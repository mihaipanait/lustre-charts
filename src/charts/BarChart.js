/**
 * @module charts/BarChart
 * 3D bar charts — single series (colored per category) or grouped
 * multi-series (colored per series), with rounded bars, a projected value
 * axis, category labels and staggered entrances.
 */

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';

import { BaseChart } from '../core/BaseChart.js';
import { createItemMaterial } from '../materials/materials.js';
import { resolvePalette } from '../core/palettes.js';
import { deepMerge, niceNumber, formatCompact, svgEl } from '../core/utils.js';

export class BarChart extends BaseChart {
  constructor(container, config) {
    super(container, config);
    // A tilted default view flatters bars — only when the user didn't choose.
    if (config.options?.camera?.azimuth === undefined) this.options.camera.azimuth = -32;
    if (config.options?.camera?.elevation === undefined) this.options.camera.elevation = 22;

    this.items = [];
    this._entranceProgress = 1;
    this._axisNodes = null;
    this.setData(config.data, false);
    this.frameCamera(this.boundsRadius, new THREE.Vector3(0, this._layoutInfo.maxHeight * 0.32, 0));
    this.decorations.configure({ floorY: 0, radius: this._layoutInfo.floorRadius, ringY: 0.01 });
    this.start();
    this.entrance();
  }

  /* ---------------------------------------------------------------- */
  /* Data                                                              */
  /* ---------------------------------------------------------------- */

  /**
   * Accepts:
   *  `{ categories: [], series: [{ name, values, color?, material? }] }`
   *  `[{ label, value, color? }]` or `[numbers]` → single series
   */
  _normalize(data) {
    let categories, series;
    if (Array.isArray(data)) {
      const rows = data.map((d, i) =>
        typeof d === 'number' ? { label: `Item ${i + 1}`, value: d } : { label: d.label ?? `Item ${i + 1}`, ...d }
      );
      categories = rows.map((r) => r.label);
      series = [{ name: 'Series 1', values: rows.map((r) => Math.max(0, Number(r.value) || 0)), colors: rows.map((r) => r.color) }];
    } else if (data && Array.isArray(data.categories) && Array.isArray(data.series)) {
      categories = [...data.categories];
      series = data.series.map((s, i) => ({
        name: s.name ?? `Series ${i + 1}`,
        values: categories.map((_, c) => Math.max(0, Number(s.values?.[c]) || 0)),
        color: s.color,
        material: s.material,
      }));
    } else {
      throw new Error('[lustre-charts] bar data must be an array or { categories, series }');
    }
    return { categories, series };
  }

  setData(data, animate = this.options.animation.animateUpdates) {
    const prev = this._data;
    this._data = this._normalize(data);
    const sameShape =
      prev &&
      prev.categories.length === this._data.categories.length &&
      prev.series.length === this._data.series.length;

    if (sameShape && animate && this._entranceProgress >= 1) {
      this._retargetHeights();
    } else {
      this._teardownBars();
      this._buildScene();
      if (this._entranceProgress < 1) this.entrance();
      else this._snapFinal();
    }
    this._syncLegend();
    this.requestRender();
  }

  /* ---------------------------------------------------------------- */
  /* Layout & scene                                                    */
  /* ---------------------------------------------------------------- */

  _computeLayout() {
    const b = this.options.bar;
    const { categories, series } = this._data;
    const nC = categories.length;
    const nS = series.length;
    const cellX = 1 + b.gap;
    const cellZ = 1 + b.gap * 0.5;
    const totalW = nC * cellX;
    const totalD = nS * cellZ;

    let maxVal = 0;
    for (const s of series) for (const v of s.values) maxVal = Math.max(maxVal, v);
    if (maxVal <= 0) maxVal = 1;
    const step = niceNumber(maxVal / Math.max(1, b.axis.ticks), true);
    const top = Math.max(step, Math.ceil(maxVal / step) * step);

    this._layoutInfo = {
      nC, nS, cellX, cellZ, totalW, totalD,
      maxVal, axisStep: step, axisTop: top,
      unit: b.maxHeight / top,
      maxHeight: b.maxHeight,
      x0: -((nC - 1) / 2) * cellX,
      z0: -((nS - 1) / 2) * cellZ,
      floorRadius: Math.max(totalW, totalD) * 0.62,
    };
  }

