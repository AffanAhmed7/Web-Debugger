import type { ElementInfo } from '../types';

export class Tooltip {
  private el: HTMLDivElement;

  constructor(parent: ShadowRoot | HTMLElement) {
    this.el = document.createElement('div');
    this.el.className = 'tooltip';
    parent.appendChild(this.el);
    this.hide();
  }

  public update(info: ElementInfo) {
    const { tagName, id, classList, metrics } = info;
    const { top, left, margin } = metrics;

    const classes = classList.length > 0 ? `.${classList.join('.')}` : '';
    const idStr = id ? `#${id}` : '';

    this.el.innerHTML = `
      <div class="tooltip-header">
        <span class="tag-name">${tagName}</span>
        <span class="element-id">${idStr}</span>
        <span class="element-classes">${classes}</span>
      </div>
      <div class="dimensions">
        ${Math.round(metrics.width)} × ${Math.round(metrics.height)}
      </div>
    `;

    // Position tooltip above the element, or below if no space
    const tooltipHeight = 40; // Approx
    const finalTop = top - margin.top - tooltipHeight - 10;
    const finalLeft = left - margin.left;

    this.el.style.transform = `translate3d(${finalLeft}px, ${Math.max(10, finalTop)}px, 0)`;
    this.show();
  }

  public show() {
    this.el.style.display = 'flex';
  }

  public hide() {
    this.el.style.display = 'none';
  }
}
