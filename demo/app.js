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
  lastPresetPalette: 'aurora',
  customPalette: [...LustrePalettes.aurora],
  customPaletteInitialized: false,
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

function currentPaletteOption() {
  return state.palette === 'custom' ? [...state.customPalette] : state.palette;
}

function currentOptions() {
  return {
    theme: state.theme,
    material: currentMaterialOption(),
    palette: currentPaletteOption(),
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
  clearTimeout(dataUpdateTimer);
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
  renderDataEditor();
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
const customPalettePanel = $('customPalettePanel');
const customPaletteEditor = $('customPaletteEditor');

function paletteColors(name = state.palette) {
  return name === 'custom' ? state.customPalette : LustrePalettes[name];
}

function paletteDots(colors) {
  return colors.slice(0, 6).map((color) =>
    `<i style="background:${color};color:${color}"></i>`
  ).join('');
}

function renderPaletteList() {
  paletteList.replaceChildren();
  const choices = [...Object.entries(LustrePalettes), ['custom', state.customPalette]];
  for (const [name, colors] of choices) {
    const row = document.createElement('button');
    row.type = 'button';
    row.dataset.palette = name;
    row.className = 'palette-row' + (name === state.palette ? ' active' : '');
    row.setAttribute('aria-pressed', String(name === state.palette));
    row.innerHTML = `<span class="palette-dots">${paletteDots(colors)}</span><span>${name}</span>`;
    paletteList.appendChild(row);
  }
  renderCustomPaletteEditor();
}

function activatePalette(name) {
  if (name === 'custom' && !state.customPaletteInitialized) {
    state.customPalette = [...LustrePalettes[state.palette]];
    state.customPaletteInitialized = true;
  } else if (name !== 'custom') {
    state.lastPresetPalette = name;
  }
  state.palette = name;
  renderPaletteList();
  renderDataEditor();
  patch({ palette: currentPaletteOption() });
}

paletteList.addEventListener('click', (event) => {
  const row = event.target.closest('[data-palette]');
  if (row) activatePalette(row.dataset.palette);
});

function normalizeHexColor(value) {
  const match = String(value).trim().match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!match) return null;
  const hex = match[1].length === 3
    ? [...match[1]].map((digit) => digit + digit).join('')
    : match[1];
  return `#${hex.toLowerCase()}`;
}

function renderCustomPaletteEditor() {
  const custom = state.palette === 'custom';
  customPalettePanel.hidden = !custom;
  $('paletteStatus').textContent = custom ? `Custom · ${state.customPalette.length}` : 'Preset';
  if (!custom) return;

  customPaletteEditor.replaceChildren();
  state.customPalette.forEach((color, index) => {
    const row = document.createElement('div');
    row.className = 'palette-color-row';
    row.dataset.colorIndex = index;

    const picker = document.createElement('input');
    picker.type = 'color';
    picker.value = color;
    picker.dataset.paletteColor = 'picker';
    picker.setAttribute('aria-label', `Custom palette color ${index + 1}`);

    const hex = document.createElement('input');
    hex.type = 'text';
    hex.className = 'editor-input';
    hex.value = color;
    hex.dataset.paletteColor = 'hex';
    hex.maxLength = 7;
    hex.spellcheck = false;
    hex.setAttribute('aria-label', `Custom palette color ${index + 1} hex`);

    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'icon-action';
    remove.dataset.removePaletteColor = index;
    remove.disabled = state.customPalette.length <= 2;
    remove.setAttribute('aria-label', `Remove custom palette color ${index + 1}`);
    remove.title = 'Remove color';
    remove.textContent = '×';
    row.append(picker, hex, remove);
    customPaletteEditor.appendChild(row);
  });
  $('addPaletteColorBtn').disabled = state.customPalette.length >= 12;
  $('paletteResetBtn').title = `Reset to ${state.lastPresetPalette}`;
}

function refreshCustomPalettePreview() {
  const dots = paletteList.querySelector('[data-palette="custom"] .palette-dots');
  if (dots) dots.innerHTML = paletteDots(state.customPalette);
  $('paletteStatus').textContent = `Custom · ${state.customPalette.length}`;
  renderDataEditor();
}

let paletteRaf = 0;
function patchCustomPalette() {
  cancelAnimationFrame(paletteRaf);
  paletteRaf = requestAnimationFrame(() => patch({ palette: currentPaletteOption() }));
}

function setCustomPaletteColor(index, value) {
  const color = normalizeHexColor(value);
  if (!color) return false;
  state.customPalette[index] = color;
  const row = customPaletteEditor.querySelector(`[data-color-index="${index}"]`);
  if (row) {
    row.querySelector('[data-palette-color="picker"]').value = color;
    row.querySelector('[data-palette-color="hex"]').value = color;
    row.querySelector('[data-palette-color="hex"]').removeAttribute('aria-invalid');
  }
  refreshCustomPalettePreview();
  patchCustomPalette();
  return true;
}

customPaletteEditor.addEventListener('input', (event) => {
  const input = event.target.closest('[data-palette-color]');
  if (!input) return;
  const index = Number(input.closest('[data-color-index]').dataset.colorIndex);
  const valid = setCustomPaletteColor(index, input.value);
  if (input.dataset.paletteColor === 'hex' && !valid) input.setAttribute('aria-invalid', 'true');
});

customPaletteEditor.addEventListener('change', (event) => {
  const input = event.target.closest('[data-palette-color="hex"]');
  if (input && !normalizeHexColor(input.value)) renderCustomPaletteEditor();
});

customPaletteEditor.addEventListener('click', (event) => {
  const remove = event.target.closest('[data-remove-palette-color]');
  if (!remove || state.customPalette.length <= 2) return;
  state.customPalette.splice(Number(remove.dataset.removePaletteColor), 1);
  renderPaletteList();
  renderDataEditor();
  patchCustomPalette();
});

$('addPaletteColorBtn').addEventListener('click', () => {
  if (state.customPalette.length >= 12) return toast('Max 12 custom colors');
  const source = LustrePalettes[state.lastPresetPalette] || LustrePalettes.aurora;
  state.customPalette.push(source[state.customPalette.length % source.length]);
  renderPaletteList();
  renderDataEditor();
  patchCustomPalette();
});

$('paletteResetBtn').addEventListener('click', () => {
  state.customPalette = [...LustrePalettes[state.lastPresetPalette]];
  renderPaletteList();
  renderDataEditor();
  patchCustomPalette();
  toast(`Custom palette reset to ${state.lastPresetPalette}`);
});

renderPaletteList();

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
const dataEditor = $('dataEditor');
const DATA_LIMITS = Object.freeze({ pie: 10, radial: 8, barCategories: 8, barSeries: 5 });
let dataUpdateTimer = 0;

function currentDataColors() {
  return paletteColors().length ? paletteColors() : LustrePalettes.aurora;
}

function dataColor(index) {
  const colors = currentDataColors();
  return colors[index % colors.length];
}

function buildDataItemRow(item, index, kind) {
  const row = document.createElement('div');
  row.className = 'data-item-row';

  const dot = document.createElement('i');
  dot.className = 'data-color-dot';
  dot.style.setProperty('--row-color', dataColor(index));

  const name = document.createElement('input');
  name.type = 'text';
  name.className = 'editor-input';
  name.value = item.label;
  name.dataset.dataField = 'label';
  name.dataset.dataIndex = index;
  name.maxLength = 40;
  name.setAttribute('aria-label', `${kind} ${index + 1} name`);

  const value = document.createElement('input');
  value.type = 'number';
  value.className = 'editor-input';
  value.value = item.value;
  value.min = '0';
  value.step = 'any';
  if (state.type === 'radial') value.max = String(state.radial.maxValue);
  value.dataset.dataField = 'value';
  value.dataset.dataIndex = index;
  value.setAttribute('aria-label', `${kind} ${index + 1} value`);

  const remove = document.createElement('button');
  remove.type = 'button';
  remove.className = 'icon-action';
  remove.dataset.removeDataIndex = index;
  remove.disabled = (state.type === 'pie' ? pieData : radialData).length <= 2;
  remove.setAttribute('aria-label', `Remove ${kind.toLowerCase()} ${index + 1}`);
  remove.title = `Remove ${kind.toLowerCase()}`;
  remove.textContent = '×';
  row.append(dot, name, value, remove);
  return row;
}

function renderSimpleDataEditor() {
  const kind = state.type === 'radial' ? 'Ring' : 'Slice';
  const items = state.type === 'radial' ? radialData : pieData;
  const columns = document.createElement('div');
  columns.className = 'data-editor-columns';
  columns.setAttribute('aria-hidden', 'true');
  columns.innerHTML = '<span></span><span>Name</span><span>Value</span><span></span>';
  const list = document.createElement('div');
  list.className = 'data-list';
  items.forEach((item, index) => list.appendChild(buildDataItemRow(item, index, kind)));
  dataEditor.append(columns, list);
}

function renderBarDataEditor() {
  const seriesSection = document.createElement('section');
  seriesSection.className = 'data-subsection';
  const seriesTitle = document.createElement('div');
  seriesTitle.className = 'data-subsection-title';
  seriesTitle.innerHTML = '<span>Series</span>';
  const addSeries = document.createElement('button');
  addSeries.type = 'button';
  addSeries.className = 'mini-btn';
  addSeries.dataset.addBarSeries = '';
  addSeries.disabled = barData.series.length >= DATA_LIMITS.barSeries;
  addSeries.textContent = '＋ Series';
  seriesTitle.appendChild(addSeries);
  const seriesList = document.createElement('div');
  seriesList.className = 'bar-series-list';
  barData.series.forEach((series, seriesIndex) => {
    const row = document.createElement('div');
    row.className = 'bar-series-row';
    const dot = document.createElement('i');
    dot.className = 'data-color-dot';
    dot.style.setProperty('--row-color', dataColor(seriesIndex));
    const name = document.createElement('input');
    name.type = 'text';
    name.className = 'editor-input';
    name.value = series.name;
    name.maxLength = 40;
    name.dataset.dataField = 'series-name';
    name.dataset.seriesIndex = seriesIndex;
    name.setAttribute('aria-label', `Series ${seriesIndex + 1} name`);
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'icon-action';
    remove.dataset.removeBarSeries = seriesIndex;
    remove.disabled = barData.series.length <= 1;
    remove.setAttribute('aria-label', `Remove series ${seriesIndex + 1}`);
    remove.title = 'Remove series';
    remove.textContent = '×';
    row.append(dot, name, remove);
    seriesList.appendChild(row);
  });
  seriesSection.append(seriesTitle, seriesList);

  const categoriesSection = document.createElement('section');
  categoriesSection.className = 'data-subsection';
  const categoriesTitle = document.createElement('div');
  categoriesTitle.className = 'data-subsection-title';
  categoriesTitle.textContent = 'Categories and values';
  const categoryList = document.createElement('div');
  categoryList.className = 'bar-category-list';
  barData.categories.forEach((category, categoryIndex) => {
    const card = document.createElement('div');
    card.className = 'bar-category-card';
    const head = document.createElement('div');
    head.className = 'bar-category-head';
    const name = document.createElement('input');
    name.type = 'text';
    name.className = 'editor-input';
    name.value = category;
    name.maxLength = 40;
    name.dataset.dataField = 'category-name';
    name.dataset.categoryIndex = categoryIndex;
    name.setAttribute('aria-label', `Category ${categoryIndex + 1} name`);
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'icon-action';
    remove.dataset.removeBarCategory = categoryIndex;
    remove.disabled = barData.categories.length <= 2;
    remove.setAttribute('aria-label', `Remove category ${categoryIndex + 1}`);
    remove.title = 'Remove category';
    remove.textContent = '×';
    head.append(name, remove);

    const values = document.createElement('div');
    values.className = 'bar-value-grid';
    barData.series.forEach((series, seriesIndex) => {
      const field = document.createElement('label');
      field.className = 'bar-value-field';
      const label = document.createElement('span');
      label.textContent = series.name;
      const input = document.createElement('input');
      input.type = 'number';
      input.className = 'editor-input';
      input.value = series.values[categoryIndex];
      input.min = '0';
      input.step = 'any';
      input.dataset.dataField = 'bar-value';
      input.dataset.seriesIndex = seriesIndex;
      input.dataset.categoryIndex = categoryIndex;
      input.setAttribute('aria-label', `${series.name}, ${category} value`);
      field.append(label, input);
      values.appendChild(field);
    });
    card.append(head, values);
    categoryList.appendChild(card);
  });
  categoriesSection.append(categoriesTitle, categoryList);
  dataEditor.append(seriesSection, categoriesSection);
}

function renderDataEditor() {
  dataEditor.replaceChildren();
  if (state.type === 'bar') {
    $('dataStatus').textContent = `${barData.series.length} × ${barData.categories.length}`;
    $('dataHint').textContent = 'Rename series and categories, then enter every value in the matrix.';
    $('addBtn').textContent = '＋ Category';
    $('removeBtn').textContent = '－ Last';
    $('removeBtn').disabled = barData.categories.length <= 2;
    renderBarDataEditor();
  } else {
    const radial = state.type === 'radial';
    const items = radial ? radialData : pieData;
    const noun = radial ? 'rings' : 'slices';
    $('dataStatus').textContent = `${items.length} ${noun}`;
    $('dataHint').textContent = radial
      ? `Edit ring names and values from 0 to ${state.radial.maxValue}.`
      : 'Edit slice names and non-negative values; percentages update automatically.';
    $('addBtn').textContent = radial ? '＋ Ring' : '＋ Slice';
    $('removeBtn').textContent = '－ Last';
    $('removeBtn').disabled = items.length <= 2;
    renderSimpleDataEditor();
  }
}

function applyCurrentData({ render = false, animate = true } = {}) {
  clearTimeout(dataUpdateTimer);
  chart.setData(currentData(), animate);
  if (render) renderDataEditor();
  renderCode();
}

function queueDataUpdate() {
  clearTimeout(dataUpdateTimer);
  const commit = () => {
    // Text/number fields can be edited while the page's entrance is still
    // running. Calling setData during that phase restarts the entrance for
    // every keystroke and can strand pie geometry at zero length. Keep the
    // current chart visible, then commit one stable snapshot when it settles.
    if (chart?._entranceProgress < 1) {
      dataUpdateTimer = setTimeout(commit, 80);
      return;
    }
    applyCurrentData({ animate: false });
  };
  dataUpdateTimer = setTimeout(commit, 100);
}

dataEditor.addEventListener('input', (event) => {
  const input = event.target.closest('[data-data-field]');
  if (!input) return;
  const field = input.dataset.dataField;
  if (field === 'label') {
    const items = state.type === 'radial' ? radialData : pieData;
    items[Number(input.dataset.dataIndex)].label = input.value;
  } else if (field === 'value') {
    const items = state.type === 'radial' ? radialData : pieData;
    items[Number(input.dataset.dataIndex)].value = Math.max(0, Number(input.value) || 0);
  } else if (field === 'series-name') {
    const seriesIndex = Number(input.dataset.seriesIndex);
    barData.series[seriesIndex].name = input.value;
    for (const valueInput of dataEditor.querySelectorAll(
      `[data-data-field="bar-value"][data-series-index="${seriesIndex}"]`
    )) {
      const category = barData.categories[Number(valueInput.dataset.categoryIndex)];
      valueInput.closest('.bar-value-field').querySelector('span').textContent = input.value;
      valueInput.setAttribute('aria-label', `${input.value}, ${category} value`);
    }
  } else if (field === 'category-name') {
    const categoryIndex = Number(input.dataset.categoryIndex);
    barData.categories[categoryIndex] = input.value;
    for (const valueInput of dataEditor.querySelectorAll(
      `[data-data-field="bar-value"][data-category-index="${categoryIndex}"]`
    )) {
      const series = barData.series[Number(valueInput.dataset.seriesIndex)];
      valueInput.setAttribute('aria-label', `${series.name}, ${input.value} value`);
    }
  } else if (field === 'bar-value') {
    barData.series[Number(input.dataset.seriesIndex)].values[Number(input.dataset.categoryIndex)]
      = Math.max(0, Number(input.value) || 0);
  }
  renderCode();
  queueDataUpdate();
});

dataEditor.addEventListener('click', (event) => {
  const removeItem = event.target.closest('[data-remove-data-index]');
  if (removeItem) {
    const items = state.type === 'radial' ? radialData : pieData;
    if (items.length <= 2) return;
    items.splice(Number(removeItem.dataset.removeDataIndex), 1);
    applyCurrentData({ render: true });
    return;
  }
  const removeCategory = event.target.closest('[data-remove-bar-category]');
  if (removeCategory) {
    if (barData.categories.length <= 2) return;
    const index = Number(removeCategory.dataset.removeBarCategory);
    barData.categories.splice(index, 1);
    barData.series.forEach((series) => series.values.splice(index, 1));
    applyCurrentData({ render: true });
    return;
  }
  const removeSeries = event.target.closest('[data-remove-bar-series]');
  if (removeSeries) {
    if (barData.series.length <= 1) return;
    barData.series.splice(Number(removeSeries.dataset.removeBarSeries), 1);
    applyCurrentData({ render: true });
    return;
  }
  if (event.target.closest('[data-add-bar-series]')) {
    if (barData.series.length >= DATA_LIMITS.barSeries) return toast('Max 5 series in the demo');
    const index = barData.series.length;
    barData.series.push({
      name: `Series ${index + 1}`,
      values: barData.categories.map(() => Math.round(20 + Math.random() * 100)),
    });
    applyCurrentData({ render: true });
  }
});

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
  applyCurrentData({ render: true });
});

$('addBtn').addEventListener('click', () => {
  if (state.type === 'bar') {
    if (barData.categories.length >= DATA_LIMITS.barCategories) return toast('Max 8 categories in the demo');
    const q = `Q${barData.categories.length + 1}`;
    barData = {
      categories: [...barData.categories, q],
      series: barData.series.map((s) => ({ ...s, values: [...s.values, Math.round(20 + Math.random() * 100)] })),
    };
  } else if (state.type === 'radial') {
    if (radialData.length >= DATA_LIMITS.radial) return toast('Max 8 rings in the demo');
    const label = SLICE_NAMES[radialData.length % SLICE_NAMES.length];
    radialData = [...radialData, { label, value: Math.round(15 + Math.random() * 85) }];
  } else {
    if (pieData.length >= DATA_LIMITS.pie) return toast('Max 10 slices in the demo');
    const label = SLICE_NAMES[pieData.length % SLICE_NAMES.length];
    pieData = [...pieData, { label, value: Math.round(5 + Math.random() * 30) }];
  }
  applyCurrentData({ render: true });
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
  applyCurrentData({ render: true });
});

renderDataEditor();

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
