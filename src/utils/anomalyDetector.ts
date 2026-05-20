import type { Anomaly } from '../types';

export function detectAnomalies(el: HTMLElement): Anomaly[] {
  const anomalies: Anomaly[] = [];
  const style = window.getComputedStyle(el);

  // 1. Overflow detection
  if (el.scrollWidth > el.clientWidth && style.overflowX !== 'hidden') {
    anomalies.push({
      type: 'warning',
      title: 'Horizontal Overflow',
      description: `Element content (${el.scrollWidth}px) is wider than its container (${el.clientWidth}px).`,
    });
  }

  // 2. Z-index stacking context check
  if (style.zIndex !== 'auto' && style.position !== 'static') {
    // Count total DOM depth first (separate from stacking context walk)
    let totalDepth = 0;
    let depthEl: HTMLElement | null = el.parentElement;
    while (depthEl) {
      totalDepth++;
      depthEl = depthEl.parentElement;
    }

    if (totalDepth > 20) {
      anomalies.push({
        type: 'warning',
        title: 'Excessive DOM Depth',
        description: `Element is nested ${totalDepth} levels deep. This can cause performance issues during reflows.`,
      });
    }

    // Check for stacking context restriction
    let parent = el.parentElement;
    while (parent) {
      const parentStyle = window.getComputedStyle(parent);
      const createsStackingContext =
        parentStyle.opacity !== '1' ||
        parentStyle.transform !== 'none' ||
        parentStyle.filter !== 'none' ||
        parentStyle.perspective !== 'none' ||
        parentStyle.clipPath !== 'none' ||
        parentStyle.mask !== 'none' ||
        (parentStyle.zIndex !== 'auto' && parentStyle.position !== 'static');

      if (createsStackingContext) {
        anomalies.push({
          type: 'warning',
          title: 'Nested Stacking Context',
          description: `Z-index ${style.zIndex} might be restricted by parent (${parent.tagName.toLowerCase()}) creating its own stacking context.`,
        });
        break;
      }
      parent = parent.parentElement;
    }
  }

  // 3. Size anomalies
  const rect = el.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) {
    if (style.display !== 'none' && style.visibility !== 'hidden') {
      anomalies.push({
        type: 'error',
        title: 'Collapsed Layout',
        description: 'Element is supposed to be visible but has zero dimensions. Check for positioning or content issues.',
      });
    }
  }

  // 4. CSS Health - Position/Display mismatch
  if (style.position === 'absolute' || style.position === 'fixed') {
    if (style.display === 'inline' || style.display === 'inline-block') {
      anomalies.push({
        type: 'warning',
        title: 'Redundant Display',
        description: 'Position: absolute/fixed automatically forces block-level behavior. Set display to block for clarity.',
      });
    }
  }

  return anomalies;
}
