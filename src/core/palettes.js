/**
 * @module core/palettes
 * Curated color palettes. Each is designed to look good on both dark and
 * light themes and to flatter the material presets (saturated mids for
 * glossy/neon, desaturated warms/cools for metal, soft tints for matte).
 */

import { extendPalette } from './utils.js';

/** @type {Record<string, string[]>} */
export const PALETTES = {
  /** Teal → blue → violet → magenta. The signature look. */
  aurora: ['#00e5ff', '#2e8bff', '#7c4dff', '#d24dff', '#ff4d9e', '#ff8a5c'],
  /** Electric primaries for neon/bloom scenes. */
  neon: ['#00f0ff', '#ff2ec4', '#b3ff2e', '#ffb300', '#7a5cff', '#2eff8a'],
  /** Gold, silver, copper, graphite, champagne — for the metal preset. */
  metal: ['#f2c14e', '#dfe5ea', '#e8926c', '#8d9ba7', '#f3e3c3', '#6b7a88'],
  /** Bright candy gloss. */
  candy: ['#ff5e7a', '#ffb545', '#ffe14d', '#4dde8e', '#39c2ff', '#b06bff'],
  /** Cool aquatic ramp. */
  ocean: ['#0affd9', '#00c2ff', '#2979ff', '#5e6bff', '#9557ff', '#c777ff'],
  /** Warm dusk ramp. */
  sunset: ['#ffd166', '#ff9e4d', '#ff6b6b', '#e84393', '#a55eea', '#5f5bd6'],
  /** Purple monochrome with depth. */
  violet: ['#e0c3fc', '#b08cff', '#8c6bff', '#6a4cff', '#4b3bd9', '#332da8'],
  /** Slate monochrome — serious dashboards. */
  mono: ['#dbe6f4', '#a9c0d8', '#7d9cbc', '#587aa0', '#3c5b82', '#274063'],
};

/**
 * Resolve a palette option into a concrete color array of length `count`.
 * @param {string | string[] | undefined} palette name, custom array, or undefined
 * @param {number} count how many colors are needed
 * @param {string} [fallback] palette name used when `palette` is unknown
 * @returns {string[]}
 */
export function resolvePalette(palette, count, fallback = 'aurora') {
  let base;
  if (Array.isArray(palette) && palette.length > 0) base = palette;
  else if (typeof palette === 'string' && PALETTES[palette]) base = PALETTES[palette];
  else base = PALETTES[fallback];
  return extendPalette(base, count);
}
