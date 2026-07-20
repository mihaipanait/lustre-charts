/**
 * @module core/BaseChart
 * Shared scene rig for all Lustre charts: renderer, camera, lighting,
 * procedural studio environment, bloom pipeline, orbit controls, picking,
 * overlays, render-on-demand loop and full lifecycle management.
 *
 * Chart types subclass this and implement:
 *   `build()`            create meshes from normalized data
 *   `entrance()`         start entrance animation
 *   `updateOverlays()`   per rendered frame: project labels etc.
 *   `setHover(i|null)`   hover visual state
 *   `toggleSelect(i)`    click behavior
 *   `getTooltipHTML(i)`  tooltip content
 *   `boundsRadius`       for camera auto-framing
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

import { TweenGroup } from './Tween.js';
import { resolveTheme } from './themes.js';
import { deepMerge, clamp, cssRGBA, disposeObject3D, el } from './utils.js';
import { DEFAULT_OPTIONS } from './defaults.js';
import { Tooltip } from '../overlay/Tooltip.js';
import { Legend } from '../overlay/Legend.js';
import { LabelOverlay } from '../overlay/LabelOverlay.js';
import { Decorations } from '../fx/decorations.js';
import { createStudioScene, disposeStudioScene } from '../fx/studioEnv.js';

const STYLE_ID = 'lustre-charts-style';

const BASE_CSS = `
.lustre-root{position:relative;width:100%;height:100%;overflow:hidden;font-family:var(--lustre-font);-webkit-tap-highlight-color:transparent;}
.lustre-root canvas{display:block;outline:none;}
.lustre-labels{position:absolute;inset:0;pointer-events:none;overflow:visible;z-index:2;}
.lustre-tooltip{position:absolute;z-index:4;pointer-events:none;opacity:0;left:0;top:0;
  transform:translate(-50%,calc(-100% - 16px));background:var(--lustre-tooltip-bg);
  border:1px solid var(--lustre-tooltip-border);color:var(--lustre-tooltip-text);
  box-shadow:var(--lustre-tooltip-shadow);border-radius:12px;padding:9px 13px;
  font-size:12.5px;line-height:1.45;backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);
  transition:opacity .16s ease;white-space:nowrap;max-width:280px;}
.lustre-tooltip.visible{opacity:1;}
.lustre-tooltip .lustre-tt-title{font-weight:600;font-size:12px;letter-spacing:.02em;opacity:.72;margin-bottom:3px;display:flex;align-items:center;gap:7px;}
.lustre-tooltip .lustre-tt-dot{width:8px;height:8px;border-radius:50%;flex:none;box-shadow:0 0 8px 0 currentColor;}
.lustre-tooltip .lustre-tt-value{font-weight:700;font-size:15px;letter-spacing:.01em;}
.lustre-tooltip .lustre-tt-sub{opacity:.62;font-size:11.5px;margin-top:1px;}
.lustre-legend{position:absolute;left:0;right:0;display:flex;flex-wrap:wrap;gap:8px;justify-content:center;z-index:3;padding:12px 16px;pointer-events:none;}
.lustre-legend.lustre-legend-bottom{bottom:0;}
.lustre-legend.lustre-legend-top{top:0;}
.lustre-chip{pointer-events:auto;display:inline-flex;align-items:center;gap:7px;padding:5px 13px;border-radius:999px;
  background:var(--lustre-chip-bg);border:1px solid var(--lustre-chip-border);color:var(--lustre-text);
  font-size:12.5px;font-weight:500;letter-spacing:.01em;cursor:pointer;user-select:none;
  backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);transition:transform .16s ease,border-color .16s ease,opacity .16s ease;}
.lustre-chip:hover{border-color:var(--lustre-accent);transform:translateY(-1px);}
.lustre-chip.lustre-chip-static{cursor:default;}
.lustre-chip.lustre-chip-static:hover{border-color:var(--lustre-chip-border);transform:none;}
.lustre-chip.off{opacity:.42;}
.lustre-chip.off .lustre-chip-label{text-decoration:line-through;}
.lustre-chip-dot{width:9px;height:9px;border-radius:50%;flex:none;box-shadow:0 0 7px -1px currentColor;}
`;

function injectStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = BASE_CSS;
  document.head.appendChild(style);
}

export class BaseChart {
  /**
   * @param {HTMLElement} container
   * @param {{ type?: string, data: any, options?: object }} config
   */
  constructor(container, config = {}) {
    if (!container || !(container instanceof HTMLElement)) {
      throw new Error('[lustre-charts] first argument must be a DOM element');
    }
    injectStyles();

    this.container = container;
    this.config = config;
    /** Fully merged options. */
    this.options = deepMerge(DEFAULT_OPTIONS, config.options || {});
    this.theme = resolveTheme(this.options.theme);
    this.tweens = new TweenGroup();
    this.destroyed = false;

    /** Meshes that respond to pointer events; set by subclasses. */
    this.pickables = [];
    /** LineMaterials that need resolution updates on resize. */
    this._lineMaterials = new Set();
    this.hoveredIndex = null;
    /** @type {Set<number>} */
    this.selection = new Set();

    this._buildDOM();
    this._buildRenderer();
    this._initScene();
    this._buildOverlays();
    this.applyTheme(this.theme);

    this._raf = 0;
    this._needsRender = true;
    this._pickPending = false;
    this._lastTime = performance.now();
    this._pointer = new THREE.Vector2(2, 2); // offscreen
    this._raycaster = new THREE.Raycaster();
    this._downInfo = null;

    this._bindEvents();
  }

  /* ---------------------------------------------------------------- */
  /* Construction                                                      */
  /* ---------------------------------------------------------------- */

  _buildDOM() {
    this.root = el('div', { className: 'lustre-root' }, this.container);
    const w = this.container.clientWidth || 300;
    const h = this.container.clientHeight || 200;
    this._size = { w, h };
  }

  _buildRenderer() {
    const q = this.options.quality;
    this.renderer = new THREE.WebGLRenderer({
      antialias: q.antialias,
      alpha: true,
      powerPreference: 'high-performance',
    });
    this._dpr = q.dpr === 'auto' ? Math.min(window.devicePixelRatio || 1, 2) : q.dpr;
    this.renderer.setPixelRatio(this._dpr);
    this.renderer.setSize(this._size.w, this._size.h);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.canvas = this.renderer.domElement;
    this.canvas.setAttribute('role', 'img');
    this.root.appendChild(this.canvas);
  }

  _initScene() {
    this.scene = new THREE.Scene();

    const camOpts = this.options.camera;
    const aspect = this._size.w / Math.max(1, this._size.h);
    this.camera = new THREE.PerspectiveCamera(camOpts.fov, aspect, 0.1, 400);

    // Procedural studio environment: bright softboxes on darkness (dark
    // themes) or inside a bright surround (light themes). Near-zero diffuse
    // wash keeps colors saturated; the softboxes give long specular streaks.
    this._pmrem = new THREE.PMREMGenerator(this.renderer);
    this._buildEnvironment(this.theme.kind);

    // Lighting rig (intensities themed in applyTheme)
    this.lights = {
      hemi: new THREE.HemisphereLight('#ffffff', '#30364a', 1),
      key: new THREE.DirectionalLight('#ffffff', 1),
      fill: new THREE.DirectionalLight('#ffffff', 1),
      rim: new THREE.DirectionalLight('#ffffff', 1),
    };
    this.lights.key.position.set(7, 5.5, 6.5);
    this.lights.fill.position.set(-7, 3.5, -3);
    this.lights.rim.position.set(-3, 6, -9);
    for (const light of Object.values(this.lights)) this.scene.add(light);

    // Group all chart content so charts can be swapped/cleared cleanly.
    this.chartGroup = new THREE.Group();
    this.scene.add(this.chartGroup);

    // Controls
    const c = camOpts.controls;
    this.controls = new OrbitControls(this.camera, this.canvas);
    this.controls.enabled = c.enabled;
    this.controls.enableZoom = c.enableZoom;
    this.controls.enablePan = c.enablePan;
    this.controls.enableDamping = true;
    this.controls.dampingFactor = c.damping;
    this.controls.minPolarAngle = c.minPolarAngle;
    this.controls.maxPolarAngle = c.maxPolarAngle;
    this.controls.autoRotate = camOpts.autoRotate;
    this.controls.autoRotateSpeed = camOpts.autoRotateSpeed;
    this.controls.addEventListener('change', () => this.requestRender());
    this._userOrbited = false;
    this.controls.addEventListener('start', () => {
      this._userOrbited = true;
    });

    this.decorations = new Decorations(this);
  }

  _buildOverlays() {
    this.labelOverlay = new LabelOverlay(this);
    this.tooltip = new Tooltip(this);
    this.legend = new Legend(this);
  }

  _bindEvents() {
    this._onPointerMove = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this._pointer.set(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      );
      this._pointerPx = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      this._pickPending = true;
    };
    this._onPointerDown = (e) => {
      this._downInfo = { x: e.clientX, y: e.clientY, t: performance.now() };
    };
    this._onPointerUp = (e) => {
      const d = this._downInfo;
      this._downInfo = null;
      if (!d) return;
      const moved = Math.hypot(e.clientX - d.x, e.clientY - d.y);
      if (moved > 6 || performance.now() - d.t > 600) return; // was a drag
      this._onPointerMove(e);
      this._doPick();
      const idx = this.hoveredIndex;
      const item = idx != null ? this.getItem(idx) : null;
      this.options.interaction.onClick?.(item, e);
      if (idx != null && this.options.interaction.select !== 'none') {
        this.toggleSelect(idx);
        this.options.interaction.onSelect?.([...this.selection].map((i) => this.getItem(i)));
      }
    };
    this._onPointerLeave = () => {
      this._pointer.set(2, 2);
      this._pointerPx = null;
      this._applyHover(null);
    };

    if (this.options.interaction.enabled) {
      this.canvas.addEventListener('pointermove', this._onPointerMove);
      this.canvas.addEventListener('pointerdown', this._onPointerDown);
      this.canvas.addEventListener('pointerup', this._onPointerUp);
      this.canvas.addEventListener('pointerleave', this._onPointerLeave);
    }

    if (this.options.responsive && typeof ResizeObserver !== 'undefined') {
      this._ro = new ResizeObserver(() => this.resize());
      this._ro.observe(this.container);
    }
  }

  /* ---------------------------------------------------------------- */
  /* Theme & background                                                */
  /* ---------------------------------------------------------------- */

  _buildEnvironment(kind) {
    this._envTex?.dispose();
    const studio = createStudioScene(kind);
    // sigma 0: keep softbox reflections crisp; PMREM's own mip chain still
    // provides the roughness blur levels.
    this._envTex = this._pmrem.fromScene(studio, 0).texture;
    disposeStudioScene(studio);
    this.scene.environment = this._envTex;
    this._envKind = kind;
  }

  /**
   * Apply a theme (object or name). Charts react via `onThemeChanged`.
   * @param {string | object} theme
   */
  setTheme(theme) {
    this.options.theme = theme;
    this.theme = resolveTheme(theme);
    if (this.theme.kind !== this._envKind) this._buildEnvironment(this.theme.kind);
    this.applyTheme(this.theme);
    this.onThemeChanged?.();
    this.decorations.refresh();
    this.requestRender();
  }

  /** @param {import('./themes.js').LustreTheme} theme */
  applyTheme(theme) {
    // Background
    this._applyBackground();

    // Tone mapping + lights
    this.renderer.toneMappingExposure = theme.exposure;
    const L = theme.lights;
    this.lights.hemi.intensity = L.ambient;
    this.lights.hemi.groundColor.set(theme.kind === 'dark' ? '#232a40' : '#b9c2d6');
    this.lights.key.intensity = L.key;
    this.lights.key.color.set(L.keyColor);
    this.lights.fill.intensity = L.fill;
    this.lights.fill.color.set(L.fillColor);
    this.lights.rim.intensity = L.rim;
    this.lights.rim.color.set(L.rimColor);

    // Bloom threshold follows the theme unless user pinned it
    if (this._bloomPass) {
      const cfg = this._bloomConfig();
      this._bloomPass.threshold = cfg.threshold;
      this._bloomPass.strength = cfg.strength;
      this._bloomPass.radius = cfg.radius;
    }

    // Overlay CSS variables
    const dark = theme.kind === 'dark';
    const vars = {
      '--lustre-font': this.options.labels.fontFamily,
      '--lustre-text': theme.textColor,
      '--lustre-muted': theme.mutedTextColor,
      '--lustre-accent': theme.accentColor,
      '--lustre-tooltip-bg': theme.tooltip.background,
      '--lustre-tooltip-border': theme.tooltip.border,
      '--lustre-tooltip-text': theme.tooltip.text,
      '--lustre-tooltip-shadow': theme.tooltip.shadow,
      '--lustre-chip-bg': dark ? 'rgba(255,255,255,0.055)' : 'rgba(255,255,255,0.62)',
      '--lustre-chip-border': dark ? 'rgba(255,255,255,0.14)' : 'rgba(30,40,70,0.14)',
    };
    for (const [k, v] of Object.entries(vars)) this.root.style.setProperty(k, v);

    this.labelOverlay.onTheme();
  }

  _applyBackground() {
    const bg = this.options.background === 'auto' ? this.theme.background : this.options.background;
    if (this._bgTex) {
      this._bgTex.dispose();
      this._bgTex = null;
    }
    if (bg === 'transparent') {
      this.scene.background = null;
      this.renderer.setClearAlpha(0);
    } else if (typeof bg === 'string') {
      this.scene.background = new THREE.Color(bg);
    } else if (bg && typeof bg === 'object') {
      this._bgTex = makeGradientTexture(bg.inner, bg.outer);
      this.scene.background = this._bgTex;
    }
  }

  /* ---------------------------------------------------------------- */
  /* Bloom                                                             */
  /* ---------------------------------------------------------------- */

  _bloomConfig() {
    const user = this.options.effects.bloom;
    const obj = typeof user === 'object' && user !== null ? user : {};
    return {
      strength: obj.strength ?? (this.theme.kind === 'dark' ? 0.5 : 0.32),
      radius: obj.radius ?? 0.6,
      threshold: obj.threshold ?? this.theme.bloomThreshold,
    };
  }

  /**
   * Enable/disable bloom. Called by charts after materials resolve
   * (`effects.bloom: 'auto'`) or directly from options.
   * @param {boolean} on
   */
  setBloom(on) {
    if (on && !this.composer) {
      const cfg = this._bloomConfig();
      this.composer = new EffectComposer(this.renderer);
      this._renderPass = new RenderPass(this.scene, this.camera);
      this._bloomPass = new UnrealBloomPass(
        new THREE.Vector2(this._size.w, this._size.h),
        cfg.strength,
        cfg.radius,
        cfg.threshold
      );
      this._outputPass = new OutputPass();
      this.composer.addPass(this._renderPass);
      this.composer.addPass(this._bloomPass);
      this.composer.addPass(this._outputPass);
      this.composer.setPixelRatio(this._dpr);
      this.composer.setSize(this._size.w, this._size.h);
    }
    this._bloomOn = on;
    this.requestRender();
  }

  /** Resolve `effects.bloom: 'auto' | bool | object` given material wishes. */
  resolveBloom(materialsWantBloom) {
    const b = this.options.effects.bloom;
    if (b === false) return this.setBloom(false);
    if (b === true || (typeof b === 'object' && b !== null)) return this.setBloom(true);
    return this.setBloom(!!materialsWantBloom);
  }

  /* ---------------------------------------------------------------- */
  /* Camera                                                            */
  /* ---------------------------------------------------------------- */

  /**
   * Frame the camera around the chart bounds. Uses `options.camera`
   * elevation/azimuth/zoom unless an explicit position is given.
   * @param {number} radius bounding radius of the chart content
   * @param {THREE.Vector3} [target]
   */
  frameCamera(radius, target = new THREE.Vector3(0, 0, 0)) {
    const cam = this.options.camera;
    if (Array.isArray(cam.position)) {
      this.camera.position.set(...cam.position);
    } else {
      const fovRad = (this.camera.fov * Math.PI) / 180;
      const dist = ((radius * 1.12) / Math.tan(fovRad / 2)) * cam.zoom;
      const elev = (cam.elevation * Math.PI) / 180;
      const az = (cam.azimuth * Math.PI) / 180;
      const horiz = dist * Math.cos(elev);
      this.camera.position.set(
        target.x + horiz * Math.sin(az),
        target.y + dist * Math.sin(elev),
        target.z + horiz * Math.cos(az)
      );
      const c = cam.controls;
      this.controls.minDistance = dist * c.minDistanceFactor;
      this.controls.maxDistance = dist * c.maxDistanceFactor;
    }
    this.camera.lookAt(target);
    this.controls.target.copy(target);
    this.controls.update();
    this.requestRender();
  }

  /**
   * Re-frame only while the user hasn't taken over the camera — option
   * tweaks shouldn't yank a view someone has orbited to.
   */
  frameCameraIfAuto(radius, target) {
    if (this._userOrbited) return;
    this.frameCamera(radius, target);
  }

  /* ---------------------------------------------------------------- */
  /* Picking                                                           */
  /* ---------------------------------------------------------------- */

  _doPick() {
    if (!this.options.interaction.enabled || this.pickables.length === 0) return;
    this._raycaster.setFromCamera(this._pointer, this.camera);
    const hits = this._raycaster.intersectObjects(this.pickables, false);
    const idx = hits.length ? hits[0].object.userData.itemIndex : null;
    this._applyHover(idx);
  }

  _applyHover(idx) {
    if (idx === this.hoveredIndex) {
      if (idx != null) this.tooltip.move(this._pointerPx);
      return;
    }
    this.hoveredIndex = idx;
    this.canvas.style.cursor = idx != null ? 'pointer' : '';
    this.setHover?.(idx);
    if (idx != null && this.options.tooltip.show) {
      this.tooltip.show(this.getTooltipHTML(idx), this._pointerPx);
    } else {
      this.tooltip.hide();
    }
    this.options.interaction.onHover?.(idx != null ? this.getItem(idx) : null);
    this.requestRender();
  }

  /* ---------------------------------------------------------------- */
  /* Loop                                                              */
  /* ---------------------------------------------------------------- */

  /** Ask for a render on the next frame (render-on-demand core). */
  requestRender() {
    this._needsRender = true;
  }

  /** Register a LineMaterial so its resolution follows canvas size. */
  registerLineMaterial(mat) {
    mat.resolution.set(this._size.w * this._dpr, this._size.h * this._dpr);
    this._lineMaterials.add(mat);
  }

  start() {
    if (this._raf) return;
    const tick = (now) => {
      if (this.destroyed) return;
      this._raf = requestAnimationFrame(tick);
      const dt = Math.min(0.1, (now - this._lastTime) / 1000);
      this._lastTime = now;

      if (this.tweens.update(now)) this._needsRender = true;
      this.controls.update(dt);
      if (this._pickPending) {
        this._pickPending = false;
        this._doPick();
      }
      if (this.decorations.animated) this._needsRender = true;

      if (this._needsRender) {
        this._needsRender = false;
        this.decorations.update(now, dt);
        this.updateOverlays?.();
        this._renderFrame();
      }
    };
    this._raf = requestAnimationFrame(tick);
  }

  _renderFrame() {
    if (this._bloomOn && this.composer) this.composer.render();
    else this.renderer.render(this.scene, this.camera);
  }

  /* ---------------------------------------------------------------- */
  /* Sizing, export, lifecycle                                         */
  /* ---------------------------------------------------------------- */

  resize() {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    if (!w || !h || (w === this._size.w && h === this._size.h)) return;
    this._size = { w, h };
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.composer?.setSize(w, h);
    for (const m of this._lineMaterials) m.resolution.set(w * this._dpr, h * this._dpr);
    this.labelOverlay.resize(w, h);
    this.requestRender();
  }

  /**
   * Export the current view as a PNG data URL.
   * @returns {string}
   */
  toDataURL() {
    this.decorations.update(performance.now(), 0);
    this.updateOverlays?.();
    this._renderFrame();
    return this.canvas.toDataURL('image/png');
  }

  /** Tear down everything: GPU resources, DOM, observers, listeners. */
  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    cancelAnimationFrame(this._raf);
    this._ro?.disconnect();
    this.canvas.removeEventListener('pointermove', this._onPointerMove);
    this.canvas.removeEventListener('pointerdown', this._onPointerDown);
    this.canvas.removeEventListener('pointerup', this._onPointerUp);
    this.canvas.removeEventListener('pointerleave', this._onPointerLeave);
    this.tweens.kill();
    this.controls.dispose();
    disposeObject3D(this.scene);
    this.decorations.dispose();
    this._bgTex?.dispose();
    this._envTex?.dispose();
    this._pmrem?.dispose();
    this._bloomPass?.dispose();
    this.composer?.dispose?.();
    this.renderer.dispose();
    this.root.remove();
  }

  /* ---------------------------------------------------------------- */
  /* Subclass helpers                                                  */
  /* ---------------------------------------------------------------- */

  /**
   * Chart.js-style convenience: update data and/or options in one call,
   * animating what can be animated.
   * @param {{ data?: any, options?: object }} patch
   */
  update(patch = {}) {
    if (patch.options) this.applyOptions(patch.options);
    if (patch.data !== undefined) this.setData(patch.data);
  }

  /** Replay the entrance animation. */
  replay() {
    this.entrance?.();
  }

  /** Item accessor for events/tooltip — subclasses override. */
  getItem(index) {
    return { index };
  }

  getTooltipHTML(index) {
    return String(index);
  }

  toggleSelect(index) {
    if (this.selection.has(index)) this.selection.delete(index);
    else this.selection.add(index);
    this.onSelectionChanged?.();
    this.requestRender();
  }

  /** Accessible summary applied to the canvas. */
  setAriaLabel(text) {
    this.canvas.setAttribute('aria-label', this.options.ariaLabel || text);
  }
}

/**
 * Soft radial-gradient background texture (in-scene so bloom composites
 * correctly, unlike CSS backdrops).
 */
function makeGradientTexture(inner, outer) {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createRadialGradient(size / 2, size * 0.42, size * 0.05, size / 2, size / 2, size * 0.72);
  grad.addColorStop(0, inner);
  grad.addColorStop(1, outer);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export { cssRGBA, clamp };
