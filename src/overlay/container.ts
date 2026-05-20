export class OverlayContainer {
  private host: HTMLElement;
  private shadowRoot: ShadowRoot;
  private styles: HTMLStyleElement;

  constructor() {
    this.host = document.createElement('div');
    this.host.id = 'universal-web-debugger-root';
    this.host.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 2147483647;';
    
    this.shadowRoot = this.host.attachShadow({ mode: 'closed' });
    
    this.styles = document.createElement('style');
    this.shadowRoot.appendChild(this.styles);
  }

  public toggle() {
    this.host.classList.toggle('hidden');
  }

  public inject() {
    if (!document.getElementById(this.host.id)) {
      document.documentElement.appendChild(this.host);
    }
  }

  public setStyles(css: string) {
    this.styles.textContent = css;
  }

  public getRoot(): ShadowRoot {
    return this.shadowRoot;
  }

  public cleanup() {
    if (this.host.parentNode) {
      this.host.parentNode.removeChild(this.host);
    }
  }
}
