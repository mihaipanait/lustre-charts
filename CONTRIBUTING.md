# Contributing to Lustre

Thanks for your interest in making Lustre better! ✨

## Philosophy

Lustre deliberately ships **few chart types with obsessive visual quality and
deep configurability**, rather than many chart types that all look average.
Contributions are judged with that lens:

- A new material preset, theme, entrance animation, decoration or
  configuration knob → 💚 very welcome.
- A new chart type → open an issue first so we can discuss whether it can be
  brought to the same visual bar.
- Anything that adds a runtime dependency beyond `three` → almost certainly
  declined. Zero-dependency (peer `three` only) is a hard design goal.

## Getting started

Lustre is a **no-build library** — plain ES modules, no bundler, no
transpiler. Working on it is refreshingly simple:

```bash
git clone https://github.com/mihaipanait/lustre-charts.git
cd lustre-charts
npm run dev          # static server on http://localhost:5173
# open http://localhost:5173/demo/
```

Every source file in `src/` is loaded directly by the demo through an import
map, so just edit and refresh.

## Project layout

| Path | Purpose |
| --- | --- |
| `src/index.js` | Public entry point / exports |
| `src/core/` | Base chart rig, tween engine, themes, palettes, utils |
| `src/materials/` | Physically based material presets |
| `src/geometry/` | Slice/profile revolve builder, outline builders |
| `src/charts/` | `PieChart`, `BarChart` |
| `src/overlay/` | SVG callout labels, tooltip, legend (DOM) |
| `src/fx/` | Bloom composer + scene decorations |
| `demo/` | The playground page (also serves as visual regression bed) |
| `docs/` | Markdown documentation |

## Code style

- Modern ES2022, ES modules, no semicolon-free style — keep it boring.
- JSDoc on every public function and option.
- No external runtime dependencies. `three` and `three/addons/*` only.
- Dispose everything you create (geometries, materials, render targets,
  DOM nodes, observers) — `destroy()` must leave zero traces.

## Before opening a PR

1. Run the demo and eyeball **all material presets × both themes × all chart
   types**. Screenshots in the PR description are hugely appreciated.
2. Check the browser console — zero errors, zero warnings.
3. Update `docs/` and `CHANGELOG.md` if you changed public behavior.

## Reporting bugs

Please include: browser + GPU, `three` version, a minimal config object that
reproduces the issue, and a screenshot if it is a visual bug.
