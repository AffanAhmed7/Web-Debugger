import type { PerformanceData, Bottleneck } from '../types';

let clsValue = 0;
let longTaskCount = 0;
let lcpValue = 0;

export function initPerformanceMonitoring() {
  // CLS
  new PerformanceObserver((entryList) => {
    for (const entry of entryList.getEntries()) {
      if (!(entry as any).hadRecentInput) {
        clsValue += (entry as any).value;
      }
    }
  }).observe({ type: 'layout-shift', buffered: true });

  // Long Tasks
  new PerformanceObserver((entryList) => {
    longTaskCount += entryList.getEntries().length;
  }).observe({ type: 'longtask', buffered: true });

  // LCP
  new PerformanceObserver((entryList) => {
    const entries = entryList.getEntries();
    lcpValue = entries[entries.length - 1].startTime;
  }).observe({ type: 'largest-contentful-paint', buffered: true });
}

export function getPerformanceData(el: HTMLElement): PerformanceData {
  const bottlenecks: Bottleneck[] = [];

  // Check for large images
  if (el instanceof HTMLImageElement) {
    const entry = performance.getEntriesByName(el.src)[0] as PerformanceResourceTiming;
    if (entry) {
      if (entry.encodedBodySize > 1000000) {
        bottlenecks.push({
          type: 'loading',
          severity: 'high',
          message: 'Large image detected (>1MB).',
          suggestion: 'Use WebP format and progressive loading.'
        });
      }
      if (entry.duration > 1000) {
        bottlenecks.push({
            type: 'loading',
            severity: 'medium',
            message: 'Slow resource load (>1s).',
            suggestion: 'Check CDN and caching headers.'
        });
      }
    }
  }

  // Global bottlenecks
  if (clsValue > 0.1) {
    bottlenecks.push({
      type: 'rendering',
      severity: 'medium',
      message: `Cumulative Layout Shift is high (${clsValue.toFixed(3)}).`,
      suggestion: 'Set explicit width/height on images and containers.'
    });
  }

  if (longTaskCount > 5) {
    bottlenecks.push({
      type: 'scripting',
      severity: 'high',
      message: 'Significant main-thread blockage detected.',
      suggestion: 'Break up long tasks or use Web Workers.'
    });
  }

  return {
    cls: clsValue,
    longTasks: longTaskCount,
    lcp: lcpValue,
    bottlenecks
  };
}
