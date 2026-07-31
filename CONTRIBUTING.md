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
| `src/charts/` | `PieChart`, `RadialChart`, `BarChart` |
| `src/overlay/` | SVG callout labels, tooltip, legend (DOM) |
| `src/fx/` | Bloom composer + scene decorations |
| `demo/` | The playground page (also serves as visual regression bed) |
| `browser-tests/` | Playwright integration, accessibility and responsive tests |
| `test/` | Node unit and geometry tests |
| `type-tests/` | Public TypeScript API compilation |
| `docs/` | Markdown documentation |

## Code style

- Modern ES2022, ES modules, no semicolon-free style — keep it boring.
- JSDoc on every public function and option.
- No external runtime dependencies. `three` and `three/addons/*` only.
- Dispose everything you create (geometries, materials, render targets,
  DOM nodes, observers) — `destroy()` must leave zero traces.

## Before opening a PR

1. Run `npm run check`.
2. Run `npm run test:browser`.
3. Run the demo and eyeball **all material presets × both themes × all chart
   types**. Screenshots in the PR description are hugely appreciated.
4. Check the browser console — zero errors, zero warnings.
5. Update `docs/` and `CHANGELOG.md` if you changed public behavior.

## Releasing (maintainers)

Releases go through a version pull request so the protected `main` branch and
its required checks remain the source of truth:

1. Move the `Unreleased` changelog entries into a dated version section.
2. On a release branch, run `npm version patch --no-git-tag-version` (or
   `minor`/`major`), then commit and open a pull request.
3. Merge the pull request after all required checks pass.
4. Update local `main`, create an annotated `vX.Y.Z` tag on the merge commit,
   and push that tag.

The tag starts `.github/workflows/release.yml`. It repeats the complete quality
and browser gates, publishes to npm with trusted publishing, and creates the
matching GitHub Release from that version's `CHANGELOG.md` section. Re-running
the workflow is safe if npm publication or the GitHub Release already exists.

## Reporting bugs

Please include: browser + GPU, `three` version, a minimal config object that
reproduces the issue, and a screenshot if it is a visual bug.
