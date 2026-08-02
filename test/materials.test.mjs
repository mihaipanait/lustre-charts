import assert from 'node:assert/strict';
import test from 'node:test';

import * as THREE from 'three';
import {
  MATERIAL_PRESETS,
  autoProfileFor,
  createItemMaterial,
  materialPrefersSharpEdges,
} from '../src/materials/materials.js';

const theme = {
  kind: 'dark',
  envIntensity: 1,
};

test('every advertised material preset resolves to an interactive material spec', () => {
  assert.equal(MATERIAL_PRESETS.length, 13);
  for (const preset of MATERIAL_PRESETS) {
    const spec = createItemMaterial({ material: preset, color: '#2fe0c7', theme, thickness: 1 });
    assert.ok(spec.material instanceof THREE.Material, preset);
    assert.equal(typeof spec.material.emissiveIntensity, 'number', preset);
    assert.ok(Number.isFinite(spec.hoverEmissive), preset);
    assert.ok(Number.isFinite(spec.baseEmissive), preset);
    for (const layer of spec.layers || []) layer.material.dispose();
    spec.material.dispose();
  }
});

test('graphic materials ask charts for crisp geometry', () => {
  for (const preset of ['neon', 'toon', 'halftone']) {
    assert.equal(autoProfileFor(preset), 'straight');
    assert.equal(materialPrefersSharpEdges({ preset }), true);
  }
  assert.equal(autoProfileFor('crystal'), 'rounded');
  assert.equal(autoProfileFor('inset'), 'rounded');
  assert.equal(materialPrefersSharpEdges('velvet'), false);
});

test('procedural treatments augment stock shaders without replacing lighting', () => {
  for (const preset of ['halftone', 'iridescent']) {
    const { material } = createItemMaterial({ material: preset, color: '#ff4f81', theme, thickness: 1 });
    const shader = {
      vertexShader: '#include <common>\nvoid main(){\n#include <begin_vertex>\n}',
      fragmentShader: '#include <common>\nvoid main(){\n#include <color_fragment>\n}',
    };
    material.onBeforeCompile(shader);
    assert.match(shader.vertexShader, /vLustrePosition = position/);
    assert.match(shader.fragmentShader, /diffuseColor\.rgb/);
    assert.match(material.customProgramCacheKey(), new RegExp(preset));
    material.dispose();
  }
});

test('procedural shader controls are exported as live uniforms', () => {
  const { material } = createItemMaterial({
    material: {
      preset: 'halftone',
      shader: { scale: 11, dotSize: 0.14, inkStrength: 0.63 },
    },
    color: '#ff4f81',
    theme,
    thickness: 1,
  });
  const shader = {
    uniforms: {},
    vertexShader: '#include <common>\nvoid main(){\n#include <begin_vertex>\n}',
    fragmentShader: '#include <common>\nvoid main(){\n#include <color_fragment>\n}',
  };
  material.onBeforeCompile(shader);
  assert.equal(shader.uniforms.uLustreScale.value, 11);
  assert.equal(shader.uniforms.uLustreDotSize.value, 0.14);
  assert.equal(shader.uniforms.uLustreInkStrength.value, 0.63);
  assert.match(shader.fragmentShader, /uniform float uLustreScale/);
  material.dispose();
});

test('nested material overrides preserve Three.js colors and tune generated layers', () => {
  const toon = createItemMaterial({
    material: { preset: 'toon', outline: { color: '#ffffff', widthPx: 4.2 } },
    color: '#2fe0c7',
    theme,
    thickness: 1,
  });
  assert.ok(toon.outline.color instanceof THREE.Color);
  assert.equal(toon.outline.color.getHex(), 0xffffff);
  assert.equal(toon.outline.widthPx, 4.2);
  toon.material.dispose();

  const inset = createItemMaterial({
    material: {
      preset: 'inset',
      layer: {
        color: '#f6c945',
        inset: 0.18,
        embed: 0.8,
        roughness: 0.12,
        outline: { color: '#ffffff', widthPx: 2 },
      },
    },
    color: '#2fe0c7',
    theme,
    thickness: 1,
  });
  const layer = inset.layers[0];
  assert.equal(layer.inset, 0.18);
  assert.equal(layer.embed, 0.8);
  assert.equal(layer.material.color.getHex(), 0xf6c945);
  assert.equal(layer.material.roughness, 0.12);
  assert.ok(layer.outline.color instanceof THREE.Color);
  assert.equal(layer.outline.color.getHex(), 0xffffff);
  assert.equal(layer.outline.widthPx, 2);
  layer.material.dispose();
  inset.material.dispose();
});

