# Radial charts

`type: 'radial'` renders one independent value per concentric 3D ring. Every
complete circle represents `radial.maxValue` (100 by default); unlike a pie,
the values are not divided by a shared total.

```js
const chart = new LustreChart('#stage', {
  type: 'radial',
  data: [
    { label: 'Reach', value: 34 },
    { label: 'Growth', value: 52 },
    { label: 'Quality', value: 68 },
    { label: 'Velocity', value: 81 },
    { label: 'Target', value: 100 },
  ],
  options: {
    material: 'glossy',
    palette: 'aurora',
    radial: { ringGap: 0.09, profile: 'rounded' },
  },
});
```

## Values and order

Data accepts the same friendly forms as pie data:

```js
data: [25, 50, 75, 100]

data: [
  { label: 'Availability', value: 99.95, color: '#39ff88' },
  { label: 'Satisfaction', value: 86, material: 'metal' },
]

data: {
  labels: ['Availability', 'Satisfaction'],
  values: [99.95, 86],
  colors: ['#39ff88', '#00e5ff'],
}
```

The first data item is the **innermost** ring and the last is the outermost.
Values are clamped visually to `0…maxValue`; the original non-negative value
is retained in events and tooltips. Negative and non-numeric values render as
zero. Set another scale when the source data is not already a percentage:

```js
options: { radial: { maxValue: 500 } }
```

A value of `250` now renders a 50% ring while callbacks receive
`{ value: 250, maxValue: 500, percent: 50 }`.

## Ring geometry

`radius`, `innerRadius`, and `ringGap` define the available annulus. Lustre
divides the remaining width equally across the current item count and rejects
combinations that would create zero-width or overlapping rings.

```js
options: {
  radial: {
    radius: 3,
    innerRadius: 0.45,
    ringGap: 0.09,
    height: 0.7,
    cornerRadius: 0.1,
    startAngle: -90,
    clockwise: true,
  },
}
```

The built-in `auto`, `straight`, `rounded`, `pillow`, and `tube` profiles use
the same machined cross-sections as pie and donut charts. A custom profile is
normalized into every ring band, so one silhouette can repeat without its
absolute coordinates causing the rings to overlap:

```js
options: {
  radial: {
    profile: [
      { x: 0, y: -1 },
      { x: 1, y: -1 },
      { x: 1.15, y: 0 },
      { x: 1, y: 1 },
      { x: 0, y: 1 },
    ],
  },
}
```

## Recessed tracks

Set `track: true` to place a shallow neutral full circle underneath each data
ring. The progress arc stays fully pickable while the track shows the unused
part of the scale. Tracks can be tuned without changing the data material:

```js
options: {
  radial: {
    track: { color: '#667085', opacity: 0.35 },
  },
}
```

`color: 'auto'` follows the current light or dark theme. Tracks rebuild when
the theme changes.

## Labels, tooltips, and legends

Callout leaders originate at the advancing edge of each progress ring. Labels
are split into left/right lanes and vertically distributed to prevent collisions,
including when several values are identical or close together.

```js
options: {
  labels: {
    format: (item) => `${item.label} ${item.percent.toFixed(0)}%`,
    minPercent: 2,
  },
}
```

Legend visibility is independent per ring. Hiding a ring preserves its radial
slot and never changes another item’s percentage. Tooltips expose `value`,
`maxValue`, `fraction`, and `percent`.

## Motion and interaction

`auto` uses a staggered sweep entrance. `rise`, `scale`, and `none` are also
supported. `setData()` tweens every ring from its current angle to the new
independent value.

Hover glow behaves exactly like the other chart types. Lift and click selection
move a ring vertically so the stack remains concentric; pie-style sideways
explosion would destroy the radial comparison.

```js
chart.setData(nextValues);                         // tween ring lengths
chart.applyOptions({ radial: { clockwise: false } }); // rebuild in place
chart.replay();                                    // replay the entrance
```

`onHover`, `onClick`, and `onSelect` receive
`{ index, label, value, maxValue, fraction, percent, color, visible }`.
