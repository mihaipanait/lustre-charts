# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- Create or refresh a matching GitHub Release from `CHANGELOG.md` after each
  successful npm publication.

## [0.1.4] — 2026-07-25

### Added

- Add TypeScript declarations and a strict public-API compilation test.
- Add geometry invariant and malformed-profile tests.
- Add a clean packed-consumer installation smoke test.
- Add automated Chromium coverage for runtime options, lifecycle cleanup,
  accessibility controls, both chart types, and mobile sizing.
- Add a CI compatibility matrix for the supported Three.js floor and latest
  release.
- Add ESLint to the local, CI, and release quality gates.

### Changed

- Bound the tested Three.js peer range to `>= 0.167.0 < 0.186.0`.
- Require the complete quality and browser gates before trusted npm publishing.

### Fixed

- Reject unknown, degenerate, or non-finite custom profiles with actionable
  errors instead of producing invalid geometry.

## [0.1.3] — 2026-07-25

### Added

- Add regression coverage for runtime option invalidation and DPR resolution.
- Add continuous-integration and release gates for tests, syntax, package
  contents, and package metadata.

### Changed

- Apply backgrounds, camera controls, DPR, responsive observation, interaction
  listeners, labels, legends, and accessibility labels correctly at runtime.
- Reframe responsive charts using both horizontal and vertical field of view,
  keep pie callouts inside narrow viewports, and preserve a user-orbited
  viewpoint unless camera framing is explicitly changed.
- Document `quality.antialias` as constructor-only because it is fixed when the
  WebGL context is created.
- Improve the demo's tab semantics, pressed states, keyboard navigation, focus
  indicators, live status announcements, and reduced-motion behavior.

## [0.1.2] — 2026-07-25

### Fixed

- Rebuild bar charts when same-size data changes labels, colors, series names,
  or material configuration; keep the animated fast path for value-only updates.
- Generate pie chart accessibility summaries after slice percentages are laid out.
- Build default tooltip content with DOM APIs so data labels and colors are not
  interpolated into HTML.

### Security

- Restrict the development screenshot endpoint to safe filenames, cap request
  bodies, keep writes inside `tools/`, and bind the server to loopback.

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
