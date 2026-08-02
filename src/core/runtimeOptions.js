/** Resolve a DPR option into a safe positive number. */
export function resolveDpr(value, devicePixelRatio = 1) {
  const automatic = Math.min(Number(devicePixelRatio) || 1, 2);
  if (value === 'auto') return automatic;
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : automatic;
}

/** Quality tiers keep reflection and geometry costs intentional. */
export const QUALITY_PRESETS = Object.freeze({
  balanced: Object.freeze({
    environmentSize: 256,
    environmentBlur: 0.006,
    transmissionResolutionScale: 1,
    radialResolution: 256,
    roundedSegments: 8,
    tubeSegments: 32,
  }),
  ultra: Object.freeze({
    environmentSize: 512,
    environmentBlur: 0.0035,
    transmissionResolutionScale: 1,
    radialResolution: 256,
    roundedSegments: 16,
    tubeSegments: 64,
  }),
});

/** Resolve a tier plus optional expert overrides into validated values. */
export function resolveQuality(options = {}) {
  const preset = options?.preset === 'balanced' ? 'balanced' : 'ultra';
  const tier = QUALITY_PRESETS[preset];
  return {
    preset,
    environmentSize: powerOfTwo(options?.environmentSize, tier.environmentSize, 64, 2048),
    environmentBlur: finiteInRange(options?.environmentBlur, tier.environmentBlur, 0, 0.1),
    transmissionResolutionScale: finiteInRange(
      options?.transmissionResolutionScale,
      tier.transmissionResolutionScale,
      0.25,
      1,
    ),
    radialResolution: integerInRange(options?.radialResolution, tier.radialResolution, 24, 512),
    roundedSegments: integerInRange(options?.roundedSegments, tier.roundedSegments, 1, 16),
    tubeSegments: integerInRange(options?.tubeSegments, tier.tubeSegments, 8, 64),
  };
}

function finiteInRange(value, fallback, min, max) {
  if (value === null || value === undefined) return fallback;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.min(max, Math.max(min, numeric)) : fallback;
}

function integerInRange(value, fallback, min, max) {
  return Math.round(finiteInRange(value, fallback, min, max));
}

function powerOfTwo(value, fallback, min, max) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return fallback;
  const rounded = 2 ** Math.round(Math.log2(numeric));
  return Math.min(max, Math.max(min, rounded));
}

/** Camera patches that intentionally replace the current framed viewpoint. */
export function cameraPatchNeedsFrame(patch) {
  if (!patch || typeof patch !== 'object') return false;
  if (['fov', 'position', 'elevation', 'azimuth', 'zoom'].some((key) => patch[key] !== undefined)) {
    return true;
  }
  const controls = patch.controls;
  return !!controls && (
    controls.minDistanceFactor !== undefined ||
    controls.maxDistanceFactor !== undefined
  );
}

/** Options that require chart meshes/materials to be reconstructed. */
export function optionPatchNeedsRebuild(patch, chartKey) {
  const geometryQualityChanged = chartKey !== 'bar' && patch.quality && (
    patch.quality.preset !== undefined ||
    patch.quality.radialResolution !== undefined ||
    patch.quality.roundedSegments !== undefined ||
    patch.quality.tubeSegments !== undefined
  );
  return (
    patch.theme !== undefined ||
    patch.material !== undefined ||
    patch.palette !== undefined ||
    patch[chartKey] !== undefined ||
    geometryQualityChanged
  );
}
