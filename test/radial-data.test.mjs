import test from 'node:test';
import assert from 'node:assert/strict';

import {
  computeRadialBands,
  distributeLabelYs,
  fitRadialProfile,
  normalizeRadialData,
  radialFraction,
  resolveRadialMax,
} from '../src/charts/radialData.js';

test('normalizes radial input without normalizing independent values', () => {
  assert.deepEqual(normalizeRadialData([
    25,
    { label: 'Complete', value: 100, color: '#fff', material: 'metal' },
    { value: -4 },
    { value: 'invalid' },
  ]), [
    { label: 'Item 1', value: 25, color: undefined, material: undefined },
    { label: 'Complete', value: 100, color: '#fff', material: 'metal' },
    { label: 'Item 3', value: 0, color: undefined, material: undefined },
    { label: 'Item 4', value: 0, color: undefined, material: undefined },
  ]);

  assert.deepEqual(normalizeRadialData({
    labels: ['A', 'B'],
    values: [40, 80],
    colors: ['#111', undefined],
  }), [
    { label: 'A', value: 40, color: '#111', material: undefined },
    { label: 'B', value: 80, color: undefined, material: undefined },
  ]);
});

test('rejects malformed radial input with actionable errors', () => {
  assert.throws(() => normalizeRadialData(null), /radial data must/);
  assert.throws(() => normalizeRadialData([null]), /numbers or objects/);
});

test('normalizes every ring independently against a positive maximum', () => {
  assert.equal(radialFraction(25, 100), 0.25);
  assert.equal(radialFraction(150, 100), 1);
  assert.equal(radialFraction(-20, 100), 0);
  assert.equal(radialFraction(5, 20), 0.25);
  assert.equal(resolveRadialMax('50'), 50);
  assert.throws(() => radialFraction(10, 0), /maxValue/);
  assert.throws(() => resolveRadialMax(Number.NaN), /maxValue/);
});

test('computes equal non-overlapping bands from inner to outer radius', () => {
  const bands = computeRadialBands(4, { innerRadius: 0.5, radius: 3, ringGap: 0.1 });
  assert.equal(bands.length, 4);
  assert.ok(Math.abs(bands[0].innerRadius - 0.5) < 1e-10);
  assert.ok(Math.abs(bands.at(-1).outerRadius - 3) < 1e-10);
  assert.ok(bands.every((band) => Math.abs(band.width - 0.55) < 1e-10));
  for (let index = 1; index < bands.length; index++) {
    assert.ok(Math.abs(bands[index].innerRadius - bands[index - 1].outerRadius - 0.1) < 1e-10);
    assert.ok(bands[index].centerRadius > bands[index - 1].centerRadius);
  }
});

test('rejects radial layouts that cannot produce positive rings', () => {
  assert.deepEqual(computeRadialBands(0, { innerRadius: 0, radius: 3, ringGap: 1 }), []);
  assert.throws(
    () => computeRadialBands(5, { innerRadius: 2.8, radius: 3, ringGap: 0.1 }),
    /positive width/,
  );
  assert.throws(
    () => computeRadialBands(1, { innerRadius: 3, radius: 3, ringGap: 0 }),
    /innerRadius/,
  );
});

test('fits one custom profile silhouette into arbitrary radial bands', () => {
  const source = [
    { x: 2, y: -1 },
    { x: 4, y: -1 },
    { x: 4.5, y: 0 },
    { x: 4, y: 1 },
    { x: 2, y: 1 },
  ];
  const fitted = fitRadialProfile(source, { innerRadius: 1.2, outerRadius: 1.8, height: 0.4 });
  const xs = fitted.map((point) => point.x);
  const ys = fitted.map((point) => point.y);
  assert.ok(Math.abs(Math.min(...xs) - 1.2) < 1e-10);
  assert.ok(Math.abs(Math.max(...xs) - 1.8) < 1e-10);
  assert.ok(Math.abs(Math.min(...ys) + 0.2) < 1e-10);
  assert.ok(Math.abs(Math.max(...ys) - 0.2) < 1e-10);
  assert.throws(
    () => fitRadialProfile([{ x: 1, y: 0 }, { x: 1, y: 1 }, { x: 1, y: 2 }], {
      innerRadius: 1,
      outerRadius: 2,
      height: 1,
    }),
    /span both/,
  );
});

test('distributes clustered callouts without collisions or viewport overflow', () => {
  const desired = [96, 100, 98, 102, 99];
  const rows = distributeLabelYs(desired, 20, 180, 22);
  assert.equal(rows.length, desired.length);
  assert.ok(rows.every((row) => row >= 20 && row <= 180));
  const sorted = [...rows].sort((a, b) => a - b);
  for (let index = 1; index < sorted.length; index++) {
    assert.ok(sorted[index] - sorted[index - 1] >= 22 - 1e-10);
  }
  assert.deepEqual(distributeLabelYs([5], 10, 20, 8), [10]);
});
