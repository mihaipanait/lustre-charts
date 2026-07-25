import test from 'node:test';
import assert from 'node:assert/strict';

import {
  cameraPatchNeedsFrame,
  optionPatchNeedsRebuild,
  resolveDpr,
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

test('rebuilds only options that change chart meshes or materials', () => {
  assert.equal(optionPatchNeedsRebuild({ theme: 'light' }, 'pie'), true);
  assert.equal(optionPatchNeedsRebuild({ material: 'metal' }, 'pie'), true);
  assert.equal(optionPatchNeedsRebuild({ palette: 'ocean' }, 'pie'), true);
  assert.equal(optionPatchNeedsRebuild({ pie: { innerRadius: 1 } }, 'pie'), true);
  assert.equal(optionPatchNeedsRebuild({ bar: { maxHeight: 4 } }, 'bar'), true);
  assert.equal(optionPatchNeedsRebuild({ quality: { dpr: 1 } }, 'pie'), false);
  assert.equal(optionPatchNeedsRebuild({ labels: { show: false } }, 'bar'), false);
});
