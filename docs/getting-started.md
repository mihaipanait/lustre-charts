# Getting started

## Installation

### With a bundler (Vite, webpack, esbuild…)

```bash
npm install lustre-charts three
```

`three` is a peer dependency (`>= 0.167`) — you control the version.

```js
import { LustreChart } from 'lustre-charts';
```

### Without a bundler

Lustre ships as plain ES modules, so a static server plus an import map is a complete setup:

```html
<script type="importmap">
{
  "imports": {
    "three": "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js",
    "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/",
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
  type: 'donut',                       // 'pie' | 'donut' | 'bar'
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

## Next steps

- Skim the [configuration reference](configuration.md) — everything is an option.
- Try the [materials & theming guide](materials-and-theming.md) for the six looks.
- Chart specifics: [pie/donut](charts/pie.md), [bar](charts/bar.md).
- Or just open the demo (`npm run dev` → `http://localhost:5173/demo/`) and copy
  the generated config.
