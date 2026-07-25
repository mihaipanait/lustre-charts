import test from 'node:test';
import assert from 'node:assert/strict';

import { canRetargetBarData, normalizeBarData } from '../src/charts/barData.js';

test('normalizes bar input and clamps invalid values', () => {
  assert.deepEqual(normalizeBarData([
    { label: 'A', value: 3, color: '#fff' },
    { label: 'B', value: -2 },
    Number.NaN,
  ]), {
    categories: ['A', 'B', 'Item 3'],
    series: [{
      name: 'Series 1',
      values: [3, 0, 0],
      colors: ['#fff', undefined, undefined],
    }],
  });
});

test('retargets only value-only updates', () => {
  const before = normalizeBarData({
    categories: ['Q1', 'Q2'],
    series: [{ name: 'Sales', values: [10, 20], color: '#09f', material: { preset: 'glass', roughness: 0.1 } }],
  });
  const valuesOnly = normalizeBarData({
    categories: ['Q1', 'Q2'],
    series: [{ name: 'Sales', values: [30, 40], color: '#09f', material: { preset: 'glass', roughness: 0.1 } }],
  });
  assert.equal(canRetargetBarData(before, valuesOnly), true);

  const renamed = normalizeBarData({
    categories: ['Q1', 'QX'],
    series: [{ name: 'Sales', values: [30, 40], color: '#09f', material: { preset: 'glass', roughness: 0.1 } }],
  });
  assert.equal(canRetargetBarData(before, renamed), false);

  const recolored = normalizeBarData({
    categories: ['Q1', 'Q2'],
    series: [{ name: 'Sales', values: [30, 40], color: '#f09', material: { preset: 'glass', roughness: 0.1 } }],
  });
  assert.equal(canRetargetBarData(before, recolored), false);

  const renamedSeries = normalizeBarData({
    categories: ['Q1', 'Q2'],
    series: [{ name: 'Revenue', values: [30, 40], color: '#09f', material: { preset: 'glass', roughness: 0.1 } }],
  });
  assert.equal(canRetargetBarData(before, renamedSeries), false);

  const rematerialed = normalizeBarData({
    categories: ['Q1', 'Q2'],
    series: [{ name: 'Sales', values: [30, 40], color: '#09f', material: { preset: 'glass', roughness: 0.2 } }],
  });
  assert.equal(canRetargetBarData(before, rematerialed), false);
});