  _buildScene() {
    this._computeLayout();
    const L = this._layoutInfo;
    const b = this.options.bar;
    const { categories, series } = this._data;
    const singleSeries = series.length === 1;
    const seriesColors = resolvePalette(this.options.palette, series.length);
    const categoryColors = resolvePalette(this.options.palette, categories.length);

    this.items = [];
    this.pickables = [];
    let anyBloom = false;
    const isNeon = presetOf(this.options.material) === 'neon';

    series.forEach((s, si) => {
      s.values.forEach((value, ci) => {
        const color = singleSeries
          ? (s.colors?.[ci] || categoryColors[ci])
          : (s.color || seriesColors[si]);
        const spec = createItemMaterial({
          material: mergeMaterialCfg(this.options.material, s.material),
          color,
          theme: this.theme,
          thickness: Math.max(0.4, b.barWidth),
        });
        anyBloom = anyBloom || spec.wantsBloom;

        const h = Math.max(0.02, value * L.unit);
        const w = b.barWidth, d = b.barDepth;
        const geo = isNeon
          ? new THREE.BoxGeometry(w, h, d)
          : new RoundedBoxGeometry(w, h, d, 3, Math.min(b.cornerRadius, h / 2.5, w / 2.5));
        geo.translate(0, h / 2, 0);

        const mesh = new THREE.Mesh(geo, spec.material);
        mesh.position.set(L.x0 + ci * L.cellX, 0, L.z0 + si * L.cellZ);
        const index = this.items.length;
        mesh.userData.itemIndex = index;

        const group = new THREE.Group();
        group.add(mesh);
        this.chartGroup.add(group);

        let outline = null;
        if (spec.outline) {
          const lineMat = new LineMaterial({
            color: spec.outline.color,
            linewidth: spec.outline.widthPx,
            transparent: true,
            opacity: spec.outline.opacity,
            depthWrite: false,
            toneMapped: false,
          });
          this.registerLineMaterial(lineMat);
          const edges = new THREE.EdgesGeometry(geo, 30);
          const lineGeo = new LineSegmentsGeometry().fromEdgesGeometry(edges);
          edges.dispose();
          outline = new LineSegments2(lineGeo, lineMat);
          outline.position.copy(mesh.position);
          group.add(outline);
        }

        this.items.push({
          index, ci, si,
          label: categories[ci],
          seriesName: s.name,
          value, color, spec, mesh, group, outline,
          height: h,
          visible: true,
          hoverT: 0,
        });
        this.pickables.push(mesh);
      });
    });

    this.resolveBloom(anyBloom);
    this._buildAxis();
    this.setAriaLabel(this._summary());
  }

  _teardownBars() {
    for (const it of this.items) {
      it.mesh.geometry.dispose();
      it.spec.material.dispose();
      if (it.outline) {
        it.outline.geometry.dispose();
        this._lineMaterials.delete(it.outline.material);
        it.outline.material.dispose();
      }
      this.chartGroup.remove(it.group);
    }
    this.items = [];
    this.pickables = [];
  }

  /** Tween existing bars to new values (same shape fast-path). */
  _retargetHeights() {
    this._computeLayout();
    const L = this._layoutInfo;
    const b = this.options.bar;
    const isNeon = presetOf(this.options.material) === 'neon';
    this.tweens.kill('bar-height');

    this._data.series.forEach((s, si) => {
      s.values.forEach((value, ci) => {
        const item = this.items[si * L.nC + ci];
        if (!item) return;
        const oldH = item.height * item.mesh.scale.y;
        const newH = Math.max(0.02, value * L.unit);
        item.value = value;
        item.height = newH;

        // rebuild geometry at the final height so bevels end up perfect
        item.mesh.geometry.dispose();
        const geo = isNeon
          ? new THREE.BoxGeometry(b.barWidth, newH, b.barDepth)
          : new RoundedBoxGeometry(b.barWidth, newH, b.barDepth, 3, Math.min(b.cornerRadius, newH / 2.5, b.barWidth / 2.5));
        geo.translate(0, newH / 2, 0);
        item.mesh.geometry = geo;
        if (item.outline) {
          item.outline.geometry.dispose();
          const edges = new THREE.EdgesGeometry(geo, 30);
          item.outline.geometry = new LineSegmentsGeometry().fromEdgesGeometry(edges);
          edges.dispose();
        }

        const fromScale = oldH / newH;
        item.mesh.scale.y = fromScale;
        if (item.outline) item.outline.scale.y = fromScale;
        this.tweens.add({
          duration: this.options.animation.updateDuration,
          easing: 'cubicInOut',
          tag: `bar-height-${item.index}`,
          onUpdate: (v, t) => {
            const sc = fromScale + (1 - fromScale) * t;
            item.mesh.scale.y = sc;
            if (item.outline) item.outline.scale.y = sc;
            this.requestRender();
          },
        });
      });
    });
    this._buildAxis();
    this.setAriaLabel(this._summary());
  }

