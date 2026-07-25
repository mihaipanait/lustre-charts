/** Resolve a DPR option into a safe positive number. */
export function resolveDpr(value, devicePixelRatio = 1) {
  const automatic = Math.min(Number(devicePixelRatio) || 1, 2);
  if (value === 'auto') return automatic;
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : automatic;
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
  return (
    patch.theme !== undefined ||
    patch.material !== undefined ||
    patch.palette !== undefined ||
    patch[chartKey] !== undefined
  );
}
