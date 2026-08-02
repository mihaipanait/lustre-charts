# Getting started

## Installation

### With a bundler (Vite, webpack, esbuild…)

```bash
npm install lustre-charts three
```

`three` is a peer dependency (`>= 0.175.0 < 0.186.0`) — you control the
version. CI exercises the range floor and the current latest release.

TypeScript declarations are included. TypeScript projects should install the
matching three.js declarations as a development dependency:

```bash
npm install -D @types/three
```

```js
import { LustreChart } from 'lustre-charts';
```

### Without a bundler

Lustre ships as plain ES modules, so a static server plus an import map is a complete setup:

```html
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
  // …
</script>
```

> The `three/addons/` mapping is required — Lustre uses three's official addons
> (OrbitControls, postprocessing, fat lines).

## Your first chart

```html
<div id="app" style="width: 100%; height: 480px"></div>
```

```js
const chart = new LustreChart('#app', {
  type: 'donut',                       // 'pie' | 'donut' | 'radial' | 'bar'
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

The container just needs a size — Lustre fills it, observes it with `ResizeObserver`,
and keeps the camera framed.

## Data formats

### Pie / donut

Any of these are accepted:

```js
// the friendly form
data: [
  { label: 'Chrome', value: 64 },
  { label: 'Safari', value: 19, color: '#ff2ec4' },   // per-item color override
  { label: 'Edge', value: 9, offset: 0.4 },           // pre-exploded slice
  { label: 'Firefox', value: 8, material: 'metal' },  // per-item material
]

// bare numbers
data: [64, 19, 9, 8]

// Chart.js-style parallel arrays
data: { labels: ['Chrome', 'Safari'], values: [64, 19], colors: ['#00e5ff', '#ff2ec4'] }
```

### Radial

Radial data uses the same friendly forms, but every value fills its own
concentric ring rather than being divided by a shared total:

```js
data: [
  { label: 'Reach', value: 34 },       // innermost ring
  { label: 'Growth', value: 52 },
  { label: 'Quality', value: 68 },
  { label: 'Target', value: 100 },     // outermost, complete ring
]

// Parallel arrays work too
data: { labels: ['Reach', 'Growth'], values: [34, 52], colors: ['#00e5ff', '#7c4dff'] }
```

One complete ring is `radial.maxValue` (`100` by default). Values above the
maximum are visually clamped while callbacks retain the original value.

### Bar

```js
// single series (bars are colored per category)
data: [
  { label: 'Mon', value: 42 },
  { label: 'Tue', value: 71 },
]

// multiple series (bars are colored per series, rows along Z)
data: {
  categories: ['Q1', 'Q2', 'Q3', 'Q4'],
  series: [
    { name: '2024', values: [42, 58, 51, 74] },
    { name: '2025', values: [55, 67, 80, 96], color: '#ff2ec4' },
  ],
}
```

## The chart object

```js
chart.update({ data, options })   // update either or both, animated
chart.setData(data, animate?)     // just the data
chart.applyOptions(patch)         // just the options (deep-merged)
chart.setTheme('light')           // shortcut for the theme option
chart.replay()                    // re-run the entrance animation
chart.toDataURL()                 // PNG snapshot of the current view
chart.resize()                    // manual resize (automatic by default)
chart.destroy()                   // dispose GPU resources, DOM, observers
```

Most option patches apply immediately; mesh/material options rebuild the chart
in place. `quality.antialias` is the exception: set it during construction
because WebGL cannot change MSAA on an existing context. See
[runtime option behavior](configuration.md#runtime-option-behavior).

Lustre defaults to reference-quality rendering. Applications displaying many
simultaneous charts can switch tiers at construction or runtime:

```js
chart.applyOptions({ quality: { preset: 'balanced' } });
chart.applyOptions({ quality: { preset: 'ultra' } });
```

## Next steps

- Skim the [configuration reference](configuration.md) — everything is an option.
- Try the [materials & theming guide](materials-and-theming.md) for all fifteen looks.
- Chart specifics: [pie/donut](charts/pie.md), [radial](charts/radial.md), [bar](charts/bar.md).
- Or just open the demo (`npm run dev` → `http://localhost:5173/demo/`) and copy
  the generated config.
