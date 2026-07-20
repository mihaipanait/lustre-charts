/**
 * @module materials/materials
 * The material preset system — the visual soul of Lustre.
 *
 * Every preset is built on `THREE.MeshPhysicalMaterial` and tuned against a
 * procedural studio environment (see BaseChart), so metals and glass get
 * believable reflections with zero texture downloads. Presets are named
 * after mineralogical lustre categories where it fits:
 *
 *  - `glossy`    candy / automotive clearcoat (the classic infographic look)
 *  - `glass`     tinted refractive glass with absorption + slight dispersion
 *  - `metal`     brushed anisotropic metal
 *  - `neon`      translucent emissive body + glowing rim lines (wants bloom)
 *  - `hologram`  iridescent translucent "sci-fi UI" material
 *  - `matte`     soft clean matte for minimal dashboards
 *
 * A preset is resolved via {@link createItemMaterial} which returns the
 * material plus hints the charts use (hover glow targets, outline specs).
 */

import * as THREE from 'three';

/** Preset names, in display order. */
export const MATERIAL_PRESETS = ['glossy', 'glass', 'metal', 'neon', 'hologram', 'matte'];

/**
 * Push a color toward candy-pigment saturation. White studio light plus
 * tone mapping inevitably clips high-luminance hues (cyans, yellows)
 * toward white, so pigments are luminance-normalized: bright hues start
 * darker and get lit back up to the palette color, keeping their hue.
 * @param {THREE.Color} c
 * @param {number} satBoost
 * @param {number} maxLum linear luminance ceiling before lighting
 */
function pigment(c, satBoost = 1.25, maxLum = 0.3) {
  const hsl = { h: 0, s: 0, l: 0 };
  c.getHSL(hsl);
  const out = new THREE.Color().setHSL(hsl.h, Math.min(1, hsl.s * satBoost), hsl.l);
  const lum = 0.2126 * out.r + 0.7152 * out.g + 0.0722 * out.b;
  if (lum > maxLum) out.multiplyScalar((maxLum / lum) ** 0.9);
  return out;
}

/**
 * @typedef {object} MaterialSpec
 * @property {THREE.MeshPhysicalMaterial} material
 * @property {number} hoverEmissive   emissiveIntensity target while hovered
 * @property {number} baseEmissive    resting emissiveIntensity
 * @property {{ color: THREE.Color, opacity: number, widthPx: number } | null} outline
 *   When set, charts add glowing rim lines (neon / hologram looks).
 * @property {boolean} wantsBloom     preset looks best with bloom enabled
 */

/**
 * Create a material for one chart item (slice / bar).
 *
 * @param {object} cfg
 * @param {string | object} cfg.material  preset name, or `{ preset, ...overrides }`
 *   where overrides are any MeshPhysicalMaterial properties (roughness,
 *   transmission, emissiveIntensity …) plus `outline: false` to suppress rims.
 * @param {string} cfg.color   item base color (hex)
 * @param {import('../core/themes.js').LustreTheme} cfg.theme
 * @param {number} [cfg.thickness]  reference thickness for glass absorption
 * @returns {MaterialSpec}
 */
