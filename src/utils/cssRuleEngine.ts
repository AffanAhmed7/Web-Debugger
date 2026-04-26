import type { CssRule } from '../types';

export function getAppliedRules(el: HTMLElement): CssRule[] {
  const rules: CssRule[] = [];
  const sheets = Array.from(document.styleSheets);

  for (const sheet of sheets) {
    try {
      const sheetRules = Array.from(sheet.cssRules) as CSSStyleRule[];
      for (const rule of sheetRules) {
        if (rule.selectorText && el.matches(rule.selectorText)) {
          const declarations: { property: string; value: string }[] = [];
          for (let i = 0; i < rule.style.length; i++) {
            const prop = rule.style[i];
            declarations.push({
              property: prop,
              value: rule.style.getPropertyValue(prop),
            });
          }

          rules.push({
            selector: rule.selectorText,
            source: sheet.href || 'inline',
            isOverridden: false, // In Phase 3 we mark all as false initially; specificity logic can be added later
            declarations,
          });
        }
      }
    } catch (e) {
      // CORS restricted sheet
      continue;
    }
  }

  return rules.reverse(); // Most recent/higher specificity usually later in sheets
}
