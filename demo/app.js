/**
 * Lustre demo playground.
 * Everything on this page goes through the public library API — it doubles
 * as a living integration test.
 */

import {
  LustreChart,
  LustrePalettes,
  MATERIAL_PRESETS,
  QUALITY_PRESETS,
  VERSION,
} from 'lustre-charts';
import {
  MATERIAL_CONTROLS,
  controlDefault,
  countLeaves,
  deletePath,
  getPath,
  setPath,
} from './material-controls.js';

/* ------------------------------------------------------------------ */
/* State                                                                */
/* ------------------------------------------------------------------ */

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const requestedQuality = new URLSearchParams(window.location.search).get('quality');
const DEMO_QUALITY_PRESETS = Object.freeze({
  balanced: Object.freeze({ ...QUALITY_PRESETS.balanced, environmentSize: 512 }),
  ultra: Object.freeze({ ...QUALITY_PRESETS.ultra, environmentSize: 1024 }),
});
const initialQualityPreset = Object.hasOwn(DEMO_QUALITY_PRESETS, requestedQuality)
  ? requestedQuality
  : 'ultra';

const state = {
  // 'pie' covers donuts too — the Inner radius slider is the only difference
  type: 'pie',
  theme: 'dark',
  material: 'glossy',
  palette: 'aurora',
  entrance: prefersReducedMotion ? 'none' : 'auto',
  autoRotate: false,
  quality: { preset: initialQualityPreset, ...DEMO_QUALITY_PRESETS[initialQualityPreset] },
  labels: true,
  legend: true,
  pie: { radius: 3, height: 1.15, innerRadius: 1.65, cornerRadius: 0.16, padAngle: 1.4, explode: 0, profile: 'auto' },
  radial: { radius: 3, height: 0.7, innerRadius: 0.45, cornerRadius: 0.1, ringGap: 0.09, maxValue: 100, profile: 'auto', track: false },
  bar: { barWidth: 0.6, gap: 0.25, cornerRadius: 0.07 },
  effects: { bloom: 'auto', shadow: true, grid: false, rings: false, particles: false },
  materialOverrides: Object.fromEntries(MATERIAL_PRESETS.map((preset) => [preset, {}])),
};

/** A custom cross-section to show off the profile API (the sample project's
 *  draggable-profile idea, shipped as data). */
const WAVY_PROFILE = (() => {
  const pts = [];
  const inner = 1.0, outer = 3, h = 1.15;
  pts.push({ x: outer, y: -h / 2 });
  pts.push({ x: outer + 0.12, y: 0 });
  pts.push({ x: outer, y: h / 2 });
  for (let i = 0; i <= 8; i++) {
    const t = i / 8;
    const x = outer - (outer - inner) * t;
    pts.push({ x, y: h / 2 + Math.sin(t * Math.PI * 2.5) * 0.14 });
  }
  pts.push({ x: inner - 0.1, y: 0 });
  pts.push({ x: inner, y: -h / 2 });
  return pts.reverse(); // wind CCW (library re-checks anyway)
})();

let pieData = [
  { label: 'Aurora', value: 34 },
  { label: 'Nova', value: 24 },
  { label: 'Pulse', value: 17 },
  { label: 'Flux', value: 14 },
  { label: 'Echo', value: 11 },
];

let radialData = [
  { label: 'Reach', value: 34 },
  { label: 'Growth', value: 52 },
  { label: 'Quality', value: 68 },
  { label: 'Velocity', value: 81 },
  { label: 'Target', value: 100 },
];

let barData = {
  categories: ['Q1', 'Q2', 'Q3', 'Q4'],
  series: [
    { name: '2024', values: [42, 58, 51, 74] },
    { name: '2025', values: [55, 67, 80, 96] },
    { name: '2026', values: [68, 84, 97, 121] },
  ],
};

