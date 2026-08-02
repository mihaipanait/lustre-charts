/**
 * @module materials/materials
 * The material preset system — the visual soul of Lustre.
 *
 * Most presets are built on `THREE.MeshPhysicalMaterial` and tuned against a
 * procedural studio environment (see BaseChart), so metals and glass get
 * believable reflections with zero texture downloads. Graphic presets use
 * Three's toon shader or small shader augmentations while keeping the same
 * interaction contract. Presets are named after mineralogical lustre
 * categories where it fits:
 *
 *  - `glossy`    candy / automotive clearcoat (the classic infographic look)
 *  - `glass`     tinted refractive glass with absorption + slight dispersion
 *  - `metal`     brushed anisotropic metal
 *  - `neon`      translucent emissive body + glowing rim lines (wants bloom)
 *  - `hologram`  iridescent translucent "sci-fi UI" material
 *  - `matte`     soft clean matte for minimal dashboards
 *  - `toon`      stepped lighting and heavy editorial ink outlines
 *  - `halftone`  procedural comic dots with no downloaded texture
 *  - `iridescent` opaque, view-dependent thin-film color
 *  - `crystal`   highly polished dispersive glass
 *  - `acrylic`   softly frosted translucent polymer
 *  - `subsurface` soft gel / wax with wrapped diffuse light + back-scattering
 *  - `tricolor`  translucent palette-derived three-color harmony
 *  - `velvet`    grazing-angle fabric sheen
 *  - `inset`     colored backing with one inset solid-white face
 *
 * A preset is resolved via {@link createItemMaterial} which returns the
 * material plus hints the charts use (hover glow targets, outline specs).
 */

import * as THREE from 'three';

/** Preset names, in display order. */
export const MATERIAL_PRESETS = [
  'glossy', 'glass', 'metal', 'neon', 'hologram', 'matte',
  'toon', 'halftone', 'iridescent', 'crystal', 'acrylic', 'subsurface', 'tricolor', 'velvet', 'inset',
];

const SHARP_EDGE_PRESETS = new Set(['neon', 'toon', 'halftone']);
const TINTED_VOLUME_PRESETS = new Set(['glass', 'crystal', 'acrylic', 'tricolor']);
const DEFAULT_ATTENUATION_SCALE = 0.15;
const SAFE_MIN_ATTENUATION_DISTANCE = 1e-4;

/** Four luminance steps keep the toon look graphic without crushing form. */
let toonGradient = null;
function getToonGradient() {
  if (toonGradient) return toonGradient;
  toonGradient = new THREE.DataTexture(
    new Uint8Array([35, 102, 188, 255]),
    4,
    1,
    THREE.RedFormat,
  );
  toonGradient.minFilter = THREE.NearestFilter;
  toonGradient.magFilter = THREE.NearestFilter;
  toonGradient.generateMipmaps = false;
  toonGradient.needsUpdate = true;
  return toonGradient;
}

/**
 * Add a small object-space procedural surface treatment to a stock material.
 * This preserves Three's full lighting, shadows, tone mapping, and PBR stack.
 * @param {THREE.Material} material
 * @param {string} key
 * @param {{ fragmentBody: string, uniforms?: Record<string, number | THREE.Color> }} treatment
 *   GLSL inserted immediately after base color plus float/color uniforms.
 */
function addSurfaceTreatment(material, key, treatment) {
  const uniformEntries = Object.entries(treatment.uniforms || {}).map(([name, value]) => {
    const glslName = `uLustre${name[0].toUpperCase()}${name.slice(1)}`;
    const glslType = value instanceof THREE.Color ? 'vec3' : 'float';
    return [name, glslName, { value }, glslType];
  });
  material.userData.lustreShader = {
    key,
    uniforms: Object.fromEntries(uniformEntries.map(([name, _glslName, uniform]) => [name, uniform])),
  };
  material.onBeforeCompile = (shader) => {
    const varyings = `
varying vec3 vLustrePosition;
varying vec3 vLustreNormal;
varying vec2 vLustreUv;`;
    const declarations = uniformEntries
      .map(([_name, glslName, _uniform, glslType]) => `uniform ${glslType} ${glslName};`)
      .join('\n');
    shader.uniforms ||= {};
    for (const [_name, glslName, uniform] of uniformEntries) shader.uniforms[glslName] = uniform;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>${varyings}`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
  vLustrePosition = position;
  vLustreNormal = normal;
  vLustreUv = uv;`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>${varyings}\n${declarations}`)
      .replace('#include <color_fragment>', `#include <color_fragment>\n${treatment.fragmentBody}`);
  };
  material.customProgramCacheKey = () => `lustre-surface-${key}-v1`;
}

