// Color & contrast utilities + default categories
export function hexToRgb(hex) {
  const h = hex.replace('#','');
  const bigint = parseInt(h.length === 3 ? h.split('').map(x => x+x).join('') : h, 16);
  return { r: (bigint>>16)&255, g: (bigint>>8)&255, b: bigint&255 };
}
export function luminance(hex) {
  const {r,g,b} = hexToRgb(hex);
  const a = [r,g,b].map(v => {
    v /= 255;
    return v <= 0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055, 2.4);
  });
  return 0.2126*a[0] + 0.7152*a[1] + 0.0722*a[2];
}
// color.js
export function textColorFor(bgColor) {
  if (!bgColor) return '#000';

  // Convert hex to RGB
  let c = bgColor.substring(1); // remove #
  if (c.length === 3) c = c.split('').map(x => x + x).join('');
  const r = parseInt(c.substr(0, 2), 16) / 255;
  const g = parseInt(c.substr(2, 2), 16) / 255;
  const b = parseInt(c.substr(4, 2), 16) / 255;

  // Calculate luminance
  const l = 0.2126 * Math.pow(r <= 0.03928 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4), 1)
          + 0.7152 * Math.pow(g <= 0.03928 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4), 1)
          + 0.0722 * Math.pow(b <= 0.03928 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4), 1);

  // Contrast threshold
  return l > 0.5 ? '#000000' : '#ffffff';
}

// A subtle, eye-friendly default palette
export const DEFAULT_CATEGORIES = [
  { id: crypto.randomUUID(), name: 'Ideas', color: '#FFE8A3' },
  { id: crypto.randomUUID(), name: 'Work',  color: '#CDE7FF' },
  { id: crypto.randomUUID(), name: 'Personal', color: '#D9F2E6' },
  { id: crypto.randomUUID(), name: 'Learn', color: '#F2D7F9' }
];