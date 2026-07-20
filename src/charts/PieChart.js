/**
 * @module charts/PieChart
 * Pie & donut charts with revolved cross-section profiles, exploding
 * slices, callout labels and animated layout. `type: 'donut'` is the same
 * chart with a default inner radius.
 */

import * as THREE from 'three';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';

import { BaseChart } from '../core/BaseChart.js';
import { buildProfile, buildSliceGeometry, buildSliceOutlinePositions } from '../geometry/sliceGeometry.js';
import { createItemMaterial, autoProfileFor, materialWantsBloom } from '../materials/materials.js';
import { resolvePalette } from '../core/palettes.js';
import { deepMerge, clamp } from '../core/utils.js';

const TAU = Math.PI * 2;
const DEG = Math.PI / 180;

export class PieChart extends BaseChart {
  constructor(container, config) {
    super(container, config);
    if (config.type === 'donut' && !(config.options?.pie?.innerRadius > 0)) {
      this.options.pie.innerRadius = this.options.pie.radius * 0.55;
    }
    /** @type {Array<object>} normalized items */
    this.items = [];
    this._profile = null;
    this._entranceProgress = 1;
    this.setData(config.data, false);
    this.frameCamera(this.boundsRadius);
    this.decorations.configure({
      floorY: -this.options.pie.height / 2 - 0.02,
      radius: this.options.pie.radius,
      ringY: 0,
    });
    this.start();
    this.entrance();
  }

  /* ---------------------------------------------------------------- */
  /* Data                                                              */
  /* ---------------------------------------------------------------- */

  /**
   * Normalize input data into items.
   * Accepts `[{label, value, color?, offset?, material?}]`, `[numbers]`,
   * or `{ labels: [], values: [], colors?: [] }`.
   */
  _normalize(data) {
    let raw;
    if (Array.isArray(data)) {
      raw = data.map((d, i) =>
        typeof d === 'number' ? { label: `Item ${i + 1}`, value: d } : { label: d.label ?? `Item ${i + 1}`, ...d }
      );
    } else if (data && Array.isArray(data.values)) {
      raw = data.values.map((v, i) => ({
        label: data.labels?.[i] ?? `Item ${i + 1}`,
        value: v,
        color: data.colors?.[i],
      }));
    } else {
      throw new Error('[lustre-charts] pie data must be an array or { labels, values }');
    }
    const colors = resolvePalette(this.options.palette, raw.length);
    return raw.map((d, i) => ({
      index: i,
      label: d.label,
      value: Math.max(0, Number(d.value) || 0),
      _explicitColor: d.color || null,
      color: d.color || colors[i],
      offset: d.offset || 0,
      materialCfg: d.material || null,
      visible: true,
      // runtime state
      anim: { start: 0, length: 0 },
      target: { start: 0, length: 0 },
      fraction: 0,
      group: null,
      mesh: null,
      outline: null,
      spec: null,
      hoverT: 0,
    }));
  }

  /**
   * Replace the data. Existing charts tween to the new layout when
   * `animate` (defaults to `options.animation.animateUpdates`).
   * @param {*} data
   * @param {boolean} [animate]
   */
  setData(data, animate = this.options.animation.animateUpdates) {
    const prev = this.items;
    const prevAngles = prev.map((it) => ({ ...it.anim }));
    this.items = this._normalize(data);

    // carry over visibility for matching labels
    for (const it of this.items) {
      const old = prev.find((p) => p.label === it.label);
      if (old) it.visible = old.visible;
    }

    this._disposeItems(prev);
    this._buildScene();

    if (this._entranceProgress < 1) {
      // data changed mid-entrance — restart the entrance with the new data
      this.entrance();
    } else if (prev.length && animate) {
      // start from previous angles where possible, then tween to layout
      this._layout();
      this.items.forEach((it, i) => {
        const from = prevAngles[i] || { start: it.target.start, length: 0 };
        it.anim = { ...from };
      });
      this._tweenToLayout(this.options.animation.updateDuration);
    } else {
      this._layout();
      for (const it of this.items) it.anim = { ...it.target };
      this._flushAll();
    }
    this._syncLegend();
    this._syncLabels();
    this.requestRender();
  }

  /* ---------------------------------------------------------------- */
  /* Scene construction                                                */
  /* ---------------------------------------------------------------- */

