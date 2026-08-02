import type {
  BufferGeometry,
  Color,
  MeshPhysicalMaterial,
  MeshToonMaterial,
} from 'three';

export type ChartType = 'pie' | 'donut' | 'radial' | 'bar';
export type ThemeName = 'dark' | 'light';
export type MaterialPreset =
  | 'glossy'
  | 'glass'
  | 'metal'
  | 'neon'
  | 'hologram'
  | 'matte'
  | 'toon'
  | 'halftone'
  | 'iridescent'
  | 'crystal'
  | 'acrylic'
  | 'subsurface'
  | 'velvet'
  | 'inset';
export type PaletteName = 'aurora' | 'neon' | 'metal' | 'candy' | 'ocean' | 'sunset' | 'violet' | 'mono';
export type EasingFunction = (t: number) => number;
export type EasingName =
  | 'linear'
  | 'quadIn'
  | 'quadOut'
  | 'quadInOut'
  | 'cubicIn'
  | 'cubicOut'
  | 'cubicInOut'
  | 'quartOut'
  | 'quintOut'
  | 'expoOut'
  | 'circOut'
  | 'backOut'
  | 'elasticOut'
  | 'bounceOut';

export interface ProfilePoint {
  x: number;
  y: number;
}

export interface ResolvedProfilePoint extends ProfilePoint {
  nx: number;
  ny: number;
}

export interface Profile {
  points: ResolvedProfilePoint[];
  capContour: ProfilePoint[];
  edgeMarks: ProfilePoint[];
}

export type ProfileOption =
  | 'auto'
  | 'straight'
  | 'rounded'
  | 'pillow'
  | 'tube'
  | ProfilePoint[];

export interface PieDataItem {
  label?: string;
  value: number;
  color?: string;
  offset?: number;
  material?: MaterialOption;
}

export type PieData =
  | Array<number | PieDataItem>
  | {
      labels?: string[];
      values: number[];
      colors?: Array<string | undefined>;
    };

export interface RadialDataItem {
  label?: string;
  value: number;
  color?: string;
  material?: MaterialOption;
}

export type RadialData =
  | Array<number | RadialDataItem>
  | {
      labels?: string[];
      values: number[];
      colors?: Array<string | undefined>;
    };

export interface BarDataItem {
  label?: string;
  value: number;
  color?: string;
  material?: MaterialOption;
}

export interface BarSeries {
  name?: string;
  values: number[];
  color?: string;
  colors?: Array<string | undefined>;
  material?: MaterialOption;
}

export type BarData =
  | Array<number | BarDataItem>
  | {
      categories: string[];
      series: BarSeries[];
    };

export type ChartData = PieData | RadialData | BarData;

export interface ChartItem {
  index: number;
  label: string;
  value: number;
  color: string;
  percent?: number;
  maxValue?: number;
  fraction?: number;
  series?: string;
  category?: string;
  visible?: boolean;
}

export interface LustreTheme {
  name: string;
  kind: ThemeName;
  background: string | { inner: string; outer: string };
  textColor: string;
  mutedTextColor: string;
  lineColor: string;
  accentColor: string;
  tooltip: {
    background: string;
    border: string;
    text: string;
    shadow: string;
  };
  exposure: number;
  envIntensity: number;
  lights: {
    ambient: number;
    key: number;
    fill: number;
    rim: number;
    keyColor: string;
    fillColor: string;
    rimColor: string;
  };
  gridColor: string;
  ringColor: string;
  shadowOpacity: number;
  bloomThreshold: number;
}

export type ThemeOption =
  | ThemeName
  | (Omit<Partial<LustreTheme>, 'tooltip' | 'lights'> & {
      extends?: ThemeName;
      tooltip?: Partial<LustreTheme['tooltip']>;
      lights?: Partial<LustreTheme['lights']>;
    });

export interface MaterialOutlineOptions {
  color?: string | number;
  opacity?: number;
  widthPx?: number;
}

export interface MaterialLayerOptions extends Record<string, unknown> {
  color?: string | number;
  inset?: number;
  height?: number;
  embed?: number;
  outline?: false | MaterialOutlineOptions;
}