const SLICE_NAMES = ['Aurora', 'Nova', 'Pulse', 'Flux', 'Echo', 'Nimbus', 'Zephyr', 'Onyx', 'Lyra', 'Quasar', 'Vega', 'Helix'];

const MATERIAL_INFO = {
  glossy: ['Automotive clearcoat', 'Deep pigment under a polished candy shell.'],
  glass: ['Tinted glass', 'Clear refraction, subtle color absorption, and polished highlights.'],
  metal: ['Brushed metal', 'Anisotropic studio reflections with controlled roughness.'],
  neon: ['Luminous tube', 'Translucent emissive color, bright rims, and automatic bloom.'],
  hologram: ['Spectral UI', 'Translucent thin-film color with an illuminated edge.'],
  matte: ['Soft matte', 'Quiet diffuse color for restrained, minimal dashboards.'],
  toon: ['Graphic toon', 'Four-step lighting, crisp geometry, and heavy editorial ink.'],
  halftone: ['Procedural ink', 'Object-space comic dots with anti-aliased print texture.'],
  iridescent: ['Angle-shift film', 'Opaque spectral color that changes as you orbit the view.'],
  crystal: ['Dispersive crystal', 'Clear high-IOR glass with chromatic edge separation.'],
  acrylic: ['Frosted acrylic', 'Soft transmission, milky depth, and a polished outer skin.'],
  subsurface: ['Subsurface gel', 'Partial transmission and palette-tinted diffusion revealed by a dedicated rear light.'],
  tricolor: ['Harmonic tri-glass', 'The palette color anchors two widely separated deterministic hues across a translucent volume.'],
  velvet: ['Velvet sheen', 'Dark diffuse body with bright color at grazing angles.'],
  inset: ['Inset white face', 'One solid-white face is sunk into a larger colored backing.'],
};

/* ------------------------------------------------------------------ */
/* Chart lifecycle                                                      */
/* ------------------------------------------------------------------ */

const stage = document.getElementById('stage');
let chart = null;

function currentMaterialOption() {
  const overrides = state.materialOverrides[state.material];
  if (!countLeaves(overrides)) return state.material;
  return { preset: state.material, ...JSON.parse(JSON.stringify(overrides)) };
}

function currentOptions() {
  return {
    theme: state.theme,
    material: currentMaterialOption(),
    palette: state.palette,
    camera: { autoRotate: state.autoRotate },
    quality: { ...state.quality },
    pie: { ...state.pie, profile: state.pie.profile === 'wavy' ? WAVY_PROFILE : state.pie.profile },
    radial: { ...state.radial, profile: state.radial.profile === 'wavy' ? WAVY_PROFILE : state.radial.profile },
    bar: { ...state.bar },
    labels: { show: state.labels },
    legend: { show: state.legend },
    animation: { entrance: state.entrance },
    effects: { ...state.effects },
  };
}

function currentData() {
  if (state.type === 'bar') return barData;
  if (state.type === 'radial') return radialData;
  return pieData;
}

function recreate() {
  chart?.destroy();
  chart = new LustreChart(stage, {
    type: state.type,
    data: currentData(),
    options: currentOptions(),
  });
  window.chart = chart; // for curious consoles
  renderCode();
}

function patch(options) {
  chart.applyOptions(options);
  renderCode();
}

/* ------------------------------------------------------------------ */
/* Controls wiring                                                      */
/* ------------------------------------------------------------------ */

const $ = (id) => document.getElementById(id);

/* Chart type -------------------------------------------------------- */
function activateChartType(btn) {
  state.type = btn.dataset.type;
  for (const tab of $('typeSeg').querySelectorAll('[role="tab"]')) {
    const active = tab === btn;
    tab.classList.toggle('active', active);
    tab.setAttribute('aria-selected', String(active));
    tab.tabIndex = active ? 0 : -1;
  }
  for (const [id, type] of [['pieControls', 'pie'], ['radialControls', 'radial'], ['barControls', 'bar']]) {
    const hidden = state.type !== type;
    $(id).hidden = hidden;
    $(id).classList.toggle('hidden', hidden);
  }
  recreate();
}

