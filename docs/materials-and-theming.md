# Materials & theming

The visual system has four independent axes — mix them freely:

```
material (surface)  ×  palette (colors)  ×  theme (scene)  ×  effects (garnish)
```

## Material presets

The reflective and translucent presets are physically based (`MeshPhysicalMaterial`)
and lit by Lustre's procedural **studio environment**: a black room with a handful
of bright softboxes (plus a bright surround on light themes). Graphic presets use
Three's toon lighting or small procedural shader treatments while retaining the
same shadows, interaction, and tone-mapping pipeline. No surface texture downloads
are required.

| Preset | Vibe | Notes |
|---|---|---|
| `glossy` | Candy / automotive clearcoat | The classic premium-infographic look. Default. |
| `glass` | Tinted refractive glass | Full transmission, subtle volume absorption, slight dispersion, and polished reflections. |
| `metal` | Brushed metal | Anisotropic highlights. Pairs beautifully with `palette: 'metal'`. |
| `neon` | Translucent body + glowing rims | Auto-enables bloom; crisp `straight` profile by default. |
| `hologram` | Iridescent sci-fi UI | Thin-film iridescence + rim lines; bloom auto-enables. |
| `matte` | Soft minimal | For clean business dashboards, especially on light. |
| `toon` | Editorial 3D illustration | Four-step toon lighting, crisp geometry, and heavy ink outlines. |
| `halftone` | Comic print | Anti-aliased procedural dots with bold outlines; no bitmap texture. |
| `iridescent` | Opaque thin film | Strong spectral color shift as the camera moves. |
| `crystal` | Polished optical glass | High IOR, strong dispersion, precise clearcoat, and long absorption depth. |
| `acrylic` | Frosted translucent polymer | Soft transmission and milky depth under a polished skin. |
| `subsurface` | Soft gel / wax | Partial physical transmission plus palette-aware wrapped diffusion and back-scattering under a polished PBR surface. |
| `tricolor` | Harmonic tri-glass | The palette color anchors a broad gradient between two deterministic split-complementary hues across a translucent volume. |
| `velvet` | Soft textile | Dark diffuse body with colored grazing-angle sheen. |
| `inset` | Inset white face | A smaller solid-white face is physically sunk into a colored backing silhouette. |

### Overriding a preset

Pass an object instead of a string. Physical presets accept
`MeshPhysicalMaterial` properties; `toon` accepts `MeshToonMaterial` properties:

```js
options: {
  material: {
    preset: 'glass',
    roughness: 0.02,
    ior: 1.8,
    dispersion: 0.6,
    thicknessScale: 1.25,   // multiply geometry-aware volume depth
    attenuationScale: 0.15, // glass-family default; 0 requests maximum absorption
    environmentScale: 0.8, // soften studio reflections relative to the preset
    surfaceSide: 'double',  // render entry and rear volume surfaces
    outline: false,          // suppress rims on outlined presets
    // outline: { color: '#ffffff', widthPx: 3, opacity: 0.8 },
  },
}
```

Generated geometry and procedural shaders have focused nested controls:

```js
// Physically embedded face
material: {
  preset: 'inset',
  layer: {
    color: '#fff4c7',
    inset: 0.14,
    height: 0.12,
    embed: 0.75,
    roughness: 0.2,
    outline: { color: '#4b2a13', widthPx: 1.5 },
  },
}

// Procedural print treatment
material: {
  preset: 'halftone',
  shader: { scale: 9, dotSize: 0.18, inkStrength: 0.92 },
  outline: { color: '#ffffff', widthPx: 3 },
}

// Real-time subsurface diffusion
material: {
  preset: 'subsurface',
  shader: { strength: 0.9, radius: 1.1, wrap: 0.4, backscatter: 0.8 },
  transmission: 0.36,
  thicknessScale: 0.8,
  roughness: 0.3,
}

// Palette-derived three-color glass
material: {
  preset: 'tricolor',
  shader: { dominance: 0.2, edgePower: 1.5, flow: 1.25 },
  transmission: 0.48,
}
```

The interactive demo's **Material settings** panel exposes the useful controls
for every preset, shows the active defaults, retains edits while switching
presets, and includes them in **Copy config** / **View config**.

