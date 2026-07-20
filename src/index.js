/**
 * Lustre — gorgeous, configurable 3D charts for the web.
 *
 * In mineralogy, "lustre" names the ways light plays on a surface:
 * metallic, vitreous, adamantine. This library brings those finishes to
 * your data. Built on three.js; zero other dependencies.
 *
 * @example
 * import { LustreChart } from 'lustre-charts';
 *
 * const chart = new LustreChart('#app', {
 *   type: 'donut',
 *   data: [
 *     { label: 'Chrome', value: 64 },
 *     { label: 'Safari', value: 19 },
 *     { label: 'Edge', value: 9 },
 *     { label: 'Firefox', value: 8 },
 *   ],
 *   options: { material: 'glass', theme: 'dark', palette: 'aurora' },
 * });
 */

import { PieChart } from './charts/PieChart.js';
import { BarChart } from './charts/BarChart.js';
import { THEMES } from './core/themes.js';
import { PALETTES } from './core/palettes.js';
import { MATERIAL_PRESETS } from './materials/materials.js';
import { Easings } from './core/Tween.js';
import { DEFAULT_OPTIONS } from './core/defaults.js';

/** Library version (kept in sync with package.json). */
export const VERSION = '0.1.0';

/** @type {Record<string, any>} */
const REGISTRY = {
  pie: PieChart,
  donut: PieChart,
  bar: BarChart,
};

/**
 * Chart factory. `new LustreChart(container, { type, data, options })`
 * returns the concrete chart instance for `type`.
 *
 * @param {HTMLElement | string} container element or CSS selector
 * @param {{ type?: 'pie' | 'donut' | 'bar', data: any, options?: object }} config
 */
export class LustreChart {
  constructor(container, config = {}) {
    const type = config.type || 'pie';
    const ChartCtor = REGISTRY[type];
    if (!ChartCtor) {
      throw new Error(
        `[lustre-charts] unknown chart type "${type}". Registered: ${Object.keys(REGISTRY).join(', ')}`
      );
    }
    const el = typeof container === 'string' ? document.querySelector(container) : container;
    if (!el) throw new Error(`[lustre-charts] container not found: ${container}`);
    // Constructor returns the concrete chart — LustreChart is a factory.
    return new ChartCtor(el, { ...config, type });
  }

  /**
   * Register a custom chart type (must extend BaseChart).
   * @param {string} type
   * @param {any} ChartCtor
   */
  static register(type, ChartCtor) {
    REGISTRY[type] = ChartCtor;
  }
}

export { PieChart, BarChart };
export { BaseChart } from './core/BaseChart.js';
export { THEMES as LustreThemes };
export { PALETTES as LustrePalettes };
export { MATERIAL_PRESETS };
export { Easings };
export { DEFAULT_OPTIONS };
export { buildProfile, buildSliceGeometry } from './geometry/sliceGeometry.js';
export { createItemMaterial } from './materials/materials.js';

export default LustreChart;