$('typeSeg').addEventListener('click', (e) => {
  const btn = e.target.closest('[role="tab"]');
  if (btn) activateChartType(btn);
});

$('typeSeg').addEventListener('keydown', (e) => {
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
  const tabs = [...$('typeSeg').querySelectorAll('[role="tab"]')];
  const current = tabs.indexOf(e.target);
  if (current < 0) return;
  e.preventDefault();
  const next = e.key === 'Home'
    ? 0
    : e.key === 'End'
      ? tabs.length - 1
      : (current + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
  tabs[next].focus();
  activateChartType(tabs[next]);
});

/* Material chips ----------------------------------------------------- */
const materialGrid = $('materialGrid');
const materialNote = $('materialNote');
const materialEditor = $('materialEditor');
const materialResetBtn = $('materialResetBtn');

function describeMaterial(preset) {
  const [title, detail] = MATERIAL_INFO[preset];
  materialNote.innerHTML = `<strong>${title}</strong><span>${detail}</span>`;
}

function formatMaterialValue(value, control) {
  if (control.type === 'select') {
    return control.options.find((option) => option.value === value)?.label || String(value);
  }
  const stepText = String(control.step ?? 1);
  const precision = stepText.includes('.') ? Math.min(3, stepText.split('.')[1].length) : 0;
  return `${Number(value).toFixed(precision)}${control.suffix || ''}`;
}

function renderMaterialEditor() {
  const preset = state.material;
  const overrides = state.materialOverrides[preset];
  const controls = MATERIAL_CONTROLS[preset];
  const groups = new Map();
  for (const control of controls) {
    if (!groups.has(control.group)) groups.set(control.group, []);
    groups.get(control.group).push(control);
  }

  $('materialEditorName').textContent = preset;
  $('materialEditorHint').textContent = `${MATERIAL_INFO[preset][0]} controls`;
  materialEditor.dataset.preset = preset;
  materialEditor.replaceChildren();

  for (const [groupName, fields] of groups) {
    const fieldset = document.createElement('fieldset');
    const legend = document.createElement('legend');
    legend.textContent = groupName;
    fieldset.appendChild(legend);

    for (const control of fields) {
      const defaultValue = controlDefault(control, state.theme);
      const override = getPath(overrides, control.path);
      const edited = override !== undefined;
      const value = edited ? override : defaultValue;
      const id = `material-${preset}-${control.path.replaceAll('.', '-')}`;
      const row = document.createElement('div');
      row.className = `material-control${edited ? ' is-edited' : ''}`;
      row.dataset.path = control.path;

      const header = document.createElement('div');
      header.className = 'material-control-head';
      const label = document.createElement('label');
      label.htmlFor = id;
      label.textContent = control.label;
      label.title = control.description;
      const reset = document.createElement('button');
      reset.type = 'button';
      reset.className = 'material-field-reset';
      reset.dataset.resetPath = control.path;
      reset.setAttribute('aria-label', `Reset ${control.label}`);
      reset.title = `Reset ${control.label}`;
      reset.textContent = '↺';
      reset.hidden = !edited;
      header.append(label, reset);

      const meta = document.createElement('div');
      meta.className = 'material-control-meta';
      const defaultNode = document.createElement('small');
      const defaultDisplay = control.defaultText
        || (control.type === 'color' ? defaultValue.toUpperCase() : formatMaterialValue(defaultValue, control));
      defaultNode.textContent = `Default ${defaultDisplay}`;
      const output = document.createElement('output');
      output.htmlFor = id;
      output.textContent = control.type === 'color' ? value.toUpperCase() : formatMaterialValue(value, control);
      meta.append(defaultNode, output);

      const input = document.createElement(control.type === 'select' ? 'select' : 'input');
      input.id = id;
      if (control.type !== 'select') input.type = control.type;
      input.dataset.materialPath = control.path;
      input.dataset.controlType = control.type;
      input.setAttribute('aria-label', control.label);
      input.title = control.description;
      if (control.type === 'range') {
        input.min = control.min;
        input.max = control.max;
        input.step = control.step;
      } else if (control.type === 'select') {
        for (const option of control.options) {
          const node = document.createElement('option');
          node.value = option.value;
          node.textContent = option.label;
          input.appendChild(node);
        }
      }
      input.value = value;

      row.append(header, meta, input);
      fieldset.appendChild(row);
    }
    materialEditor.appendChild(fieldset);
  }
  updateMaterialEditorStatus();
}

function updateMaterialEditorStatus() {
  const count = countLeaves(state.materialOverrides[state.material]);
  $('materialEditCount').textContent = count ? `${count} customized` : 'Defaults';
  materialResetBtn.disabled = count === 0;
  for (const chip of materialGrid.children) {
    chip.classList.toggle('has-edits', countLeaves(state.materialOverrides[chip.dataset.preset]) > 0);
  }
}

let materialRaf = 0;
function patchMaterial() {
  cancelAnimationFrame(materialRaf);
  materialRaf = requestAnimationFrame(() => patch({ material: currentMaterialOption() }));
}

materialEditor.addEventListener('input', (event) => {
  const input = event.target.closest('[data-material-path]');
  if (!input) return;
  const path = input.dataset.materialPath;
  const value = ['color', 'select'].includes(input.dataset.controlType)
    ? input.value
    : Number(input.value);
  setPath(state.materialOverrides[state.material], path, value);
  const row = input.closest('.material-control');
  row.classList.add('is-edited');
  row.querySelector('.material-field-reset').hidden = false;
  const control = MATERIAL_CONTROLS[state.material].find((entry) => entry.path === path);
  row.querySelector('output').textContent = control.type === 'color'
    ? value.toUpperCase()
    : formatMaterialValue(value, control);
  updateMaterialEditorStatus();
  patchMaterial();
});

materialEditor.addEventListener('click', (event) => {
  const reset = event.target.closest('[data-reset-path]');
  if (!reset) return;
  deletePath(state.materialOverrides[state.material], reset.dataset.resetPath);
  renderMaterialEditor();
  patchMaterial();
});

materialResetBtn.addEventListener('click', () => {
  state.materialOverrides[state.material] = {};
  renderMaterialEditor();
  patchMaterial();
  toast(`${state.material} settings reset`);
});

for (const preset of MATERIAL_PRESETS) {
  const chip = document.createElement('button');
  chip.type = 'button';
  chip.className = 'chip' + (preset === state.material ? ' active' : '');
  chip.dataset.preset = preset;
  chip.setAttribute('aria-pressed', String(preset === state.material));
  chip.title = MATERIAL_INFO[preset].join(' — ');
  chip.innerHTML = `<span class="swatch swatch-${preset}"></span>${preset}`;
  chip.addEventListener('click', () => {
    state.material = preset;
    for (const c of materialGrid.children) {
      const active = c === chip;
      c.classList.toggle('active', active);
      c.setAttribute('aria-pressed', String(active));
    }
    describeMaterial(preset);
    renderMaterialEditor();
    patch({ material: currentMaterialOption() });
  });
  materialGrid.appendChild(chip);
}
describeMaterial(state.material);
renderMaterialEditor();

/* Palettes ------------------------------------------------------------ */
const paletteList = $('paletteList');
for (const [name, colors] of Object.entries(LustrePalettes)) {
  const row = document.createElement('button');
  row.type = 'button';
  row.className = 'palette-row' + (name === state.palette ? ' active' : '');
  row.setAttribute('aria-pressed', String(name === state.palette));
  const dots = colors.slice(0, 6).map((c) => `<i style="background:${c};color:${c}"></i>`).join('');
  row.innerHTML = `<span class="palette-dots">${dots}</span><span>${name}</span>`;
  row.addEventListener('click', () => {
    state.palette = name;
    for (const r of paletteList.children) {
      const active = r === row;
      r.classList.toggle('active', active);
      r.setAttribute('aria-pressed', String(active));
    }
    patch({ palette: state.palette });
  });
  paletteList.appendChild(row);
}

/* Theme --------------------------------------------------------------- */
const themeToggle = $('themeToggle');
function syncThemeToggle() {
  const nextTheme = state.theme === 'dark' ? 'light' : 'dark';
  themeToggle.setAttribute('aria-pressed', String(state.theme === 'light'));
  themeToggle.setAttribute('aria-label', `Switch to ${nextTheme} theme`);
}

themeToggle.addEventListener('click', () => {
  state.theme = state.theme === 'dark' ? 'light' : 'dark';
  document.body.dataset.theme = state.theme;
  chart.setTheme(state.theme);
  syncThemeToggle();
  renderMaterialEditor();
  renderCode();
});

/* Shape sliders -------------------------------------------------------- */
function bindSlider(id, valueId, apply, fmt = (v) => v.toFixed(2)) {
  const input = $(id);
  const label = $(valueId);
  const update = () => {
    const v = parseFloat(input.value);
    label.textContent = fmt(v);
    apply(v);
  };
  input.addEventListener('input', update);
  const v = parseFloat(input.value);
  label.textContent = fmt(v);
  return update;
}

bindSlider('s-height', 'v-height', (v) => { state.pie.height = v; patchPie(); });
bindSlider('s-inner', 'v-inner', (v) => { state.pie.innerRadius = v; patchPie(); });
bindSlider('s-corner', 'v-corner', (v) => { state.pie.cornerRadius = v; patchPie(); });
bindSlider('s-pad', 'v-pad', (v) => { state.pie.padAngle = v; patchPie(); }, (v) => `${v.toFixed(1)}°`);
bindSlider('s-explode', 'v-explode', (v) => { state.pie.explode = v; patchPie(); });

let pieRaf = 0;
function patchPie() {
  cancelAnimationFrame(pieRaf);
  pieRaf = requestAnimationFrame(() =>
    patch({ pie: { ...state.pie, profile: state.pie.profile === 'wavy' ? WAVY_PROFILE : state.pie.profile } })
  );
}

$('profileSelect').addEventListener('change', (e) => {
  state.pie.profile = e.target.value;
  patchPie();
});

/* Radial sliders ------------------------------------------------------- */
bindSlider('s-radial-height', 'v-radial-height', (v) => { state.radial.height = v; patchRadial(); });
bindSlider('s-radial-inner', 'v-radial-inner', (v) => { state.radial.innerRadius = v; patchRadial(); });
bindSlider('s-ring-gap', 'v-ring-gap', (v) => { state.radial.ringGap = v; patchRadial(); });
bindSlider('s-radial-corner', 'v-radial-corner', (v) => { state.radial.cornerRadius = v; patchRadial(); });

let radialRaf = 0;
function patchRadial() {
  cancelAnimationFrame(radialRaf);
  radialRaf = requestAnimationFrame(() =>
    patch({ radial: { ...state.radial, profile: state.radial.profile === 'wavy' ? WAVY_PROFILE : state.radial.profile } })
  );
}

$('radialProfileSelect').addEventListener('change', (e) => {
  state.radial.profile = e.target.value;
  patchRadial();
});

$('t-track').addEventListener('change', (e) => {
  state.radial.track = e.target.checked;
  patchRadial();
});

/* Bar sliders ----------------------------------------------------------- */
bindSlider('s-barw', 'v-barw', (v) => { state.bar.barWidth = v; state.bar.barDepth = v; patchBar(); });
bindSlider('s-gap', 'v-gap', (v) => { state.bar.gap = v; patchBar(); });
bindSlider('s-barr', 'v-barr', (v) => { state.bar.cornerRadius = v; patchBar(); });

let barRaf = 0;
function patchBar() {
  cancelAnimationFrame(barRaf);
  barRaf = requestAnimationFrame(() => patch({ bar: { ...state.bar } }));
}

/* Motion ----------------------------------------------------------------- */
$('entranceSelect').addEventListener('change', (e) => {
  state.entrance = e.target.value;
  patch({ animation: { entrance: state.entrance } });
  chart.replay();
});
$('replayBtn').addEventListener('click', () => chart.replay());
$('t-rotate').addEventListener('change', (e) => {
  state.autoRotate = e.target.checked;
  patch({ camera: { autoRotate: state.autoRotate } });
});

/* Rendering quality -------------------------------------------------------- */
const QUALITY_CONTROLS = [
  {
    input: 'q-environment-blur',
    output: 'v-environment-blur',
    key: 'environmentBlur',
    format: (value) => Number(value).toFixed(4),
  },
  {
    input: 'q-radial-resolution',
    output: 'v-radial-resolution',
    key: 'radialResolution',
    format: (value) => String(Math.round(value)),
  },
  {
    input: 'q-rounded-segments',
    output: 'v-rounded-segments',
    key: 'roundedSegments',
    format: (value) => String(Math.round(value)),
  },
  {
    input: 'q-tube-segments',
    output: 'v-tube-segments',
    key: 'tubeSegments',
    format: (value) => String(Math.round(value)),
  },
  {
    input: 'q-transmission-scale',
    output: 'v-transmission-scale',
    key: 'transmissionResolutionScale',
    format: (value) => `${Math.round(value * 100)}%`,
  },
];

function syncQualityControls() {
  $('qualitySelect').value = state.quality.preset;
  $('q-environment-size').value = String(state.quality.environmentSize);
  for (const control of QUALITY_CONTROLS) {
    const value = state.quality[control.key];
    $(control.input).value = String(value);
    $(control.output).textContent = control.format(value);
  }
}

function applyQualityPatch(key = null) {
  const quality = key ? { [key]: state.quality[key] } : { ...state.quality };
  patch({ quality });
}

$('qualitySelect').addEventListener('change', (event) => {
  const preset = event.target.value;
  state.quality = { preset, ...DEMO_QUALITY_PRESETS[preset] };
  syncQualityControls();
  applyQualityPatch();
});

$('qualityResetBtn').addEventListener('click', () => {
  const preset = state.quality.preset;
  state.quality = { preset, ...DEMO_QUALITY_PRESETS[preset] };
  syncQualityControls();
  applyQualityPatch();
  toast(`${preset} quality values restored`);
});

$('q-environment-size').addEventListener('change', (event) => {
  state.quality.environmentSize = Number(event.target.value);
  applyQualityPatch('environmentSize');
});

for (const control of QUALITY_CONTROLS) {
  const input = $(control.input);
  input.addEventListener('input', () => {
    $(control.output).textContent = control.format(Number(input.value));
  });
  input.addEventListener('change', () => {
    state.quality[control.key] = Number(input.value);
    applyQualityPatch(control.key);
  });
}

/* Scene toggles ------------------------------------------------------------ */
$('t-labels').addEventListener('change', (e) => {
  state.labels = e.target.checked;
  patch({ labels: { show: state.labels } });
});
$('t-legend').addEventListener('change', (e) => {
  state.legend = e.target.checked;
  patch({ legend: { show: state.legend } });
});
for (const key of ['shadow', 'grid', 'rings', 'particles']) {
  $(`t-${key}`).addEventListener('change', (e) => {
    state.effects[key] = e.target.checked;
    patch({ effects: { ...state.effects } });
  });
}
$('t-bloom').addEventListener('change', (e) => {
  state.effects.bloom = e.target.checked ? 'auto' : false;
  patch({ effects: { ...state.effects } });
});

/* Data ---------------------------------------------------------------------- */
$('randomBtn').addEventListener('click', () => {
  if (state.type === 'bar') {
    barData = {
      ...barData,
      series: barData.series.map((s) => ({
        ...s,
        values: s.values.map(() => Math.round(20 + Math.random() * 100)),
      })),
    };
  } else if (state.type === 'radial') {
    radialData = radialData.map((d) => ({ ...d, value: Math.round(10 + Math.random() * 90) }));
  } else {
    pieData = pieData.map((d) => ({ ...d, value: Math.round(5 + Math.random() * 40) }));
  }
  chart.setData(currentData());
  renderCode();
});

$('addBtn').addEventListener('click', () => {
  if (state.type === 'bar') {
    if (barData.categories.length >= 8) return toast('Max 8 categories in the demo');
    const q = `Q${barData.categories.length + 1}`;
    barData = {
      categories: [...barData.categories, q],
      series: barData.series.map((s) => ({ ...s, values: [...s.values, Math.round(20 + Math.random() * 100)] })),
    };
  } else if (state.type === 'radial') {
    if (radialData.length >= 8) return toast('Max 8 rings in the demo');
    const label = SLICE_NAMES[radialData.length % SLICE_NAMES.length];
    radialData = [...radialData, { label, value: Math.round(15 + Math.random() * 85) }];
  } else {
    if (pieData.length >= 10) return toast('Max 10 slices in the demo');
    const label = SLICE_NAMES[pieData.length % SLICE_NAMES.length];
    pieData = [...pieData, { label, value: Math.round(5 + Math.random() * 30) }];
  }
  chart.setData(currentData());
  renderCode();
});

$('removeBtn').addEventListener('click', () => {
  if (state.type === 'bar') {
    if (barData.categories.length <= 2) return toast('Keep at least 2 categories');
    barData = {
      categories: barData.categories.slice(0, -1),
      series: barData.series.map((s) => ({ ...s, values: s.values.slice(0, -1) })),
    };
  } else if (state.type === 'radial') {
    if (radialData.length <= 2) return toast('Keep at least 2 rings');
    radialData = radialData.slice(0, -1);
  } else {
    if (pieData.length <= 2) return toast('Keep at least 2 slices');
    pieData = pieData.slice(0, -1);
  }
  chart.setData(currentData());
  renderCode();
});

/* Export --------------------------------------------------------------------- */
$('pngBtn').addEventListener('click', () => {
  const a = document.createElement('a');
  a.href = chart.toDataURL();
  a.download = `lustre-${state.type}.png`;
  a.click();
  toast('PNG exported');
});

$('copyBtn').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(buildSnippet());
    toast('Config copied to clipboard');
  } catch {
    toast('Clipboard unavailable — see “View config”');
  }
});

/* ------------------------------------------------------------------ */
/* Config snippet                                                       */
/* ------------------------------------------------------------------ */

function buildSnippet() {
  const options = currentOptions();
  if (options.pie.profile === WAVY_PROFILE) options.pie.profile = '/* custom {x,y}[] */';
  if (options.radial.profile === WAVY_PROFILE) options.radial.profile = '/* custom {x,y}[] */';
  const cfg = { type: state.type, data: currentData(), options };
  return [
    `import { LustreChart } from 'lustre-charts';`,
    ``,
    `const chart = new LustreChart('#container', ${JSON.stringify(cfg, null, 2)});`,
  ].join('\n');
}

function renderCode() {
  $('codeView').textContent = buildSnippet();
}

/* ------------------------------------------------------------------ */
/* Toast + boot                                                         */
/* ------------------------------------------------------------------ */

let toastTimer = 0;
function toast(msg) {
  const node = $('toast');
  node.textContent = msg;
  node.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => node.classList.remove('show'), 2200);
}

$('version').textContent = `v${VERSION}`;
$('entranceSelect').value = state.entrance;
syncQualityControls();
syncThemeToggle();
recreate();
