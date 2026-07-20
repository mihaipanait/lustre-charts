# Configuration reference

Everything below goes in the `options` object and is deep-merged over the defaults
(arrays and functions replace, plain objects merge). Runtime changes go through
`chart.applyOptions(patch)`.

```js
new LustreChart(el, { type, data, options: { /* this document */ } });
```

## Top level

| Option | Default | Description |
|---|---|---|
| `theme` | `'dark'` | `'dark'`, `'light'`, or a [custom theme object](materials-and-theming.md#custom-themes). |
| `background` | `'auto'` | `'auto'` (theme backdrop), `'transparent'`, a CSS color, or `{ inner, outer }` for an in-canvas radial gradient. |
| `palette` | `'aurora'` | Palette name (`aurora`, `neon`, `metal`, `candy`, `ocean`, `sunset`, `violet`, `mono`) or an array of colors. Auto-extended when the data has more items. |
| `material` | `'glossy'` | Preset name (`glossy`, `glass`, `metal`, `neon`, `hologram`, `matte`) or `{ preset, ...overrides }` where overrides are any `MeshPhysicalMaterial` property plus `outline`. |
| `responsive` | `true` | Follow the container size via `ResizeObserver`. |
| `ariaLabel` | `null` | Accessible canvas description. Defaults to an auto-generated data summary. |

## `camera`

| Option | Default | Description |
|---|---|---|
| `fov` | `38` | Perspective field of view (degrees). |
| `position` | `null` | `[x, y, z]` override. `null` auto-frames from chart bounds. |
| `elevation` | `26` | Auto-framing: degrees above the horizon. |
| `azimuth` | `0` (pie) / `-32` (bar) | Auto-framing: degrees around the chart. |
| `zoom` | `1` | Auto-framing distance multiplier (smaller = closer). |
| `autoRotate` | `false` | Slow orbital rotation. |
| `autoRotateSpeed` | `0.9` | OrbitControls units (2.0 ≈ one turn / 30 s). |
| `controls.enabled` | `true` | Allow drag-to-orbit. |
| `controls.enableZoom` | `true` | Wheel / pinch zoom. |
| `controls.enablePan` | `false` | Panning. |
| `controls.minPolarAngle` / `maxPolarAngle` | `0.08` / `π/2 + 0.2` | Vertical orbit limits (radians). |
| `controls.minDistanceFactor` / `maxDistanceFactor` | `0.5` / `3.5` | Zoom limits as multiples of the framed distance. |
| `controls.damping` | `0.08` | Inertia of the orbit controls. |

> Once the user orbits manually, option changes stop re-framing the camera —
> their viewpoint wins.

## `pie` (used by `type: 'pie'` and `'donut'`)

| Option | Default | Description |
|---|---|---|
| `radius` | `3` | Outer radius (world units — everything scales together). |
| `innerRadius` | `0` (pie) / `radius * 0.55` (donut) | Hole radius. |
| `height` | `1.15` | Extrusion height. |
| `cornerRadius` | `0.16` | Bevel radius of the cross-section corners. |
| `padAngle` | `1.4` | Gap between slices, degrees. |
| `startAngle` | `-90` | Where the first slice starts (degrees; `-90` = 12 o'clock). |
| `clockwise` | `true` | Sweep direction. |
| `profile` | `'auto'` | Cross-section: `'auto'`, `'straight'`, `'rounded'`, `'pillow'`, `'tube'`, or an array of `{ x, y }` points ([details](charts/pie.md#profiles)). `'auto'` picks what flatters the material. |
| `explode` | `0` | Radial offset applied to all slices. |
| `sort` | `null` | `null`, `'asc'` or `'desc'` — layout order by value. |

## `bar` (used by `type: 'bar'`)

| Option | Default | Description |
|---|---|---|
| `barWidth` / `barDepth` | `0.6` | Bar footprint as a fraction of its grid cell. |
| `gap` | `0.25` | Extra spacing between category cells (fraction). |
| `cornerRadius` | `0.07` | Bar bevel radius (world units). |
| `maxHeight` | `3.1` | World height of the top axis tick. |
| `axis.show` | `true` | Value axis ticks. |
| `axis.ticks` | `4` | Approximate tick count ("nice" values are chosen). |
| `axis.format` | `null` | `(value) => string`. Defaults to compact notation (1.2K, 3M…). |
| `categoryLabels` | `true` | Projected category names under the front row. |

## `labels` (pie callouts)

| Option | Default | Description |
|---|---|---|
| `show` | `true` | Master switch. |
| `format` | `null` | `(item, chart) => string`. Default `` `${label} ${percent}%` ``. |
| `offset` | `48` | Elbow leader length in px. |
| `fontSize` | `13` | Px. |
| `fontFamily` | Inter/system stack | CSS font-family for labels **and** overlays. |
| `color` / `lineColor` | `'auto'` | `'auto'` follows the theme. |
| `dot` | `true` | Colored dot at the text start. |
| `dimBackfacing` | `true` | Fade labels whose slice faces away from the camera. |
| `minPercent` | `2` | Hide labels for slices under this share. |

## `legend`

| Option | Default | Description |
|---|---|---|
| `show` | `true` | HTML legend chips over the canvas. |
| `position` | `'bottom'` | `'bottom'` or `'top'`. |
| `interactive` | `true` | Click chips to toggle items (animated re-layout); hover to highlight. |

## `tooltip`

| Option | Default | Description |
|---|---|---|
| `show` | `true` | Frosted-glass tooltip on hover. |
| `format` | `null` | `(item, chart) => string | HTMLElement` replacing the default content. |

## `animation`

| Option | Default | Description |
|---|---|---|
| `entrance` | `'auto'` | `'auto'` (pie → `sweep`, bar → `wave`), `'sweep'`, `'rise'`, `'scale'`, `'grow'`, `'wave'`, `'none'`. |
| `duration` | `1500` | Entrance duration, ms. |
| `easing` | `'cubicInOut'` | Easing name (see `Easings` export) or a `(t) => t` function. |
| `stagger` | `70` | Delay between items for staggered entrances, ms. |
| `animateUpdates` | `true` | Tween `setData` / legend toggles. |
| `updateDuration` | `750` | Update tween duration, ms. |

## `interaction`

| Option | Default | Description |
|---|---|---|
| `enabled` | `true` | Master switch for pointer handling. |
| `hover` | `'both'` | `'lift'`, `'glow'`, `'both'`, `'none'`. |
| `liftDistance` | `0.25` | Hover lift distance (pie slices move along their bisector). |
| `select` | `'explode'` | Click behavior: `'explode'` or `'none'`. |
| `explodeDistance` | `0.45` | How far selected slices travel. |
| `onHover` | `null` | `(item \| null, event) => void`. |
| `onClick` | `null` | `(item \| null, event) => void`. |
| `onSelect` | `null` | `(selectedItems[]) => void`. |

## `effects`

| Option | Default | Description |
|---|---|---|
| `bloom` | `'auto'` | `'auto'` (on for neon/hologram), `true`, `false`, or `{ strength, radius, threshold }`. |
| `grid` | `false` | Neon grid floor with radial fade. |
| `rings` | `false` | Slowly counter-rotating dashed HUD rings. |
| `particles` | `false` | Floating dust motes. |
| `shadow` | `true` | Soft procedural contact shadow. |

## `quality`

| Option | Default | Description |
|---|---|---|
| `dpr` | `'auto'` | `'auto'` = `min(devicePixelRatio, 2)`, or a number. |
| `antialias` | `true` | MSAA on the WebGL context. |

## Per-item overrides (pie data)

```js
data: [
  { label: 'Featured', value: 40, color: '#ffd700', material: 'metal', offset: 0.3 },
  { label: 'Rest', value: 60 },
]
```

`material` accepts the same string/object forms as the global option and merges over it.