export function createItemMaterial({ material, color, theme, thickness = 1 }) {
  const cfg = typeof material === 'string' ? { preset: material } : { preset: 'glossy', ...(material || {}) };
  const preset = MATERIAL_PRESETS.includes(cfg.preset) ? cfg.preset : 'glossy';
  const dark = theme.kind === 'dark';
  const base = new THREE.Color(color);

  /** @type {MaterialSpec} */
  const spec = {
    material: null,
    hoverEmissive: 0.35,
    baseEmissive: 0,
    outline: null,
    wantsBloom: false,
  };

  switch (preset) {
    case 'glass': {
      spec.material = new THREE.MeshPhysicalMaterial({
        color: base.clone().lerp(new THREE.Color('#ffffff'), 0.4),
        roughness: dark ? 0.13 : 0.06,
        metalness: 0,
        transmission: 1,
        thickness: Math.max(0.35, thickness * 0.8),
        ior: 1.5,
        attenuationColor: base.clone(),
        attenuationDistance: thickness * 3.2,
        clearcoat: 1,
        clearcoatRoughness: 0.06,
        specularIntensity: 1,
        iridescence: 0.14,
        iridescenceIOR: 1.3,
        envMapIntensity: (dark ? 1.7 : 1.35) * theme.envIntensity,
        emissive: pigment(base, 1.3, 0.3),
        emissiveIntensity: dark ? 0.5 : 0.05,
      });
      if ('dispersion' in spec.material) spec.material.dispersion = 0.4;
      spec.baseEmissive = spec.material.emissiveIntensity;
      spec.hoverEmissive = spec.baseEmissive + (dark ? 0.3 : 0.18);
      break;
    }

    case 'metal': {
      spec.material = new THREE.MeshPhysicalMaterial({
        color: base,
        metalness: 1,
        roughness: 0.24,
        clearcoat: 0.55,
        clearcoatRoughness: 0.22,
        reflectivity: 1,
        envMapIntensity: (dark ? 1.5 : 1.25) * theme.envIntensity,
        emissive: base.clone(),
        emissiveIntensity: 0,
      });
      // Brushed look — anisotropy follows the revolve UVs. Guarded for
      // older three versions that lack the extension.
      if ('anisotropy' in spec.material) {
        spec.material.anisotropy = 0.38;
        spec.material.anisotropyRotation = Math.PI / 2;
      }
      spec.hoverEmissive = 0.22;
      break;
    }

    case 'neon': {
      spec.material = new THREE.MeshPhysicalMaterial({
        color: base.clone().multiplyScalar(dark ? 0.1 : 0.4),
        roughness: 0.35,
        metalness: 0.05,
        transmission: 0.4,
        thickness: thickness * 0.5,
        ior: 1.4,
        attenuationColor: base.clone(),
        attenuationDistance: thickness * 1.5,
        clearcoat: 0.5,
        clearcoatRoughness: 0.25,
        envMapIntensity: 0.35 * theme.envIntensity,
        emissive: pigment(base, 1.45, 0.26),
        emissiveIntensity: dark ? 1.0 : 0.7,
        transparent: true,
        opacity: 0.98,
      });
      spec.baseEmissive = spec.material.emissiveIntensity;
      spec.hoverEmissive = spec.baseEmissive + (dark ? 0.9 : 0.5);
      spec.outline = {
        color: base.clone().lerp(new THREE.Color('#ffffff'), 0.5).multiplyScalar(dark ? 2.6 : 1.7),
        opacity: 1,
        widthPx: 2.2,
      };
      spec.wantsBloom = true;
      break;
    }

    case 'hologram': {
      spec.material = new THREE.MeshPhysicalMaterial({
        color: base.clone().lerp(new THREE.Color(dark ? '#0a1030' : '#ffffff'), 0.3),
        roughness: 0.1,
        metalness: 0.1,
        transmission: 0.8,
        thickness: thickness * 0.6,
        ior: 1.35,
        attenuationColor: base.clone(),
        attenuationDistance: thickness * 2.6,
        iridescence: 1,
        iridescenceIOR: 1.6,
        iridescenceThicknessRange: [90, 620],
        clearcoat: 1,
        clearcoatRoughness: 0.05,
        envMapIntensity: 1.55 * theme.envIntensity,
        emissive: pigment(base, 1.3, 0.3),
        emissiveIntensity: dark ? 0.42 : 0.12,
        transparent: true,
        opacity: 0.92,
      });
      spec.baseEmissive = spec.material.emissiveIntensity;
      spec.hoverEmissive = spec.baseEmissive + 0.5;
      spec.outline = {
        color: base.clone().lerp(new THREE.Color('#ffffff'), 0.6).multiplyScalar(dark ? 1.7 : 1.2),
        opacity: 0.85,
        widthPx: 1.6,
      };
      spec.wantsBloom = true;
      break;
    }

    case 'matte': {
      spec.material = new THREE.MeshPhysicalMaterial({
        color: pigment(base, 1.2, 0.34),
        roughness: 0.82,
        metalness: 0,
        clearcoat: 0.1,
        clearcoatRoughness: 0.6,
        envMapIntensity: 0.45 * theme.envIntensity,
        emissive: base.clone(),
        emissiveIntensity: 0,
      });
      spec.hoverEmissive = 0.18;
      break;
    }

    case 'glossy':
    default: {
      spec.material = new THREE.MeshPhysicalMaterial({
        color: pigment(base, 1.35, 0.42),
        roughness: 0.26,
        metalness: 0.02,
        clearcoat: 1,
        clearcoatRoughness: 0.07,
        specularIntensity: 0.85,
        envMapIntensity: (dark ? 1.05 : 0.95) * theme.envIntensity,
        emissive: base.clone(),
        emissiveIntensity: 0,
      });
      spec.hoverEmissive = 0.26;
      break;
    }
  }

  applyOverrides(spec, cfg);
  return spec;
}

/**
 * Apply user overrides on top of a preset.
 * Recognized extras beyond material props:
 *   `outline: false` removes rims; `outline: { widthPx, opacity }` tunes them.
 * @param {MaterialSpec} spec
 * @param {object} cfg
 */
function applyOverrides(spec, cfg) {
  const { preset, outline, ...rest } = cfg;
  for (const [key, value] of Object.entries(rest)) {
    if (!(key in spec.material)) continue;
    const current = spec.material[key];
    if (current instanceof THREE.Color) current.set(value);
    else spec.material[key] = value;
  }
  if ('emissiveIntensity' in rest) {
    spec.baseEmissive = rest.emissiveIntensity;
    spec.hoverEmissive = Math.max(spec.hoverEmissive, spec.baseEmissive + 0.25);
  }
  if (outline === false) spec.outline = null;
  else if (outline && typeof outline === 'object' && spec.outline) Object.assign(spec.outline, outline);
}

/**
 * Which cross-section profile flatters a preset when the user didn't choose
 * one (`pie.profile: 'auto'`). Neon wants crisp edges for its rim lines.
 * @param {string | object} material
 * @returns {string}
 */
export function autoProfileFor(material) {
  const preset = typeof material === 'string' ? material : material?.preset;
  return preset === 'neon' ? 'straight' : 'rounded';
}

/**
 * True when the preset asks for bloom by default (`effects.bloom: 'auto'`).
 * @param {string | object} material
 */
export function materialWantsBloom(material) {
  const preset = typeof material === 'string' ? material : material?.preset;
  return preset === 'neon' || preset === 'hologram';
}
