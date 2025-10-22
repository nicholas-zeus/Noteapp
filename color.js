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
export function textColorFor(bgHex) {
  return luminance(bgHex) > 0.5 ? '#0e1220' : '#f6f7fb';
}

// A subtle, eye-friendly default palette
export const DEFAULT_CATEGORIES = [
  { id: crypto.randomUUID(), name: 'Ideas', color: '#FFE8A3' },
  { id: crypto.randomUUID(), name: 'Work',  color: '#CDE7FF' },
  { id: crypto.randomUUID(), name: 'Personal', color: '#D9F2E6' },
  { id: crypto.randomUUID(), name: 'Learn', color: '#F2D7F9' }
];