/**
 * Add a single-pass, direct-light subsurface approximation to Three's stock
 * physical shader. The original PBR response remains intact; this wrapper adds
 * a chromatic diffusion lobe around the light terminator and a view-dependent
 * transmission lobe when a light sits behind the object.
 *
 * Channel radius follows the palette pigment, so red wax, green slime, and
 * blue gel naturally scatter their dominant wavelength farther without a
 * separate color texture. This is an artistic real-time approximation rather
 * than a screen-space or random-walk SSS solution.
 *
 * @param {THREE.MeshPhysicalMaterial} material
 * @param {{ strength: number, radius: number, wrap: number, backscatter: number }} defaults
 */
function addSubsurfaceScattering(material, defaults) {
  const uniforms = Object.fromEntries(
    Object.entries(defaults).map(([name, value]) => [name, { value }]),
  );
  material.userData.lustreShader = { key: 'subsurface', uniforms };
  material.onBeforeCompile = (shader) => {
    shader.uniforms ||= {};
    shader.uniforms.uLustreStrength = uniforms.strength;
    shader.uniforms.uLustreRadius = uniforms.radius;
    shader.uniforms.uLustreWrap = uniforms.wrap;
    shader.uniforms.uLustreBackscatter = uniforms.backscatter;
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
uniform float uLustreStrength;
uniform float uLustreRadius;
uniform float uLustreWrap;
uniform float uLustreBackscatter;`)
      .replace('#include <lights_physical_pars_fragment>', `
// Preserve Three's physical direct-light function under a private name, then
// route direct lights through a wrapper that adds the subsurface lobes.
#define RE_Direct_Physical LUSTRE_RE_Direct_Physical
#include <lights_physical_pars_fragment>
#undef RE_Direct
#undef RE_Direct_Physical

void RE_Direct_LustreSubsurface(
  const in IncidentLight directLight,
  const in vec3 geometryPosition,
  const in vec3 geometryNormal,
  const in vec3 geometryViewDir,
  const in vec3 geometryClearcoatNormal,
  const in PhysicalMaterial material,
  inout ReflectedLight reflectedLight
) {
  LUSTRE_RE_Direct_Physical(
    directLight,
    geometryPosition,
    geometryNormal,
    geometryViewDir,
    geometryClearcoatNormal,
    material,
    reflectedLight
  );

  float lustreNL = dot(geometryNormal, directLight.direction);
  float lustreLambert = saturate(lustreNL);
  float lustreWrap = saturate((lustreNL + uLustreWrap) / (1.0 + uLustreWrap));
  float lustreTerminator = max(lustreWrap - lustreLambert, 0.0);

  float lustreBehind = saturate(dot(-geometryViewDir, directLight.direction));
  float lustreBackFacing = saturate(-lustreNL);
  float lustreTransmission = pow(lustreBehind, 3.0)
    * lustreBackFacing
    * uLustreBackscatter;

  vec3 lustrePigment = max(material.diffuseContribution, vec3(0.001));
  float lustreMaxChannel = max(max(lustrePigment.r, lustrePigment.g), lustrePigment.b);
  vec3 lustreChannelRadius = mix(
    vec3(1.0),
    lustrePigment / max(lustreMaxChannel, 0.001),
    0.72
  ) * max(uLustreRadius, 0.001);
  vec3 lustreProfile = exp(
    -2.25 * abs(lustreNL) / max(lustreChannelRadius, vec3(0.001))
  );
  // Diffusion stays concentrated near the terminator. Backlighting uses a
  // broader profile: otherwise the light directly behind a thick-looking
  // face is paradoxically attenuated before it can create the translucent
  // glow that communicates SSS.
  vec3 lustreBackProfile = mix(vec3(0.32), sqrt(lustreProfile), 0.58);
  vec3 lustreScatteredIrradiance = directLight.color * (
    lustreProfile * lustreTerminator
    + lustreBackProfile * lustreTransmission
  );

  reflectedLight.directDiffuse += lustreScatteredIrradiance
    * BRDF_Lambert(material.diffuseContribution)
    * uLustreStrength;
}

#define RE_Direct RE_Direct_LustreSubsurface`);
  };
  material.customProgramCacheKey = () => 'lustre-subsurface-v1';
}

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

