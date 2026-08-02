/**
 * @module charts/RadialChart
 * Concentric 3D percentage rings. Every item owns one ring and is normalized
 * independently against `radial.maxValue`; a complete revolution is 100%.
 */

import * as THREE from 'three';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';

import { BaseChart } from '../core/BaseChart.js';
import { createTooltipContent } from '../overlay/Tooltip.js';
import { buildProfile, buildSliceGeometry, buildSliceOutlinePositions } from '../geometry/sliceGeometry.js';
import { createItemMaterial, autoProfileFor } from '../materials/materials.js';
import { resolvePalette } from '../core/palettes.js';
import { optionPatchNeedsRebuild } from '../core/runtimeOptions.js';
import { clamp } from '../core/utils.js';
import {
  computeRadialBands,
  distributeLabelYs,
  fitRadialProfile,
  normalizeRadialData,
  radialFraction,
  resolveRadialMax,
} from './radialData.js';

const TAU = Math.PI * 2;
const DEG = Math.PI / 180;

export class RadialChart extends BaseChart {
  constructor(container, config) {
    super(container, config);
    // A little more elevation and less extrusion keep inner rings readable.
    if (config.options?.camera?.elevation === undefined) this.options.camera.elevation = 38;
    /** @type {Array<object>} normalized rings */
    this.items = [];
    this._entranceProgress = 1;
    this._dirtySet = new Set();
    this.setData(config.data, false);
    this.frameChart();
    this._configureDecorations();
    this.start();
    this.entrance();
  }

  /* ---------------------------------------------------------------- */
  /* Data and layout                                                   */
  /* ---------------------------------------------------------------- */

  _normalize(data) {
    const raw = normalizeRadialData(data);
    const colors = resolvePalette(this.options.palette, raw.length);
    return raw.map((entry, index) => ({
      index,
      label: entry.label,
      value: entry.value,
      _explicitColor: entry.color || null,
      color: entry.color || colors[index],
      materialCfg: entry.material || null,
      visible: true,
      fraction: 0,
      targetLength: 0,
      animLength: 0,
      innerRadius: 0,
      outerRadius: 0,
      centerRadius: 0,
      group: null,
      mesh: null,
      outline: null,
      track: null,
      spec: null,
      profile: null,
      topY: 0,
      hoverT: 0,
    }));
  }

  setData(data, animate = this.options.animation.animateUpdates) {
    const previous = this.items;
    const previousByLabel = new Map(previous.map((item) => [item.label, item]));
    this.tweens.kill('radial');
    const next = this._normalize(data);
    this.items = next;
    try {
      this._layout();
    } catch (error) {
      this.items = previous;
      throw error;
    }
    this.selection = new Set([...this.selection].filter((index) => index < next.length));
    this.hoveredIndex = null;
    this.tooltip.hide();
    this.canvas.style.cursor = '';

    const fromLengths = this.items.map((item, index) => {
      const old = previousByLabel.get(item.label) || previous[index];
      if (old) item.visible = old.visible;
      return old?.animLength ?? 0;
    });

    this._disposeItems(previous);
    this._dirtySet.clear();
    this._buildScene();

    if (this._entranceProgress < 1) {
      this.entrance();
    } else if (previous.length && animate) {
      this.items.forEach((item, index) => {
        item.animLength = fromLengths[index];
      });
      this._flushAll();
      this._tweenToLayout(this.options.animation.updateDuration);
    } else {
      for (const item of this.items) item.animLength = item.targetLength;
      this._flushAll();
    }

    this.setAriaLabel(this._summary());
    this._syncLegend();
    this._syncLabels();
    this._configureDecorations();
    this.frameChartIfAuto();
    this.requestRender();
  }

  _layout() {
    const p = this.options.radial;
    const maxValue = resolveRadialMax(p.maxValue);
    const bands = computeRadialBands(this.items.length, p);
    this.items.forEach((item, index) => {
      Object.assign(item, bands[index]);
      item.fraction = radialFraction(item.value, maxValue);
      item.targetLength = item.visible ? item.fraction * TAU : 0;
    });
  }

  /* ---------------------------------------------------------------- */
  /* Scene construction                                                */
  /* ---------------------------------------------------------------- */

