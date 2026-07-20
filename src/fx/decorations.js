/**
 * @module fx/decorations
 * Optional scene garnish for the futuristic looks: a radially fading neon
 * grid floor, slowly counter-rotating HUD rings, floating dust particles
 * and a soft procedural contact shadow. All fully disposable and re-themed
 * on the fly.
 */

import * as THREE from 'three';

export class Decorations {
  /** @param {import('../core/BaseChart.js').BaseChart} chart */
  constructor(chart) {
    this.chart = chart;
    this.group = new THREE.Group();
    this.group.renderOrder = -1;
    chart.scene.add(this.group);
    this._cfg = { floorY: 0, radius: 3 };
    this._parts = { grid: null, rings: null, particles: null, shadow: null };
  }

  /** True while any animated decoration is active (drives continuous rendering). */
  get animated() {
    return !!(this._parts.rings || this._parts.particles);
  }

  /**
   * (Re)build decorations for the current options + theme.
   * @param {{ floorY?: number, radius?: number }} [cfg]
   */
  configure(cfg = {}) {
    Object.assign(this._cfg, cfg);
    this.refresh();
  }

  refresh() {
    this.dispose(false);
    const fx = this.chart.options.effects;
    if (fx.shadow) this._buildShadow();
    if (fx.grid) this._buildGrid();
    if (fx.rings) this._buildRings();
    if (fx.particles) this._buildParticles();
    this.chart.requestRender();
  }

  /* ---------------------------------------------------------------- */

  _buildShadow() {
    const { floorY, radius } = this._cfg;
    const theme = this.chart.theme;
    const tex = makeRadialTexture([
      [0, `rgba(0,0,0,${theme.shadowOpacity})`],
      [0.55, `rgba(0,0,0,${theme.shadowOpacity * 0.5})`],
      [1, 'rgba(0,0,0,0)'],
    ]);
    const mat = new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      depthWrite: false,
      toneMapped: false,
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(radius * 3.1, radius * 3.1), mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = floorY + 0.002;
    mesh.renderOrder = -2;
    this.group.add(mesh);
    this._parts.shadow = mesh;
  }

  _buildGrid() {
    const { floorY, radius } = this._cfg;
    const theme = this.chart.theme;
    const dark = theme.kind === 'dark';
    const extent = radius * 5;
    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: {
        uColor: { value: new THREE.Color(theme.gridColor) },
        uExtent: { value: extent },
        uOpacity: { value: dark ? 0.5 : 0.4 },
        uCell: { value: Math.max(0.5, radius / 4) },
      },
      vertexShader: /* glsl */ `
        varying vec2 vPos;
        void main() {
          vPos = position.xy;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor;
        uniform float uExtent;
        uniform float uOpacity;
        uniform float uCell;
        varying vec2 vPos;
        float gridLine(vec2 p, float scale) {
          vec2 q = p / scale;
          vec2 g = abs(fract(q - 0.5) - 0.5) / fwidth(q);
          return 1.0 - min(min(g.x, g.y), 1.0);
        }
        void main() {
          float fine = gridLine(vPos, uCell) * 0.5;
          float coarse = gridLine(vPos, uCell * 4.0);
          float g = max(fine, coarse);
          float r = length(vPos);
          float fade = 1.0 - smoothstep(uExtent * 0.22, uExtent * 0.52, r);
          float a = g * fade * uOpacity;
          if (a < 0.003) discard;
          gl_FragColor = vec4(uColor, a);
        }`,
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(extent * 2, extent * 2), mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = floorY;
    mesh.renderOrder = -3;
    this.group.add(mesh);
    this._parts.grid = mesh;
  }