/** Fractional component with positive output for deterministic color hashes. */
function fract(value) {
  return value - Math.floor(value);
}

/**
 * Build two deterministic companion colors around a palette color. The hue
 * distances vary slightly with a hash of the source RGB, preventing every
 * slice from using an identical split while remaining stable across renders.
 * The companions use a split-complementary layout rather than close analogous
 * hues. One is a lighter 58°–101° turn and the other a darker 108°–166°
 * turn in the opposite direction. The source color still anchors the middle
 * of the surface gradient, but the endpoints have enough distance to read.
 * @param {THREE.Color} base
 */
function triColorHarmony(base) {
  const hsl = { h: 0, s: 0, l: 0 };
  base.getHSL(hsl);
  const seedA = fract(Math.sin(base.r * 12.9898 + base.g * 78.233 + base.b * 37.719) * 43758.5453);
  const seedB = fract(Math.sin(base.r * 39.3468 + base.g * 11.135 + base.b * 83.155) * 24634.6345);
  const direction = seedA < 0.5 ? -1 : 1;
  const nearSpread = 0.16 + seedB * 0.12;
  const farSpread = 0.3 + seedA * 0.16;
  const saturation = Math.min(1, Math.max(0.52, hsl.s * 0.92 + 0.14));
  const companionA = new THREE.Color().setHSL(
    fract(hsl.h + direction * nearSpread),
    saturation,
    Math.min(0.82, hsl.l + 0.14 + seedB * 0.13),
  );
  const companionB = new THREE.Color().setHSL(
    fract(hsl.h - direction * farSpread),
    Math.min(1, saturation * 0.96 + 0.06),
    Math.max(0.055, Math.min(0.46, hsl.l * (0.5 + seedB * 0.12) + 0.018)),
  );
  return {
    dominant: pigment(base, 1.18, 0.34),
    companionA: pigment(companionA, 1.16, 0.44),
    companionB: pigment(companionB, 1.22, 0.22),
  };
}

/**
 * @typedef {object} MaterialSpec
 * @property {THREE.MeshPhysicalMaterial | THREE.MeshToonMaterial} material
 * @property {number} hoverEmissive   emissiveIntensity target while hovered
 * @property {number} baseEmissive    resting emissiveIntensity
 * @property {{ color: THREE.Color, opacity: number, widthPx: number } | null} outline
 *   When set, charts add glowing rim lines (neon / hologram looks).
 * @property {Array<{ material: THREE.MeshPhysicalMaterial, inset: number,
 *   height: number, embed: number, outline: { color: THREE.Color,
 *   opacity: number, widthPx: number } | null }> | null} layers
 *   Optional stacked plates. `inset` and `height` are fractions of the
 *   chart's local footprint and reference thickness; `embed` is the fraction
 *   of plate height sunk into the base.
 * @property {boolean} wantsBloom     preset looks best with bloom enabled
 * @property {boolean} wantsBacklight preset needs a camera-opposed light to reveal transmission
 */

