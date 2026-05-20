export function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map(c => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

export function getContrastRatio(l1: number, l2: number): number {
  const brighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (brighter + 0.05) / (darker + 0.05);
}

export function parseRgb(color: string): { r: number, g: number, b: number, a: number } | null {
  const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  if (!match) return null;
  return {
    r: parseInt(match[1]),
    g: parseInt(match[2]),
    b: parseInt(match[3]),
    a: match[4] ? parseFloat(match[4]) : 1
  };
}

export function suggestAccessibleColor(bgColor: string): string {
  const bg = parseRgb(bgColor);
  if (!bg) return '#000000';

  // For transparent backgrounds, assume black or white based on light/dark mode preference or just black
  if (bg.a < 0.1) return '#000000';

  const bgLum = getLuminance(bg.r, bg.g, bg.b);
  
  // Decide between pure black and pure white first
  const whiteLum = 1;
  const blackLum = 0;
  
  const whiteRatio = getContrastRatio(whiteLum, bgLum);
  const blackRatio = getContrastRatio(blackLum, bgLum);

  if (whiteRatio > blackRatio) {
    return '#ffffff';
  } else {
    return '#000000';
  }
}
