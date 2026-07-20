# Pie & donut charts

`type: 'pie'` and `type: 'donut'` are the same chart — donut simply defaults
`pie.innerRadius` to `radius * 0.55`.

```js
new LustreChart('#app', {
  type: 'donut',
  data: [
    { label: 'Aurora', value: 34 },
    { label: 'Nova', value: 24 },
    { label: 'Pulse', value: 17 },
  ],
  options: { pie: { height: 1.15, padAngle: 1.4, cornerRadius: 0.16 } },
});
```

## Profiles

The cross-section ("profile") is revolved between each slice's angles and capped
with flat faces. It is the single most character-defining geometry option.

| Value | Result |
|---|---|
| `'auto'` | `rounded` for most materials, `straight` for `neon` (crisp rims). |
| `'straight'` | Sharp rectangular section — architectural, great for neon. |
| `'rounded'` | Rect with `cornerRadius` bevels — the premium default. |
| `'pillow'` | Heavily rounded cushion. |
| `'tube'` | Elliptical section → torus-style donut. |
| `[{x, y}, …]` | **Your own outline.** `x` = radius, `y` = height, wound counter-clockwise. Lustre closes the loop, detects hard corners for crisp shading, and even runs neon rim lines along them. |

```js
// a stepped "wedding cake" section
options: {
  pie: {
    profile: [
      { x: 3.0, y: -0.55 }, { x: 3.0, y: 0.1 },
      { x: 2.4, y: 0.1 },  { x: 2.4, y: 0.55 },
      { x: 1.2, y: 0.55 }, { x: 1.2, y: -0.55 },
    ],
  },
}
```

> This is the productized version of the profile editor in the original sample
> project — feed the array from any UI you like and call
> `chart.applyOptions({ pie: { profile } })`.

## Angles & layout

- `startAngle: -90` starts at 12 o'clock; `clockwise: true` sweeps like a clock.
- `padAngle` (degrees) separates slices; caps make the gaps read as machined cuts.
- `sort: 'desc'` lays out slices largest-first without touching your data order
  (legend and colors stay stable).

## Exploding

Three layers, all combinable:

```js
options: { pie: { explode: 0.15 } }            // whole chart, subtle separation
data: [{ label: 'Hero', value: 40, offset: 0.5 }, …]   // one slice, permanent
options: { interaction: { select: 'explode', explodeDistance: 0.45 } } // on click
```

Hover adds `interaction.liftDistance` on top (`hover: 'lift' | 'both'`).

## Labels

SVG callouts with a dot, an elbow leader and text — crisp at any DPI, colored by
the theme, dimmed when a slice faces away, faded in as its slice sweeps in.

```js
options: {
  labels: {
    format: (d) => `${d.label} ${d.value.toLocaleString()}`,
    offset: 60,
    minPercent: 4,
  },
}
```

## Legend interaction

Clicking a legend chip hides its slice; the pie re-lays-out with a tween and
percentages re-normalize over the visible slices. Hovering a chip highlights the
slice in 3D.

## Data updates

```js
chart.setData(next);          // angles tween from the current layout
chart.update({ data: next, options: { palette: 'sunset' } });
```

Slice identity is matched by index; hidden-state is carried over by label.

## Events

`onHover` / `onClick` / `onSelect` receive `{ index, label, value, percent, color }`.