  _snapFinal() {
    for (const it of this.items) {
      it.mesh.scale.y = it.visible ? 1 : 0.0001;
      if (it.outline) it.outline.scale.y = it.mesh.scale.y;
    }
    this._entranceProgress = 1;
    this.requestRender();
  }

  /* ---------------------------------------------------------------- */
  /* Axis (SVG, projected)                                             */
  /* ---------------------------------------------------------------- */

  _buildAxis() {
    this._axisNodes?.g.remove();
    this._axisNodes = null;
    const a = this.options.bar.axis;
    if (!a.show && !this.options.bar.categoryLabels) return;

    const g = svgEl('g', { class: 'lustre-axis' }, this.labelOverlay.svg);
    const ticks = [];
    if (a.show) {
      const L = this._layoutInfo;
      for (let v = 0; v <= L.axisTop + 1e-9; v += L.axisStep) {
        const text = svgEl('text', {
          'font-size': this.options.labels.fontSize - 1.5,
          'font-family': this.options.labels.fontFamily,
          'font-weight': 500,
          'text-anchor': 'end',
          'dominant-baseline': 'middle',
          opacity: 0.85,
        }, g);
        const line = svgEl('line', { 'stroke-width': 1, opacity: 0.5 }, g);
        ticks.push({ v, text, line });
      }
    }
    const cats = [];
    if (this.options.bar.categoryLabels) {
      this._data.categories.forEach((label) => {
        const text = svgEl('text', {
          'font-size': this.options.labels.fontSize - 0.5,
          'font-family': this.options.labels.fontFamily,
          'font-weight': 600,
          'text-anchor': 'middle',
        }, g);
        text.textContent = label;
        cats.push({ text });
      });
    }
    this._axisNodes = { g, ticks, cats };
    this._themeAxis();
  }

  _themeAxis() {
    if (!this._axisNodes) return;
    const muted = this.theme.mutedTextColor;
    const strong = this.theme.textColor;
    for (const t of this._axisNodes.ticks) {
      t.text.setAttribute('fill', muted);
      t.line.setAttribute('stroke', muted);
    }
    for (const c of this._axisNodes.cats) c.text.setAttribute('fill', strong);
  }

  /* ---------------------------------------------------------------- */
  /* Entrances                                                         */
  /* ---------------------------------------------------------------- */

  entrance() {
    const anim = this.options.animation;
    let kind = anim.entrance === 'auto' ? 'wave' : anim.entrance;
    if (kind === 'sweep') kind = 'wave';
    if (kind === 'scale') kind = 'grow';
    this.tweens.kill('bar');

    if (kind === 'none' || this.items.length === 0) {
      this._snapFinal();
      return;
    }

    this._entranceProgress = 0;
    const L = this._layoutInfo;
    const drop = this.options.bar.maxHeight * 1.15;
    let remaining = this.items.length;
    const done = () => {
      if (--remaining <= 0) this._entranceProgress = 1;
    };

    for (const item of this.items) {
      const delay =
        kind === 'grow'
          ? item.ci * anim.stagger
          : (item.ci + item.si) * anim.stagger; // diagonal wave
      if (kind === 'rise') {
        item.group.position.y = drop;
        this.tweens.add({
          duration: anim.duration * 0.5,
          delay,
          easing: 'bounceOut',
          tag: `bar-entrance-${item.index}`,
          onUpdate: (v, t) => {
            item.group.position.y = drop * (1 - t);
            this._entranceProgress = Math.max(this._entranceProgress, t * 0.98);
            this.requestRender();
          },
          onComplete: () => {
            item.group.position.y = 0;
            done();
          },
        });
      } else {
        item.mesh.scale.y = 0.0001;
        if (item.outline) item.outline.scale.y = 0.0001;
        this.tweens.add({
          duration: anim.duration * 0.55,
          delay,
          easing: kind === 'grow' ? 'quartOut' : 'backOut',
          tag: `bar-entrance-${item.index}`,
          onUpdate: (v, t) => {
            const sc = Math.max(0.0001, t) * (item.visible ? 1 : 0.0001);
            item.mesh.scale.y = sc;
            if (item.outline) item.outline.scale.y = sc;
            this._entranceProgress = Math.max(this._entranceProgress, t * 0.98);
            this.requestRender();
          },
          onComplete: done,
        });
      }
    }
  }