/**
 * Create a material for one chart item (slice / bar).
 *
 * @param {object} cfg
 * @param {string | object} cfg.material  preset name, or `{ preset, ...overrides }`
 *   where overrides are any MeshPhysicalMaterial properties (roughness,
 *   transmission, emissiveIntensity …), `outline`, `layer`, `shader`, and
 *   relative `thicknessScale` / `attenuationScale` controls.
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
    layers: null,
    wantsBloom: false,
    wantsBacklight: false,
  };

  switch (preset) {
    case 'glass': {
      const glassWhite = new THREE.Color('#ffffff');
      spec.material = new THREE.MeshPhysicalMaterial({
        // Keep the surface almost colorless and put the tint in the volume.
        // A strongly colored surface plus emissive light reads as resin even
        // when transmission is physically set to 1.
        color: base.clone().lerp(glassWhite, dark ? 0.72 : 0.58),
        roughness: dark ? 0.08 : 0.045,
        metalness: 0,
        transmission: 1,
        thickness: Math.max(0.28, thickness * 0.52),
        ior: 1.5,
        side: THREE.DoubleSide,
        attenuationColor: base.clone().lerp(glassWhite, 0.28),
        attenuationDistance: Math.max(2.6, thickness * (dark ? 10 : 6.5)),
        clearcoat: 1,
        clearcoatRoughness: 0.035,
        specularIntensity: 1,
        iridescence: 0.09,
        iridescenceIOR: 1.3,
        envMapIntensity: (dark ? 1.6 : 1.3) * theme.envIntensity,
        emissive: base.clone(),
        emissiveIntensity: dark ? 0.018 : 0,
      });
      if ('dispersion' in spec.material) spec.material.dispersion = 0.4;
      spec.baseEmissive = spec.material.emissiveIntensity;
      spec.hoverEmissive = spec.baseEmissive + (dark ? 0.09 : 0.06);
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

    case 'toon': {
      spec.material = new THREE.MeshToonMaterial({
        color: pigment(base, 1.4, 0.48),
        gradientMap: getToonGradient(),
        emissive: base.clone(),
        emissiveIntensity: dark ? 0.055 : 0.015,
      });
      spec.baseEmissive = spec.material.emissiveIntensity;
      spec.hoverEmissive = spec.baseEmissive + 0.18;
      spec.outline = {
        color: new THREE.Color(dark ? '#05060b' : '#11121a'),
        opacity: 0.98,
        widthPx: 3.2,
      };
      break;
    }

    case 'halftone': {
      spec.material = new THREE.MeshPhysicalMaterial({
        color: pigment(base, 1.45, 0.43),
        roughness: 0.68,
        metalness: 0,
        clearcoat: 0.22,
        clearcoatRoughness: 0.42,
        envMapIntensity: 0.5 * theme.envIntensity,
        emissive: base.clone(),
        emissiveIntensity: dark ? 0.035 : 0,
      });
      addSurfaceTreatment(spec.material, 'halftone', {
        uniforms: { scale: 7.5, dotSize: 0.205, inkStrength: 0.88 },
        fragmentBody: `
  vec3 lustreN = abs(normalize(vLustreNormal));
  vec2 lustrePlane = lustreN.y > max(lustreN.x, lustreN.z)
    ? vLustrePosition.xz
    : (lustreN.x > lustreN.z ? vLustrePosition.zy : vLustrePosition.xy);
  vec2 lustreCell = fract(lustrePlane * uLustreScale) - 0.5;
  float lustreDist = length(lustreCell);
  float lustreAA = max(fwidth(lustreDist) * 1.35, 0.008);
  float lustreDot = 1.0 - smoothstep(uLustreDotSize - lustreAA, uLustreDotSize + lustreAA, lustreDist);
  vec3 lustreInk = mix(diffuseColor.rgb * 0.035, vec3(0.008, 0.009, 0.014), 0.72);
  diffuseColor.rgb = mix(diffuseColor.rgb, lustreInk, lustreDot * uLustreInkStrength);`,
      });
      spec.baseEmissive = spec.material.emissiveIntensity;
      spec.hoverEmissive = spec.baseEmissive + 0.18;
      spec.outline = {
        color: new THREE.Color(dark ? '#05060b' : '#12131b'),
        opacity: 0.98,
        widthPx: 2.7,
      };
      break;
    }

    case 'iridescent': {
      spec.material = new THREE.MeshPhysicalMaterial({
        color: pigment(base, 1.2, dark ? 0.16 : 0.28),
        roughness: 0.12,
        metalness: 0.32,
        iridescence: 1,
        iridescenceIOR: 1.78,
        iridescenceThicknessRange: [110, 860],
        clearcoat: 1,
        clearcoatRoughness: 0.035,
        specularIntensity: 1,
        envMapIntensity: (dark ? 1.85 : 1.45) * theme.envIntensity,
        emissive: pigment(base, 1.15, 0.2),
        emissiveIntensity: dark ? 0.1 : 0.025,
      });
      addSurfaceTreatment(spec.material, 'iridescent', {
        uniforms: { fresnelPower: 1.55, colorStrength: 0.5, colorCycles: 1.18 },
        fragmentBody: `
  float lustreFacing = clamp(abs(dot(normalize(vNormal), normalize(vViewPosition))), 0.0, 1.0);
  float lustreFresnel = pow(1.0 - lustreFacing, uLustreFresnelPower);
  vec3 lustreSpectrum = 0.55 + 0.45 * cos(
    6.2831853 * (lustreFresnel * uLustreColorCycles + vec3(0.02, 0.34, 0.68))
  );
  diffuseColor.rgb = mix(
    diffuseColor.rgb,
    lustreSpectrum,
    clamp(0.12 + lustreFresnel * uLustreColorStrength, 0.0, 1.0)
  );`,
      });
      spec.baseEmissive = spec.material.emissiveIntensity;
      spec.hoverEmissive = spec.baseEmissive + 0.25;
      break;
    }

    case 'crystal': {
      const crystalWhite = new THREE.Color('#ffffff');
      spec.material = new THREE.MeshPhysicalMaterial({
        color: base.clone().lerp(crystalWhite, dark ? 0.92 : 0.78),
        roughness: 0.035,
        metalness: 0,
        transmission: 1,
        thickness: Math.max(0.42, thickness * 0.72),
        ior: 1.62,
        side: THREE.DoubleSide,
        attenuationColor: base.clone().lerp(crystalWhite, 0.52),
        attenuationDistance: Math.max(3.2, thickness * (dark ? 14 : 7.5)),
        clearcoat: 1,
        clearcoatRoughness: 0.015,
        specularIntensity: 1,
        iridescence: 0.58,
        iridescenceIOR: 1.48,
        iridescenceThicknessRange: [90, 520],
        envMapIntensity: (dark ? 1.55 : 1.2) * theme.envIntensity,
        emissive: base.clone(),
        emissiveIntensity: dark ? 0.012 : 0,
      });
      if ('dispersion' in spec.material) spec.material.dispersion = 0.92;
      spec.baseEmissive = spec.material.emissiveIntensity;
      spec.hoverEmissive = spec.baseEmissive + (dark ? 0.08 : 0.05);
      spec.outline = {
        color: base.clone().lerp(new THREE.Color('#ffffff'), dark ? 0.76 : 0.48).multiplyScalar(dark ? 1.45 : 1),
        opacity: dark ? 0.84 : 0.52,
        widthPx: 1.15,
      };
      break;
    }

    case 'acrylic': {
      spec.material = new THREE.MeshPhysicalMaterial({
        color: base.clone().lerp(new THREE.Color('#ffffff'), dark ? 0.36 : 0.5),
        roughness: dark ? 0.32 : 0.4,
        metalness: 0,
        transmission: 0.72,
        thickness: Math.max(0.4, thickness * 0.72),
        ior: 1.47,
        side: THREE.DoubleSide,
        attenuationColor: base.clone(),
        attenuationDistance: Math.max(0.75, thickness * 2.4),
        clearcoat: 0.82,
        clearcoatRoughness: 0.18,
        sheen: 0.36,
        sheenColor: base.clone().lerp(new THREE.Color('#ffffff'), 0.38),
        sheenRoughness: 0.72,
        envMapIntensity: (dark ? 1.35 : 1.05) * theme.envIntensity,
        emissive: pigment(base, 1.15, 0.24),
        emissiveIntensity: dark ? 0.16 : 0.02,
      });
      spec.baseEmissive = spec.material.emissiveIntensity;
      spec.hoverEmissive = spec.baseEmissive + 0.24;
      break;
    }

    case 'subsurface': {
      const softPigment = pigment(base, 1.3, dark ? 0.25 : 0.36);
      spec.material = new THREE.MeshPhysicalMaterial({
        color: softPigment,
        roughness: 0.4,
        metalness: 0,
        transmission: dark ? 0.58 : 0.48,
        thickness: Math.max(0.45, thickness * 0.8),
        ior: 1.42,
        side: THREE.DoubleSide,
        attenuationColor: base.clone().lerp(new THREE.Color('#ffffff'), 0.08),
        attenuationDistance: Math.max(0.9, thickness * 1.6),
        clearcoat: 0.48,
        clearcoatRoughness: 0.2,
        sheen: 0.28,
        sheenColor: base.clone().lerp(new THREE.Color('#ffffff'), dark ? 0.42 : 0.28),
        sheenRoughness: 0.72,
        envMapIntensity: (dark ? 0.72 : 0.62) * theme.envIntensity,
        emissive: softPigment,
        emissiveIntensity: dark ? 0.025 : 0,
      });
      addSubsurfaceScattering(spec.material, {
        strength: 1,
        radius: 1.1,
        wrap: 0.48,
        backscatter: 1.35,
      });
      spec.wantsBacklight = true;
      spec.baseEmissive = spec.material.emissiveIntensity;
      spec.hoverEmissive = spec.baseEmissive + 0.24;
      break;
    }

    case 'tricolor': {
      const harmony = triColorHarmony(base);
      spec.material = new THREE.MeshPhysicalMaterial({
        color: harmony.dominant,
        roughness: dark ? 0.16 : 0.2,
        metalness: 0,
        transmission: 0.48,
        thickness: Math.max(0.42, thickness * 0.72),
        ior: 1.4,
        side: THREE.DoubleSide,
        attenuationColor: base.clone().lerp(harmony.companionA, 0.16),
        attenuationDistance: Math.max(2.8, thickness * 7.5),
        clearcoat: 0.72,
        clearcoatRoughness: 0.11,
        sheen: 0.24,
        sheenColor: harmony.companionA.clone().lerp(new THREE.Color('#ffffff'), 0.28),
        sheenRoughness: 0.62,
        envMapIntensity: (dark ? 1.18 : 0.96) * theme.envIntensity,
        emissive: harmony.dominant,
        emissiveIntensity: dark ? 0.035 : 0,
      });
      addSurfaceTreatment(spec.material, 'tricolor', {
        uniforms: {
          dominantColor: harmony.dominant,
          companionA: harmony.companionA,
          companionB: harmony.companionB,
          dominance: 0.2,
          edgePower: 1.35,
          flow: 1.15,
        },
        fragmentBody: `
  vec3 lustreTriNormal = normalize(vLustreNormal);
  float lustreTriFacing = clamp(
    abs(dot(normalize(vNormal), normalize(vViewPosition))),
    0.0,
    1.0
  );
  float lustreTriEdge = pow(1.0 - lustreTriFacing, uLustreEdgePower);
  float lustreTriPhase = uLustreFlow * 1.35;
  vec3 lustreTriDirection = normalize(vec3(
    cos(lustreTriPhase),
    0.72,
    sin(lustreTriPhase)
  ));
  float lustreTriAngle = atan(lustreTriNormal.z, lustreTriNormal.x);
  float lustreTriNormalGradient = 0.5 + 0.5 * dot(
    lustreTriNormal,
    lustreTriDirection
  );
  float lustreTriSurfaceGradient = clamp(
    vLustreUv.x
    + 0.12 * sin(6.2831853 * vLustreUv.y + lustreTriPhase),
    0.0,
    1.0
  );
  float lustreTriGradient = clamp(
    mix(lustreTriSurfaceGradient, lustreTriNormalGradient, 0.18)
    + 0.035 * sin(lustreTriAngle * 1.6 + vLustrePosition.y * 1.8),
    0.0,
    1.0
  );
  vec3 lustreTriColor = mix(
    uLustreCompanionB,
    uLustreDominantColor,
    smoothstep(0.04, 0.52, lustreTriGradient)
  );
  lustreTriColor = mix(
    lustreTriColor,
    uLustreCompanionA,
    smoothstep(0.48, 0.96, lustreTriGradient)
  );
  float lustreTriAmount = clamp(
    (1.0 - uLustreDominance) * (1.0 + 0.12 * lustreTriEdge),
    0.0,
    0.94
  );
  diffuseColor.rgb = mix(uLustreDominantColor, lustreTriColor, lustreTriAmount);`,
      });
      spec.baseEmissive = spec.material.emissiveIntensity;
      spec.hoverEmissive = spec.baseEmissive + 0.22;
      spec.wantsBacklight = true;
      break;
    }

    case 'velvet': {
      const sheen = base.clone().lerp(new THREE.Color('#ffffff'), dark ? 0.46 : 0.28);
      spec.material = new THREE.MeshPhysicalMaterial({
        color: pigment(base, 1.28, dark ? 0.16 : 0.3),
        roughness: 0.86,
        metalness: 0,
        sheen: 1,
        sheenColor: sheen,
        sheenRoughness: 0.48,
        clearcoat: 0,
        envMapIntensity: 0.28 * theme.envIntensity,
        emissive: pigment(base, 1.2, 0.2),
        emissiveIntensity: dark ? 0.08 : 0,
      });
      spec.baseEmissive = spec.material.emissiveIntensity;
      spec.hoverEmissive = spec.baseEmissive + 0.2;
      break;
    }

    case 'inset': {
      const backing = pigment(base.clone().offsetHSL(0, 0.05, dark ? -0.07 : -0.035), 1.38, 0.34);
      const rim = base.clone().offsetHSL(0, 0.08, dark ? -0.3 : -0.24);
      spec.material = new THREE.MeshPhysicalMaterial({
        color: backing,
        roughness: 0.3,
        metalness: 0.025,
        clearcoat: 0.82,
        clearcoatRoughness: 0.12,
        envMapIntensity: 0.88 * theme.envIntensity,
        emissive: backing,
        emissiveIntensity: dark ? 0.025 : 0,
      });
      spec.baseEmissive = spec.material.emissiveIntensity;
      spec.hoverEmissive = spec.baseEmissive + 0.2;
      spec.outline = {
        color: rim.clone(),
        opacity: 0.8,
        widthPx: 1.2,
      };
      spec.layers = [
        {
          inset: 0.095,
          height: 0.13,
          embed: 0.62,
          material: new THREE.MeshPhysicalMaterial({
            color: '#ffffff',
            roughness: 0.25,
            metalness: 0,
            clearcoat: 0.88,
            clearcoatRoughness: 0.075,
            specularIntensity: 0.86,
            envMapIntensity: 0.78 * theme.envIntensity,
            emissive: '#ffffff',
            emissiveIntensity: dark ? 0.055 : 0,
          }),
          outline: { color: rim.clone(), opacity: 0.88, widthPx: 1.35 },
        },
      ];
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

  applyOverrides(spec, cfg, preset);
  return spec;
}

/**
 * Apply user overrides on top of a preset.
 * Recognized extras beyond material props:
 *   - `outline` tunes/removes generated rim lines.
 *   - `layer` tunes the first generated inset layer and its material.
 *   - `shader` tunes procedural treatment uniforms (halftone/iridescent/subsurface/tricolor).
 *   - `thicknessScale` / `attenuationScale` multiply volume defaults.
 *   - `environmentScale` multiplies the preset's reflection strength.
 *   - `surfaceSide` selects `front` or `double` face rendering.
 * @param {MaterialSpec} spec
 * @param {object} cfg
 * @param {string} preset
 */
