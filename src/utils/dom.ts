import type { BoxMetrics, ElementInfo } from '../types';

export function getElementMetrics(el: HTMLElement): BoxMetrics {
  const rect = el.getBoundingClientRect();
  const style = window.getComputedStyle(el);

  return {
    width: rect.width,
    height: rect.height,
    top: rect.top + window.scrollY,
    left: rect.left + window.scrollX,
    margin: {
      top: parseFloat(style.marginTop),
      right: parseFloat(style.marginRight),
      bottom: parseFloat(style.marginBottom),
      left: parseFloat(style.marginLeft),
    },
    padding: {
      top: parseFloat(style.paddingTop),
      right: parseFloat(style.paddingRight),
      bottom: parseFloat(style.paddingBottom),
      left: parseFloat(style.paddingLeft),
    },
    border: {
      top: parseFloat(style.borderTopWidth),
      right: parseFloat(style.borderRightWidth),
      bottom: parseFloat(style.borderBottomWidth),
      left: parseFloat(style.borderLeftWidth),
    },
  };
}

import { getAppliedRules } from './cssRuleEngine';
import { detectAnomalies } from './anomalyDetector';
import { auditAccessibility } from './accessibility';
import { getPerformanceData } from './performanceMonitor';
import { detectFramework } from './frameworkDetector';
import { PluginSystem, SEOPlugin, SecurityPlugin } from './pluginSystem';

export const pluginSystem = new PluginSystem();
let pluginsRegistered = false;
if (!pluginsRegistered) {
  pluginSystem.register(SEOPlugin);
  pluginSystem.register(SecurityPlugin);
  pluginsRegistered = true;
}

function cleanBackgroundValue(val: string): string {
  // Common browser defaults that clutter the shorthand
  const defaults = [
    'repeat', 'scroll', '0% 0%', 'padding-box', 'border-box', '/ auto', 'rgba(0, 0, 0, 0)', 'transparent', 'none'
  ];
  let cleaned = val;
  defaults.forEach(d => {
    const regex = new RegExp(`\\b${d.replace('%', '\\%').replace('(', '\\(').replace(')', '\\)')}\\b`, 'g');
    cleaned = cleaned.replace(regex, '');
  });
  
  cleaned = cleaned.trim().replace(/\s+/g, ' ');
  return cleaned === '' ? 'none' : cleaned;
}

export async function getElementInfo(el: HTMLElement, deep: boolean = false): Promise<ElementInfo> {
  const style = window.getComputedStyle(el);
  const info: ElementInfo = {
    tagName: el.tagName.toLowerCase(),
    id: el.id,
    classList: Array.from(el.classList),
    metrics: getElementMetrics(el),
    computedStyles: {
      color: style.color,
      background: cleanBackgroundValue(style.background),
      backgroundColor: style.backgroundColor,
      fontSize: style.fontSize,
      fontWeight: style.fontWeight,
      fontFamily: style.fontFamily,
      lineHeight: style.lineHeight,
      display: style.display,
      margin: style.margin,
      padding: style.padding,
      opacity: style.opacity,
      borderRadius: style.borderRadius,
    },
    analysis: {
      rules: deep ? getAppliedRules(el) : [],
      anomalies: deep ? detectAnomalies(el) : [],
      a11y: deep ? auditAccessibility(el) : [],
    },
    performance: getPerformanceData(el),
    framework: detectFramework(),
    plugins: deep ? await pluginSystem.runAll(el, {}) : [],
  };
  return info;
}