export interface MaterialOverrides extends Record<string, unknown> {
  preset?: MaterialPreset;
  outline?: false | MaterialOutlineOptions;
  layer?: MaterialLayerOptions;
  shader?: Record<string, number>;
  /** Multiplier for the preset's geometry-aware physical volume depth. */
  thicknessScale?: number;
  /** Multiplier for color attenuation distance. Glass-like presets default to 0.15; zero requests maximum safely-clamped absorption. */
  attenuationScale?: number;
  /** Multiplier for the preset's studio-environment reflection strength. */
  environmentScale?: number;
  /** Whether only outward-facing surfaces or both sides of a volume render. */
  surfaceSide?: 'front' | 'double';
}

export type MaterialOption = MaterialPreset | MaterialOverrides;

export interface CameraOptions {
  fov?: number;
  position?: [number, number, number] | null;
  elevation?: number;
  azimuth?: number;
  zoom?: number;
  autoRotate?: boolean;
  autoRotateSpeed?: number;
  controls?: {
    enabled?: boolean;
    enableZoom?: boolean;
    enablePan?: boolean;
    minPolarAngle?: number;
    maxPolarAngle?: number;
    minDistanceFactor?: number;
    maxDistanceFactor?: number;
    damping?: number;
  };
}

export interface PieOptions {
  radius?: number;
  innerRadius?: number;
  height?: number;
  cornerRadius?: number;
  padAngle?: number;
  startAngle?: number;
  clockwise?: boolean;
  profile?: ProfileOption;
  explode?: number;
  sort?: null | 'asc' | 'desc';
}

export interface RadialTrackOptions {
  color?: 'auto' | string;
  opacity?: number;
}

export interface RadialOptions {
  radius?: number;
  innerRadius?: number;
  height?: number;
  cornerRadius?: number;
  ringGap?: number;
  maxValue?: number;
  startAngle?: number;
  clockwise?: boolean;
  profile?: ProfileOption;
  track?: boolean | RadialTrackOptions;
}

export interface BarOptions {
  barWidth?: number;
  barDepth?: number;
  gap?: number;
  cornerRadius?: number;
  maxHeight?: number;
  axis?: {
    show?: boolean;
    ticks?: number;
    format?: ((value: number) => string) | null;
  };
  categoryLabels?: boolean;
  seriesLabels?: boolean;
}

export interface LabelOptions {
  show?: boolean;
  format?: ((item: ChartItem, chart: BaseChart) => string) | null;
  offset?: number;
  fontSize?: number;
  fontFamily?: string;
  color?: 'auto' | string;
  lineColor?: 'auto' | string;
  dot?: boolean;
  dimBackfacing?: boolean;
  minPercent?: number;
}

export interface LegendOptions {
  show?: boolean;
  position?: 'bottom' | 'top';
  interactive?: boolean;
}

export interface TooltipOptions {
  show?: boolean;
  format?: ((item: ChartItem, chart: BaseChart) => string | HTMLElement) | null;
}

export interface AnimationOptions {
  entrance?: 'auto' | 'sweep' | 'rise' | 'scale' | 'grow' | 'wave' | 'none';
  duration?: number;
  easing?: EasingName | EasingFunction;
  stagger?: number;
  animateUpdates?: boolean;
  updateDuration?: number;
}

export interface InteractionOptions {
  enabled?: boolean;
  hover?: 'lift' | 'glow' | 'both' | 'none';
  liftDistance?: number;
  select?: 'explode' | 'none';
  explodeDistance?: number;
  onHover?: ((item: ChartItem | null, event?: PointerEvent) => void) | null;
  onClick?: ((item: ChartItem | null, event: PointerEvent) => void) | null;
  onSelect?: ((selectedItems: ChartItem[]) => void) | null;
}

export interface BloomOptions {
  strength?: number;
  radius?: number;
  threshold?: number;
}

export interface EffectOptions {
  bloom?: 'auto' | boolean | BloomOptions;
  grid?: boolean;
  rings?: boolean;
  particles?: boolean;
  shadow?: boolean;
}

export interface QualityOptions {
  /** Rendering-cost tier. Ultra is the reference-quality default. */
  preset?: 'balanced' | 'ultra';
  dpr?: 'auto' | number;
  /** Constructor-only: WebGL fixes MSAA when the rendering context is created. */
  antialias?: boolean;
  /** PMREM cube-face size. Values are normalized to a power of two from 64 to 2048. */
  environmentSize?: number | null;
  /** Initial environment blur radius in radians. */
  environmentBlur?: number | null;
  /** Screen-space transmission buffer scale from 0.25 to 1. */
  transmissionResolutionScale?: number | null;
  /** Angular segments used for a complete pie/radial revolution, from 24 to 512. */
  radialResolution?: number | null;
  /** Segments used around each rounded profile corner, from 1 to 16. */
  roundedSegments?: number | null;
  /** Segments used around a tube profile cross-section, from 8 to 64. */
  tubeSegments?: number | null;
}

