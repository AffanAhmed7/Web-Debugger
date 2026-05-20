import { throttle } from '../utils/throttle';
import { getElementInfo } from '../utils/dom';
import { OverlayContainer } from '../overlay/container';
import { BoxModelOverlay } from '../overlay/BoxModelOverlay';
import { Tooltip } from '../overlay/Tooltip';
import { SidePanel } from '../overlay/SidePanel';
import { StyleHistory } from '../state/StyleHistory';
import { SessionRecorder } from '../overlay/SessionRecorder';
import { Annotator } from '../overlay/Annotator';
import { CommandPalette } from '../overlay/CommandPalette';
import styles from '../overlay/styles.css?inline';

export class Inspector {
  private container: OverlayContainer;
  private boxOverlay: BoxModelOverlay;
  private tooltip: Tooltip;
  private sidePanel: SidePanel;
  private history: StyleHistory;
  private recorder: SessionRecorder;
  private annotator: Annotator;
  private palette: CommandPalette;
  
  private currentElement: HTMLElement | null = null;
  private lockedElement: HTMLElement | null = null;
  private isLocked: boolean = false;
  private isRecording: boolean = false;

  constructor() {
    this.container = new OverlayContainer();
    this.container.setStyles(styles);
    const root = this.container.getRoot();
    
    this.boxOverlay = new BoxModelOverlay(root);
    this.tooltip = new Tooltip(root);
    this.history = new StyleHistory();
    this.recorder = new SessionRecorder();
    this.annotator = new Annotator(root);
    this.palette = new CommandPalette(root);

    this.palette.registerCommands([
      { id: 'toggle-overlay', name: 'Toggle Overlay Visibility', shortcut: 'V', action: () => this.container.toggle() },
      { id: 'reset-lock', name: 'Reset Inspector Lock', shortcut: 'Esc', action: () => this.unlock() },
      { id: 'clear-annotations', name: 'Clear All Annotations', action: () => this.annotator.hide() },
      { id: 'start-rec', name: 'Start Session Recording', action: () => this.toggleRecording() },
    ]);
    
    this.sidePanel = new SidePanel(root, {
      onMutation: (m) => this.history.push(m),
      onUndo: () => {
        this.history.undo();
        this.update();
      },
      onRedo: () => {
        this.history.redo();
        this.update();
      },
      onRecordToggle: () => this.toggleRecording(),
      onCapture: () => this.captureViewport()
    });

    this.onMouseMove = throttle(this.onMouseMove.bind(this), 16);
    this.onClick = this.onClick.bind(this);
    this.onKeyDown = this.onKeyDown.bind(this);
    this.updateOnScroll = throttle(this.updateOnScroll.bind(this), 16);

    window.addEventListener('relock', (e: any) => {
      if (e.detail) this.lock(e.detail);
    });
  }

  private toggleRecording() {
    this.isRecording = !this.isRecording;
    if (this.isRecording) {
      this.recorder.start();
    } else {
      this.recorder.stop();
    }
  }

  private async captureViewport() {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'capture' });
      if (response?.dataUrl) {
        this.annotator.show(response.dataUrl);
      }
    } catch (e) {
      console.error('Failed to capture viewport:', e);
    }
  }

  public start() {
    this.container.inject();
    window.addEventListener('mousemove', this.onMouseMove, { passive: true });
    window.addEventListener('scroll', this.updateOnScroll, { passive: true });
    window.addEventListener('click', this.onClick, true); // Use capture to intercept
    window.addEventListener('keydown', this.onKeyDown);
  }

  public stop() {
    window.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('scroll', this.updateOnScroll);
    window.removeEventListener('click', this.onClick, true);
    window.removeEventListener('keydown', this.onKeyDown);
    this.container.cleanup();
  }

  private async onMouseMove(e: MouseEvent) {
    if (this.isLocked) return;

    const target = this.getDeepestElementAt(e.clientX, e.clientY);

    if (!target || target === this.currentElement) {
      if (!target) this.hide();
      return;
    }

    this.currentElement = target;
    await this.update();
  }

  /**
   * Returns the most specific (deepest in DOM tree) real page element at the
   * given viewport coordinates, excluding our own overlay host.
   *
   * elementsFromPoint is sorted by z-order (top layer first), so a large
   * section with a high stacking context beats its own children. Sorting by
   * DOM depth instead gives us the actual child the cursor is over.
   */
  private getDeepestElementAt(x: number, y: number): HTMLElement | null {
    const hostId = 'universal-web-debugger-root';

    const candidates = (document.elementsFromPoint(x, y) as HTMLElement[])
      .filter(el => el.id !== hostId && !el.closest('#' + hostId)
                 && el !== document.documentElement && el !== document.body);

    if (candidates.length === 0) return null;

    // Depth = number of ancestors — deepest element = most specific child
    const depth = (el: HTMLElement) => {
      let d = 0;
      let cur: HTMLElement | null = el;
      while (cur) { d++; cur = cur.parentElement; }
      return d;
    };

    return candidates.reduce((best, el) => depth(el) >= depth(best) ? el : best);
  }

  private async onClick(e: MouseEvent) {
    // If clicking inside our root, don't intercept
    const target = e.target as HTMLElement;
    if (!target || target.closest('#universal-web-debugger-root')) return;

    if (!this.isLocked) {
      e.preventDefault();
      e.stopPropagation();
      await this.lock(target);
    }
  }

  private onKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      this.unlock();
    } else if (e.ctrlKey && e.shiftKey && e.key === 'P') {
      e.preventDefault();
      this.palette.toggle();
    } else if (e.ctrlKey && e.key === 'z') {
      this.history.undo();
      this.update();
    } else if (e.ctrlKey && e.key === 'y') {
      this.history.redo();
      this.update();
    }
  }

  private async lock(el: HTMLElement) {
    this.isLocked = true;
    this.lockedElement = el;
    this.currentElement = el;
    this.tooltip.hide();
    const info = await getElementInfo(el, true); // DEEP analysis on lock
    this.sidePanel.update(info, el);
    console.log('🔒 Element locked for inspection');
  }

  private unlock() {
    this.isLocked = false;
    this.lockedElement = null;
    this.sidePanel.hide();
    this.hide(); // Hide guides
    console.log('🔓 Element unlocked');
  }

  private updateOnScroll() {
    if (this.currentElement) {
      if (this.isLocked) {
        this.update();
      } else {
        // Lightweight update: just move box overlay
        this.updateBoxOverlay();
      }
    }
  }

  private async updateBoxOverlay() {
    const el = this.lockedElement || this.currentElement;
    if (!el) return;
    const info = await getElementInfo(el, false);
    const issueCount = info.analysis.anomalies.length + info.analysis.a11y.length;
    this.boxOverlay.update(info.metrics, issueCount);
    this.tooltip.update(info);
  }

  private async update() {
    const el = this.lockedElement || this.currentElement;
    if (!el) return;

    // Fast path: Box model overlay (GPU optimized)
    const info = await getElementInfo(el, this.isLocked); // Only deep if locked
    const issueCount = info.analysis.anomalies.length + info.analysis.a11y.length;
    this.boxOverlay.update(info.metrics, issueCount);
    
    if (!this.isLocked) {
      this.tooltip.update(info);
    } else {
      this.sidePanel.update(info, el);
    }
  }

  private hide() {
    if (this.isLocked) return;
    this.currentElement = null;
    this.boxOverlay.hide();
    this.tooltip.hide();
  }
}
