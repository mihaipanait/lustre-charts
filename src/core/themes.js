/**
 * @module core/themes
 * Themes control everything that is *not* the chart material: scene
 * background, lighting rig, overlay (label / tooltip / legend) colors and
 * decoration tints. A theme is a plain object — pass your own or extend
 * a built-in via `options.theme = { ...LustreThemes.dark, ... }`.
 */

/**
 * @typedef {object} LustreTheme
 * @property {string} name
 * @property {'dark' | 'light'} kind             hint for material/bloom tuning
 * @property {{ inner: string, outer: string } | string | 'transparent'} background
 *   Radial gradient (rendered as an in-scene texture), flat color, or transparent.
 * @property {string} textColor                  primary overlay text
 * @property {string} mutedTextColor             secondary overlay text
 * @property {string} lineColor                  callout leader lines
 * @property {string} accentColor                UI accents (legend hover…)
 * @property {{ background: string, border: string, text: string, shadow: string }} tooltip
 * @property {number} exposure                   tone-mapping exposure
 * @property {number} envIntensity               environment reflection strength
 * @property {{ ambient: number, key: number, fill: number, rim: number, keyColor: string, fillColor: string, rimColor: string }} lights
 * @property {string} gridColor                  decoration: floor grid tint
 * @property {string} ringColor                  decoration: HUD ring tint
 * @property {number} shadowOpacity              contact shadow strength (0–1)
 * @property {number} bloomThreshold             luminance threshold for bloom
 */

/** @type {Record<string, LustreTheme>} */
export const THEMES = {
  dark: {
    name: 'dark',
    kind: 'dark',
    background: { inner: '#141a2e', outer: '#06080f' },
    textColor: '#e8edf7',
    mutedTextColor: '#8b94ad',
    lineColor: '#aab3c9',
    accentColor: '#00e5ff',
    tooltip: {
      background: 'rgba(16, 21, 38, 0.72)',
      border: 'rgba(255, 255, 255, 0.14)',
      text: '#eef2fb',
      shadow: '0 12px 40px rgba(0, 0, 0, 0.55)',
    },
    exposure: 1.0,
    envIntensity: 0.75,
    lights: {
      ambient: 0.3,
      key: 1.15,
      fill: 0.38,
      rim: 0.85,
      keyColor: '#ffffff',
      fillColor: '#7ab8ff',
      rimColor: '#8f7aff',
    },
    gridColor: '#3d5afe',
    ringColor: '#00e5ff',
    shadowOpacity: 0.55,
    bloomThreshold: 0.78,
  },

  light: {
    name: 'light',
    kind: 'light',
    background: { inner: '#ffffff', outer: '#dfe6f2' },
    textColor: '#232a3a',
    mutedTextColor: '#6a7590',
    lineColor: '#7c8699',
    accentColor: '#4834d4',
    tooltip: {
      background: 'rgba(255, 255, 255, 0.78)',
      border: 'rgba(35, 42, 58, 0.12)',
      text: '#1c2333',
      shadow: '0 12px 40px rgba(30, 40, 70, 0.18)',
    },
    exposure: 0.98,
    envIntensity: 0.7,
    lights: {
      ambient: 0.52,
      key: 1.35,
      fill: 0.5,
      rim: 0.35,
      keyColor: '#ffffff',
      fillColor: '#dfeaff',
      rimColor: '#ffffff',
    },
    gridColor: '#8ea2c8',
    ringColor: '#5b6bd6',
    shadowOpacity: 0.28,
    bloomThreshold: 0.92,
  },
};

/**
 * Resolve a theme option (name or partial/full object) into a theme object.
 * Partial objects are merged over the `dark` theme (or the base they name
 * via `extends: 'light'`).
 * @param {string | Partial<LustreTheme> & { extends?: string } | undefined} theme
 * @returns {LustreTheme}
 */
export function resolveTheme(theme) {
  if (typeof theme === 'string') return THEMES[theme] || THEMES.dark;
  if (theme && typeof theme === 'object') {
    const base = THEMES[theme.extends] || THEMES[theme.name] || THEMES.dark;
    return mergeTheme(base, theme);
  }
  return THEMES.dark;
}

function mergeTheme(base, patch) {
  return {
    ...base,
    ...patch,
    tooltip: { ...base.tooltip, ...(patch.tooltip || {}) },
    lights: { ...base.lights, ...(patch.lights || {}) },
  };
}
