/**
 * Curated controls for the material playground. These intentionally expose
 * useful artistic decisions instead of dumping every Three.js property into
 * the UI. Paths map directly to Lustre's public material override object.
 */

const range = (group, path, label, min, max, step, defaultValue, description, extra = {}) => ({
  type: 'range', group, path, label, min, max, step, defaultValue, description, ...extra,
});

const color = (group, path, label, defaultValue, description, extra = {}) => ({
  type: 'color', group, path, label, defaultValue, description, ...extra,
});

const select = (group, path, label, options, defaultValue, description, extra = {}) => ({
  type: 'select', group, path, label, options, defaultValue, description, ...extra,
});

const opticalSurface = () => [
  select('Optics', 'surfaceSide', 'Surface rendering', [
    { value: 'front', label: 'Front faces' },
    { value: 'double', label: 'Double sided' },
  ], 'double', 'Render both entry and rear surfaces of the transparent volume.'),
  range('Optics', 'environmentScale', 'Reflection strength', 0, 2, 0.05, 1, 'Multiplier for reflections from the studio environment.', { suffix: '×' }),
];

const surface = {
  roughness: (value, light = value, step = 0.01) => range('Surface', 'roughness', 'Roughness', 0, 1, step, value, 'Blur or sharpen reflections.', { lightDefault: light }),
  metalness: (value) => range('Surface', 'metalness', 'Metalness', 0, 1, 0.01, value, 'Blend between dielectric and metallic response.'),
  clearcoat: (value) => range('Surface', 'clearcoat', 'Clearcoat', 0, 1, 0.01, value, 'Strength of the polished outer coat.'),
  coatRoughness: (value) => range('Surface', 'clearcoatRoughness', 'Coat roughness', 0, 1, 0.01, value, 'Softness of clearcoat highlights.'),
  emission: (dark, light = dark, step = 0.01) => range('Light', 'emissiveIntensity', 'Self illumination', 0, 2, step, dark, 'Light emitted by the material itself.', { lightDefault: light }),
};

const optics = {
  transmission: (value, light = value) => range('Optics', 'transmission', 'Transmission', 0, 1, 0.01, value, 'Amount of light passing through the material.', { lightDefault: light }),
  volume: () => range('Optics', 'thicknessScale', 'Volume depth', 0.1, 2.5, 0.05, 1, 'Multiplier for the preset’s geometry-aware optical thickness.', { suffix: '×' }),
  attenuation: () => range('Optics', 'attenuationScale', 'Tint distance', 0, 3, 0.05, 0.15, 'Multiplier for the distance light travels before absorbing color. Zero gives maximum absorption.', { suffix: '×' }),
  ior: (value) => range('Optics', 'ior', 'Refraction index', 1, 2.333, 0.01, value, 'Controls how strongly light bends through the surface.'),
  dispersion: (value) => range('Optics', 'dispersion', 'Dispersion', 0, 1, 0.01, value, 'Separates refracted light into spectral colors.'),
};

const outline = (
  width,
  opacity,
  darkColor,
  lightColor = darkColor,
  defaultText = null,
  { lightOpacity = opacity } = {},
) => [
  color('Outline', 'outline.color', 'Outline color', darkColor, 'Color of the generated silhouette and feature lines.', {
    lightDefault: lightColor,
    defaultText,
  }),
  range('Outline', 'outline.widthPx', 'Outline width', 0.25, 6, 0.05, width, 'Line width in screen pixels.', { suffix: ' px' }),
  range('Outline', 'outline.opacity', 'Outline opacity', 0, 1, 0.01, opacity, 'Visibility of the generated linework.', { lightDefault: lightOpacity }),
];

