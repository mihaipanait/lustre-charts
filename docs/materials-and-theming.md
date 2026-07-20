# Materials & theming

The visual system has four independent axes — mix them freely:

```
material (surface)  ×  palette (colors)  ×  theme (scene)  ×  effects (garnish)
```

## Material presets

All presets are physically based (`MeshPhysicalMaterial`) and lit by Lustre's
procedural **studio environment**: a black room with a handful of bright softboxes
(plus a bright surround on light themes). That's why metals get long elegant streaks
and colors stay saturated — there is almost no diffuse wash.

| Preset | Vibe | Notes |
|---|---|---|
| `glossy` | Candy / automotive clearcoat | The classic premium-infographic look. Default. |
| `glass` | Tinted refractive glass | Transmission, absorption, slight dispersion; frosted with an inner glow on dark themes. |
| `metal` | Brushed metal | Anisotropic highlights. Pairs beautifully with `palette: 'metal'`. |
| `neon` | Translucent body + glowing rims | Auto-enables bloom; crisp `straight` profile by default. |
| `hologram` | Iridescent sci-fi UI | Thin-film iridescence + rim lines; bloom auto-enables. |
| `matte` | Soft minimal | For clean business dashboards, especially on light. |

### Overriding a preset

Pass an object instead of a string — every `MeshPhysicalMaterial` property is fair game:

```js
options: {
  material: {
    preset: 'glass',
    roughness: 0.02,
    ior: 1.8,
    dispersion: 0.6,
    outline: false,          // suppress rim lines (neon/hologram)
    // outline: { widthPx: 3, opacity: 0.8 },  // …or tune them
  },
}
```

Per-item overrides work the same way inside pie data (`{ label, value, material: {...} }`).

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
