import type { A11yIssue } from '../types';

export function auditAccessibility(el: HTMLElement): A11yIssue[] {
  const issues: A11yIssue[] = [];
  const style = window.getComputedStyle(el);

  // 1. Basic Contrast Check (Simplistic)
  // Higher level check would require relative luminance calculation
  const color = style.color;
  const bgColor = style.backgroundColor;
  if (color === bgColor && bgColor !== 'rgba(0, 0, 0, 0)') {
      issues.push({
        type: 'error',
        title: 'Zero Contrast',
        description: 'Text color matches background color.',
        impact: 'critical'
      });
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
  if ((el.tagName === 'BUTTON' || el.tagName === 'A') && !el.innerText.trim() && !el.getAttribute('aria-label')) {
    issues.push({
       type: 'warning',
       title: 'Empty Interactive Element',
       description: 'Buttons or links should have descriptive text or an aria-label.',
       impact: 'medium'
    });
  }

  // 4. Role mismatch
  const role = el.getAttribute('role');
  if (role && el.tagName === 'DIV' && !el.getAttribute('tabindex')) {
    issues.push({
      type: 'warning',
      title: 'Missing Tabindex',
      description: 'Elements with interactive roles must be keyboard focusable.',
      impact: 'medium'
    });
  }

  return issues;
}
