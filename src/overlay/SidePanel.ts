import type { ElementInfo, StyleMutation } from '../types';
import { suggestAccessibleColor, parseRgb, getLuminance, getContrastRatio } from '../utils/a11yEngine';

export class SidePanel {
  private el: HTMLDivElement;
  private activeTab: 'styles' | 'rules' | 'session' | 'intel' | 'plugins' = 'styles';
  private lastInfo: ElementInfo | null = null;
  private currentElement: HTMLElement | null = null;
  private isRecording: boolean = false;
  private forcedStates: Set<string> = new Set();
  private forcedStyleBackups: Map<string, Map<string, string>> = new Map();
  private onMutation: (mutation: StyleMutation) => void;
  private onUndo: () => void;
  private onRedo: () => void;
  private onRecordToggle: () => void;
  private onCapture: () => void;

  constructor(
    parent: ShadowRoot | HTMLElement,
    callbacks: {
      onMutation: (mutation: StyleMutation) => void;
      onUndo: () => void;
      onRedo: () => void;
      onRecordToggle: () => void;
      onCapture: () => void;
    }
  ) {
    this.onMutation = callbacks.onMutation;
    this.onUndo = callbacks.onUndo;
    this.onRedo = callbacks.onRedo;
    this.onRecordToggle = callbacks.onRecordToggle;
    this.onCapture = callbacks.onCapture;

    this.el = document.createElement('div');
    this.el.className = 'side-panel hidden';
    parent.appendChild(this.el);
  }

  public update(info: ElementInfo, element: HTMLElement) {
    const isActiveInput = this.el.contains(document.activeElement) && document.activeElement?.tagName === 'INPUT';
    
    // Clear forced states when switching to a different element
    if (element !== this.currentElement) {
      this.clearAllForcedStates();
    }

    this.currentElement = element;
    this.lastInfo = info;
    
    if (isActiveInput) {
       // Only update breadcrumbs and non-style parts if user is typing
       this.partialRender(info);
    } else {
       this.render();
    }
  }

