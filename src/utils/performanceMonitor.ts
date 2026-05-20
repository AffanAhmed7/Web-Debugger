import type { PerformanceData, Bottleneck } from '../types';

let clsValue = 0;
let longTaskCount = 0;
let lcpValue = 0;
let observers: PerformanceObserver[] = [];

export function initPerformanceMonitoring() {
  const clsObserver = new PerformanceObserver((entryList) => {
    for (const entry of entryList.getEntries()) {
      if (!(entry as any).hadRecentInput) {
        clsValue += (entry as any).value;
      }
    }
  });
  clsObserver.observe({ type: 'layout-shift', buffered: true });

  const longTaskObserver = new PerformanceObserver((entryList) => {
    longTaskCount += entryList.getEntries().length;
  });
  longTaskObserver.observe({ type: 'longtask', buffered: true });

  const lcpObserver = new PerformanceObserver((entryList) => {
    const entries = entryList.getEntries();
    lcpValue = entries[entries.length - 1].startTime;
  });
  lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });

  observers = [clsObserver, longTaskObserver, lcpObserver];
}

export function stopPerformanceMonitoring() {
  observers.forEach(o => o.disconnect());
  observers = [];
  clsValue = 0;
  longTaskCount = 0;
  lcpValue = 0;
}

export function getPerformanceData(el: HTMLElement): PerformanceData {
  const bottlenecks: Bottleneck[] = [];

  // Check for large images
  if (el instanceof HTMLImageElement) {
    const entry = performance.getEntriesByName(el.src)[0] as PerformanceResourceTiming;
    if (entry) {
      if (entry.encodedBodySize > 500000) { // 500KB more aggressive
        bottlenecks.push({
          type: 'loading',
          severity: entry.encodedBodySize > 1000000 ? 'high' : 'medium',
          message: `Heavy resource (${(entry.encodedBodySize / 1024 / 1024).toFixed(2)}MB).`,
          suggestion: 'Optimize image or use next-gen formats (WebP/AVIF).'
        });
      }
      if (entry.duration > 800) {
        bottlenecks.push({
            type: 'loading',
            severity: 'medium',
            message: 'Slow fetch time detected.',
            suggestion: 'Consider lazy loading or a faster CDN.'
        });
      }
    } else if (el.src && !el.src.startsWith('data:')) {
        // Fallback for missing entry (possibly external or CORS)
        bottlenecks.push({
            type: 'loading',
            severity: 'low',
            message: 'Image metrics unavailable.',
            suggestion: 'Ensure CORS headers are set for remote resources.'
        });
    }
  }

  // Global bottlenecks
  if (clsValue > 0.05) { // Lowered threshold for "warning"
    bottlenecks.push({
      type: 'rendering',
      severity: clsValue > 0.25 ? 'high' : 'medium',
      message: `CLS: ${clsValue.toFixed(3)} detected.`,
      suggestion: 'Prevent shifts by reserving space for dynamic content.'
    });
  }

  if (longTaskCount > 0) {
    bottlenecks.push({
      type: 'scripting',
      severity: longTaskCount > 5 ? 'high' : 'low',
      message: `${longTaskCount} long tasks block the main thread.`,
      suggestion: 'Offload heavy logic to Web Workers or use requestIdleCallback.'
    });
  }

  // LCP Check
  if (lcpValue > 2500) {
    bottlenecks.push({
      type: 'rendering',
      severity: 'high',
      message: `Slow LCP (${(lcpValue / 1000).toFixed(1)}s).`,
      suggestion: 'Optimize critical path and reduce server response time.'
    });
  }

  return {
    cls: clsValue,
    longTasks: longTaskCount,
    lcp: lcpValue,
    bottlenecks
  };
}