export const MATERIAL_CONTROLS = {
  glossy: [
    surface.roughness(0.26),
    surface.metalness(0.02),
    surface.clearcoat(1),
    surface.coatRoughness(0.07),
    range('Surface', 'specularIntensity', 'Specular strength', 0, 1, 0.01, 0.85, 'Brightness of direct dielectric reflections.'),
  ],
  glass: [
    optics.transmission(1),
    surface.roughness(0.08, 0.045, 0.005),
    ...opticalSurface(),
    optics.volume(),
    optics.attenuation(),
    optics.ior(1.5),
    optics.dispersion(0.4),
    surface.clearcoat(1),
    surface.emission(0.018, 0, 0.001),
  ],
  metal: [
    surface.metalness(1),
    surface.roughness(0.24),
    range('Surface', 'anisotropy', 'Brush anisotropy', 0, 1, 0.01, 0.38, 'Stretches reflections into a brushed-metal grain.'),
    range('Surface', 'anisotropyRotation', 'Brush direction', 0, 6.283, 0.001, 1.571, 'Rotation of the anisotropic grain.', { suffix: ' rad' }),
    surface.clearcoat(0.55),
    surface.coatRoughness(0.22),
  ],
  neon: [
    surface.emission(1, 0.7),
    optics.transmission(0.4),
    surface.roughness(0.35),
    optics.volume(),
    optics.ior(1.4),
    surface.clearcoat(0.5),
    ...outline(2.2, 1, '#ffffff', '#ffffff', 'palette tint'),
  ],
  hologram: [
    optics.transmission(0.8),
    surface.roughness(0.1),
    optics.volume(),
    optics.ior(1.35),
    range('Film', 'iridescence', 'Iridescence', 0, 1, 0.01, 1, 'Strength of thin-film spectral reflections.'),
    range('Film', 'iridescenceIOR', 'Film refraction', 1, 2.333, 0.01, 1.6, 'Optical density of the iridescent film.'),
    surface.emission(0.42, 0.12),
    ...outline(1.6, 0.85, '#ffffff', '#ffffff', 'palette tint'),
  ],
  matte: [
    surface.roughness(0.82),
    surface.metalness(0),
    surface.clearcoat(0.1),
    surface.coatRoughness(0.6),
    surface.emission(0),
  ],
  toon: [
    surface.emission(0.055, 0.015, 0.005),
    ...outline(3.2, 0.98, '#05060b', '#11121a'),
  ],
  halftone: [
    range('Pattern', 'shader.scale', 'Dot frequency', 2, 18, 0.1, 7.5, 'Number of procedural print cells across object space.'),
    range('Pattern', 'shader.dotSize', 'Dot size', 0.04, 0.46, 0.005, 0.205, 'Radius of each printed dot.'),
    range('Pattern', 'shader.inkStrength', 'Ink strength', 0, 1, 0.01, 0.88, 'Blend strength of the dark ink pattern.'),
    surface.roughness(0.68),
    surface.clearcoat(0.22),
    ...outline(2.7, 0.98, '#05060b', '#12131b'),
  ],
  iridescent: [
    surface.roughness(0.12),
    surface.metalness(0.32),
    range('Film', 'iridescence', 'Iridescence', 0, 1, 0.01, 1, 'Strength of the physical thin-film layer.'),
    range('Film', 'iridescenceIOR', 'Film refraction', 1, 2.333, 0.01, 1.78, 'Optical density of the film.'),
    range('View color', 'shader.fresnelPower', 'Edge focus', 0.35, 4, 0.05, 1.55, 'Concentrates color change toward grazing view angles.'),
    range('View color', 'shader.colorStrength', 'Color shift', 0, 1.2, 0.01, 0.5, 'Amount of view-dependent spectral color.'),
    range('View color', 'shader.colorCycles', 'Spectrum cycles', 0.25, 3, 0.01, 1.18, 'Rate of hue travel as the camera orbits.'),
    surface.clearcoat(1),
  ],
  crystal: [
    optics.transmission(1),
    surface.roughness(0.035, 0.035, 0.001),
    ...opticalSurface(),
    optics.volume(),
    optics.attenuation(),
    optics.ior(1.62),
    optics.dispersion(0.92),
    range('Film', 'iridescence', 'Edge iridescence', 0, 1, 0.01, 0.58, 'Spectral coating visible around crystal edges.'),
    ...outline(1.15, 0.84, '#ffffff', '#ffffff', 'palette tint', { lightOpacity: 0.52 }),
  ],
  acrylic: [
    optics.transmission(0.72),
    surface.roughness(0.32, 0.4),
    ...opticalSurface(),
    optics.volume(),
    optics.attenuation(),
    optics.ior(1.47),
    surface.clearcoat(0.82),
    range('Surface', 'sheen', 'Soft sheen', 0, 1, 0.01, 0.36, 'Broad grazing highlight on the polymer surface.'),
    range('Surface', 'sheenRoughness', 'Sheen softness', 0.07, 1, 0.01, 0.72, 'Spread of the soft sheen highlight.'),
  ],
  subsurface: [
    range('Scattering', 'shader.strength', 'Scatter strength', 0, 2, 0.01, 1, 'Amount of diffuse light that bleeds around and through the surface.'),
    range('Scattering', 'shader.radius', 'Scatter radius', 0.05, 2, 0.05, 1.1, 'How far light spreads through the palette-tinted material.'),
    range('Scattering', 'shader.wrap', 'Light wrap', 0, 1, 0.01, 0.48, 'How far direct light bends around the surface terminator.'),
    range('Scattering', 'shader.backscatter', 'Backlight glow', 0, 2, 0.01, 1.35, 'Strength of transmitted glow when a light is behind the object.'),
    optics.transmission(0.58, 0.48),
    optics.volume(),
    range('Optics', 'attenuationScale', 'Tint distance', 0, 3, 0.05, 1, 'Multiplier for the distance transmitted light travels before absorbing the palette color.', { suffix: '×' }),
    optics.ior(1.42),
    ...opticalSurface(),
    surface.roughness(0.4),
    surface.clearcoat(0.48),
    surface.coatRoughness(0.2),
  ],
  velvet: [
    surface.roughness(0.86),
    range('Fabric', 'sheen', 'Sheen strength', 0, 1, 0.01, 1, 'Brightness of fibers at grazing angles.'),
    range('Fabric', 'sheenRoughness', 'Fiber softness', 0.07, 1, 0.01, 0.48, 'Spread of the fabric sheen.'),
    surface.clearcoat(0),
    surface.emission(0.08, 0),
  ],
  inset: [
    color('Inset face', 'layer.color', 'Face color', '#ffffff', 'Solid color of the embedded top face.'),
    range('Inset face', 'layer.inset', 'Face inset', 0.01, 0.3, 0.005, 0.095, 'Distance from the colored backing edge.'),
    range('Inset face', 'layer.height', 'Face thickness', 0.04, 0.35, 0.005, 0.13, 'Thickness of the inset face relative to the chart.'),
    range('Inset face', 'layer.embed', 'Embedded amount', 0, 0.95, 0.01, 0.62, 'Fraction of the face thickness sunk into the backing.'),
    range('Inset face', 'layer.roughness', 'Face roughness', 0, 1, 0.01, 0.25, 'Softness of highlights on the white face.'),
    range('Inset face', 'layer.clearcoat', 'Face clearcoat', 0, 1, 0.01, 0.88, 'Polish on the embedded face.'),
    color('Inset face', 'layer.outline.color', 'Face edge color', '#24103f', 'Color separating the inset face from its backing.', { defaultText: 'palette shadow' }),
    range('Inset face', 'layer.outline.widthPx', 'Face edge width', 0.25, 4, 0.05, 1.35, 'Width of the embedded face edge.', { suffix: ' px' }),
    surface.roughness(0.3),
    surface.clearcoat(0.82),
  ],
};

export function controlDefault(control, theme) {
  return theme === 'light' && control.lightDefault !== undefined
    ? control.lightDefault
    : control.defaultValue;
}

export function getPath(object, path) {
  return path.split('.').reduce((value, key) => value?.[key], object);
}

export function setPath(object, path, value) {
  const keys = path.split('.');
  let target = object;
  for (const key of keys.slice(0, -1)) target = target[key] ||= {};
  target[keys.at(-1)] = value;
}

export function deletePath(object, path) {
  const keys = path.split('.');
  const stack = [];
  let target = object;
  for (const key of keys.slice(0, -1)) {
    if (!target?.[key]) return;
    stack.push([target, key]);
    target = target[key];
  }
  delete target[keys.at(-1)];
  for (let i = stack.length - 1; i >= 0; i--) {
    const [parent, key] = stack[i];
    if (Object.keys(parent[key]).length === 0) delete parent[key];
  }
}

export function countLeaves(object) {
  if (!object || typeof object !== 'object') return 0;
  return Object.values(object).reduce(
    (count, value) => count + (value && typeof value === 'object' ? countLeaves(value) : 1),
    0,
  );
}
