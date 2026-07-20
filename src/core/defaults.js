/**
 * @module core/defaults
 * The complete option surface with sensible defaults. Everything here is
 * public API — see docs/configuration.md for the annotated reference.
 * User options are deep-merged over these.
 */

export const DEFAULT_OPTIONS = {
  /** 'dark' | 'light' | custom theme object (see core/themes.js) */
  theme: 'dark',

  /**
   * 'auto' (use the theme's backdrop), 'transparent', a CSS color string,
   * or `{ inner, outer }` for a radial gradient rendered inside the canvas.
   */
  background: 'auto',

  /** Palette name (aurora, neon, metal, candy, ocean, sunset, violet, mono) or array of colors. */
  palette: 'aurora',

  /**
   * Material preset name ('glossy' | 'glass' | 'metal' | 'neon' |
   * 'hologram' | 'matte') or `{ preset, ...MeshPhysicalMaterial overrides }`.
   * Individual data items may override with their own `material`.
   */
  material: 'glossy',

  camera: {
    fov: 38,
    /** [x, y, z] override. null = auto-framed from chart bounds. */
    position: null,
    /** Auto-framing shape: degrees above the horizon and around the chart. */
    elevation: 26,
    azimuth: 0,
    /** Extra distance multiplier for auto-framing (1 = tight). */
    zoom: 1,
    autoRotate: false,
    /** OrbitControls speed: 2.0 ≈ one turn / 30 s. */
    autoRotateSpeed: 0.9,
    controls: {
      enabled: true,
      enableZoom: true,
      enablePan: false,
      minPolarAngle: 0.08,
      maxPolarAngle: Math.PI / 2 + 0.2,
      minDistanceFactor: 0.5,
      maxDistanceFactor: 3.5,
      damping: 0.08,
    },
  },

  pie: {
    radius: 3,
    /** 0 for a solid pie. `type: 'donut'` defaults this to radius * 0.55. */
    innerRadius: 0,
    height: 1.15,
    /** Bevel radius of the cross-section corners (world units). */
    cornerRadius: 0.16,
    /** Gap between slices, in degrees. */
    padAngle: 1.4,
    /** Where the first slice starts, degrees. -90 = 12 o'clock. */
    startAngle: -90,
    /** Sweep direction as seen from the default camera. */
    clockwise: true,
    /**
     * Cross-section: 'auto' | 'straight' | 'rounded' | 'pillow' | 'tube'
     * or an array of { x, y } points (x = radius, y = height, CCW).
     * 'auto' picks what flatters the material preset.
     */
    profile: 'auto',
    /** Radial offset applied to all slices (world units). */
    explode: 0,
    /** null | 'asc' | 'desc' — sort slices by value. */
    sort: null,
  },

  bar: {
    /** Bar footprint as a fraction of its grid cell. */
    barWidth: 0.6,
    barDepth: 0.6,
    /** Extra spacing between category cells (fraction of cell). */
    gap: 0.25,
    /** Bevel radius of bars (world units). */
    cornerRadius: 0.07,
    /** World height of the tallest value. */
    maxHeight: 3.1,
    axis: {
      show: true,
      /** Approximate tick count on the value axis. */
      ticks: 4,
      /** (value) => string */
      format: null,
    },
    categoryLabels: true,
    seriesLabels: true,
  },

  labels: {
    show: true,
    /** (item, chart) => string. Default: "Label 34%" for pie. */
    format: null,
    /** Callout elbow length in px. */
    offset: 48,
    fontSize: 13,
    fontFamily: `'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif`,
    /** 'auto' uses the theme text color. */
    color: 'auto',
    lineColor: 'auto',
    /** Colored dot at the start of the text. */
    dot: true,
    /** Fade labels whose anchor faces away from the camera. */
    dimBackfacing: true,
    /** Hide pie labels for slices under this percentage. */
    minPercent: 2,
  },

  legend: {
    show: true,
    /** 'bottom' | 'top' */
    position: 'bottom',
    /** Click chips to toggle items. */
    interactive: true,
  },

  tooltip: {
    show: true,
    /** (item, chart) => string | HTMLElement. */
    format: null,
  },

  animation: {
    /**
     * 'auto' | 'sweep' | 'rise' | 'scale' | 'grow' | 'wave' | 'none'
     * (pie auto = sweep, bar auto = wave)
     */
    entrance: 'auto',
    duration: 1500,
    easing: 'cubicInOut',
    /** ms between items for staggered entrances. */
    stagger: 70,
    animateUpdates: true,
    updateDuration: 750,
  },

  interaction: {
    enabled: true,
    /** 'lift' | 'glow' | 'both' | 'none' */
    hover: 'both',
    liftDistance: 0.25,
    /** Click behavior on pie slices: 'explode' | 'none'. */
    select: 'explode',
    explodeDistance: 0.45,
    /** (item | null, event) => void */
    onHover: null,
    /** (item, event) => void */
    onClick: null,
    /** (selectedItems[]) => void */
    onSelect: null,
  },

  effects: {
    /** 'auto' | true | false | { strength, radius, threshold } */
    bloom: 'auto',
    /** Neon floor grid. */
    grid: false,
    /** HUD rings under/around the chart. */
    rings: false,
    /** Floating dust particles. */
    particles: false,
    /** Soft contact shadow disc. */
    shadow: true,
  },

  quality: {
    /** 'auto' = min(devicePixelRatio, 2), or a number. */
    dpr: 'auto',
    antialias: true,
  },

  /** Watch the container and resize with it. */
  responsive: true,

  /** Accessible description for the canvas. Defaults to a data summary. */
  ariaLabel: null,
};
