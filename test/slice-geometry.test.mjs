import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildProfile,
  buildSliceGeometry,
} from '../src/geometry/sliceGeometry.js';

const dimensions = {
  innerRadius: 1.4,
  radius: 3,
  height: 1.2,
  cornerRadius: 0.16,
};

function signedArea(points) {
  return points.reduce((sum, point, index) => {
    const next = points[(index + 1) % points.length];
    return sum + point.x * next.y - next.x * point.y;
  }, 0) / 2;
}

function assertFiniteAttribute(attribute) {
  for (const value of attribute.array) {
    assert.equal(Number.isFinite(value), true);
  }
}

test('profile presets produce closed finite strips and valid cap contours', () => {
  for (const preset of ['auto', 'straight', 'rounded', 'pillow', 'tube']) {
    const profile = buildProfile(preset, dimensions);
    assert.ok(profile.points.length >= 3, preset);
    assert.ok(profile.capContour.length >= 3, preset);
    assert.ok(signedArea(profile.capContour) > 0, preset);
    const first = profile.points[0];
    const last = profile.points.at(-1);
    assert.ok(Math.abs(first.x - last.x) < 1e-6, preset);
    assert.ok(Math.abs(first.y - last.y) < 1e-6, preset);
    for (const point of profile.points) {
      assert.equal(Number.isFinite(point.x), true, preset);
      assert.equal(Number.isFinite(point.y), true, preset);
      assert.equal(Number.isFinite(point.nx), true, preset);
      assert.equal(Number.isFinite(point.ny), true, preset);
    }
  }
});

test('quality segment controls increase curved profile and revolution density', () => {
  const balancedRounded = buildProfile('rounded', dimensions, { roundedSegments: 8 });
  const ultraRounded = buildProfile('rounded', dimensions, { roundedSegments: 16 });
  const balancedTube = buildProfile('tube', dimensions, { tubeSegments: 32 });
  const ultraTube = buildProfile('tube', dimensions, { tubeSegments: 64 });
  assert.ok(ultraRounded.points.length > balancedRounded.points.length);
  assert.ok(ultraTube.points.length > balancedTube.points.length);

  const balancedGeometry = buildSliceGeometry(balancedRounded, 0, Math.PI * 2, { radialResolution: 256 });
  const ultraGeometry = buildSliceGeometry(ultraRounded, 0, Math.PI * 2, { radialResolution: 512 });
  assert.ok(ultraGeometry.getAttribute('position').count > balancedGeometry.getAttribute('position').count);
  balancedGeometry.dispose();
  ultraGeometry.dispose();
});

test('custom profiles normalize winding and explicit closure', () => {
  const clockwiseWithClosure = [
    { x: 1, y: -0.5 },
    { x: 1, y: 0.5 },
    { x: 3, y: 0.5 },
    { x: 3, y: -0.5 },
    { x: 1, y: -0.5 },
  ];
  const profile = buildProfile(clockwiseWithClosure, dimensions);
  assert.equal(profile.capContour.length, 4);
  assert.ok(signedArea(profile.capContour) > 0);
  assert.deepEqual(
    { x: profile.points[0].x, y: profile.points[0].y },
    { x: profile.points.at(-1).x, y: profile.points.at(-1).y },
  );
});

test('malformed profiles fail with actionable errors', () => {
  assert.throws(
    () => buildProfile([{ x: 1, y: 0 }, { x: 2, y: 0 }], dimensions),
    /at least 3 points/,
  );
  assert.throws(
    () => buildProfile([
      { x: 1, y: 0 },
      { x: Number.NaN, y: 1 },
      { x: 2, y: 0 },
    ], dimensions),
    /finite x and y/,
  );
  assert.throws(
    () => buildProfile([
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 3, y: 0 },
    ], dimensions),
    /non-zero enclosed area/,
  );
  assert.throws(
    () => buildProfile('unknown', dimensions),
    /unknown profile/,
  );
  assert.throws(
    () => buildProfile('rounded', { ...dimensions, radius: 0 }),
    /greater than zero/,
  );
});

test('slice geometry has finite attributes and in-range indices', () => {
  const profile = buildProfile('rounded', dimensions);
  for (const length of [0, Math.PI / 3, Math.PI * 2]) {
    const geometry = buildSliceGeometry(profile, -Math.PI / 2, length, {
      radialResolution: 48,
    });
    const position = geometry.getAttribute('position');
    const normal = geometry.getAttribute('normal');
    const uv = geometry.getAttribute('uv');
    assert.ok(position.count > 0);
    assert.equal(position.count, normal.count);
    assert.equal(position.count, uv.count);
    assertFiniteAttribute(position);
    assertFiniteAttribute(normal);
    assertFiniteAttribute(uv);
    for (const index of geometry.index.array) {
      assert.ok(index >= 0 && index < position.count);
    }
    geometry.dispose();
  }
});

test('slice geometry rejects malformed public inputs', () => {
  const profile = buildProfile('straight', dimensions);
  assert.throws(
    () => buildSliceGeometry(profile, Number.NaN, 1),
    /angles must be finite/,
  );
  assert.throws(
    () => buildSliceGeometry(profile, 0, 1, { radialResolution: 1 }),
    /radialResolution/,
  );
  assert.throws(
    () => buildSliceGeometry({
      ...profile,
      points: [{ x: 1, y: 0, nx: Number.NaN, ny: 1 }],
    }, 0, 1),
    /strip points|non-finite/,
  );
});