  private partialRender(info: ElementInfo) {
    const header = this.el.querySelector('.panel-header');
    if (header) {
      const { tagName, id } = info;
      header.innerHTML = `
        <div style="display: flex; flex-direction: column; overflow: hidden; flex: 1;">
          <div style="display: flex; align-items: center; gap: 4px;">
            <div class="breadcrumbs">
              ${this.renderBreadcrumbs(this.currentElement!)}
            </div>
          </div>
          <div style="display: flex; align-items: center; margin-top: 4px;">
            <h2 style="margin: 0; font-size: 13px; font-family: monospace; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
               <span style="color: #ef9ad3;">${tagName}</span>${id ? `<span style="color: #ffcc00;">#${id}</span>` : ''}${info.classList.length > 0 ? `<span style="color: #9cdcfe;">.${info.classList.join('.')}</span>` : ''}
            </h2>
          </div>
        </div>
      `;
    }
  }

  private render() {
    if (!this.lastInfo || !this.currentElement) return;

    const { tagName, id, computedStyles, analysis, framework } = this.lastInfo;

    this.el.innerHTML = `
      <div class="panel-header">
        <div style="display: flex; flex-direction: column; overflow: hidden; flex: 1;">
          <div style="display: flex; align-items: center; gap: 4px;">
            <div class="breadcrumbs">
              ${this.renderBreadcrumbs(this.currentElement)}
            </div>
            ${framework && framework.name !== 'Unknown' ? `<span class="framework-badge ${framework.name.toLowerCase()}">${framework.name}</span>` : ''}
          </div>
          <div style="display: flex; align-items: center; margin-top: 4px;">
            <h2 style="margin: 0; font-size: 13px; font-family: monospace; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
               <span style="color: #ef9ad3;">${tagName}</span>${id ? `<span style="color: #ffcc00;">#${id}</span>` : ''}${this.lastInfo.classList.length > 0 ? `<span style="color: #9cdcfe;">.${this.lastInfo.classList.join('.')}</span>` : ''}
            </h2>
          </div>
        </div>
      </div>
      
      <div class="tab-nav">
        <button class="tab-btn ${this.activeTab === 'styles' ? 'active' : ''}" data-tab="styles">Styles</button>
        <button class="tab-btn ${this.activeTab === 'rules' ? 'active' : ''}" data-tab="rules">Rules</button>
        <button class="tab-btn ${this.activeTab === 'intel' ? 'active' : ''}" data-tab="intel">Intel</button>
        <button class="tab-btn ${this.activeTab === 'plugins' ? 'active' : ''}" data-tab="plugins">Plugins</button>
        <button class="tab-btn ${this.activeTab === 'session' ? 'active' : ''}" data-tab="session">Session</button>
      </div>

      <div class="panel-content">
        ${this.renderTabContent(computedStyles, analysis, this.lastInfo.performance, framework, this.lastInfo.plugins)}
      </div>

      ${this.activeTab === 'styles' ? `
      <div class="history-controls">
        <button class="btn undo-btn">Undo</button>
        <button class="btn redo-btn">Redo</button>
        <button class="btn copy-css-btn">Copy CSS</button>
      </div>
      ` : ''}
    `;

    this.attachListeners();
    this.show();
  }

  private renderTabContent(styles: any, analysis: any, perf: any, framework: any, plugins: any[]) {
    switch (this.activeTab) {
      case 'plugins':
        return `
          <div class="section-title">Plugin Audits</div>
          ${plugins?.map((p: any) => `
            <div class="plugin-section">
              <div class="plugin-header">${p.pluginName}</div>
              ${p.results.map((r: any) => `
                <div class="plugin-result ${r.type}">
                  <b>${r.title}:</b> ${r.message}
                </div>
              `).join('')}
            </div>
          `).join('') || '<div style="font-size: 11px; opacity: 0.5;">No additional plugins active.</div>'}
        `;
      case 'session':
        return `
          <div class="recorder-controls">
            <button class="record-btn ${this.isRecording ? 'active' : ''}" id="toggle-record">
              <span>${this.isRecording ? 'Stop Recording' : 'Start Recording'}</span>
            </button>
            <button class="btn" id="capture-btn">📸 Capture Viewport</button>
            <button class="btn" id="export-btn">📄 Export Audit Report</button>
            <div style="font-size: 11px; opacity: 0.6; text-align: center;">Record flows and export diagnostic data</div>
          </div>
        `;
      case 'intel': {
        const issues = [...analysis.anomalies, ...analysis.a11y];
        const criticalCount = issues.filter(i => i.type === 'error').length;
        const healthScore = Math.max(0, 100 - (issues.length * 10) - (criticalCount * 15));
        const scoreColor = healthScore > 80 ? '#34c759' : (healthScore > 50 ? '#ffa500' : '#ff453a');

        return `
          <div class="intel-summary">
             <div class="health-gauge">
                <svg viewBox="0 0 36 36" class="gauge-svg">
                  <path class="gauge-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                  <path class="gauge-fill" style="stroke: ${scoreColor}; stroke-dasharray: ${healthScore}, 100;" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                  <text x="18" y="20.35" class="gauge-text">${healthScore}</text>
                </svg>
                <div class="health-label">HEALTH SCORE</div>
             </div>
             <div class="context-advice">
                <b>Strategy:</b> ${healthScore > 80 ? 'Maintain stable patterns.' : (healthScore > 50 ? 'Refactor identified bottlenecks.' : 'Immediate architectural review needed.')}
                <div style="font-size: 11px; opacity: 0.7; margin-top: 4px;">
                  Detected as a ${framework?.name && framework.name !== 'Unknown' ? `<b>${framework.name}</b> component` : 'standard DOM element'}.
                </div>
             </div>
          </div>
          
          <div class="section-title">Performance Vitals</div>
          <div class="perf-grid">
            <div class="perf-card">
              <span class="perf-label">CLS</span>
              <span class="perf-value" style="color: ${perf.cls > 0.1 ? '#ff453a' : '#ef9ad3'}">${perf.cls.toFixed(3)}</span>
            </div>
            <div class="perf-card">
              <span class="perf-label">LCP</span>
              <span class="perf-value" style="color: ${perf.lcp > 2500 ? '#ff453a' : '#ef9ad3'}">${(perf.lcp / 1000).toFixed(1)}s</span>
            </div>
            <div class="perf-card">
              <span class="perf-label">Blocking Tasks</span>
              <span class="perf-value">${perf.longTasks}</span>
            </div>
          </div>

          ${perf.bottlenecks.length > 0 ? `
            <div class="section-title">Technical Bottlenecks</div>
            ${perf.bottlenecks.map((b: any) => `
              <div class="bottleneck-item severity-${b.severity}">
                <span class="bottleneck-msg">${b.message}</span>
                <span class="bottleneck-sugg">${b.suggestion}</span>
              </div>
            `).join('')}
          ` : ''}
          
          <div class="section-title">Diagnostic Details</div>
          ${issues.length > 0 ? issues.map((i: any) => this.renderAlert(i)).join('') : '<div style="font-size: 11px; opacity: 0.5; text-align: center; padding: 20px;">No critical issues found. Your component is healthy!</div>'}
        `;
      }
      case 'styles': {
        const contrastInfo = this.checkContrast(styles.color, styles.backgroundColor);
        return `
          <div class="property-group">
            <div class="section-title">Layout Context</div>
            ${this.renderBoxModel(this.lastInfo!.metrics)}
            ${this.renderLayoutHelpers(styles.display)}
          </div>

          ${this.renderForceState(this.lastInfo!.analysis.rules)}

          <div class="property-group">
            <div class="section-title">Colors & Background</div>
            ${this.renderProperty('Color', 'color', styles.color)}
            ${this.renderProperty('Background', 'background', styles.background)}
            
            ${contrastInfo ? `
              <div class="alert alert-${contrastInfo.pass ? 'info' : 'error'}" style="margin-top: 10px;">
                <div class="alert-title">${contrastInfo.pass ? '✅' : '❌'} Contrast: ${contrastInfo.ratio}:1</div>
                <div class="alert-desc">
                  WCAG rating: <b>${contrastInfo.rating}</b>. 
                  ${!contrastInfo.pass ? `<button class="btn fix-contrast-btn" style="margin-top: 4px;">Fix Contrast</button>` : ''}
                </div>
              </div>
            ` : ''}
          </div>
          <div class="property-group">
             <div class="section-title">Typography & Layout</div>
             ${this.renderProperty('Font Size', 'fontSize', styles.fontSize)}
             ${this.renderProperty('Font Weight', 'fontWeight', styles.fontWeight)}
             ${this.renderProperty('Display', 'display', styles.display)}
             ${this.renderProperty('Opacity', 'opacity', styles.opacity || '1')}
          </div>
          <div class="property-group">
            <div class="section-title">Spacing & Shaping</div>
            ${this.renderProperty('Margin', 'margin', styles.margin)}
            ${this.renderProperty('Padding', 'padding', styles.padding)}
            ${this.renderProperty('Radius', 'borderRadius', styles.borderRadius || '0px')}
          </div>
        `;
      }
      case 'rules':
        return `
          <div class="rules-list">
            ${analysis.rules.map((rule: any) => `
              <div class="rule-item">
                <span class="rule-source">${rule.source}</span>
                <span class="rule-selector">${rule.selector} {</span>
                <div class="decl-list">
                  ${rule.declarations.map((d: any) => `
                    <div class="decl-row">
                      <span class="decl-prop">${d.property}</span>: <span class="decl-val">${d.value}</span>;
                    </div>
                  `).join('')}
                </div>
                <span class="rule-selector">}</span>
              </div>
            `).join('')}
          </div>
        `;
    }
  }

  private renderBoxModel(m: any) {
    const round = (v: any) => Math.round(v);
    return `
      <div class="visual-box-model">
        <div class="box-rect margin">
          <span class="box-value top">${round(m.margin.top)}</span>
          <span class="box-value left">${round(m.margin.left)}</span>
          <span class="box-value right">${round(m.margin.right)}</span>
          <span class="box-value bottom">${round(m.margin.bottom)}</span>
          
          <div class="box-rect border">
            <span class="box-value top">${round(m.border.top)}</span>
            <span class="box-value left">${round(m.border.left)}</span>
            <span class="box-value right">${round(m.border.right)}</span>
            <span class="box-value bottom">${round(m.border.bottom)}</span>

            <div class="box-rect padding">
              <span class="box-value top">${round(m.padding.top)}</span>
              <span class="box-value left">${round(m.padding.left)}</span>
              <span class="box-value right">${round(m.padding.right)}</span>
              <span class="box-value bottom">${round(m.padding.bottom)}</span>

              <div class="box-rect content">
                <span class="box-value">${round(m.width)} × ${round(m.height)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private renderLayoutHelpers(display: string) {
    if (display.includes('flex')) {
      const jc = [
        { val: 'flex-start', label: 'Start' },
        { val: 'center',     label: 'Center' },
        { val: 'flex-end',   label: 'End' },
        { val: 'space-between', label: 'Space' },
      ];
      const ai = [
        { val: 'flex-start', label: 'Top' },
        { val: 'center',     label: 'Middle' },
        { val: 'flex-end',   label: 'Bottom' },
        { val: 'stretch',    label: 'Stretch' },
      ];
      return `
        <div class="layout-helpers">
          <div class="helper-row">
            <span class="helper-axis-label">justify</span>
            <div class="helper-btns">
              ${jc.map(b => `<button class="helper-btn" title="justify-content: ${b.val}" data-prop="justifyContent" data-val="${b.val}">${b.label}</button>`).join('')}
            </div>
          </div>
          <div class="helper-row">
            <span class="helper-axis-label">align</span>
            <div class="helper-btns">
              ${ai.map(b => `<button class="helper-btn" title="align-items: ${b.val}" data-prop="alignItems" data-val="${b.val}">${b.label}</button>`).join('')}
            </div>
          </div>
        </div>
      `;
    }
    if (display.includes('grid')) {
      return `
        <div class="layout-helpers">
          <div style="font-size: 10px; opacity: 0.5; text-align: center;">Grid layout detected — open Rules tab for template details.</div>
        </div>
      `;
    }
    return '';
  }

  private renderAlert(alert: any): string {
    return `
      <div class="alert alert-${alert.type}">
        <div class="alert-title">
          <span>${alert.type === 'error' ? '❌' : '⚠️'}</span>
          ${alert.title}
        </div>
        <div class="alert-desc">${alert.description}</div>
      </div>
    `;
  }

  private renderProperty(label: string, property: string, value: string): string {
    return `
      <div class="property-row">
        <span class="property-label">${label}</span>
        <input type="text" class="property-input" data-prop="${property}" value="${value}">
      </div>
    `;
  }

  private attachListeners() {
    // Tab switching
    this.el.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = e.target as HTMLButtonElement;
        this.activeTab = target.getAttribute('data-tab') as any;
        this.render();
      });
    });