  _buildRings() {
    const { radius } = this._cfg;
    const theme = this.chart.theme;
    const group = new THREE.Group();
    const color = new THREE.Color(theme.ringColor);

    const ringSpecs = [
      { r: radius * 1.22, dash: 0.4, gap: 0.25, opacity: 0.6, speed: 0.1 },
      { r: radius * 1.38, dash: 1.6, gap: 1.1, opacity: 0.34, speed: -0.055 },
      { r: radius * 1.5, dash: 0.06, gap: 0.5, opacity: 0.5, speed: 0.028 },
    ];
    for (const spec of ringSpecs) {
      const pts = [];
      const n = 220;
      for (let i = 0; i <= n; i++) {
        const a = (i / n) * Math.PI * 2;
        pts.push(new THREE.Vector3(Math.cos(a) * spec.r, 0, Math.sin(a) * spec.r));
      }
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      const mat = new THREE.LineDashedMaterial({
        color,
        dashSize: spec.dash,
        gapSize: spec.gap,
        transparent: true,
        opacity: spec.opacity,
        depthWrite: false,
        toneMapped: false,
      });
      const line = new THREE.Line(geo, mat);
      line.computeLineDistances();
      line.userData.speed = spec.speed;
      group.add(line);
    }
    group.position.y = this._cfg.ringY ?? 0;
    this.group.add(group);
    this._parts.rings = group;
  }

  _buildParticles() {
    const { radius, floorY } = this._cfg;
    const theme = this.chart.theme;
    const count = 130;
    const positions = new Float32Array(count * 3);
    const seeds = new Float32Array(count * 2);
    for (let i = 0; i < count; i++) {
      const r = radius * (0.4 + Math.random() * 1.6);
      const a = Math.random() * Math.PI * 2;
      positions[i * 3] = Math.cos(a) * r;
      positions[i * 3 + 1] = floorY + Math.random() * radius * 1.8;
      positions[i * 3 + 2] = Math.sin(a) * r;
      seeds[i * 2] = Math.random() * Math.PI * 2;
      seeds[i * 2 + 1] = 0.08 + Math.random() * 0.22;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this._particleSeeds = seeds;
    this._particleTop = floorY + radius * 1.9;
    this._particleBottom = floorY;

    const mat = new THREE.PointsMaterial({
      color: new THREE.Color(theme.kind === 'dark' ? '#9fc4ff' : '#7387b8'),
      size: radius * 0.02,
      map: makeRadialTexture([
        [0, 'rgba(255,255,255,1)'],
        [0.4, 'rgba(255,255,255,0.5)'],
        [1, 'rgba(255,255,255,0)'],
      ], 64),
      transparent: true,
      opacity: theme.kind === 'dark' ? 0.75 : 0.5,
      depthWrite: false,
      blending: theme.kind === 'dark' ? THREE.AdditiveBlending : THREE.NormalBlending,
      sizeAttenuation: true,
    });
    const points = new THREE.Points(geo, mat);
    this.group.add(points);
    this._parts.particles = points;
  }

  /* ---------------------------------------------------------------- */

  /** Advance animated decorations. Called on rendered frames. */
  update(now, dt) {
    if (this._parts.rings) {
      for (const line of this._parts.rings.children) {
        line.rotation.y += line.userData.speed * dt;
      }
    }
    if (this._parts.particles) {
      const pos = this._parts.particles.geometry.attributes.position;
      const t = now / 1000;
      for (let i = 0; i < pos.count; i++) {
        const seed = this._particleSeeds[i * 2];
        const speed = this._particleSeeds[i * 2 + 1];
        let y = pos.getY(i) + speed * dt;
        if (y > this._particleTop) y = this._particleBottom;
        pos.setY(i, y);
        pos.setX(i, pos.getX(i) + Math.sin(t * 0.6 + seed) * dt * 0.05);
      }
      pos.needsUpdate = true;
    }
  }

  /**
   * @param {boolean} [full] also remove the group itself (destroy path)
   */
  dispose(full = true) {
    for (const key of Object.keys(this._parts)) {
      const part = this._parts[key];
      if (!part) continue;
      part.traverse?.((obj) => {
        obj.geometry?.dispose();
        if (obj.material) {
          obj.material.map?.dispose();
          obj.material.dispose();
        }
      });
      this.group.remove(part);
      this._parts[key] = null;
    }
    if (full) this.chart.scene.remove(this.group);
  }
}

/** Radial gradient CanvasTexture used for shadows and particle sprites. */
function makeRadialTexture(stops, size = 256) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  for (const [offset, color] of stops) grad.addColorStop(offset, color);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