  /* ---------------------------------------------------------------- */
  /* Interaction                                                       */
  /* ---------------------------------------------------------------- */

  setHover(index) {
    this._applyHoverSet(index == null ? null : new Set([index]));
  }

  /** Legend hover — highlight a whole series (or category when single). */
  _hoverGroup(gIdx) {
    if (gIdx == null) return this._applyHoverSet(null);
    const single = this._data.series.length === 1;
    const set = new Set();
    for (const it of this.items) {
      if ((single ? it.ci : it.si) === gIdx) set.add(it.index);
    }
    this._applyHoverSet(set);
  }

  _applyHoverSet(set) {
    const inter = this.options.interaction;
    const wantGlow = inter.hover !== 'none';
    const wantLift = inter.hover === 'lift' || inter.hover === 'both';
    for (const item of this.items) {
      const on = !!set?.has(item.index);
      const targetE = on && wantGlow ? item.spec.hoverEmissive : item.spec.baseEmissive;
      const targetS = on && wantLift ? 1.045 : 1;
      if (item._glowTarget === targetE && item._scaleTarget === targetS) continue;
      item._glowTarget = targetE;
      item._scaleTarget = targetS;
      const fromE = item.spec.material.emissiveIntensity;
      const fromS = item.mesh.scale.x;
      this.tweens.kill(`bar-hover-${item.index}`);
      this.tweens.add({
        duration: 200,
        easing: 'cubicOut',
        tag: `bar-hover-${item.index}`,
        onUpdate: (v, t) => {
          item.spec.material.emissiveIntensity = fromE + (targetE - fromE) * t;
          const s = fromS + (targetS - fromS) * t;
          item.mesh.scale.x = s;
          item.mesh.scale.z = s;
          if (item.outline) {
            item.outline.scale.x = s;
            item.outline.scale.z = s;
          }
          this.requestRender();
        },
      });
    }
  }

  /** Legend click → toggle a series (or category when single-series). */
  toggleGroup(gIdx) {
    const single = this._data.series.length === 1;
    const members = this.items.filter((it) => (single ? it.ci : it.si) === gIdx);
    if (!members.length) return;
    const nowVisible = !members[0].visible;
    for (const it of members) {
      it.visible = nowVisible;
      const from = it.mesh.scale.y;
      const to = nowVisible ? 1 : 0.0001;
      this.tweens.kill(`bar-vis-${it.index}`);
      this.tweens.add({
        duration: 380,
        easing: nowVisible ? 'backOut' : 'cubicIn',
        tag: `bar-vis-${it.index}`,
        onUpdate: (v) => {
          it.mesh.scale.y = v;
          if (it.outline) it.outline.scale.y = v;
          this.requestRender();
        },
        from,
        to,
      });
    }
    this.legend.setVisible(gIdx, nowVisible);
    this.setAriaLabel(this._summary());
  }

  getItem(index) {
    const it = this.items[index];
    if (!it) return null;
    return {
      index,
      label: it.label,
      series: it.seriesName,
      value: it.value,
      color: it.color,
      category: it.label,
    };
  }

  getTooltipHTML(index) {
    const item = this.getItem(index);
    if (!item) return '';
    const custom = this.options.tooltip.format;
    if (custom) return custom(item, this);
    const multi = this._data.series.length > 1;
    const title = multi ? `${esc(item.series)} · ${esc(item.label)}` : esc(item.label);
    return (
      `<div class="lustre-tt-title"><span class="lustre-tt-dot" style="background:${item.color};color:${item.color}"></span>${title}</div>` +
      `<div class="lustre-tt-value">${Number(item.value).toLocaleString()}</div>`
    );
  }

  /* ---------------------------------------------------------------- */
  /* Overlays                                                          */
  /* ---------------------------------------------------------------- */

  _syncLegend() {
    const single = this._data.series.length === 1;
    const entries = single
      ? this._data.categories.map((label, ci) => ({
          label,
          color: this.items.find((it) => it.ci === ci)?.color || '#888',
          visible: this.items.find((it) => it.ci === ci)?.visible ?? true,
        }))
      : this._data.series.map((s, si) => ({
          label: s.name,
          color: this.items.find((it) => it.si === si)?.color || '#888',
          visible: this.items.find((it) => it.si === si)?.visible ?? true,
        }));
    this.legend.setEntries(entries, {
      onToggle: (i) => this.options.legend.interactive && this.toggleGroup(i),
      onHover: (i) => this._hoverGroup(i),
    });
  }

