/**
 * Normalize the supported bar-chart input shapes without depending on Three.js.
 * Keeping this logic separate also makes the data-update contract easy to test.
 *
 * @param {*} data
 * @returns {{ categories: any[], series: Array<{name: any, values: number[], color?: string, colors?: Array<string | undefined>, material?: any}> }}
 */
export function normalizeBarData(data) {
  let categories, series;
  if (Array.isArray(data)) {
    const rows = data.map((d, i) =>
      typeof d === 'number' ? { label: `Item ${i + 1}`, value: d } : { label: d.label ?? `Item ${i + 1}`, ...d }
    );
    categories = rows.map((r) => r.label);
    series = [{
      name: 'Series 1',
      values: rows.map((r) => Math.max(0, Number(r.value) || 0)),
      colors: rows.map((r) => r.color),
    }];
  } else if (data && Array.isArray(data.categories) && Array.isArray(data.series)) {
    categories = [...data.categories];
    series = data.series.map((s, i) => ({
      name: s.name ?? `Series ${i + 1}`,
      values: categories.map((_, c) => Math.max(0, Number(s.values?.[c]) || 0)),
      color: s.color,
      material: s.material,
    }));
  } else {
    throw new Error('[lustre-charts] bar data must be an array or { categories, series }');
  }
  return { categories, series };
}

/**
 * Whether an existing bar scene can be safely reused for a value-only update.
 * Labels, colors, and material changes require a rebuild because they are
 * captured by meshes, materials, legends, and tooltips.
 *
 * @param {ReturnType<typeof normalizeBarData> | undefined} prev
 * @param {ReturnType<typeof normalizeBarData>} next
 */
export function canRetargetBarData(prev, next) {
  if (!prev || prev.categories.length !== next.categories.length || prev.series.length !== next.series.length) {
    return false;
  }
  if (!sameArray(prev.categories, next.categories)) return false;

  return prev.series.every((oldSeries, i) => {
    const newSeries = next.series[i];
    return (
      oldSeries.name === newSeries.name &&
      oldSeries.color === newSeries.color &&
      sameArray(oldSeries.colors, newSeries.colors) &&
      sameMaterial(oldSeries.material, newSeries.material)
    );
  });
}

function sameArray(a, b) {
  if (a === b) return true;
  if (!a || !b || a.length !== b.length) return false;
  return a.every((value, i) => value === b[i]);
}

function sameMaterial(a, b) {
  if (a === b) return true;
  if (!isPlainObject(a) || !isPlainObject(b)) return false;
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  return aKeys.every((key) => bKeys.includes(key) && sameMaterial(a[key], b[key]));
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && (value.constructor === Object || value.constructor === undefined);
}
