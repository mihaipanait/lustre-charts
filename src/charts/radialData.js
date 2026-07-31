/**
 * Data normalization and layout helpers for concentric radial charts.
 * Kept independent from Three.js so the public data contract and the label
 * collision pass can be covered with fast unit tests.
 */

const EPS = 1e-6;

/**
 * Normalize the supported radial-chart input shapes.
 * Values remain in their original units; the renderer maps them against
 * `radial.maxValue` and clamps only the visual percentage.
 *
 * @param {*} data
 * @returns {Array<{label: any, value: number, color?: string, material?: any}>}
 */
export function normalizeRadialData(data) {
  let raw;
  if (Array.isArray(data)) {
    raw = data.map((entry, index) => {
      if (typeof entry === 'number') return { label: `Item ${index + 1}`, value: entry };
      if (!entry || typeof entry !== 'object') {
        throw new Error('[lustre-charts] radial data items must be numbers or objects');
      }
      return { label: entry.label ?? `Item ${index + 1}`, ...entry };
    });
  } else if (data && Array.isArray(data.values)) {
    raw = data.values.map((value, index) => ({
      label: data.labels?.[index] ?? `Item ${index + 1}`,
      value,
      color: data.colors?.[index],
    }));
  } else {
    throw new Error('[lustre-charts] radial data must be an array or { labels, values }');
  }

  return raw.map((entry) => ({
    label: entry.label,
    value: Math.max(0, Number(entry.value) || 0),
    color: entry.color,
    material: entry.material,
  }));
}

/** Resolve and validate the value represented by a complete ring. */
export function resolveRadialMax(value) {
  const max = Number(value);
  if (!Number.isFinite(max) || max <= 0) {
    throw new Error('[lustre-charts] radial.maxValue must be a finite number greater than zero');
  }
  return max;
}

/** Return a value's independently normalized 0–1 radial fraction. */
export function radialFraction(value, maxValue) {
  const max = resolveRadialMax(maxValue);
  const numeric = Math.max(0, Number(value) || 0);
  return Math.min(1, numeric / max);
}

/**
 * Divide an annulus into equal, non-overlapping bands. Data order is
 * innermost to outermost so legends and callouts follow the visual stack.
 *
 * @param {number} count
 * @param {{ innerRadius: number, radius: number, ringGap: number }} options
 * @returns {Array<{innerRadius:number, outerRadius:number, centerRadius:number, width:number}>}
 */
export function computeRadialBands(count, options) {
  if (!Number.isInteger(count) || count < 0) {
    throw new Error('[lustre-charts] radial ring count must be a non-negative integer');
  }
  if (count === 0) return [];

  const radius = Number(options.radius);
  const innerRadius = Math.max(0, Number(options.innerRadius));
  const ringGap = Math.max(0, Number(options.ringGap));
  if (!Number.isFinite(radius) || radius <= EPS) {
    throw new Error('[lustre-charts] radial.radius must be a finite number greater than zero');
  }
  if (!Number.isFinite(innerRadius) || innerRadius >= radius - EPS) {
    throw new Error('[lustre-charts] radial.innerRadius must be finite and smaller than radial.radius');
  }
  if (!Number.isFinite(ringGap)) {
    throw new Error('[lustre-charts] radial.ringGap must be a finite non-negative number');
  }

  const width = (radius - innerRadius - ringGap * (count - 1)) / count;
  if (width <= EPS) {
    throw new Error(
      '[lustre-charts] radial rings need positive width; reduce radial.innerRadius, radial.ringGap, or the item count'
    );
  }

  return Array.from({ length: count }, (_, index) => {
    const inner = innerRadius + index * (width + ringGap);
    const outer = inner + width;
    return {
      innerRadius: inner,
      outerRadius: outer,
      centerRadius: (inner + outer) / 2,
      width,
    };
  });
}

/**
 * Fit a custom cross-section into one radial band. Pie profiles use absolute
 * radii; radial profiles are repeated, so normalizing their own bounds keeps
 * the same silhouette on every ring without making the rings overlap.
 *
 * @param {{x:number,y:number}[]} points
 * @param {{innerRadius:number, outerRadius:number, height:number}} dimensions
 */
export function fitRadialProfile(points, dimensions) {
  if (!Array.isArray(points) || points.length < 3) {
    throw new Error('[lustre-charts] custom radial profile needs at least 3 points');
  }
  const finite = points.every((point) =>
    point && Number.isFinite(point.x) && Number.isFinite(point.y)
  );
  if (!finite) throw new Error('[lustre-charts] custom radial profile points must be finite');

  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const spanX = maxX - minX, spanY = maxY - minY;
  if (spanX <= EPS || spanY <= EPS) {
    throw new Error('[lustre-charts] custom radial profile must span both radius and height');
  }

  const radialSpan = dimensions.outerRadius - dimensions.innerRadius;
  return points.map((point) => ({
    x: dimensions.innerRadius + ((point.x - minX) / spanX) * radialSpan,
    y: ((point.y - minY) / spanY - 0.5) * dimensions.height,
  }));
}

/**
 * Resolve desired label rows into a collision-free vertical lane while
 * preserving their visual order. Returned positions match the input order.
 */
export function distributeLabelYs(desired, minY, maxY, requestedGap) {
  if (!desired.length) return [];
  if (desired.length === 1) return [clamp(desired[0], minY, maxY)];

  const available = Math.max(0, maxY - minY);
  const gap = Math.min(Math.max(0, requestedGap), available / (desired.length - 1));
  const sorted = desired
    .map((value, index) => ({ value: clamp(value, minY, maxY), index }))
    .sort((a, b) => a.value - b.value || a.index - b.index);

  const positions = new Array(sorted.length);
  positions[0] = sorted[0].value;
  for (let index = 1; index < sorted.length; index++) {
    positions[index] = Math.max(sorted[index].value, positions[index - 1] + gap);
  }

  if (positions.at(-1) > maxY) {
    positions[positions.length - 1] = maxY;
    for (let index = positions.length - 2; index >= 0; index--) {
      positions[index] = Math.min(positions[index], positions[index + 1] - gap);
    }
  }
  if (positions[0] < minY) {
    const shift = minY - positions[0];
    for (let index = 0; index < positions.length; index++) positions[index] += shift;
  }

  const result = new Array(desired.length);
  sorted.forEach((entry, index) => {
    result[entry.index] = positions[index];
  });
  return result;
}

function clamp(value, min, max) {
  return value < min ? min : value > max ? max : value;
}
