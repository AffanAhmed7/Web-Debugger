import type { ElementInfo, StyleMutation } from '../types';

export class SidePanel {
  private el: HTMLDivElement;
  private activeTab: 'styles' | 'rules' | 'session' | 'intel' | 'plugins' = 'styles';
  private lastInfo: ElementInfo | null = null;
  private currentElement: HTMLElement | null = null;
  private isRecording: boolean = false;
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
    this.currentElement = element;
    this.lastInfo = info;
    this.render();
  }

  private render() {
    if (!this.lastInfo || !this.currentElement) return;

    const { tagName, id, classList, computedStyles, analysis, framework } = this.lastInfo;
    const idDisplay = id ? `#${id}` : '';
    const classDisplay = classList.length ? `.${classList.join('.')}` : '';

    this.el.innerHTML = `
      <div class="panel-header">
        <div style="display: flex; flex-direction: column;">
          <div style="display: flex; align-items: center;">
            <h2>${tagName}${idDisplay}</h2>
            ${framework ? `<span class="framework-badge">${framework.name}</span>` : ''}
          </div>
          <span style="font-size: 10px; color: #888; margin-top: 4px;">${classDisplay}</span>
        </div>
        <span class="status-badge">LOCKED</span>
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
      case 'intel':
        return `
          <div class="section-title">Diagnostic Intelligence</div>
          <div class="alert alert-info">
            <div class="alert-title">🔍 Contextual Advice</div>
            <div class="alert-desc">
              Based on ${framework ? framework.name : 'your codebase'} patterns, this component is ${perf.cls > 0.05 ? 'contributing to layout instability' : 'stable'}. 
              ${analysis.anomalies.length > 0 ? 'Address the identified anomalies to improve UX.' : 'Everything looks optimal.'}
            </div>
          </div>
          
          <div class="perf-grid" style="margin-top: 16px;">
            <div class="perf-card">
              <span class="perf-label">CLS</span>
              <span class="perf-value">${perf.cls.toFixed(3)}</span>
            </div>
            <div class="perf-card">
              <span class="perf-label">Long Tasks</span>
              <span class="perf-value">${perf.longTasks}</span>
            </div>
          </div>
          
          <div class="section-title">Anomalies & Accessibility</div>
          ${analysis.anomalies.map((a: any) => this.renderAlert(a)).join('')}
          ${analysis.a11y.map((i: any) => this.renderAlert(i)).join('')}
          ${(analysis.anomalies.length === 0 && analysis.a11y.length === 0) ? '<div style="font-size: 11px; opacity: 0.5;">No critical issues found.</div>' : ''}
        `;
      case 'styles':
        return `
          <div class="property-group">
            <div class="section-title">Colors & Background</div>
            ${this.renderProperty('Color', 'color', styles.color)}
            ${this.renderProperty('Background', 'backgroundColor', styles.backgroundColor)}
          </div>
          <div class="property-group">
             <div class="section-title">Typography</div>
             ${this.renderProperty('Font Size', 'fontSize', styles.fontSize)}
             ${this.renderProperty('Font Weight', 'fontWeight', styles.fontWeight)}
          </div>
          <div class="property-group">
            <div class="section-title">Spacing</div>
            ${this.renderProperty('Margin', 'margin', styles.margin)}
            ${this.renderProperty('Padding', 'padding', styles.padding)}
          </div>
        `;
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
      a.click();
      URL.revokeObjectURL(url);
    });

    const inputs = this.el.querySelectorAll('.property-input');
    inputs.forEach(input => {
      input.addEventListener('change', (e) => {
        const target = e.target as HTMLInputElement;
        const prop = target.getAttribute('data-prop') as keyof CSSStyleDeclaration;
        if (this.currentElement && prop) {
          const oldValue = window.getComputedStyle(this.currentElement)[prop as any];
          const newValue = target.value;

          // Apply change
          (this.currentElement.style as any)[prop] = newValue;

          // Notify mutation
          this.onMutation({
            element: this.currentElement,
            property: prop,
            oldValue: String(oldValue),
            newValue: newValue
          });
        }
      });
    });

    this.el.querySelector('.undo-btn')?.addEventListener('click', () => this.onUndo());
    this.el.querySelector('.redo-btn')?.addEventListener('click', () => this.onRedo());
  }

  public show() {
    this.el.classList.remove('hidden');
  }

  public hide() {
    this.el.classList.add('hidden');
    this.currentElement = null;
  }
}