  _buildScene() {
    const p = this.options.radial;
    this.pickables = [];
    let anyBloom = false;

    for (const item of this.items) {
      item.mesh = null;
      item.outline = null;
      item.layers = null;
      item.track = null;
      item.spec = null;
      item._hoverTarget = undefined;
      item._glowTarget = undefined;
      const materialCfg = mergeMaterialCfg(this.options.material, item.materialCfg);
      const profileOpt = p.profile === 'auto' ? autoProfileFor(materialCfg) : p.profile;
      const dimensions = {
        innerRadius: item.innerRadius,
        radius: item.outerRadius,
        height: p.height,
        cornerRadius: p.cornerRadius,
      };
      const resolvedProfile = Array.isArray(profileOpt)
        ? fitRadialProfile(profileOpt, {
            innerRadius: item.innerRadius,
            outerRadius: item.outerRadius,
            height: p.height,
          })
        : profileOpt;
      item.profile = buildProfile(resolvedProfile, dimensions, {
        roundedSegments: this.quality.roundedSegments,
        tubeSegments: this.quality.tubeSegments,
      });
      item.topY = Math.max(...item.profile.points.map((point) => point.y));

      const spec = createItemMaterial({
        material: materialCfg,
        color: item.color,
        theme: this.theme,
        thickness: p.height,
      });
      item.spec = spec;
      anyBloom = anyBloom || spec.wantsBloom;

      const group = new THREE.Group();
      if (p.track) {
        item.track = this._createTrack(item);
        group.add(item.track);
      }

      const mesh = new THREE.Mesh(new THREE.BufferGeometry(), spec.material);
      mesh.userData.itemIndex = item.index;
      group.add(mesh);

      item.layers = [];
      let layerTop = item.topY;
      const bandWidth = item.outerRadius - item.innerRadius;
      for (const layerSpec of spec.layers || []) {
        const radialInset = Math.max(0.008, bandWidth * layerSpec.inset);
        const layerHeight = Math.max(0.018, p.height * layerSpec.height);
        const innerRadius = item.innerRadius + radialInset;
        const radius = Math.max(innerRadius + 0.012, item.outerRadius - radialInset);
        const profile = buildProfile('rounded', {
          innerRadius,
          radius,
          height: layerHeight,
          cornerRadius: Math.min(p.cornerRadius * 0.7, layerHeight * 0.42, (radius - innerRadius) * 0.34),
        }, {
          roundedSegments: this.quality.roundedSegments,
          tubeSegments: this.quality.tubeSegments,
        });
        const layerMesh = new THREE.Mesh(new THREE.BufferGeometry(), layerSpec.material);
        const layerBottom = layerTop - layerHeight * (layerSpec.embed ?? 0);
        layerMesh.position.y = layerBottom + layerHeight / 2;
        group.add(layerMesh);

        let layerOutline = null;
        if (layerSpec.outline) {
          const lineMat = new LineMaterial({
            color: layerSpec.outline.color,
            linewidth: layerSpec.outline.widthPx,
            transparent: true,
            opacity: layerSpec.outline.opacity,
            depthWrite: false,
            toneMapped: false,
          });
          this.registerLineMaterial(lineMat);
          layerOutline = new LineSegments2(new LineSegmentsGeometry(), lineMat);
          layerOutline.position.y = layerMesh.position.y;
          layerOutline.visible = false;
          group.add(layerOutline);
        }
        item.layers.push({
          spec: layerSpec,
          mesh: layerMesh,
          outline: layerOutline,
          profile,
          radialInset,
          centerRadius: (innerRadius + radius) / 2,
        });
        layerTop = Math.max(layerTop, layerBottom + layerHeight);
      }
      item.topY = layerTop;

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
    if (this.hoveredIndex != null) this.setHover(this.hoveredIndex);
  }

  _createTrack(item) {
    const p = this.options.radial;
    const cfg = typeof p.track === 'object' ? p.track : {};
    const trackHeight = Math.max(0.035, p.height * 0.18);
    const trackProfile = buildProfile('rounded', {
      innerRadius: item.innerRadius,
      radius: item.outerRadius,
      height: trackHeight,
      cornerRadius: Math.min(p.cornerRadius, trackHeight * 0.42, (item.outerRadius - item.innerRadius) * 0.42),
    }, {
      roundedSegments: this.quality.roundedSegments,
      tubeSegments: this.quality.tubeSegments,
    });
    const color = !cfg.color || cfg.color === 'auto'
      ? (this.theme.kind === 'dark' ? '#263044' : '#cbd3df')
      : cfg.color;
    const opacity = clamp(cfg.opacity ?? (this.theme.kind === 'dark' ? 0.5 : 0.72), 0, 1);
    const material = new THREE.MeshPhysicalMaterial({
      color,
      roughness: 0.72,
      metalness: 0.08,
      clearcoat: 0.18,
      clearcoatRoughness: 0.6,
      envMapIntensity: this.theme.envIntensity * 0.55,
      transparent: opacity < 1,
      opacity,
      depthWrite: opacity >= 0.85,
    });
    const mesh = new THREE.Mesh(buildSliceGeometry(trackProfile, 0, TAU, {
      radialResolution: this.quality.radialResolution,
    }), material);
    mesh.position.y = -(p.height / 2 + trackHeight / 2 + 0.025);
    mesh.userData.track = true;
    return mesh;
  }

  _disposeItems(items) {
    for (const item of items) {
      if (!item.group) continue;
      item.mesh?.geometry.dispose();
      item.spec?.material.dispose();
      for (const layer of item.layers || []) {
        layer.mesh.geometry.dispose();
        layer.spec.material.dispose();
        if (layer.outline) {
          layer.outline.geometry.dispose();
          this._lineMaterials.delete(layer.outline.material);
          layer.outline.material.dispose();
        }
      }
      if (item.track) {
        item.track.geometry.dispose();
        item.track.material.dispose();
      }
      if (item.outline) {
        item.outline.geometry.dispose();
        this._lineMaterials.delete(item.outline.material);
        item.outline.material.dispose();
      }
      this.chartGroup.remove(item.group);
      item.group = null;
      item.mesh = null;
      item.outline = null;
      item.layers = null;
      item.track = null;
      item.spec = null;
    }
  }

  /* ---------------------------------------------------------------- */
  /* Geometry and animation                                            */
  /* ---------------------------------------------------------------- */

  _geometryStart(length) {
    const start = this.options.radial.startAngle * DEG;
    return this.options.radial.clockwise ? start : start - length;
  }

  _leadingAngle(length) {
    const start = this.options.radial.startAngle * DEG;
    return start + (this.options.radial.clockwise ? length : -length);
  }

  _dirty(item) {
    this._dirtySet.add(item);
    this.requestRender();
  }

  _flushAll() {
    for (const item of this.items) this._dirty(item);
    this._flushGeometry();
  }

  _flushGeometry() {
    if (this._dirtySet.size === 0) return;
    const geometryOptions = { radialResolution: this.quality.radialResolution };
    for (const item of this._dirtySet) {
      const length = clamp(item.animLength, 0, TAU);
      const show = length > 0.0005;
      item.mesh.visible = show;
      if (item.track) item.track.visible = item.visible || show;
      if (item.outline) item.outline.visible = show;
      for (const layer of item.layers || []) {
        layer.mesh.visible = show;
        if (layer.outline) layer.outline.visible = show;
      }
      if (!show) continue;

      const start = this._geometryStart(length);
      item.mesh.geometry.dispose();
      item.mesh.geometry = buildSliceGeometry(item.profile, start, length, geometryOptions);
      for (const layer of item.layers || []) {
        const angularInset = length >= TAU - 1e-4
          ? 0
          : Math.min((layer.radialInset * 0.7) / Math.max(layer.centerRadius, 0.05), length * 0.2);
        const layerStart = start + angularInset;
        const layerLength = Math.max(1e-5, length - angularInset * 2);
        layer.mesh.geometry.dispose();
        layer.mesh.geometry = buildSliceGeometry(layer.profile, layerStart, layerLength, geometryOptions);
        if (layer.outline) {
          layer.outline.geometry.dispose();
          const layerGeometry = new LineSegmentsGeometry();
          layerGeometry.setPositions(buildSliceOutlinePositions(layer.profile, layerStart, layerLength, geometryOptions));
          layer.outline.geometry = layerGeometry;
        }
      }
      if (item.outline) {
        item.outline.geometry.dispose();
        const geometry = new LineSegmentsGeometry();
        geometry.setPositions(buildSliceOutlinePositions(item.profile, start, length, geometryOptions));
        item.outline.geometry = geometry;
      }
      this._applyLift(item);
    }
    this._dirtySet.clear();
  }

  _tweenToLayout(duration) {
    this.tweens.kill('radial-length');
    for (const item of this.items) {
      const from = item.animLength;
      const to = item.targetLength;
      if (Math.abs(from - to) < 1e-4) {
        item.animLength = to;
        this._dirty(item);
        continue;
      }
      this.tweens.add({
        duration,
        easing: 'cubicInOut',
        tag: `radial-length-${item.index}`,
        onUpdate: (value, t) => {
          item.animLength = from + (to - from) * t;
          this._dirty(item);
        },
        onComplete: () => {
          item.animLength = to;
          this._dirty(item);
        },
      });
    }
  }

  entrance() {
    const animation = this.options.animation;
    const kind = animation.entrance === 'auto' ? 'sweep' : animation.entrance;
    this._layout();
    this.tweens.kill('radial');

    if (kind === 'none' || !this.items.length) {
      for (const item of this.items) {
        item.animLength = item.targetLength;
        item.group.position.y = this._targetLift(item);
        item.group.scale.setScalar(1);
      }
      this._entranceProgress = 1;
      this._flushAll();
      return;
    }
    if (kind === 'rise') return this._entranceRise();
    if (kind === 'scale') return this._entranceScale();
    return this._entranceSweep();
  }

  _entranceSweep() {
    const animation = this.options.animation;
    this._entranceProgress = 0;
    for (const item of this.items) item.animLength = 0;
    this._flushAll();

    this.items.forEach((item, index) => {
      this.tweens.add({
        duration: animation.duration * 0.82,
        delay: index * animation.stagger,
        easing: animation.easing,
        tag: `radial-entrance-${index}`,
        onUpdate: (value, t) => {
          item.animLength = item.targetLength * t;
          this._entranceProgress = Math.max(this._entranceProgress, (index + t) / this.items.length);
          this._dirty(item);
        },
        onComplete: () => {
          item.animLength = item.targetLength;
          if (index === this.items.length - 1) this._entranceProgress = 1;
          this._dirty(item);
        },
      });
    });
  }

  _entranceRise() {
    const animation = this.options.animation;
    const drop = this.options.radial.height * 2.4;
    this._entranceProgress = 0;
    for (const item of this.items) item.animLength = item.targetLength;
    this._flushAll();

    this.items.forEach((item, index) => {
      item.group.position.y = -drop;
      item.group.scale.setScalar(0.82);
      this.tweens.add({
        duration: animation.duration * 0.62,
        delay: index * animation.stagger,
        easing: 'backOut',
        tag: `radial-entrance-${index}`,
        onUpdate: (value, t) => {
          item.group.position.y = -drop * (1 - t) + this._targetLift(item) * t;
          item.group.scale.setScalar(0.82 + 0.18 * t);
          this._entranceProgress = Math.max(this._entranceProgress, (index + t) / this.items.length);
          this.requestRender();
        },
        onComplete: () => {
          item.group.position.y = this._targetLift(item);
          item.group.scale.setScalar(1);
          if (index === this.items.length - 1) this._entranceProgress = 1;
        },
      });
    });
  }

  _entranceScale() {
    const animation = this.options.animation;
    this._entranceProgress = 0;
    for (const item of this.items) item.animLength = item.targetLength;
    this._flushAll();

    this.items.forEach((item, index) => {
      item.group.scale.setScalar(0.0001);
      this.tweens.add({
        duration: animation.duration * 0.58,
        delay: index * animation.stagger,
        easing: 'backOut',
        tag: `radial-entrance-${index}`,
        onUpdate: (value, t) => {
          item.group.scale.setScalar(Math.max(0.0001, t));
          this._entranceProgress = Math.max(this._entranceProgress, (index + t) / this.items.length);
          this.requestRender();
        },
        onComplete: () => {
          item.group.scale.setScalar(1);
          if (index === this.items.length - 1) this._entranceProgress = 1;
        },
      });
    });
  }

  /* ---------------------------------------------------------------- */
  /* Interaction                                                       */
  /* ---------------------------------------------------------------- */

  _targetLift(item) {
    const interaction = this.options.interaction;
    return (this.selection.has(item.index) ? interaction.explodeDistance : 0) +
      item.hoverT * interaction.liftDistance;
  }

  _applyLift(item) {
    item.group.position.y = this._targetLift(item);
  }

  setHover(index) {
    const interaction = this.options.interaction;
    for (const item of this.items) {
      const on = item.index === index;
      const wantsLift = interaction.hover === 'lift' || interaction.hover === 'both';
      const wantsGlow = interaction.hover === 'glow' || interaction.hover === 'both';
      const targetT = on && wantsLift ? 1 : 0;
      const targetE = on && wantsGlow ? item.spec.hoverEmissive : item.spec.baseEmissive;
      if ((item._hoverTarget ?? 0) === targetT &&
          (item._glowTarget ?? item.spec.baseEmissive) === targetE) continue;
      item._hoverTarget = targetT;
      item._glowTarget = targetE;

      const fromT = item.hoverT;
      const fromE = item.spec.material.emissiveIntensity;
      this.tweens.kill(`radial-hover-${item.index}`);
      this.tweens.add({
        duration: 220,
        easing: 'cubicOut',
        tag: `radial-hover-${item.index}`,
        onUpdate: (value, t) => {
          item.hoverT = fromT + (targetT - fromT) * t;
          item.spec.material.emissiveIntensity = fromE + (targetE - fromE) * t;
          this._applyLift(item);
          this.requestRender();
        },
      });
    }
  }

  onSelectionChanged() {
    for (const item of this.items) {
      const from = item.group.position.y;
      const to = this._targetLift(item);
      if (Math.abs(from - to) < 1e-4) continue;
      this.tweens.kill(`radial-select-${item.index}`);
      this.tweens.add({
        duration: 340,
        easing: 'backOut',
        tag: `radial-select-${item.index}`,
        onUpdate: (value, t) => {
          item.group.position.y = from + (to - from) * t;
          this.requestRender();
        },
      });
    }
  }

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
    const item = this.items[index];
    if (!item) return null;
    return {
      index,
      label: item.label,
      value: item.value,
      color: item.color,
      fraction: item.fraction,
      percent: item.fraction * 100,
      maxValue: resolveRadialMax(this.options.radial.maxValue),
      visible: item.visible,
    };
  }

