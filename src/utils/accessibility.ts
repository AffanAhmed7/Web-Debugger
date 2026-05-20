import type { A11yIssue } from '../types';
import { parseRgb, getLuminance, getContrastRatio } from './a11yEngine';

export function auditAccessibility(el: HTMLElement): A11yIssue[] {
  const issues: A11yIssue[] = [];
  const style = window.getComputedStyle(el);
  const rect = el.getBoundingClientRect();

  // 1. Real Contrast Check
  const rgb = parseRgb(style.color);
  const bgRgb = parseRgb(style.backgroundColor);
  
  if (rgb && bgRgb && bgRgb.a > 0.05) {
      const lum1 = getLuminance(rgb.r, rgb.g, rgb.b);
      const lum2 = getLuminance(bgRgb.r, bgRgb.g, bgRgb.b);
      const ratio = getContrastRatio(lum1, lum2);
      
      if (ratio < 4.5) {
          issues.push({
            type: 'error',
            title: 'Low Contrast',
            description: `Contrast ratio is ${ratio.toFixed(2)}:1. WCAG AA requires 4.5:1.`,
            impact: ratio < 3 ? 'critical' : 'high'
          });
      }
  }

  // 2. Image alt attributes
  if (el instanceof HTMLImageElement && !el.alt) {
    issues.push({
      type: 'error',
      title: 'Missing Alt Text',
      description: 'Images without alt text are invisible to screen readers.',
      impact: 'high'
    });
  }

  // 3. Interactive elements without labels
  const isInteractive = el.tagName === 'BUTTON' || el.tagName === 'A' || el.getAttribute('role') === 'button' || el.getAttribute('tabindex') !== null;
  if (isInteractive && !el.innerText.trim() && !el.getAttribute('aria-label') && !el.getAttribute('title')) {
    issues.push({
       type: 'error',
       title: 'Empty Interactive Element',
       description: 'Buttons or links should have descriptive text or an aria-label.',
       impact: 'high'
    });
  }

  // 4. Touch Target Size (WCAG 2.1 recommends 44x44px for targets)
  if (isInteractive) {
    if (rect.width < 44 || rect.height < 44) {
      issues.push({
        type: 'warning',
        title: 'Small Touch Target',
        description: `Target size is ${Math.round(rect.width)}x${Math.round(rect.height)}px. Recommended minimum is 44x44px.`,
        impact: 'medium'
      });
    }
  }

  // 5. Font Legibility
  const fontSize = parseFloat(style.fontSize);
  if (fontSize < 12) {
    issues.push({
      type: 'warning',
      title: 'Tiny Font Size',
      description: `Font size is ${fontSize}px. Text smaller than 12px can be difficult to read.`,
      impact: 'medium'
    });
  }

  // 6. Role mismatch & Keyboard focus
  const role = el.getAttribute('role');
  if (role && el.getAttribute('tabindex') === null) {
    issues.push({
      type: 'warning',
      title: 'Missing Keyboard Support',
      description: `Elements with role="${role}" must be keyboard focusable (missing tabindex).`,
      impact: 'medium'
    });
  }

  return issues;
}
