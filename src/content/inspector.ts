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
    this.annotator = new Annotator(document.documentElement);
    this.palette = new CommandPalette(document.documentElement);

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
    const response = await chrome.runtime.sendMessage({ action: 'capture' });
    if (response?.dataUrl) {
      this.annotator.show(response.dataUrl);
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

    const target = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement;

    if (!target || target === this.currentElement) {
      if (!target) this.hide();
      return;
    }

    if (target.id === 'universal-web-debugger-root') return;

    this.currentElement = target;
    await this.update();
  }

  private async onClick(e: MouseEvent) {
    // If clicking inside our side panel, don't intercept
    if ((e.target as HTMLElement).closest('.side-panel')) return;

    if (!this.isLocked && this.currentElement) {
      e.preventDefault();
      e.stopPropagation();
      await this.lock(this.currentElement);
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
    const info = await getElementInfo(el);
    this.sidePanel.update(info, el);
    console.log('🔒 Element locked for inspection');
  }

  private unlock() {
    this.isLocked = false;
    this.lockedElement = null;
    this.sidePanel.hide();
    console.log('🔓 Element unlocked');
  }

  private updateOnScroll = throttle(() => {
    if (this.currentElement) {
      this.update();
    }
  }, 16);

  private async update() {
    const el = this.lockedElement || this.currentElement;
    if (!el) return;

    // Fast path: Box model overlay (GPU optimized)
    const info = await getElementInfo(el);
    this.boxOverlay.update(info.metrics);
    
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
