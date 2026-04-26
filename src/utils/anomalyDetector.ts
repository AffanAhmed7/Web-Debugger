import type { Anomaly } from '../types';

export function detectAnomalies(el: HTMLElement): Anomaly[] {
  const anomalies: Anomaly[] = [];

  // 1. Overflow detection
  if (el.scrollWidth > el.clientWidth) {
    anomalies.push({
      type: 'warning',
      title: 'Horizontal Overflow',
      description: `Element content (${el.scrollWidth}px) is wider than its container (${el.clientWidth}px).`,
    });
  }

  // 2. Z-index stacking context check
  const style = window.getComputedStyle(el);
  if (style.zIndex !== 'auto') {
    const parent = el.parentElement;
    if (parent) {
      const parentStyle = window.getComputedStyle(parent);
      if (parentStyle.opacity !== '1' || parentStyle.transform !== 'none') {
         // Potential stacking context confusion
      }
    }
  }

  // 3. Size anomalies
  const rect = el.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) {
    anomalies.push({
      type: 'error',
      title: 'Zero Dimension',
      description: 'Element is currently invisible or has zero width/height.',
    });
  }

  return anomalies;
}