  getTooltipHTML(index) {
    const item = this.getItem(index);
    if (!item) return '';
    const custom = this.options.tooltip.format;
    if (custom) return custom(item, this);
    return createTooltipContent({
      title: item.label,
      color: item.color,
      value: formatValue(item.value),
      sub: `${item.percent.toFixed(1)}% of ${formatValue(item.maxValue)}`,
    });
  }

  /* ---------------------------------------------------------------- */
  /* Overlays                                                          */
  /* ---------------------------------------------------------------- */

  _syncLegend() {
    this.legend.setEntries(
      this.items.map((item) => ({ label: item.label, color: item.color, visible: item.visible })),
      {
        onToggle: (index) => this.options.legend.interactive && this.toggleVisibility(index),
        onHover: (index) => this.setHover(index),
      }
    );
  }

  _syncLabels() {
    this.labelOverlay.setEntries(this.items.map((item) => ({ color: item.color })));
  }

  updateOverlays() {
    this._flushGeometry();
    const options = this.options.labels;
    if (!options.show || this.labelOverlay.nodes.size === 0) return;

    const { w, h } = this._size;
    const center = _v3a.set(0, 0, 0).project(this.camera);
    const centerX = ((center.x + 1) / 2) * w;
    const centerY = ((1 - center.y) / 2) * h;
    const candidates = [];

    for (const item of this.items) {
      const percent = item.fraction * 100;
      if (!item.visible || item.animLength <= 0.002 || percent < options.minPercent) {
        this.labelOverlay.hide(item.index);
        continue;
      }

      const angle = this._leadingAngle(item.animLength);
      _v3b.set(
        Math.cos(angle) * item.centerRadius,
        item.topY + item.group.position.y,
        Math.sin(angle) * item.centerRadius
      );

      let opacity = 1;
      if (options.dimBackfacing) {
        _v3c.set(Math.cos(angle), 0, Math.sin(angle));
        _v3d.copy(this.camera.position).sub(_v3b).setY(0).normalize();
        opacity = clamp(0.75 + _v3c.dot(_v3d) * 0.65, 0.36, 1);
      }
      const progress = clamp(item.animLength / Math.max(item.targetLength, 1e-6), 0, 1);
      opacity *= progress * progress * clamp(this._entranceProgress * 1.25, 0, 1);

      _v3b.project(this.camera);
      if (_v3b.z > 1) {
        this.labelOverlay.hide(item.index);
        continue;
      }
      const anchorX = ((_v3b.x + 1) / 2) * w;
      const anchorY = ((1 - _v3b.y) / 2) * h;
      let dx = anchorX - centerX, dy = anchorY - centerY;
      const length = Math.hypot(dx, dy);
      if (length < 0.001) {
        dx = Math.cos(angle);
        dy = Math.sin(angle);
      } else {
        dx /= length;
        dy /= length;
      }
      const text = options.format
        ? options.format(this.getItem(item.index), this)
        : `${item.label} ${percent.toFixed(1)}%`;
      candidates.push({
        item,
        anchorX,
        anchorY,
        dx,
        dy,
        side: dx >= 0 ? 1 : -1,
        text,
        opacity,
      });
    }

    const verticalMargin = Math.max(10, options.fontSize * 1.2);
    const labelGap = options.fontSize * 1.5;
    for (const side of [-1, 1]) {
      const lane = candidates.filter((candidate) => candidate.side === side);
      const rows = distributeLabelYs(
        lane.map((candidate) => candidate.anchorY + candidate.dy * options.offset),
        verticalMargin,
        h - verticalMargin,
        labelGap
      );
      lane.forEach((candidate, index) => {
        this.labelOverlay.place(candidate.item.index, {
          ax: candidate.anchorX,
          ay: candidate.anchorY,
          dx: candidate.dx,
          dy: candidate.dy,
          side: candidate.side,
          elbowY: rows[index],
          textContent: candidate.text,
          opacity: candidate.opacity,
        });
      });
    }
  }

