import * as THREE from 'three';
import { LustreChart } from '../src/index.js';

const container = document.getElementById('chart');
const results = document.getElementById('results');
const checks = [];

function assert(condition, message) {
  if (!condition) throw new Error(message);
  checks.push(`✓ ${message}`);
}

function nextFrame() {
  return new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
}

function contentFitsCamera(chart, tolerance = 1.02) {
  chart.scene.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(chart.chartGroup);
  const corners = [];
  for (const x of [box.min.x, box.max.x]) {
    for (const y of [box.min.y, box.max.y]) {
      for (const z of [box.min.z, box.max.z]) {
        corners.push(new THREE.Vector3(x, y, z).project(chart.camera));
      }
    }
  }
  return corners.every((point) =>
    Math.abs(point.x) <= tolerance &&
    Math.abs(point.y) <= tolerance &&
    point.z >= -1 &&
    point.z <= 1
  );
}

async function run() {
  const chart = new LustreChart(container, {
    type: 'donut',
    data: [
      { label: 'Long alpha label', value: 60 },
      { label: 'Long beta label', value: 40 },
    ],
    options: {
      animation: { entrance: 'none' },
      interaction: { enabled: false },
      responsive: false,
    },
  });

  assert(chart.canvas.getAttribute('aria-label').includes('Long alpha label 60%'), 'initial ARIA summary includes percentages');
  assert(chart._interactionBound === false, 'interaction can start disabled');
  assert(!chart._ro, 'responsive observation can start disabled');

  const firstMesh = chart.items[0].mesh;
  chart.applyOptions({ quality: { dpr: 1 } });
  assert(chart._dpr === 1, 'DPR updates live');
  assert(chart.items[0].mesh === firstMesh, 'DPR updates do not rebuild chart meshes');

  chart.applyOptions({ background: '#123456' });
  assert(chart.scene.background?.getHexString() === '123456', 'background updates live');

  chart.applyOptions({ labels: { show: false }, legend: { show: false } });
  assert(chart.labelOverlay.nodes.size === 0, 'labels update live');
  assert(chart.legend.node === null, 'legend updates live');

  chart.applyOptions({ interaction: { enabled: true }, responsive: true });
  assert(chart._interactionBound === true, 'interaction listeners can be enabled live');
  assert(chart._ro instanceof ResizeObserver, 'responsive observation can be enabled live');

  chart._userOrbited = true;
  chart.applyOptions({
    camera: {
      fov: 44,
      controls: { enableZoom: false, damping: 0.12 },
    },
  });
  assert(chart.camera.fov === 44, 'camera projection updates live');
  assert(chart.controls.enableZoom === false, 'camera controls update live');
  assert(chart.controls.dampingFactor === 0.12, 'camera damping updates live');
  assert(chart._userOrbited === false, 'explicit camera framing replaces a user viewpoint');

  const materialBeforeTheme = chart.items[0].spec.material;
  chart.applyOptions({ theme: 'light' });
  assert(chart.theme.kind === 'light', 'theme updates live');
  assert(chart.items[0].spec.material !== materialBeforeTheme, 'theme rebuilds chart materials once');

  chart.applyOptions({ ariaLabel: 'Custom chart description' });
  assert(chart.canvas.getAttribute('aria-label') === 'Custom chart description', 'ARIA label updates live');

  chart.frameChart(true);
  const wideDistance = chart.camera.position.distanceTo(chart.controls.target);
  container.style.width = '280px';
  await nextFrame();
  chart.resize();
  const narrowDistance = chart.camera.position.distanceTo(chart.controls.target);
  assert(narrowDistance > wideDistance, 'narrow containers use horizontal field of view when framing');
  chart.applyOptions({ labels: { show: true } });
  await nextFrame();
  const overlayRect = chart.labelOverlay.svg.getBoundingClientRect();
  const labelsFit = [...chart.labelOverlay.nodes.values()].every(({ text }) => {
    const rect = text.getBoundingClientRect();
    return rect.left >= overlayRect.left - 1 && rect.right <= overlayRect.right + 1;
  });
  assert(labelsFit, 'callout labels stay inside narrow viewports');

  const antialias = chart.options.quality.antialias;
  chart.applyOptions({ quality: { antialias: !antialias } });
  assert(chart.options.quality.antialias === antialias, 'antialias remains constructor-only');

  chart.destroy();
  assert(container.children.length === 0, 'pie destroy removes chart DOM');

  const radial = new LustreChart(container, {
    type: 'radial',
    data: [
      { label: 'Alpha ring', value: 72 },
      { label: 'Beta ring', value: 73 },
      { label: 'Gamma ring', value: 74 },
      { label: 'Full ring', value: 100 },
      { label: 'Clamped ring', value: 140 },
    ],
    options: {
      animation: { entrance: 'none', updateDuration: 20 },
      radial: { track: true },
      responsive: false,
    },
  });
  await nextFrame();
  assert(radial.canvas.getAttribute('aria-label').includes('Full ring 100%'), 'radial ARIA summary includes independent percentages');
  assert(radial.items[0].fraction === 0.72, 'radial values normalize independently');
  assert(radial.items.at(-1).fraction === 1, 'radial values clamp visually at a complete ring');
  assert(radial.items.every((item, index) => index === 0 || item.innerRadius > radial.items[index - 1].outerRadius), 'radial bands are concentric and non-overlapping');
  assert(radial.items.every((item) => item.track?.visible), 'radial tracks render when enabled');
  assert(contentFitsCamera(radial), 'radial rings fit the camera frustum');

  const firstRadial = radial.items[0];
  radial.toggleVisibility(0);
  assert(firstRadial.mesh.visible, 'radial visibility changes collapse from the current arc');
  await nextFrame();
  await nextFrame();
  assert(!firstRadial.mesh.visible && !firstRadial.track.visible, 'hidden radial rings and tracks finish collapsed');
  radial.toggleVisibility(0);
  await nextFrame();
  await nextFrame();
  assert(firstRadial.mesh.visible && firstRadial.track.visible, 'radial rings grow back into their preserved slot');

  const radialLabels = [...radial.labelOverlay.nodes.values()]
    .map(({ text }) => text.getBoundingClientRect())
    .filter((rect) => rect.width > 0 && rect.height > 0);
  const labelsOverlap = radialLabels.some((rect, index) =>
    radialLabels.slice(index + 1).some((other) =>
      rect.left < other.right && rect.right > other.left && rect.top < other.bottom && rect.bottom > other.top
    )
  );
  assert(!labelsOverlap, 'clustered radial callouts do not overlap');

  const radialMesh = radial.items[0].mesh;
  radial.applyOptions({
    radial: {
      track: false,
      clockwise: false,
      profile: [
        { x: 0, y: -1 },
        { x: 1, y: -1 },
        { x: 1.15, y: 0 },
        { x: 1, y: 1 },
        { x: 0, y: 1 },
      ],
    },
  });
  assert(radial.items[0].mesh !== radialMesh, 'radial geometry options rebuild meshes');
  assert(radial.items.every((item) => item.track === null), 'radial tracks can be disabled live');
  assert(radial.items.every((item) => item.profile.points.every((point) => Number.isFinite(point.x))), 'custom radial profiles repeat with finite geometry');
  radial.setData([
    { label: 'Alpha ring', value: 45 },
    { label: 'Full ring', value: 100 },
  ], false);
  assert(radial.items[0].fraction === 0.45, 'radial data updates preserve independent percentages');
  radial.destroy();
  assert(container.children.length === 0, 'radial destroy removes chart DOM');

  const bars = new LustreChart(container, {
    type: 'bar',
    data: {
      categories: ['Q1', 'Q2', 'Q3', 'Q4', 'Q5', 'Q6'],
      series: [
        { name: 'Plan', values: [42, 58, 51, 74, 63, 82] },
        { name: 'Actual', values: [55, 67, 80, 96, 78, 104] },
        { name: 'Forecast', values: [68, 84, 97, 121, 99, 132] },
      ],
    },
    options: {
      animation: { entrance: 'none' },
      responsive: false,
    },
  });
  await nextFrame();
  assert(contentFitsCamera(bars), 'grouped bars fit a narrow camera frustum');
  assert(bars.canvas.getAttribute('aria-label').includes('3 series'), 'bar ARIA summary is present');
  bars.applyOptions({ theme: 'light', labels: { fontSize: 15 } });
  assert(bars.theme.kind === 'light', 'bar theme and labels update live');
  bars.destroy();
  assert(container.children.length === 0, 'bar destroy removes chart DOM');

  window.__testResult = { ok: true, checks };
  document.body.dataset.status = 'pass';
  results.textContent = checks.join('\n');
}

run().catch((error) => {
  window.__testResult = { ok: false, checks, error: error.stack || String(error) };
  document.body.dataset.status = 'fail';
  results.textContent = `${checks.join('\n')}\n✗ ${error.stack || error}`;
});
