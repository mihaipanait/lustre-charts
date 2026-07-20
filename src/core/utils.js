/**
 * @module core/utils
 * Small dependency-free helpers shared across the library.
 */

/** @param {*} v */
export function isPlainObject(v) {
  return v !== null && typeof v === 'object' && (v.constructor === Object || v.constructor === undefined);
}

/**
 * Recursively merge `source` into a deep clone of `target`.
 * Arrays and non-plain objects (colors, vectors, functions…) are replaced, not merged.
 * @template T
 * @param {T} target
 * @param {...object} sources
 * @returns {T}
 */
export function deepMerge(target, ...sources) {
  const out = isPlainObject(target) ? { ...target } : target;
  for (const source of sources) {
    if (!isPlainObject(source)) continue;
    for (const key of Object.keys(source)) {
      const sv = source[key];
      if (sv === undefined) continue;
      const tv = out[key];
      out[key] = isPlainObject(tv) && isPlainObject(sv) ? deepMerge(tv, sv) : (isPlainObject(sv) ? deepMerge({}, sv) : sv);
    }
  }
  return out;
}

/** @param {number} v @param {number} min @param {number} max */
export function clamp(v, min, max) {
  return v < min ? min : v > max ? max : v;
}

/** @param {number} a @param {number} b @param {number} t */
export function lerp(a, b, t) {
  return a + (b - a) * t;
}

/**
 * Frame-rate independent exponential smoothing.
 * @param {number} current @param {number} target
 * @param {number} lambda smoothing speed (~8–20 feels snappy)
 * @param {number} dt delta time in seconds
 */
export function damp(current, target, lambda, dt) {
  return lerp(current, target, 1 - Math.exp(-lambda * dt));
}

/** Round `v` to a "nice" number (1, 2, 2.5, 5 × 10^n) for axis ticks. */
export function niceNumber(v, round = true) {
  if (v === 0) return 0;
  const exp = Math.floor(Math.log10(Math.abs(v)));
  const f = Math.abs(v) / 10 ** exp;
  let nf;
  if (round) nf = f < 1.5 ? 1 : f < 3 ? 2 : f < 4.5 ? 2.5 : f < 7 ? 5 : 10;
  else nf = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10;
  return Math.sign(v) * nf * 10 ** exp;
}

/**
 * Compact human formatting: 1234567 → "1.23M".
 * @param {number} v @param {number} [digits]
 */
export function formatCompact(v, digits = 2) {
  const abs = Math.abs(v);
  if (abs >= 1e9) return trimZeros((v / 1e9).toFixed(digits)) + 'B';
  if (abs >= 1e6) return trimZeros((v / 1e6).toFixed(digits)) + 'M';
  if (abs >= 1e3) return trimZeros((v / 1e3).toFixed(digits)) + 'K';
  return trimZeros(v.toFixed(abs < 10 && !Number.isInteger(v) ? 1 : 0));
}

function trimZeros(s) {
  return s.includes('.') ? s.replace(/\.?0+$/, '') : s;
}

/* ------------------------------------------------------------------ */
/* Color helpers (CSS side — WebGL colors go through THREE.Color)      */
/* ------------------------------------------------------------------ */

/**
 * Parse a hex color (`#rgb`, `#rrggbb`) to `{ r, g, b }` in 0–255.
 * @param {string} hex
 */
export function hexToRgb(hex) {
  let h = hex.replace('#', '').trim();
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

/**
 * CSS `rgba()` string from a hex color and alpha.
 * @param {string} hex @param {number} alpha
 */
export function cssRGBA(hex, alpha = 1) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Relative luminance (0–1) of a hex color, for contrast decisions. */
export function luminanceOf(hex) {
  const { r, g, b } = hexToRgb(hex);
  const f = (c) => {
    c /= 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

/** Convert HSL (h in degrees, s/l in 0–1) to a hex string. */
export function hslToHex(h, s, l) {
  h = ((h % 360) + 360) % 360;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => {
    const k = (n + h / 30) % 12;
    const c = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(255 * c).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

/** Hex → {h (deg), s (0–1), l (0–1)} */
export function hexToHsl(hex) {
  let { r, g, b } = hexToRgb(hex);
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  switch (max) {
    case r: h = ((g - b) / d + (g < b ? 6 : 0)) * 60; break;
    case g: h = ((b - r) / d + 2) * 60; break;
    default: h = ((r - g) / d + 4) * 60;
  }
  return { h, s, l };
}

/**
 * Ensure `count` colors: repeats the base palette, shifting lightness and hue
 * slightly on each pass so large datasets stay distinguishable.
 * @param {string[]} palette
 * @param {number} count
 * @returns {string[]}
 */
export function extendPalette(palette, count) {
  if (palette.length >= count) return palette.slice(0, count);
  const out = [...palette];
  let pass = 1;
  while (out.length < count) {
    const src = palette[out.length % palette.length];
    const { h, s, l } = hexToHsl(src);
    out.push(hslToHex(h + pass * 14, clamp(s * 0.95, 0, 1), clamp(l + (pass % 2 ? 0.12 : -0.1), 0.15, 0.85)));
    if (out.length % palette.length === 0) pass++;
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* DOM helpers                                                         */
/* ------------------------------------------------------------------ */

/**
 * Create a DOM element with props and styles.
 * @param {string} tag
 * @param {{ [k: string]: any, style?: object }} [props]
 * @param {HTMLElement} [parent]
 */
export function el(tag, props = {}, parent) {
  const node = document.createElement(tag);
  const { style, ...rest } = props;
  Object.assign(node, rest);
  if (style) Object.assign(node.style, style);
  if (parent) parent.appendChild(node);
  return node;
}

const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * Create an SVG element with attributes.
 * @param {string} tag
 * @param {object} [attrs]
 * @param {Element} [parent]
 */
export function svgEl(tag, attrs = {}, parent) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  if (parent) parent.appendChild(node);
  return node;
}

/** Dispose a three.js object tree: geometries + materials (not textures shared elsewhere). */
export function disposeObject3D(root) {
  root.traverse((obj) => {
    if (obj.geometry) obj.geometry.dispose();
    if (obj.material) {
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      for (const m of mats) m.dispose();
    }
  });
}
