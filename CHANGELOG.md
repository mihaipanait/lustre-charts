# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.1] — 2026-07-20

### Changed

- Releases are now published to npm by GitHub Actions using OIDC
  trusted publishing (with provenance); no npm tokens involved.
  No library changes.

## [0.1.0] — 2026-07-20

### Added

- Initial release 🎉
- `LustreChart` factory with Chart.js-style `{ type, data, options }` API.
- **Pie / Donut charts** with configurable cross-section profiles
  (`straight`, `rounded`, `pillow`, `tube`, or fully custom point arrays),
  pad angles, per-slice explode, sorting and start angle.
- **Bar charts** (categories × series) with rounded bars, value axis
  ticks and projected category labels.
- **Material presets**: `glossy`, `glass`, `metal`, `neon`, `hologram`,
  `matte` — all built on physically based rendering with a procedural
  studio environment (no texture downloads).
- **Themes**: `dark`, `light`, plus fully custom theme objects and
  transparent backgrounds.
- **Palettes**: `aurora`, `neon`, `metal`, `candy`, `ocean`, `sunset`,
  `violet`, `mono` or any custom color array.
- SVG **callout labels** (dot + elbow leader lines), glass **tooltip**,
  interactive HTML **legend** with per-slice visibility toggling.
- **Entrance animations** (`sweep`, `rise`, `scale`, `grow`, `wave`,
  `none`) and tweened data updates via `chart.update()`.
- Scene decorations: neon **grid floor**, HUD **rings**, floating
  **particles**, soft **contact shadow**.
- Selective-feel **bloom** post-processing (auto-enabled for neon).
- Render-on-demand loop, `ResizeObserver` responsiveness,
  `toDataURL()` PNG export, full `destroy()` cleanup.