  /* ---------------------------------------------------------------- */
  /* Updates and maintenance                                           */
  /* ---------------------------------------------------------------- */

  applyOptions(patch) {
    const { needsCameraFrame } = this._applyBaseOptions(patch);
    const needsRebuild = optionPatchNeedsRebuild(patch, 'radial');
    if (needsRebuild) this.rebuild();
    if (patch.labels && !needsRebuild) {
      this._syncLabels();
      this.frameChartIfAuto();
    }
    if (patch.legend && !needsRebuild) this._syncLegend();
    if (patch.effects) {
      this._configureDecorations();
      this.resolveBloom(this.items.some((item) => item.spec?.wantsBloom));
    }
    if (needsCameraFrame) this.frameChart(true);
    this.requestRender();
  }

  rebuild() {
    const colors = resolvePalette(this.options.palette, this.items.length);
    this.items.forEach((item, index) => {
      item.color = item._explicitColor || colors[index];
    });
    this.tweens.kill('radial');
    const items = this.items;
    this._disposeItems(items);
    this._dirtySet.clear();
    for (const item of items) item.group = null;
    this._layout();
    this._buildScene();
    for (const item of items) item.animLength = item.targetLength;
    this._flushAll();
    this.setAriaLabel(this._summary());
    this._syncLegend();
    this._syncLabels();
    this._configureDecorations();
    this.frameChartIfAuto();
  }

  onThemeChanged() {
    this.rebuild();
  }

  _configureDecorations() {
    const p = this.options.radial;
    const trackDepth = p.track ? Math.max(0.035, p.height * 0.18) + 0.025 : 0;
    this.decorations.configure({
      floorY: -p.height / 2 - trackDepth - 0.02,
      radius: p.radius,
      ringY: 0,
    });
  }

  get boundsRadius() {
    const p = this.options.radial;
    const aspect = this.camera?.aspect ?? 1;
    const narrowLabelMargin = this.options.labels.show
      ? clamp((1 - aspect) * 0.9, 0, 0.3)
      : 0;
    return p.radius * (1.32 + narrowLabelMargin) + this.options.interaction.explodeDistance * 0.35;
  }

  _summary() {
    const parts = this.items
      .filter((item) => item.visible)
      .map((item) => `${item.label} ${(item.fraction * 100).toFixed(0)}%`);
    return parts.length ? `Radial chart. ${parts.join(', ')}` : 'Radial chart.';
  }

  destroy() {
    this._disposeItems(this.items);
    super.destroy();
  }
}

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

function formatValue(value) {
  return Number.isInteger(value)
    ? value.toLocaleString()
    : value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}