    this.el.querySelector('#toggle-record')?.addEventListener('click', () => {
      this.isRecording = !this.isRecording;
      this.onRecordToggle();
      this.render();
    });

    this.el.querySelector('#capture-btn')?.addEventListener('click', () => {
      this.onCapture();
    });

    this.el.querySelector('#export-btn')?.addEventListener('click', () => {
      if (!this.lastInfo) return;
      const data = JSON.stringify(this.lastInfo, null, 2);
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `debug-report-${this.lastInfo.tagName}-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });

    const inputs = this.el.querySelectorAll('.property-input');
    inputs.forEach(input => {
      input.addEventListener('input', (e) => {
        const target = e.target as HTMLInputElement;
        const prop = target.getAttribute('data-prop') as string;
        if (this.currentElement && prop) {
          const newValue = target.value;

          // Convert camelCase back to kebab-case for setProperty
          const kebabProp = prop.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();

          // Apply change with high specificity
          this.currentElement.style.setProperty(kebabProp, newValue, 'important');
        }
      });

      // Commit changes to history on change (blur)
      input.addEventListener('change', (e) => {
        const target = e.target as HTMLInputElement;
        const prop = target.getAttribute('data-prop') as string;
        if (this.currentElement && prop && this.lastInfo) {
          const oldValue = (this.lastInfo.computedStyles as any)[prop] || '';
          const newValue = target.value;

          this.onMutation({
            element: this.currentElement,
            property: prop as any,
            oldValue: String(oldValue),
            newValue: newValue
          });
        }
      });
    });

    this.el.querySelector('.undo-btn')?.addEventListener('click', () => this.onUndo());
    this.el.querySelector('.redo-btn')?.addEventListener('click', () => this.onRedo());

    this.el.querySelector('.copy-css-btn')?.addEventListener('click', async () => {
      if (!this.lastInfo) return;
      const styles = this.lastInfo.computedStyles;
      const css = Object.entries(styles)
        .map(([k, v]) => `  ${k.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()}: ${v};`)
        .join('\n');
      const block = `${this.lastInfo.tagName.toLowerCase()}${this.lastInfo.id ? '#' + this.lastInfo.id : ''} {\n${css}\n}`;
      
      try {
        await navigator.clipboard.writeText(block);
        const btn = this.el.querySelector('.copy-css-btn') as HTMLButtonElement;
        const originalText = btn.innerText;
        btn.innerText = 'Copied!';
        setTimeout(() => btn.innerText = originalText, 1500);
      } catch (err) {
        console.error('Failed to copy CSS:', err);
      }
    });

    this.el.querySelectorAll('.helper-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLButtonElement;
        const prop = target.getAttribute('data-prop') as any;
        const val = target.getAttribute('data-val') as string;
        
        if (this.currentElement && prop) {
          const oldValue = (this.currentElement.style as any)[prop];
          this.currentElement.style.setProperty(prop.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase(), val, 'important');
          
          this.onMutation({
            element: this.currentElement,
            property: prop,
            oldValue: String(oldValue),
            newValue: val
          });
          
          // Toggle active class
          target.parentElement?.querySelectorAll('.helper-btn').forEach(b => {
             if (b.getAttribute('data-prop') === prop) b.classList.remove('active');
          });
          target.classList.add('active');
        }
      });
    });

    this.el.querySelectorAll('.force-state-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLButtonElement;
        const pseudo = target.getAttribute('data-pseudo')!;

        if (this.forcedStates.has(pseudo)) {
          this.forcedStates.delete(pseudo);
          this.removeForcedState(pseudo);
          target.classList.remove('active');
        } else {
          this.forcedStates.add(pseudo);
          this.applyForcedState(pseudo);
          target.classList.add('active');
        }
      });
    });

    this.el.querySelectorAll('.breadcrumb-item').forEach(item => {
      item.addEventListener('click', () => {
        const index = parseInt(item.getAttribute('data-index') || '0');
        let el = this.currentElement;
        for (let i = 0; i < index && el?.parentElement; i++) {
          el = el.parentElement;
        }
        if (el) {
          // Manual trigger of re-lock on parent
          const event = new CustomEvent('relock', { detail: el });
          window.dispatchEvent(event);
        }
      });
    });

    this.el.querySelector('.fix-contrast-btn')?.addEventListener('click', () => {
      if (this.currentElement && this.lastInfo) {
        const bg = window.getComputedStyle(this.currentElement).backgroundColor;
        const bestColor = suggestAccessibleColor(bg);
        
        this.currentElement.style.setProperty('color', bestColor, 'important');
        this.onMutation({
          element: this.currentElement,
          property: 'color' as any,
          oldValue: this.lastInfo.computedStyles.color,
          newValue: bestColor
        });
        
        // Refresh display
        this.update({
          ...this.lastInfo,
          computedStyles: { ...this.lastInfo.computedStyles, color: bestColor }
        }, this.currentElement);
      }
    });
  }

  private renderForceState(rules: any[]): string {
    const pseudos = ['hover', 'focus', 'active', 'focus-within'];
    const available = new Set(pseudos.filter(p => rules.some((r: any) => r.selector.includes(`:${p}`))));

    return `
      <div class="force-state-bar">
        <div class="force-state-header">
          <span class="force-state-label">Force State</span>
          <span class="force-state-hint">${available.size > 0 ? `${available.size} state${available.size > 1 ? 's' : ''} available` : 'no rules detected'}</span>
        </div>
        <div class="force-state-btns">
          ${pseudos.map(p => {
            const isActive = this.forcedStates.has(p);
            const isAvailable = available.has(p);
            return `<button
              class="force-state-btn${isActive ? ' active' : ''}${!isAvailable ? ' dimmed' : ''}"
              data-pseudo="${p}"
              title="${isAvailable ? `Click to ${isActive ? 'release' : 'force'} :${p}` : `No :${p} rules found`}"
            >:${p}</button>`;
          }).join('')}
        </div>
      </div>
    `;
  }

  private applyForcedState(pseudo: string) {
    if (!this.currentElement || !this.lastInfo) return;
    const rules = this.lastInfo.analysis.rules;
    const backup = new Map<string, string>();

    rules
      .filter((r: any) => r.selector.includes(`:${pseudo}`))
      .forEach((r: any) => {
        r.declarations.forEach((d: any) => {
          const original = this.currentElement!.style.getPropertyValue(d.property);
          backup.set(d.property, original);
          this.currentElement!.style.setProperty(d.property, d.value, 'important');
        });
      });

    this.forcedStyleBackups.set(pseudo, backup);
  }

  private removeForcedState(pseudo: string) {
    if (!this.currentElement) return;
    const backup = this.forcedStyleBackups.get(pseudo);
    if (!backup) return;

    backup.forEach((originalValue, property) => {
      if (originalValue) {
        this.currentElement!.style.setProperty(property, originalValue, 'important');
      } else {
        this.currentElement!.style.removeProperty(property);
      }
    });

    this.forcedStyleBackups.delete(pseudo);
  }

  private clearAllForcedStates() {
    this.forcedStates.forEach(pseudo => this.removeForcedState(pseudo));
    this.forcedStates.clear();
  }

  private checkContrast(color: string, bg: string) {
    const rgb = parseRgb(color);
    const bgRgb = parseRgb(bg);
    if (!rgb || !bgRgb || bgRgb.a < 0.1) return null;

    const l1 = getLuminance(rgb.r, rgb.g, rgb.b);
    const l2 = getLuminance(bgRgb.r, bgRgb.g, bgRgb.b);
    const ratio = getContrastRatio(l1, l2);
    
    return { 
      ratio: ratio.toFixed(1), 
      pass: ratio >= 4.5, 
      rating: ratio >= 7 ? 'AAA' : (ratio >= 4.5 ? 'AA' : 'Fail') 
    };
  }

  private renderBreadcrumbs(el: HTMLElement) {
    const sequence: string[] = [];
    let cur: HTMLElement | null = el;
    while (cur && sequence.length < 5) {
      let label = cur.tagName.toLowerCase();
      if (cur.id) label += `<span style="opacity: 0.5;">#${cur.id}</span>`;
      else if (cur.classList.length > 0) label += `<span style="opacity: 0.5;">.${cur.classList[0]}${cur.classList.length > 1 ? '…' : ''}</span>`;
      
      sequence.push(`<span class="breadcrumb-item" data-index="${sequence.length}">${label}</span>`);
      cur = cur.parentElement;
    }
    return sequence.reverse().join('<span class="breadcrumb-sep">/</span>');
  }

  public show() {
    this.el.classList.remove('hidden');
  }

  public hide() {
    this.clearAllForcedStates();
    this.el.classList.add('hidden');
    this.currentElement = null;
  }
}
