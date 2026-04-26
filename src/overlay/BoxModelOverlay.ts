import type { BoxMetrics } from '../types';

export class BoxModelOverlay {
  private container: HTMLDivElement;
  private margin: HTMLDivElement;
  private border: HTMLDivElement;
  private padding: HTMLDivElement;
  private content: HTMLDivElement;

  constructor(parent: ShadowRoot | HTMLElement) {
    this.container = document.createElement('div');
    this.container.className = 'box-model-container';
    
    this.margin = this.createZone('margin-zone');
    this.border = this.createZone('border-zone');
    this.padding = this.createZone('padding-zone');
    this.content = this.createZone('content-zone');

    this.container.appendChild(this.margin);
    this.container.appendChild(this.border);
    this.container.appendChild(this.padding);
    this.container.appendChild(this.content);
    
    parent.appendChild(this.container);
    this.hide();
  }

  private createZone(className: string): HTMLDivElement {
    const div = document.createElement('div');
    div.className = `zone ${className}`;
    return div;
  }

  public update(metrics: BoxMetrics) {
    const { top, left, width, height, margin, padding, border } = metrics;

    // GPU-optimized moves
    this.container.style.transform = `translate3d(${left - margin.left}px, ${top - margin.top}px, 0)`;

    // Margin zone (outermost)
    const marginWidth = width + margin.left + margin.right;
    const marginHeight = height + margin.top + margin.bottom;
    this.setSize(this.margin, marginWidth, marginHeight);

    // Border zone
    this.setSize(this.border, width + border.left + border.right, height + border.top + border.bottom);
    this.border.style.transform = `translate3d(${margin.left}px, ${margin.top}px, 0)`;

    // Padding zone
    this.setSize(this.padding, width, height);
    this.padding.style.transform = `translate3d(${margin.left + border.left}px, ${margin.top + border.top}px, 0)`;

    // Content zone
    this.setSize(this.content, width - padding.left - padding.right, height - padding.top - padding.bottom);
    this.content.style.transform = `translate3d(${margin.left + border.left + padding.left}px, ${margin.top + border.top + padding.top}px, 0)`;

    this.show();
  }

  private setSize(el: HTMLElement, w: number, h: number) {
    el.style.width = `${Math.max(0, w)}px`;
    el.style.height = `${Math.max(0, h)}px`;
  }

  public show() {
    this.container.style.display = 'block';
  }

  public hide() {
    this.container.style.display = 'none';
  }
}
