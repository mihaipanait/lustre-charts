<div align="center">

# Lustre Charts

**Gorgeous, vibe coded, configurable 3D charts for the web.**

*In mineralogy, "lustre" names the ways light plays on a surface — metallic, vitreous, adamantine.
This library brings those finishes to your data.*

[![live demo](https://img.shields.io/badge/%E2%96%B6%20live%20demo-mihaipanait.github.io-ff4081)](https://mihaipanait.github.io/lustre-charts/)
[![CI](https://github.com/mihaipanait/lustre-charts/actions/workflows/ci.yml/badge.svg)](https://github.com/mihaipanait/lustre-charts/actions/workflows/ci.yml)
[![npm](https://img.shields.io/badge/npm-lustre--charts-cb3837?logo=npm)](https://www.npmjs.com/package/lustre-charts)
[![license](https://img.shields.io/badge/license-MIT-7c4dff)](LICENSE)
[![three.js](https://img.shields.io/badge/three.js-r175--r185-00e5ff?logo=three.js&logoColor=white)](https://threejs.org)
[![zero deps](https://img.shields.io/badge/runtime%20deps-zero-39ff88)](package.json)
[![no build](https://img.shields.io/badge/build%20step-none-ffb300)](#development)

<img src="docs/assets/hero-donut-dark.jpg" alt="Lustre donut chart, glossy material, dark theme" width="820" />

**[▶ Play with the live demo](https://mihaipanait.github.io/lustre-charts/)** — tune every material, palette, effect and quality setting, then export the exact configuration.

*Few chart types. Obsessive attention to how they look.*

</div>

---

Lustre is a small 3D charting library built on [three.js](https://threejs.org). It deliberately
ships **a few chart types with deep configurability and reference-grade visual quality**, rather
than fifty chart types that all look like homework:

- 🥧 **Pie / Donut** — revolved cross-section profiles (rounded, straight, pillow, tube… or your
  own points), pad angles, exploding slices, callout labels
- 🌀 **Radial** — independently scaled concentric percentage rings, progress-edge callouts,
  collision-free label lanes and optional recessed tracks
- 📊 **Bar** — single or grouped series, rounded bars, projected value axis, staggered entrances

Everything else is *look and feel*:

| | |
|---|---|
| 🎨 **15 material presets** | PBR, translucent, subsurface, harmonic color, spectral, fabric, toon, procedural print, and inset finishes — each with curated, exportable controls |
| 🌗 **Themes** | `dark`, `light`, fully custom objects, transparent backgrounds |
| 🌈 **8 palettes** | aurora, neon, metal, candy, ocean, sunset, violet, mono — or any color array, auto-extended for large datasets |
| ✨ **Effects** | bloom post-processing, neon grid floor, HUD rings, floating particles, soft contact shadow |
| 🎬 **Motion** | sweep / rise / scale / wave / grow entrances, tweened data updates, hover lift & glow, click-to-explode/lift |
| 🏷 **Overlays** | SVG callout labels (dot + elbow leader), frosted-glass tooltip, interactive legend with animated re-layout |
| ♻️ **Engineering** | render-on-demand loop, `ResizeObserver` responsive, PNG + configuration export, complete `destroy()`, zero dependencies beyond `three` |

## Gallery

| Glossy · light | Metal · light | Metal · dark |
|---|---|---|
| ![glossy light](docs/assets/glossy-light.jpg) | ![metal light](docs/assets/metal-light.jpg) | ![metal dark](docs/assets/metal-dark.jpg) |

| Neon + grid + bloom | Neon bars | Glass · dark |
|---|---|---|
| ![neon](docs/assets/neon-dark.jpg) | ![neon bars](docs/assets/bar-neon.jpg) | ![glass](docs/assets/glass-dark.jpg) |

| Crystal · dark | Iridescent · dark | Inset face · dark |
|---|---|---|
| ![crystal](docs/assets/crystal-dark.jpg) | ![iridescent](docs/assets/iridescent-dark.jpg) | ![inset](docs/assets/inset-dark.jpg) |

| Toon · light | `tube` profile | Custom profile (your own points!) |
|---|---|---|
| ![toon](docs/assets/toon-light.jpg) | ![tube profile](docs/assets/profile-tube.jpg) | ![custom profile](docs/assets/profile-custom.jpg) |

## Quick start

### npm

```bash
npm install lustre-charts three
```

TypeScript declarations ship with the package. Because three.js publishes its
types separately, TypeScript projects should also install the matching type
package:

```bash
npm install -D @types/three
```

```js
import { LustreChart } from 'lustre-charts';

const chart = new LustreChart('#app', {
  type: 'donut',
  data: [
    { label: 'Chrome', value: 64 },
    { label: 'Safari', value: 19 },
    { label: 'Edge', value: 9 },
    { label: 'Firefox', value: 8 },
  ],
  options: {
    theme: 'dark',
    material: 'glossy',
    palette: 'aurora',
  },
});
```

### No bundler? No problem

Lustre is plain ES modules — an import map is all you need:

```html
<div id="app" style="width:100%;height:480px"></div>

<script type="importmap">
{
  "imports": {
    "three": "https://cdn.jsdelivr.net/npm/three@0.185.1/build/three.module.js",
    "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.185.1/examples/jsm/",
    "lustre-charts": "https://cdn.jsdelivr.net/npm/lustre-charts/src/index.js"
  }
}
</script>

<script type="module">
  import { LustreChart } from 'lustre-charts';
  new LustreChart('#app', { type: 'pie', data: [12, 19, 3, 5] });
</script>
```

## The fun parts

### Materials in one line

```js
options: { material: 'neon' }        // bloom auto-enables, rim lines appear
options: { material: 'metal', palette: 'metal' }   // brushed gold/silver/copper
options: { material: { preset: 'glass', roughness: 0.02, ior: 1.8 } } // override anything
options: { material: { preset: 'toon', outline: { color: '#fff', widthPx: 4 } } }
options: { material: { preset: 'subsurface', shader: { radius: 1.1, backscatter: 0.8 } } }
options: { material: { preset: 'tricolor', shader: { dominance: 0.2, flow: 1.25 } } }
```

Every preset has a curated editor in the demo. It shows the active defaults,
supports per-control and per-material resets, retains edits while you compare
finishes, and includes the active material/shader settings in **Copy config**
and **View config**.

### Reference or balanced quality

```js
options: { quality: { preset: 'ultra' } }     // 512px PMREM, 256/16/64 geometry (default)
options: { quality: { preset: 'balanced' } }  // 256px PMREM, 256/8/32 geometry
```

Both tiers keep physical transmission at full resolution. Expert overrides
include `environmentSize` (64–2048px PMREM faces), `radialResolution`
(24–512 angular segments), `roundedSegments`, `tubeSegments`, PMREM blur, and
transmission resolution scale. The demo intentionally starts at 1024px for
close inspection; 2048px is available as an experimental, high-memory option.

### Cross-section profiles

The donut's cross-section is a first-class citizen. Use a preset…

```js
options: { pie: { profile: 'tube' } }   // torus-like, straight, rounded, pillow…
```

…or hand it your own 2D outline (`x` = radius, `y` = height) and Lustre revolves it, caps it
and lights it:

```js
options: {
  pie: {
    profile: [
      { x: 3.1, y: -0.5 }, { x: 3.25, y: 0 }, { x: 3.1, y: 0.5 },
      { x: 2.0, y: 0.62 }, { x: 1.2, y: 0.45 }, { x: 1.0, y: -0.5 },
    ],
  },
}
```

### Concentric radial percentages

Each item owns a complete scale rather than sharing a pie total. Data order is
inner-to-outer and a full revolution is 100 by default:

```js
new LustreChart('#app', {
  type: 'radial',
  data: [
    { label: 'Reach', value: 34 },
    { label: 'Growth', value: 52 },
    { label: 'Quality', value: 68 },
    { label: 'Velocity', value: 81 },
    { label: 'Target', value: 100 },
  ],
  options: {
    radial: { ringGap: 0.09, track: true },
  },
});
```

<img src="docs/assets/radial-glossy-dark.png" alt="Lustre concentric radial percentage chart with 3D glossy rings and callout labels" width="820" />

### Live updates

```js
chart.update({ data: newData });                  // tweened re-layout
chart.setTheme('light');                          // relights the scene
chart.applyOptions({ material: 'hologram' });     // hot-swap the look
chart.replay();                                   // run the entrance again
const png = chart.toDataURL();                    // export what you see
chart.destroy();                                  // leaves zero traces
```

### Events

```js
options: {
  interaction: {
    onHover: (item) => console.log(item),         // { label, value, percent, color… }
    onClick: (item) => {},
    onSelect: (selectedItems) => {},
  },
}
```

## Documentation

| | |
|---|---|
| [Getting started](docs/getting-started.md) | install, first chart, data formats |
| [Configuration reference](docs/configuration.md) | every option, annotated |
| [Materials & theming](docs/materials-and-theming.md) | presets, palettes, themes, effects, custom studio |
| [Pie & donut charts](docs/charts/pie.md) | profiles, explode, labels, sorting |
| [Radial charts](docs/charts/radial.md) | concentric percentages, tracks, labels, updates |
| [Bar charts](docs/charts/bar.md) | series, axis, entrances |

## Demo playground

**[▶ mihaipanait.github.io/lustre-charts](https://mihaipanait.github.io/lustre-charts/)** — hosted straight from this repo, nothing to install.

Or run it locally:

```bash
git clone https://github.com/mihaipanait/lustre-charts.git
cd lustre-charts
npm run dev            # → http://localhost:5173/demo/
```

The [demo](demo/) lets you flip through every chart type, material, palette,
theme, profile and effect. **Material settings** exposes the useful artistic
controls for the selected finish, while **Quality lab** exposes raw PMREM,
transmission and geometry settings. **Copy config** / **View config** includes
those active material, shader and quality overrides in the generated snippet.

<img src="docs/assets/demo-page.jpg" alt="Lustre demo playground" width="820" />

## Development

There is **no build step**. The library is modern ES modules in [`src/`](src/), loaded directly
by the demo via an import map. Edit, refresh, done. See [CONTRIBUTING.md](CONTRIBUTING.md).

```bash
npm run check          # unit/geometry, lint, types, packed consumer, publint
npm run test:browser   # Chromium integration, accessibility, lifecycle, mobile
```

```
src/
├── index.js          public API (LustreChart factory + exports)
├── core/             BaseChart rig · tween engine · themes · palettes · utils
├── charts/           PieChart · RadialChart · BarChart
├── geometry/         profile revolve + cap builder, outline builder
├── materials/        the fifteen PBR and graphic presets
├── overlay/          SVG callout labels · tooltip · legend
└── fx/               studio environment · bloom · grid/rings/particles/shadow
```

> **Heads-up:** three.js prints a cosmetic `sigmaRadians … will clip` warning while
> pre-filtering the environment. It is harmless and comes from three's PMREM mip chain,
> not your code.

## Browser support

Any evergreen browser with WebGL2. The supported and continuously tested
three.js range is `>= 0.175.0 < 0.186.0`. r175 is the minimum because it adds
the variable-size `PMREMGenerator.fromScene()` API used by Lustre's reflection
quality controls.

## Vibe coded

Lustre Charts is a **vibe coded project**. It began with an original idea by Mihai Panait,
then evolved through iterative collaboration with AI models including Gemini, Claude, Codex,
DeepSeek and Kimi. These models helped refine, implement, review, test and polish the project,
while its creative direction and final decisions remain human-led.

## License

[MIT](LICENSE) © 2026 Mihai Panait

---

<div align="center">
<sub>Built with an unreasonable amount of care about specular highlights.</sub>
</div>
