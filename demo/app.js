/**
 * Lustre demo playground.
 * Everything on this page goes through the public library API — it doubles
 * as a living integration test.
 */

import { LustreChart, LustrePalettes, MATERIAL_PRESETS, VERSION } from 'lustre-charts';

/* ------------------------------------------------------------------ */
/* State                                                                */
/* ------------------------------------------------------------------ */

const state = {
  // 'pie' covers donuts too — the Inner radius slider is the only difference
  type: 'pie',
  theme: 'dark',
  material: 'glossy',
  palette: 'aurora',
  entrance: 'auto',
  autoRotate: false,
  labels: true,
  legend: true,
  pie: { radius: 3, height: 1.15, innerRadius: 1.65, cornerRadius: 0.16, padAngle: 1.4, explode: 0, profile: 'auto' },
  bar: { barWidth: 0.6, gap: 0.25, cornerRadius: 0.07 },
  effects: { bloom: 'auto', shadow: true, grid: false, rings: false, particles: false },
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

let barData = {
  categories: ['Q1', 'Q2', 'Q3', 'Q4'],
  series: [
    { name: '2024', values: [42, 58, 51, 74] },
    { name: '2025', values: [55, 67, 80, 96] },
    { name: '2026', values: [68, 84, 97, 121] },
  ],
};

const SLICE_NAMES = ['Aurora', 'Nova', 'Pulse', 'Flux', 'Echo', 'Nimbus', 'Zephyr', 'Onyx', 'Lyra', 'Quasar', 'Vega', 'Helix'];

/* ------------------------------------------------------------------ */
/* Chart lifecycle                                                      */
/* ------------------------------------------------------------------ */

const stage = document.getElementById('stage');
let chart = null;

function currentOptions() {
  return {
    theme: state.theme,
    material: state.material,
    palette: state.palette,
    camera: { autoRotate: state.autoRotate },
    pie: { ...state.pie, profile: state.pie.profile === 'wavy' ? WAVY_PROFILE : state.pie.profile },
    bar: { ...state.bar },
    labels: { show: state.labels },
    legend: { show: state.legend },
    animation: { entrance: state.entrance },
    effects: { ...state.effects },
  };
}

function currentData() {
  return state.type === 'bar' ? barData : pieData;
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
$('typeSeg').addEventListener('click', (e) => {
  const btn = e.target.closest('button');
  if (!btn) return;
  state.type = btn.dataset.type;
  for (const b of $('typeSeg').children) b.classList.toggle('active', b === btn);
  $('pieControls').classList.toggle('hidden', state.type === 'bar');
  $('barControls').classList.toggle('hidden', state.type !== 'bar');
  recreate();
});

/* Material chips ----------------------------------------------------- */
const materialGrid = $('materialGrid');
for (const preset of MATERIAL_PRESETS) {
  const chip = document.createElement('button');
  chip.className = 'chip' + (preset === state.material ? ' active' : '');
  chip.innerHTML = `<span class="swatch swatch-${preset}"></span>${preset}`;
  chip.addEventListener('click', () => {
    state.material = preset;
    for (const c of materialGrid.children) c.classList.toggle('active', c === chip);
    patch({ material: state.material });
  });
  materialGrid.appendChild(chip);
}

/* Palettes ------------------------------------------------------------ */
const paletteList = $('paletteList');
for (const [name, colors] of Object.entries(LustrePalettes)) {
  const row = document.createElement('button');
  row.className = 'palette-row' + (name === state.palette ? ' active' : '');
  const dots = colors.slice(0, 6).map((c) => `<i style="background:${c};color:${c}"></i>`).join('');
  row.innerHTML = `<span class="palette-dots">${dots}</span><span>${name}</span>`;
  row.addEventListener('click', () => {
    state.palette = name;
    for (const r of paletteList.children) r.classList.toggle('active', r === row);
    patch({ palette: state.palette });
  });
  paletteList.appendChild(row);
}

/* Theme --------------------------------------------------------------- */
$('themeToggle').addEventListener('click', () => {
  state.theme = state.theme === 'dark' ? 'light' : 'dark';
  document.body.dataset.theme = state.theme;
  chart.setTheme(state.theme);
  renderCode();
});

/* Shape sliders (pie) -------------------------------------------------- */
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

/* Scene toggles ------------------------------------------------------------ */
$('t-labels').addEventListener('change', (e) => {
  state.labels = e.target.checked;
  patch({ labels: { show: state.labels } });
  if (state.type !== 'bar') chart._syncLabels?.();
  chart.requestRender();
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
recreate();
