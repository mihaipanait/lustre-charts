# Bar charts

`type: 'bar'` renders rounded 3D columns — one row for a single series, a
categories × series grid for more.

```js
new LustreChart('#app', {
  type: 'bar',
  data: {
    categories: ['Q1', 'Q2', 'Q3', 'Q4'],
    series: [
      { name: '2024', values: [42, 58, 51, 74] },
      { name: '2025', values: [55, 67, 80, 96] },
      { name: '2026', values: [68, 84, 97, 121] },
    ],
  },
  options: {
    bar: { barWidth: 0.6, gap: 0.25, cornerRadius: 0.07 },
  },
});
```

## Coloring rules

- **Single series** → bars are colored *per category* (and the legend lists categories).
- **Multiple series** → bars are colored *per series* (legend lists series).
  Override with `series[i].color`, or give a series its own `material`.

## Value axis

Tick values are chosen from the "nice number" family (1 / 2 / 2.5 / 5 × 10ⁿ) to cover
the data maximum:

```js
options: {
  bar: {
    maxHeight: 3.1,                 // world height of the top tick
    axis: {
      ticks: 5,
      format: (v) => `$${v / 1000}k`,
    },
  },
}
```

Category labels are projected under the front row and follow the camera. Disable with
`bar.categoryLabels: false`, or the whole axis with `bar.axis.show: false`.

## Entrances

| Name | Motion |
|---|---|
| `'wave'` *(auto)* | Bars grow with a diagonal stagger across the grid. |
| `'grow'` | Bars grow staggered by category. |
| `'rise'` | Bars drop in from above with a bounce. |
| `'none'` | Everything appears settled. |

```js
options: { animation: { entrance: 'rise', stagger: 90 } }
chart.replay();
```

## Updates

If the new data has the same shape (categories × series), bars tween to their new
heights — bevels are rebuilt at the target size so the final geometry is exact.
Different shapes rebuild with a fresh entrance.

```js
chart.setData({
  categories: ['Q1', 'Q2', 'Q3', 'Q4'],
  series: [{ name: '2024', values: [50, 61, 44, 90] }, …],
});
```

## Neon bars

With `material: 'neon'`, bars switch to crisp boxes with glowing edge lines and
bloom — the synthwave look. Add `effects: { grid: true }` for the full retro floor.

## Interaction

Hovering glows (and slightly swells) a bar; hovering a legend chip highlights its
whole series. Clicking a legend chip collapses/restores the series with a tween.
`onHover` / `onClick` items look like
`{ index, label, series, value, color, category }`.
