import test from 'node:test';
import assert from 'node:assert/strict';

import {
  cameraPatchNeedsFrame,
  optionPatchNeedsRebuild,
  resolveDpr,
  resolveQuality,
} from '../src/core/runtimeOptions.js';

test('resolves automatic and explicit device pixel ratios safely', () => {
  assert.equal(resolveDpr('auto', 3), 2);
  assert.equal(resolveDpr('auto', 1.25), 1.25);
  assert.equal(resolveDpr(1.5, 3), 1.5);
  assert.equal(resolveDpr(0, 1.5), 1.5);
  assert.equal(resolveDpr('invalid', 1.5), 1.5);
});

test('identifies camera patches that intentionally replace the viewpoint', () => {
  assert.equal(cameraPatchNeedsFrame({ fov: 52 }), true);
  assert.equal(cameraPatchNeedsFrame({ position: [1, 2, 3] }), true);
  assert.equal(cameraPatchNeedsFrame({ controls: { minDistanceFactor: 0.75 } }), true);
  assert.equal(cameraPatchNeedsFrame({ autoRotate: true }), false);
  assert.equal(cameraPatchNeedsFrame({ controls: { enableZoom: false } }), false);
});

test('resolves balanced and ultra quality tiers with safe expert overrides', () => {
  assert.deepEqual(resolveQuality({ preset: 'balanced' }), {
    preset: 'balanced',
    environmentSize: 256,
    environmentBlur: 0.006,
    transmissionResolutionScale: 1,
    radialResolution: 256,
    roundedSegments: 8,
    tubeSegments: 32,
  });
  assert.deepEqual(resolveQuality({ preset: 'ultra' }), {
    preset: 'ultra',
    environmentSize: 512,
    environmentBlur: 0.0035,
    transmissionResolutionScale: 1,
    radialResolution: 256,
    roundedSegments: 16,
    tubeSegments: 64,
  });
  const custom = resolveQuality({
    environmentSize: 3000,
    environmentBlur: -1,
    transmissionResolutionScale: 2,
    radialResolution: 999,
    roundedSegments: 0,
    tubeSegments: 999,
  });
  assert.equal(custom.environmentSize, 2048);
  assert.equal(custom.environmentBlur, 0);
  assert.equal(custom.transmissionResolutionScale, 1);
  assert.equal(custom.radialResolution, 512);
  assert.equal(custom.roundedSegments, 1);
  assert.equal(custom.tubeSegments, 64);
  assert.equal(resolveQuality({ environmentSize: 64 }).environmentSize, 64);
});

test('rebuilds only options that change chart meshes or materials', () => {
  assert.equal(optionPatchNeedsRebuild({ theme: 'light' }, 'pie'), true);
  assert.equal(optionPatchNeedsRebuild({ material: 'metal' }, 'pie'), true);
  assert.equal(optionPatchNeedsRebuild({ palette: 'ocean' }, 'pie'), true);
  assert.equal(optionPatchNeedsRebuild({ pie: { innerRadius: 1 } }, 'pie'), true);
  assert.equal(optionPatchNeedsRebuild({ radial: { ringGap: 0.12 } }, 'radial'), true);
  assert.equal(optionPatchNeedsRebuild({ bar: { maxHeight: 4 } }, 'bar'), true);
  assert.equal(optionPatchNeedsRebuild({ quality: { dpr: 1 } }, 'pie'), false);
  assert.equal(optionPatchNeedsRebuild({ quality: { environmentSize: 512 } }, 'pie'), false);
  assert.equal(optionPatchNeedsRebuild({ quality: { preset: 'balanced' } }, 'pie'), true);
  assert.equal(optionPatchNeedsRebuild({ quality: { radialResolution: 144 } }, 'radial'), true);
  assert.equal(optionPatchNeedsRebuild({ quality: { roundedSegments: 12 } }, 'bar'), false);
  assert.equal(optionPatchNeedsRebuild({ labels: { show: false } }, 'bar'), false);
});