Per-item overrides work the same way inside pie and radial data (`{ label, value, material: {...} }`).

### A note on color fidelity

Bright saturated hues (electric cyan, lime) would normally clip toward white under
studio lighting + filmic tone mapping. Lustre's presets run palette colors through a
**luminance-normalized pigment step** — bright hues start darker and are lit back up
to the intended color. You pick `#00e5ff`; the rendered pixels read `#00e5ff`.

## Palettes

```js
options: { palette: 'sunset' }
options: { palette: ['#ff5e7a', '#ffb545', '#4dde8e'] }   // your own
```

Built-ins: `aurora` (signature teal→violet→magenta), `neon`, `metal` (gold/silver/copper/
graphite/champagne), `candy`, `ocean`, `sunset`, `violet`, `mono`.

If the data has more items than the palette, colors are extended by rotating hue and
alternating lightness so neighbors stay distinguishable.

All palettes are exported:

```js
import { LustrePalettes } from 'lustre-charts';
console.log(LustrePalettes.aurora);  // ['#00e5ff', '#2e8bff', …]
```

## Themes

A theme controls the scene around the data: background, lighting rig, tone-mapping
exposure, overlay colors, decoration tints, shadow strength, bloom threshold.

```js
options: { theme: 'dark' }   // or 'light'
chart.setTheme('light');     // switch at runtime — relights & re-materializes
```

### Custom themes

Pass a partial object; it merges over the base you name with `extends`
(default `dark`):

```js
options: {
  theme: {
    extends: 'dark',
    background: { inner: '#1a1033', outer: '#05010f' },
    accentColor: '#ff2ec4',
    lights: { key: 1.4, rim: 1.2, rimColor: '#ff2ec4' },
    gridColor: '#ff2ec4',
  },
}
```

The full theme shape is documented in [`src/core/themes.js`](../src/core/themes.js) —
every field has a JSDoc annotation.

### Backgrounds

```js
options: { background: 'transparent' }              // let the page show through
options: { background: '#0b0e17' }                  // flat color
options: { background: { inner: '#16203a', outer: '#04060c' } }  // radial gradient
```

The gradient renders *inside* the canvas so bloom composites correctly.
With `'transparent'`, prefer `effects.bloom: false` (bloom over transparency can
fringe on some drivers).

## Effects

```js
options: {
  effects: {
    bloom: 'auto',        // 'auto' | true | false | { strength, radius, threshold }
    grid: true,           // neon floor grid (radial fade)
    rings: true,          // counter-rotating dashed HUD rings
    particles: true,      // floating dust
    shadow: true,         // soft contact shadow
  },
}
```

`bloom: 'auto'` turns on only when a material wants it (neon, hologram) and tunes its
threshold per theme so light themes don't glow indiscriminately. Grid, rings and
particles are tinted by the theme (`gridColor`, `ringColor`).

## Recipes

**Synthwave dashboard**

```js
options: {
  theme: 'dark', material: 'neon', palette: 'neon',
  effects: { grid: true, rings: true, particles: true },
  camera: { autoRotate: true },
}
```

**Annual-report elegance**

```js
options: {
  theme: 'light', material: 'metal', palette: 'metal',
  pie: { profile: 'straight', padAngle: 0.8, height: 0.9 },
  labels: { format: (d) => `${d.label} — ${d.percent.toFixed(0)}%` },
}
```

**Product-page glass**

```js
options: {
  theme: 'light', material: 'glass', palette: 'ocean',
  background: 'transparent',
  effects: { bloom: false },
  legend: { show: false },
}
```

**Spectral material study**

```js
options: {
  theme: 'dark', material: 'iridescent', palette: 'aurora',
  camera: { autoRotate: true }, // the finish changes with view angle
  pie: { profile: 'pillow', height: 1.35, padAngle: 2 },
}
```

**Pop-art infographic**

```js
options: {
  theme: 'light', material: 'halftone', palette: 'candy',
  pie: { profile: 'straight', height: 1.65, padAngle: 3 },
  effects: { bloom: false, shadow: true },
}
```