  updateOverlays() {
    const L = this._layoutInfo;
    if (!this._axisNodes) return;
    const { w, h } = this._size;
    const project = (x, y, z) => {
      _v3.set(x, y, z).project(this.camera);
      return { x: ((_v3.x + 1) / 2) * w, y: ((1 - _v3.y) / 2) * h, behind: _v3.z > 1 };
    };

    const leftX = L.x0 - L.cellX * 0.72;
    const backZ = L.z0 - L.cellZ * 0.55;
    for (const t of this._axisNodes.ticks) {
      const p = project(leftX, t.v * L.unit, backZ);
      if (p.behind) {
        t.text.setAttribute('opacity', 0);
        t.line.setAttribute('opacity', 0);
        continue;
      }
      const label = this.options.bar.axis.format ? this.options.bar.axis.format(t.v) : formatCompact(t.v);
      if (t.text.textContent !== label) t.text.textContent = label;
      t.text.setAttribute('x', p.x - 10);
      t.text.setAttribute('y', p.y);
      t.text.setAttribute('opacity', 0.85);
      t.line.setAttribute('x1', p.x - 6);
      t.line.setAttribute('y1', p.y);
      t.line.setAttribute('x2', p.x);
      t.line.setAttribute('y2', p.y);
      t.line.setAttribute('opacity', 0.5);
    }

    const frontZ = L.z0 + (L.nS - 1) * L.cellZ + L.cellZ * 0.72;
    this._axisNodes.cats.forEach((c, ci) => {
      const p = project(L.x0 + ci * L.cellX, 0, frontZ);
      c.text.setAttribute('opacity', p.behind ? 0 : 0.95);
      c.text.setAttribute('x', p.x);
      c.text.setAttribute('y', p.y + 16);
    });
  }

  /* ---------------------------------------------------------------- */
  /* Updates & maintenance                                             */
  /* ---------------------------------------------------------------- */

  applyOptions(patch) {
    this.options = deepMerge(this.options, patch);
    if (patch.theme !== undefined) this.setTheme(patch.theme);
    if (patch.camera) {
      this.controls.autoRotate = this.options.camera.autoRotate;
      this.controls.autoRotateSpeed = this.options.camera.autoRotateSpeed;
    }
    const heavy = ['material', 'palette', 'bar', 'quality'];
    if (heavy.some((k) => patch[k] !== undefined)) this.rebuild();
    if (patch.legend) this._syncLegend();
    if (patch.effects) {
      this.decorations.configure({ floorY: 0, radius: this._layoutInfo.floorRadius, ringY: 0.01 });
      this.resolveBloom(this.items.some((it) => it.spec?.wantsBloom));
    }
    this.requestRender();
  }

  rebuild() {
    this._teardownBars();
    this._buildScene();
    this._snapFinal();
    this._syncLegend();
    this.decorations.configure({ floorY: 0, radius: this._layoutInfo.floorRadius, ringY: 0.01 });
    this.frameCameraIfAuto(this.boundsRadius, new THREE.Vector3(0, this._layoutInfo.maxHeight * 0.32, 0));
  }

  onThemeChanged() {
    this.rebuild();
    this._themeAxis();
  }

  get boundsRadius() {
    const L = this._layoutInfo;
    if (!L) return 4;
    return Math.max(L.totalW, L.totalD, L.maxHeight * 1.45) * 0.72;
  }

  _summary() {
    const single = this._data.series.length === 1;
    if (single) {
      return `Bar chart. ${this._data.categories.map((c, i) => `${c}: ${this._data.series[0].values[i]}`).join(', ')}`;
    }
    return `Bar chart, ${this._data.series.length} series × ${this._data.categories.length} categories.`;
  }

  destroy() {
    this._teardownBars();
    this._axisNodes?.g.remove();
    super.destroy();
  }
}

/* -------------------------------------------------------------------- */

const _v3 = new THREE.Vector3();

function presetOf(material) {
  return typeof material === 'string' ? material : material?.preset;
}

function mergeMaterialCfg(globalCfg, itemCfg) {
  if (!itemCfg) return globalCfg;
  if (typeof itemCfg === 'string') return itemCfg;
  const base = typeof globalCfg === 'string' ? { preset: globalCfg } : globalCfg || {};
  return { ...base, ...itemCfg };
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