function applyOverrides(spec, cfg, preset) {
  const {
    preset: _preset,
    outline,
    layer,
    shader,
    thicknessScale,
    attenuationScale,
    environmentScale,
    surfaceSide,
    ...rest
  } = cfg;

  if (Number.isFinite(thicknessScale) && typeof spec.material.thickness === 'number') {
    spec.material.thickness *= Math.max(0, thicknessScale);
  }
  if (typeof spec.material.attenuationDistance === 'number') {
    const resolvedAttenuationScale = Number.isFinite(attenuationScale)
      ? Math.max(0, attenuationScale)
      : (TINTED_VOLUME_PRESETS.has(preset) ? DEFAULT_ATTENUATION_SCALE : 1);
    spec.material.attenuationDistance = Math.max(
      SAFE_MIN_ATTENUATION_DISTANCE,
      spec.material.attenuationDistance * resolvedAttenuationScale,
    );
  }
  if (Number.isFinite(environmentScale) && typeof spec.material.envMapIntensity === 'number') {
    spec.material.envMapIntensity *= Math.max(0, environmentScale);
  }
  if (surfaceSide === 'front') spec.material.side = THREE.FrontSide;
  else if (surfaceSide === 'double') spec.material.side = THREE.DoubleSide;
  applyObjectProperties(spec.material, rest);
  if ('emissiveIntensity' in rest) {
    spec.baseEmissive = rest.emissiveIntensity;
    spec.hoverEmissive = Math.max(spec.hoverEmissive, spec.baseEmissive + 0.25);
  }
  if (outline === false) {
    spec.outline = null;
    for (const layer of spec.layers || []) layer.outline = null;
  } else if (outline && typeof outline === 'object') {
    if (spec.outline) applyObjectProperties(spec.outline, outline);
    for (const layer of spec.layers || []) {
      if (layer.outline) applyObjectProperties(layer.outline, outline);
    }
  }

  const firstLayer = spec.layers?.[0];
  if (firstLayer && layer && typeof layer === 'object') {
    const { outline: layerOutline, inset, height, embed, ...layerMaterial } = layer;
    if (Number.isFinite(inset)) firstLayer.inset = inset;
    if (Number.isFinite(height)) firstLayer.height = height;
    if (Number.isFinite(embed)) firstLayer.embed = embed;
    applyObjectProperties(firstLayer.material, layerMaterial);
    if (layerOutline === false) firstLayer.outline = null;
    else if (firstLayer.outline && layerOutline && typeof layerOutline === 'object') {
      applyObjectProperties(firstLayer.outline, layerOutline);
    }
  }

  const shaderUniforms = spec.material.userData.lustreShader?.uniforms;
  if (shaderUniforms && shader && typeof shader === 'object') {
    for (const [key, value] of Object.entries(shader)) {
      if (
        key in shaderUniforms
        && typeof shaderUniforms[key].value === 'number'
        && Number.isFinite(value)
      ) shaderUniforms[key].value = value;
    }
  }
}

