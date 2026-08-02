# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.4.0] — 2026-08-03

### Added

- Add a `subsurface` gel/wax preset that combines restrained physical
  transmission with palette-aware wrapped diffusion and back-scattering,
  including a material-aware rear light and live optical, radius, light-wrap,
  and backlight controls in the material lab.
- Add a `tricolor` translucent preset that deterministically derives lighter
  and darker split-complementary hues from each palette color, anchors the
  source color in a broad surface gradient, and exposes palette dominance,
  rim-contrast, and gradient-direction controls.
- Add live custom-palette editing and adaptive data editors to the demo for
  pie slices, radial rings, and complete bar series/category matrices, with
  every edit included in the generated configuration.

### Fixed

- Keep chart geometry visible when names or values are edited during an active
  entrance animation by applying one stable data update after it completes.

## [0.3.1] — 2026-08-02

### Changed

- Refresh the README hero, gallery, radial sample, and demo screenshot using
  the current high-quality renderer and showcase settings.
- Add representative glass, crystal, iridescent, toon, and inset renders so
  the gallery accurately presents the expanded material system.
- Document the per-material editor, exported shader/material settings, and
  raw quality controls more prominently in the README.
- Correct the README's Three.js compatibility badge to the supported
  r175–r185 range.

## [0.3.0] — 2026-08-02

### Added

- Add seven material presets: toon, procedural halftone, opaque
  iridescence, dispersive crystal, frosted acrylic, velvet sheen, and
  inset enamel with one solid-white face physically embedded in its backing.
- Add material-lab descriptions and swatches to the interactive demo.
- Add a live per-preset material editor with curated surface, optical,
  outline, procedural shader, and inset-layer controls; edited settings are
  preserved per material and included in exported demo configurations.
- Add nested `layer` and `shader` material overrides plus relative physical
  `thicknessScale`, `attenuationScale`, and `environmentScale` controls.
- Add editable `surfaceSide` rendering for glass, crystal, and acrylic.
- Add balanced and ultra quality tiers. Ultra is the new reference-quality
  default with a 512px softly prefiltered PMREM and bounded 256/16/64 angular,
  rounded, and tube tessellation; all constituent settings remain overridable.
- Add 1024px showcase and experimental 2048px PMREM choices to the demo while
  retaining lower 64–256px environment sizes for explicit configuration.

### Changed

- Rework glass, crystal, and acrylic as genuinely transmissive, double-sided
  volumes with geometry-aware thickness, clearer internal surfaces, and more
  restrained reflection and emission tuning.
- Set glass-family tint-distance scaling to 0.15 by default and allow zero in
  the material editor through a shader-safe lower bound.
- Raise the angular tessellation default to 256 and expose expert overrides up
  to 512 for smoother reflections on highly polished metallic surfaces.
- Raise the supported Three.js peer dependency floor from 0.167 to 0.175.

### Fixed

- Reduce staircase artifacts in sharp studio reflections with configurable
  high-resolution PMREM generation, subtle prefiltering, and denser geometry.
- Replace the original shader-only inset treatment with one embedded top layer
  so the material reads as a physical face rather than stacked surface bands.

## [0.2.1] — 2026-08-01

### Changed

- Create or refresh a matching GitHub Release from `CHANGELOG.md` after each
  successful npm publication.

### Fixed

- Suppress segment hover animations during pointer-driven chart rotation,
  panning, and zooming while preserving intentional hover, click, and tap
  interactions.

## [0.2.0] — 2026-07-31

### Added

- Add 3D concentric radial charts through `type: 'radial'`, with one
  independently normalized percentage ring per data item.
- Add radial sweep, rise, and scale entrances; tweened value and visibility
  updates; vertical hover/select lift; tooltips; legends; and accessible
  percentage summaries.
- Add collision-resolved SVG callouts anchored to each ring's progress edge,
  optional recessed full-circle tracks, and repeated custom profile support.
- Add radial chart configuration, TypeScript declarations, demo controls,
  documentation, unit coverage, and Chromium lifecycle/mobile regressions.

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