  _resolveProfile() {
    const p = this.options.pie;
    const profileOpt = p.profile === 'auto' ? autoProfileFor(this.options.material) : p.profile;
    this._profile = buildProfile(profileOpt, {
      innerRadius: p.innerRadius,
      radius: p.radius,
      height: p.height,
      cornerRadius: p.cornerRadius,
    });
  }

  _buildScene() {
    this._resolveProfile();
    this.pickables = [];
    let anyBloom = false;

    for (const item of this.items) {
      const spec = createItemMaterial({
        material: mergeMaterialCfg(this.options.material, item.materialCfg),
        color: item.color,
        theme: this.theme,
        thickness: this.options.pie.height,
      });
      item.spec = spec;
      anyBloom = anyBloom || spec.wantsBloom;

      const group = new THREE.Group();
      const mesh = new THREE.Mesh(new THREE.BufferGeometry(), spec.material);
      mesh.userData.itemIndex = item.index;
      group.add(mesh);

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
        const line = new LineSegments2(new LineSegmentsGeometry(), lineMat);
        line.visible = false;
        item.outline = line;
        group.add(line);
      }

      item.group = group;
      item.mesh = mesh;
      this.chartGroup.add(group);
      this.pickables.push(mesh);
    }

    this.resolveBloom(anyBloom);
    this.setAriaLabel(this._summary());
  }

  _disposeItems(items) {
    for (const it of items) {
      if (!it.group) continue;
      it.mesh.geometry.dispose();
      it.spec.material.dispose();
      if (it.outline) {
        it.outline.geometry.dispose();
        this._lineMaterials.delete(it.outline.material);
        it.outline.material.dispose();
      }
      this.chartGroup.remove(it.group);
    }
  }

  /* ---------------------------------------------------------------- */
  /* Layout                                                            */
  /* ---------------------------------------------------------------- */

  _layout() {
    const p = this.options.pie;
    const visible = this.items.filter((it) => it.visible && it.value > 0);
    const total = visible.reduce((s, it) => s + it.value, 0);

    let order = [...this.items];
    if (p.sort === 'asc') order.sort((a, b) => a.value - b.value);
    else if (p.sort === 'desc') order.sort((a, b) => b.value - a.value);

    const pad = visible.length > 1 ? p.padAngle * DEG : 0;
    const usable = TAU - pad * visible.length;
    const dir = p.clockwise ? 1 : -1;
    let cursor = p.startAngle * DEG;

    for (const item of order) {
      const active = item.visible && item.value > 0 && total > 0;
      const frac = active ? item.value / total : 0;
      const len = frac * usable;
      if (active) {
        const start = cursor + dir * (pad / 2);
        item.target = dir === 1 ? { start, length: len } : { start: start - len, length: len };
        item.midAngle = start + (dir * len) / 2;
        cursor += dir * (len + pad);
      } else {
        // collapse hidden slices at the cursor so they can grow back from there
        item.target = { start: cursor, length: 0 };
        item.midAngle = cursor;
      }
      item.fraction = frac;
    }
  }

  _tweenToLayout(duration) {
    this.tweens.kill('pie-angles');
    for (const item of this.items) {
      const from = { ...item.anim };
      const to = { ...item.target };
      if (Math.abs(from.start - to.start) < 1e-4 && Math.abs(from.length - to.length) < 1e-4) continue;
      this.tweens.add({
        duration,
        easing: 'cubicInOut',
        tag: `pie-angles-${item.index}`,
        onUpdate: (v, t) => {
          item.anim.start = from.start + (to.start - from.start) * t;
          item.anim.length = from.length + (to.length - from.length) * t;
          this._dirty(item);
        },
      });
    }
  }

  /* ---------------------------------------------------------------- */
  /* Geometry flushing                                                 */
  /* ---------------------------------------------------------------- */

  _dirty(item) {
    (this._dirtySet ||= new Set()).add(item);
    this.requestRender();
  }

  _flushAll() {
    for (const it of this.items) this._dirty(it);
    this._flushGeometry();
  }

  _flushGeometry() {
    if (!this._dirtySet || this._dirtySet.size === 0) return;
    for (const item of this._dirtySet) {
      const { start, length } = item.anim;
      const show = length > 0.0005;
      item.mesh.visible = show;
      if (item.outline) item.outline.visible = show;
      if (!show) continue;

      item.mesh.geometry.dispose();
      item.mesh.geometry = buildSliceGeometry(this._profile, start, length);

      if (item.outline) {
        item.outline.geometry.dispose();
        const geo = new LineSegmentsGeometry();
        geo.setPositions(buildSliceOutlinePositions(this._profile, start, length));
        item.outline.geometry = geo;
      }
      this._applyOffset(item);
    }
    this._dirtySet.clear();
  }

  /** Radial explode/hover offset along the slice bisector. */
  _applyOffset(item) {
    const mid = item.anim.start + item.anim.length / 2;
    const inter = this.options.interaction;
    const selected = this.selection.has(item.index);
    const dist =
      this.options.pie.explode +
      item.offset +
      (selected ? inter.explodeDistance : 0) +
      item.hoverT * inter.liftDistance;
    // preserve y — entrance animations own the vertical axis
    item.group.position.set(Math.cos(mid) * dist, item.group.position.y, Math.sin(mid) * dist);
  }

  /* ---------------------------------------------------------------- */
  /* Entrances                                                         */
  /* ---------------------------------------------------------------- */

  /** Re-run the entrance animation. */
  entrance() {
    const anim = this.options.animation;
    const kind = anim.entrance === 'auto' ? 'sweep' : anim.entrance;
    this._layout();
    this.tweens.kill('pie');

    if (kind === 'none' || !this.items.length) {
      for (const it of this.items) it.anim = { ...it.target };
      this._entranceProgress = 1;
      this._flushAll();
      return;
    }

    if (kind === 'sweep') return this._entranceSweep();
    if (kind === 'rise') return this._entranceRise();
    if (kind === 'scale') return this._entranceScale();
    return this._entranceSweep();
  }

  _entranceSweep() {
    const anim = this.options.animation;
    this._entranceProgress = 0;
    const totalLen = this.items.reduce((s, it) => s + it.target.length, 0);
    // cumulative offsets in "content" angle space
    let acc = 0;
    for (const it of this.items) {
      it._sweepAcc = acc;
      acc += it.target.length;
    }
    for (const it of this.items) it.anim = { start: it.target.start, length: 0 };
    this._flushAll();

    this.tweens.add({
      duration: anim.duration,
      easing: anim.easing,
      tag: 'pie-entrance',
      onUpdate: (v, t) => {
        this._entranceProgress = t;
        const sweep = t * totalLen;
        for (const it of this.items) {
          const visible = clamp(sweep - it._sweepAcc, 0, it.target.length);
          if (Math.abs(visible - it.anim.length) > 1e-5) {
            it.anim.length = visible;
            this._dirty(it);
          }
        }
      },
      onComplete: () => {
        this._entranceProgress = 1;
      },
    });
  }

  _entranceRise() {
    const anim = this.options.animation;
    this._entranceProgress = 0;
    const drop = this.options.pie.height * 3;
    for (const it of this.items) it.anim = { ...it.target };
    this._flushAll();

    this.items.forEach((it, i) => {
      it.group.position.y = -drop;
      it.group.scale.setScalar(0.72);
      this.tweens.add({
        duration: anim.duration * 0.62,
        delay: i * anim.stagger,
        easing: 'backOut',
        tag: `pie-entrance-${i}`,
        onUpdate: (v, t) => {
          it.group.position.y = -drop * (1 - t);
          const s = 0.72 + 0.28 * t;
          it.group.scale.setScalar(s);
          this._entranceProgress = Math.max(this._entranceProgress, t * (i + 1) / this.items.length);
          this.requestRender();
        },
        onComplete: () => {
          it.group.position.y = 0;
          it.group.scale.setScalar(1);
          if (i === this.items.length - 1) this._entranceProgress = 1;
        },
      });
    });
  }

  _entranceScale() {
    const anim = this.options.animation;
    this._entranceProgress = 0;
    for (const it of this.items) it.anim = { ...it.target };
    this._flushAll();

    this.items.forEach((it, i) => {
      it.group.scale.setScalar(0.0001);
      this.tweens.add({
        duration: anim.duration * 0.55,
        delay: i * anim.stagger,
        easing: 'backOut',
        tag: `pie-entrance-${i}`,
        onUpdate: (v, t) => {
          it.group.scale.setScalar(Math.max(0.0001, t));
          this._entranceProgress = Math.max(this._entranceProgress, (i + t) / this.items.length);
          this.requestRender();
        },
        onComplete: () => {
          it.group.scale.setScalar(1);
          if (i === this.items.length - 1) this._entranceProgress = 1;
        },
      });
    });
  }

  /* ---------------------------------------------------------------- */
  /* Interaction                                                       */
  /* ---------------------------------------------------------------- */

  setHover(index) {
    const inter = this.options.interaction;
    for (const item of this.items) {
      const on = item.index === index;
      const wantLift = inter.hover === 'lift' || inter.hover === 'both';
      const wantGlow = inter.hover === 'glow' || inter.hover === 'both';
      const targetT = on && wantLift ? 1 : 0;
      const targetE = on && wantGlow ? item.spec.hoverEmissive : item.spec.baseEmissive;
      if ((item._hoverTarget ?? 0) === targetT && (item._glowTarget ?? item.spec.baseEmissive) === targetE) continue;
      item._hoverTarget = targetT;
      item._glowTarget = targetE;

      const fromT = item.hoverT;
      const fromE = item.spec.material.emissiveIntensity;
      this.tweens.kill(`pie-hover-${item.index}`);
      this.tweens.add({
        duration: 220,
        easing: 'cubicOut',
        tag: `pie-hover-${item.index}`,
        onUpdate: (v, t) => {
          item.hoverT = fromT + (targetT - fromT) * t;
          item.spec.material.emissiveIntensity = fromE + (targetE - fromE) * t;
          this._applyOffset(item);
          this.requestRender();
        },
      });
    }
  }

  onSelectionChanged() {
    for (const item of this.items) this._animateOffset(item);
  }

  _animateOffset(item) {
    const from = item.group.position.clone();
    // compute destination via _applyOffset into a temp
    const saved = item.group.position.clone();
    this._applyOffset(item);
    const to = item.group.position.clone();
    item.group.position.copy(saved);
    if (from.distanceTo(to) < 1e-4) return;
    this.tweens.kill(`pie-select-${item.index}`);
    this.tweens.add({
      duration: 340,
      easing: 'backOut',
      tag: `pie-select-${item.index}`,
      onUpdate: (v, t) => {
        item.group.position.lerpVectors(from, to, t);
        this.requestRender();
      },
    });
  }

  /** Legend click → toggle item and re-layout the pie. */
  toggleVisibility(index) {
    const item = this.items[index];
    if (!item) return;
    item.visible = !item.visible;
    this.legend.setVisible(index, item.visible);
    this._layout();
    this._tweenToLayout(this.options.animation.updateDuration);
    this.setAriaLabel(this._summary());
  }

  getItem(index) {
    const it = this.items[index];
    if (!it) return null;
    return { index, label: it.label, value: it.value, color: it.color, percent: it.fraction * 100 };
  }

  getTooltipHTML(index) {
    const item = this.getItem(index);
    if (!item) return '';
    const custom = this.options.tooltip.format;
    if (custom) return custom(item, this);
    return (
      `<div class="lustre-tt-title"><span class="lustre-tt-dot" style="background:${item.color};color:${item.color}"></span>${esc(item.label)}</div>` +
      `<div class="lustre-tt-value">${formatValue(item.value)}</div>` +
      `<div class="lustre-tt-sub">${item.percent.toFixed(1)}% of total</div>`
    );
  }

  /* ---------------------------------------------------------------- */
  /* Overlays                                                          */
  /* ---------------------------------------------------------------- */

  _syncLegend() {
    this.legend.setEntries(
      this.items.map((it) => ({ label: it.label, color: it.color, visible: it.visible })),
      {
        onToggle: (i) => this.options.legend.interactive && this.toggleVisibility(i),
        onHover: (i) => this.setHover(i),
      }
    );
  }

  _syncLabels() {
    this.labelOverlay.setEntries(this.items.map((it) => ({ color: it.color })));
  }

  /** Project callout labels — runs on every rendered frame. */
  updateOverlays() {
    this._flushGeometry();
    const o = this.options.labels;
    if (!o.show || this.labelOverlay.nodes.size === 0) return;

    const { w, h } = this._size;
    const center = _v3a.set(0, 0, 0).project(this.camera);
    const cx = ((center.x + 1) / 2) * w;
    const cy = ((1 - center.y) / 2) * h;

    for (const item of this.items) {
      const pct = item.fraction * 100;
      if (!item.visible || item.anim.length <= 0.002 || pct < o.minPercent) {
        this.labelOverlay.hide(item.index);
        continue;
      }
      const mid = item.anim.start + item.anim.length / 2;
      const r = this.options.pie.radius;
      _v3b.set(Math.cos(mid) * r, 0, Math.sin(mid) * r).add(item.group.position);

      // backfacing fade — judge by the horizontal direction only so side
      // slices stay readable and only truly-behind labels dim
      let opacity = 1;
      if (o.dimBackfacing) {
        _v3c.set(Math.cos(mid), 0, Math.sin(mid));
        _v3d.copy(this.camera.position).sub(_v3b).setY(0).normalize();
        const facing = _v3c.dot(_v3d);
        opacity = clamp(0.72 + facing * 0.75, 0.3, 1);
      }
      // entrance fade — labels appear as their slice completes
      const prog = clamp(item.anim.length / Math.max(item.target.length, 1e-6), 0, 1);
      opacity *= prog * prog * clamp(this._entranceProgress * 1.25, 0, 1);

      _v3b.project(this.camera);
      if (_v3b.z > 1) {
        this.labelOverlay.hide(item.index);
        continue;
      }
      const ax = ((_v3b.x + 1) / 2) * w;
      const ay = ((1 - _v3b.y) / 2) * h;
      let dx = ax - cx, dy = ay - cy;
      const len = Math.hypot(dx, dy);
      if (len < 0.001) {
        dx = Math.cos(mid);
        dy = Math.sin(mid);
      } else {
        dx /= len;
        dy /= len;
      }
      const text = o.format
        ? o.format(this.getItem(item.index), this)
        : `${item.label} ${pct.toFixed(1)}%`;
      this.labelOverlay.place(item.index, { ax, ay, dx, dy, textContent: text, opacity });
    }
  }

  /* ---------------------------------------------------------------- */
  /* Updates & maintenance                                             */
  /* ---------------------------------------------------------------- */

  /**
   * Merge option changes and rebuild what's affected.
   * @param {object} patch partial options
   */
  applyOptions(patch) {
    this.options = deepMerge(this.options, patch);
    if (patch.theme !== undefined) this.setTheme(patch.theme);

    const heavy = ['material', 'palette', 'pie', 'quality'];
    const needsRebuild = heavy.some((k) => patch[k] !== undefined);
    if (patch.camera) {
      this.controls.autoRotate = this.options.camera.autoRotate;
      this.controls.autoRotateSpeed = this.options.camera.autoRotateSpeed;
    }
    if (needsRebuild) this.rebuild();
    if (patch.labels) this._syncLabels();
    if (patch.legend) this._syncLegend();
    if (patch.effects) {
      this.decorations.configure({
        floorY: -this.options.pie.height / 2 - 0.02,
        radius: this.options.pie.radius,
        ringY: 0,
      });
      this.resolveBloom(this.items.some((it) => it.spec?.wantsBloom));
    }
    this.requestRender();
  }

  /** Full rebuild preserving data and current angles (no entrance). */
  rebuild() {
    const colors = resolvePalette(this.options.palette, this.items.length);
    this.items.forEach((it, i) => {
      if (!it.materialCfg) it.color = it._explicitColor || colors[i];
    });
    const items = this.items;
    this._disposeItems(items);
    for (const it of items) {
      it.group = null;
    }
    this._buildScene();
    this._layout();
    for (const it of items) it.anim = { ...it.target };
    this._flushAll();
    this._syncLegend();
    this._syncLabels();
    this.decorations.configure({
      floorY: -this.options.pie.height / 2 - 0.02,
      radius: this.options.pie.radius,
      ringY: 0,
    });
    this.frameCameraIfAuto(this.boundsRadius);
  }

  onThemeChanged() {
    // Materials are theme-tuned — rebuild them in place.
    this.rebuild();
  }

  get boundsRadius() {
    const p = this.options.pie;
    return p.radius * 1.3 + p.explode + this.options.interaction.explodeDistance * 0.5;
  }

  _summary() {
    const parts = this.items
      .filter((it) => it.visible)
      .map((it) => `${it.label} ${(it.fraction * 100).toFixed(0)}%`);
    return `Pie chart. ${parts.join(', ')}`;
  }

  destroy() {
    this._disposeItems(this.items);
    super.destroy();
  }
}

/* -------------------------------------------------------------------- */

const _v3a = new THREE.Vector3();
const _v3b = new THREE.Vector3();
const _v3c = new THREE.Vector3();
const _v3d = new THREE.Vector3();

function mergeMaterialCfg(globalCfg, itemCfg) {
  if (!itemCfg) return globalCfg;
  if (typeof itemCfg === 'string') return itemCfg;
  const base = typeof globalCfg === 'string' ? { preset: globalCfg } : globalCfg || {};
  return { ...base, ...itemCfg };
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function formatValue(v) {
  return Number.isInteger(v) ? v.toLocaleString() : v.toLocaleString(undefined, { maximumFractionDigits: 2 });
}