/** Safely apply public overrides without replacing Three.js Color instances. */
function applyObjectProperties(target, overrides) {
  for (const [key, value] of Object.entries(overrides || {})) {
    if (!(key in target) || value === undefined) continue;
    const current = target[key];
    if (current instanceof THREE.Color) current.set(value);
    else target[key] = value;
  }
}

/**
 * Which cross-section profile flatters a preset when the user didn't choose
 * one (`pie.profile: 'auto'` / `radial.profile: 'auto'`). Neon wants crisp
 * edges for its rim lines.
 * @param {string | object} material
 * @returns {string}
 */
export function autoProfileFor(material) {
  const preset = typeof material === 'string' ? material : material?.preset;
  return SHARP_EDGE_PRESETS.has(preset) ? 'straight' : 'rounded';
}

/** True when bars should default to crisp geometry for a graphic preset. */
export function materialPrefersSharpEdges(material) {
  const preset = typeof material === 'string' ? material : material?.preset;
  return SHARP_EDGE_PRESETS.has(preset);
}

/**
 * True when the preset asks for bloom by default (`effects.bloom: 'auto'`).
 * @param {string | object} material
 */
export function materialWantsBloom(material) {
  const preset = typeof material === 'string' ? material : material?.preset;
  return preset === 'neon' || preset === 'hologram';
}