test('relative optical controls scale geometry-aware glass defaults', () => {
  const baseline = createItemMaterial({ material: 'glass', color: '#2fe0c7', theme, thickness: 1.4 });
  const unitScale = createItemMaterial({
    material: { preset: 'glass', attenuationScale: 1 },
    color: '#2fe0c7',
    theme,
    thickness: 1.4,
  });
  const customized = createItemMaterial({
    material: { preset: 'glass', thicknessScale: 1.5, attenuationScale: 0.4, environmentScale: 0.65 },
    color: '#2fe0c7',
    theme,
    thickness: 1.4,
  });
  assert.equal(customized.material.thickness, baseline.material.thickness * 1.5);
  assert.equal(baseline.material.attenuationDistance, unitScale.material.attenuationDistance * 0.15);
  assert.equal(customized.material.attenuationDistance, unitScale.material.attenuationDistance * 0.4);
  assert.equal(customized.material.envMapIntensity, baseline.material.envMapIntensity * 0.65);
  baseline.material.dispose();
  unitScale.material.dispose();
  customized.material.dispose();
});

test('zero tint distance produces maximum absorption without a zero shader divisor', () => {
  for (const preset of ['glass', 'crystal', 'acrylic']) {
    const spec = createItemMaterial({
      material: { preset, attenuationScale: 0 },
      color: '#2fe0c7',
      theme,
      thickness: 1,
    });
    assert.equal(spec.material.attenuationDistance, 1e-4, preset);
    spec.material.dispose();
  }
});

test('glass families stay genuinely transmissive instead of self-lit and opaque-looking', () => {
  for (const preset of ['glass', 'crystal']) {
    const spec = createItemMaterial({ material: preset, color: '#2fe0c7', theme, thickness: 1 });
    assert.equal(spec.material.transmission, 1, preset);
    assert.equal(spec.material.opacity, 1, preset);
    assert.equal(spec.material.transparent, false, preset);
    assert.equal(spec.material.side, THREE.DoubleSide, preset);
    assert.ok(spec.material.emissiveIntensity < 0.02, preset);
    assert.ok(spec.material.attenuationDistance > 0, preset);
    assert.ok(spec.material.attenuationDistance <= 2.1, preset);
    spec.material.dispose();
  }
});

test('glass-family surface rendering can be returned to front faces', () => {
  for (const preset of ['glass', 'crystal', 'acrylic']) {
    const baseline = createItemMaterial({ material: preset, color: '#2fe0c7', theme, thickness: 1 });
    assert.equal(baseline.material.side, THREE.DoubleSide, preset);
    baseline.material.dispose();

    const spec = createItemMaterial({
      material: { preset, surfaceSide: 'front' },
      color: '#2fe0c7',
      theme,
      thickness: 1,
    });
    assert.equal(spec.material.side, THREE.FrontSide, preset);
    spec.material.dispose();
  }
});

test('inset resolves to one solid-white plate embedded in the colored backing', () => {
  const spec = createItemMaterial({ material: 'inset', color: '#2fe0c7', theme, thickness: 1 });
  assert.equal(spec.layers.length, 1);
  assert.equal(spec.layers[0].material.color.getHex(), 0xffffff);
  assert.ok(spec.layers[0].embed > 0.5 && spec.layers[0].embed < 1);
  assert.equal(materialPrefersSharpEdges('inset'), false);
  for (const layer of spec.layers) layer.material.dispose();
  spec.material.dispose();
});