export interface ResolvedQualitySettings {
  environmentSize: number;
  environmentBlur: number;
  transmissionResolutionScale: number;
  radialResolution: number;
  roundedSegments: number;
  tubeSegments: number;
}

export interface LustreOptions {
  theme?: ThemeOption;
  background?: 'auto' | 'transparent' | string | { inner: string; outer: string };
  palette?: PaletteName | string[];
  material?: MaterialOption;
  camera?: CameraOptions;
  pie?: PieOptions;
  radial?: RadialOptions;
  bar?: BarOptions;
  labels?: LabelOptions;
  legend?: LegendOptions;
  tooltip?: TooltipOptions;
  animation?: AnimationOptions;
  interaction?: InteractionOptions;
  effects?: EffectOptions;
  quality?: QualityOptions;
  responsive?: boolean;
  ariaLabel?: string | null;
}

export interface LustreConfig<TData extends ChartData = ChartData> {
  type?: ChartType;
  data: TData;
  options?: LustreOptions;
}

export interface ChartUpdate<TData extends ChartData = ChartData> {
  data?: TData;
  options?: LustreOptions;
}

export class BaseChart<TData extends ChartData = ChartData> {
  constructor(container: HTMLElement, config: LustreConfig<TData>);
  readonly container: HTMLElement;
  readonly canvas: HTMLCanvasElement;
  options: LustreOptions;
  destroyed: boolean;
  setData(data: TData, animate?: boolean): void;
  applyOptions(patch: LustreOptions): void;
  update(patch?: ChartUpdate<TData>): void;
  setTheme(theme: ThemeOption): void;
  replay(): void;
  resize(): void;
  requestRender(): void;
  frameChart(force?: boolean): void;
  toDataURL(): string;
  getItem(index: number): ChartItem | null;
  destroy(): void;
}

export class PieChart extends BaseChart<PieData> {}
export class RadialChart extends BaseChart<RadialData> {}
export class BarChart extends BaseChart<BarData> {}

type ChartConstructor = new (
  container: HTMLElement,
  config: LustreConfig
) => BaseChart;

export class LustreChart extends BaseChart {
  constructor(container: HTMLElement | string, config: LustreConfig);
  static register(type: string, ChartCtor: ChartConstructor): void;
}

export interface ProfileDimensions {
  innerRadius: number;
  radius: number;
  height: number;
  cornerRadius: number;
}

export interface SliceGeometryOptions {
  radialResolution?: number;
}

export interface ProfileQualityOptions {
  roundedSegments?: number;
  tubeSegments?: number;
}

export interface MaterialSpec {
  material: MeshPhysicalMaterial | MeshToonMaterial;
  hoverEmissive: number;
  baseEmissive: number;
  outline: {
    color: Color;
    opacity: number;
    widthPx: number;
  } | null;
  layers: Array<{
    material: MeshPhysicalMaterial;
    inset: number;
    height: number;
    embed: number;
    outline: {
      color: Color;
      opacity: number;
      widthPx: number;
    } | null;
  }> | null;
  wantsBloom: boolean;
  wantsBacklight: boolean;
}

export const VERSION: string;
export const LustreThemes: Record<ThemeName, LustreTheme>;
export const LustrePalettes: Record<PaletteName, string[]>;
export const MATERIAL_PRESETS: readonly MaterialPreset[];
export const Easings: Record<EasingName, EasingFunction>;
export const DEFAULT_OPTIONS: LustreOptions;
export const QUALITY_PRESETS: Readonly<Record<
  'balanced' | 'ultra',
  Readonly<ResolvedQualitySettings>
>>;

export function buildProfile(
  profile: ProfileOption,
  dimensions: ProfileDimensions,
  options?: ProfileQualityOptions
): Profile;

export function buildSliceGeometry(
  profile: Profile,
  thetaStart: number,
  thetaLength: number,
  options?: SliceGeometryOptions
): BufferGeometry;

export function createItemMaterial(config: {
  material: MaterialOption;
  color: string;
  theme: LustreTheme;
  thickness?: number;
}): MaterialSpec;

export default LustreChart;
