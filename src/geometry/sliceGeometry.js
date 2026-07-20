/**
 * @module geometry/sliceGeometry
 * Builds pie/donut slice geometry by revolving a 2D cross-section
 * ("profile") between two angles, with proper flat caps and analytic
 * normals (smooth around the revolve, creased across profile corners).
 *
 * A profile lives in the (x = radius, y = height) plane and is described by
 * an ordered CCW loop of points. Hard corners are represented by duplicated
 * positions with different normals, which is exactly what the GPU needs.
 *
 * Presets: `straight`, `rounded`, `pillow`, `tube` — or pass an array of
 * `{ x, y }` points for a fully custom cross-section (the sample project's
 * beloved profile editor concept, productized).
 */

import * as THREE from 'three';

const EPS = 1e-6;

/**
 * @typedef {object} Profile
 * @property {{ x: number, y: number, nx: number, ny: number }[]} points
 *   Open strip whose last position equals the first (loop closure).
 * @property {{ x: number, y: number }[]} capContour  clean CCW polygon for caps
 * @property {{ x: number, y: number }[]} edgeMarks   where rim outline arcs run
 */

/* ------------------------------------------------------------------ */
/* Profile construction                                                */
/* ------------------------------------------------------------------ */

function makePusher(points) {
  return (x, y, nx, ny, force = false) => {
    const last = points[points.length - 1];
    if (!force && last && Math.abs(last.x - x) < EPS && Math.abs(last.y - y) < EPS &&
        Math.abs(last.nx - nx) < 1e-4 && Math.abs(last.ny - ny) < 1e-4) {
      return; // identical vertex — skip
    }
    points.push({ x, y, nx, ny });
  };
}

/** Append arc points around a corner center. Angles in radians. */
function pushArc(push, cx, cy, r, a0, a1, segments) {
  for (let i = 0; i <= segments; i++) {
    const a = a0 + ((a1 - a0) * i) / segments;
    const nx = Math.cos(a), ny = Math.sin(a);
    push(cx + r * nx, cy + r * ny, nx, ny);
  }
}

/** Close the strip: guarantee last position === first position. */
function closeStrip(points) {
  const first = points[0], last = points[points.length - 1];
  if (Math.abs(first.x - last.x) > EPS || Math.abs(first.y - last.y) > EPS) {
    points.push({ ...last, x: first.x, y: first.y });
  }
}

/**
 * Rounded-rectangle profile generator (also powers `straight` with r=0 and
 * `pillow` with a large r).
 */
function roundedRectProfile(inner, outer, h, r, cornerSegments = 6) {
  const h2 = h / 2;
  const w = Math.max(EPS, outer - inner);
  const rO = Math.max(0, Math.min(r, h2 * 0.98, w * 0.49));
  const rI = inner > EPS ? Math.max(0, Math.min(r, h2 * 0.98, w * 0.49)) : 0;
  const points = [];
  const push = makePusher(points);

  // Outer wall, bottom → top (normal +x)
  push(outer, -h2 + rO, 1, 0);
  push(outer, h2 - rO, 1, 0);
  // Outer-top corner
  if (rO > EPS) pushArc(push, outer - rO, h2 - rO, rO, 0, Math.PI / 2, cornerSegments);
  else push(outer, h2, 0, 1, true);
  // Top run, outward → inward (normal +y)
  push(outer - rO, h2, 0, 1);
  push(inner + rI, h2, 0, 1);
  // Inner-top corner
  if (rI > EPS) pushArc(push, inner + rI, h2 - rI, rI, Math.PI / 2, Math.PI, cornerSegments);
  else push(inner, h2, -1, 0, true);
  // Inner wall, top → bottom (normal −x)
  push(inner, h2 - rI, -1, 0);
  push(inner, -h2 + rI, -1, 0);
  // Inner-bottom corner
  if (rI > EPS) pushArc(push, inner + rI, -h2 + rI, rI, Math.PI, Math.PI * 1.5, cornerSegments);
  else push(inner, -h2, 0, -1, true);
  // Bottom run, inward → outward (normal −y)
  push(inner + rI, -h2, 0, -1);
  push(outer - rO, -h2, 0, -1);
  // Outer-bottom corner, closes back to start
  if (rO > EPS) pushArc(push, outer - rO, -h2 + rO, rO, Math.PI * 1.5, Math.PI * 2, cornerSegments);
  else push(outer, -h2, 1, 0, true);
  closeStrip(points);

  const capContour = dedupePositions(points);

  // Rim outline arcs sit on the bevel highlight (arc midpoints), or the
  // sharp corners when there is no bevel.
  const oB = rO > EPS ? diag(outer - rO, -h2 + rO, rO, -Math.PI / 4) : { x: outer, y: -h2 };
  const oT = rO > EPS ? diag(outer - rO, h2 - rO, rO, Math.PI / 4) : { x: outer, y: h2 };
  const iT = inner > EPS ? (rI > EPS ? diag(inner + rI, h2 - rI, rI, (Math.PI * 3) / 4) : { x: inner, y: h2 }) : null;
  const iB = inner > EPS ? (rI > EPS ? diag(inner + rI, -h2 + rI, rI, (Math.PI * 5) / 4) : { x: inner, y: -h2 }) : null;
  const edgeMarks = [oT, oB, iT, iB].filter(Boolean);

  return { points, capContour, edgeMarks };
}

function diag(cx, cy, r, angle) {
  return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
}

/** Elliptical (torus-like) cross-section. */
function tubeProfile(inner, outer, h, segments = 28) {
  const rx = Math.max(EPS, (outer - inner) / 2);
  const ry = Math.max(EPS, h / 2);
  const cx = (inner + outer) / 2;
  const points = [];
  for (let i = 0; i <= segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    const nx = Math.cos(a) / rx, ny = Math.sin(a) / ry;
    const len = Math.hypot(nx, ny) || 1;
    points.push({ x: cx + rx * Math.cos(a), y: ry * Math.sin(a), nx: nx / len, ny: ny / len });
  }
  closeStrip(points);
  const capContour = dedupePositions(points);
  const edgeMarks = [{ x: cx + rx, y: 0 }];
  if (cx - rx > 0.02) edgeMarks.push({ x: cx - rx, y: 0 });
  return { points, capContour, edgeMarks };
}

/**
 * Custom user profile from raw `{x, y}` points. Ensures CCW winding,
 * removes duplicate neighbors, and derives normals with crease detection.
 * @param {{x: number, y: number}[]} raw
 * @param {number} [creaseAngleDeg]
 */
function customProfile(raw, creaseAngleDeg = 38) {
  let pts = raw
    .map((p) => ({ x: Math.max(0, p.x), y: p.y }))
    .filter((p, i, arr) => i === 0 || Math.hypot(p.x - arr[i - 1].x, p.y - arr[i - 1].y) > EPS);
  if (pts.length >= 2) {
    const f = pts[0], l = pts[pts.length - 1];
    if (Math.hypot(f.x - l.x, f.y - l.y) < EPS) pts = pts.slice(0, -1); // drop explicit closure
  }
  if (pts.length < 3) throw new Error('[lustre-charts] custom profile needs at least 3 points');

  // Enforce CCW (positive signed area)
  let area = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    area += a.x * b.y - b.x * a.y;
  }
  if (area < 0) pts.reverse();

  const n = pts.length;
  const edgeNormals = pts.map((p, i) => {
    const q = pts[(i + 1) % n];
    const dx = q.x - p.x, dy = q.y - p.y;
    const len = Math.hypot(dx, dy) || 1;
    return { nx: dy / len, ny: -dx / len }; // right-hand normal = outward for CCW
  });

  const creaseCos = Math.cos((creaseAngleDeg * Math.PI) / 180);
  const points = [];
  const push = makePusher(points);
  for (let i = 0; i < n; i++) {
    const prevEdge = edgeNormals[(i - 1 + n) % n];
    const edge = edgeNormals[i];
    const dot = prevEdge.nx * edge.nx + prevEdge.ny * edge.ny;
    if (dot < creaseCos) {
      // hard corner — duplicate with each edge's normal
      push(pts[i].x, pts[i].y, prevEdge.nx, prevEdge.ny, true);
      push(pts[i].x, pts[i].y, edge.nx, edge.ny, true);
    } else {
      const ax = prevEdge.nx + edge.nx, ay = prevEdge.ny + edge.ny;
      const len = Math.hypot(ax, ay) || 1;
      push(pts[i].x, pts[i].y, ax / len, ay / len);
    }
  }
  // close the loop with the first corner's incoming normal
  const lastEdge = edgeNormals[n - 1];
  push(pts[0].x, pts[0].y, lastEdge.nx, lastEdge.ny, true);
  closeStrip(points);

  // Outline marks: the hard corners (or the two extremes for smooth loops)
  const marks = [];
  for (let i = 1; i < points.length; i++) {
    if (Math.abs(points[i].x - points[i - 1].x) < EPS && Math.abs(points[i].y - points[i - 1].y) < EPS) {
      marks.push({ x: points[i].x, y: points[i].y });
    }
  }
  return { points, capContour: pts, edgeMarks: marks.length ? marks : [pts.reduce((a, b) => (b.x > a.x ? b : a))] };
}

function dedupePositions(points) {
  const out = [];
  for (const p of points) {
    const last = out[out.length - 1];
    if (last && Math.abs(last.x - p.x) < EPS && Math.abs(last.y - p.y) < EPS) continue;
    out.push({ x: p.x, y: p.y });
  }
  // strip closing duplicate
  if (out.length > 1) {
    const f = out[0], l = out[out.length - 1];
    if (Math.abs(f.x - l.x) < EPS && Math.abs(f.y - l.y) < EPS) out.pop();
  }
  return out;
}

/**
 * Resolve a profile option into a {@link Profile}.
 * @param {string | {x:number, y:number}[]} profile preset name or custom points
 * @param {{ innerRadius: number, radius: number, height: number, cornerRadius: number }} dims
 * @returns {Profile}
 */
export function buildProfile(profile, { innerRadius, radius, height, cornerRadius }) {
  const inner = Math.max(0, Math.min(innerRadius, radius * 0.98));
  if (Array.isArray(profile)) return customProfile(profile);
  switch (profile) {
    case 'straight':
      return roundedRectProfile(inner, radius, height, 0);
    case 'pillow':
      return roundedRectProfile(inner, radius, height, Math.min(height / 2, (radius - inner) / 2) * 0.96, 8);
    case 'tube':
      return tubeProfile(inner, radius, height);
    case 'rounded':
    default:
      return roundedRectProfile(inner, radius, height, cornerRadius, 6);
  }
}

/* ------------------------------------------------------------------ */
/* Revolve                                                             */
/* ------------------------------------------------------------------ */

const FULL = Math.PI * 2;

/**
 * Revolve a profile between two angles into a BufferGeometry with caps.
 * θ is in radians; world position = (x·cosθ, y, x·sinθ).
 *
 * @param {Profile} profile
 * @param {number} thetaStart
 * @param {number} thetaLength
 * @param {{ radialResolution?: number }} [opts] segments for a full turn
 * @returns {THREE.BufferGeometry}
 */
export function buildSliceGeometry(profile, thetaStart, thetaLength, opts = {}) {
  const res = opts.radialResolution ?? 96;
  const len = Math.max(1e-5, Math.min(thetaLength, FULL));
  const isFull = len >= FULL - 1e-4;
  const N = Math.max(2, Math.ceil((len / FULL) * res));
  const strip = profile.points;
  const P = strip.length;

  // cumulative profile length for the v coordinate
  const vArc = new Float32Array(P);
  let total = 0;
  for (let j = 1; j < P; j++) {
    total += Math.hypot(strip[j].x - strip[j - 1].x, strip[j].y - strip[j - 1].y);
    vArc[j] = total;
  }
  const invTotal = total > 0 ? 1 / total : 0;

  const sideVerts = P * (N + 1);
  const contour = profile.capContour;
  const capVerts = isFull ? 0 : contour.length * 2;

  const positions = new Float32Array((sideVerts + capVerts) * 3);
  const normals = new Float32Array((sideVerts + capVerts) * 3);
  const uvs = new Float32Array((sideVerts + capVerts) * 2);

  const cos = new Float32Array(N + 1);
  const sin = new Float32Array(N + 1);
  for (let k = 0; k <= N; k++) {
    const a = thetaStart + (len * k) / N;
    cos[k] = Math.cos(a);
    sin[k] = Math.sin(a);
  }

  let ptr = 0, uptr = 0;
  for (let j = 0; j < P; j++) {
    const { x, y, nx, ny } = strip[j];
    const v = vArc[j] * invTotal;
    for (let k = 0; k <= N; k++) {
      positions[ptr] = x * cos[k];
      positions[ptr + 1] = y;
      positions[ptr + 2] = x * sin[k];
      normals[ptr] = nx * cos[k];
      normals[ptr + 1] = ny;
      normals[ptr + 2] = nx * sin[k];
      uvs[uptr] = k / N;
      uvs[uptr + 1] = v;
      ptr += 3;
      uptr += 2;
    }
  }

  const indices = [];
  for (let j = 0; j < P - 1; j++) {
    const row = j * (N + 1);
    const next = (j + 1) * (N + 1);
    for (let k = 0; k < N; k++) {
      const a = row + k, b = next + k, c = next + k + 1, d = row + k + 1;
      // Degenerate (zero-length) edges produce zero-area triangles — harmless.
      indices.push(a, b, c, a, c, d);
    }
  }

  if (!isFull) {
    // ---- caps -------------------------------------------------------
    const capTris = THREE.ShapeUtils.triangulateShape(
      contour.map((p) => new THREE.Vector2(p.x, p.y)),
      []
    );
    const thetaEnd = thetaStart + len;
    const caps = [
      { theta: thetaStart, flip: true },
      { theta: thetaEnd, flip: false },
    ];

    // cap uv bbox
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const p of contour) {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }
    const spanX = maxX - minX || 1, spanY = maxY - minY || 1;

    let base = sideVerts;
    for (const { theta, flip } of caps) {
      const c = Math.cos(theta), s = Math.sin(theta);
      // outward normal: start cap faces −tangent, end cap +tangent
      const nx = flip ? s : -s;
      const nz = flip ? -c : c;
      for (let i = 0; i < contour.length; i++) {
        const p = contour[i];
        const vi = (base + i) * 3;
        positions[vi] = p.x * c;
        positions[vi + 1] = p.y;
        positions[vi + 2] = p.x * s;
        normals[vi] = nx;
        normals[vi + 1] = 0;
        normals[vi + 2] = nz;
        uvs[(base + i) * 2] = (p.x - minX) / spanX;
        uvs[(base + i) * 2 + 1] = (p.y - minY) / spanY;
      }
      for (const tri of capTris) {
        if (flip) indices.push(base + tri[0], base + tri[2], base + tri[1]);
        else indices.push(base + tri[0], base + tri[1], base + tri[2]);
      }
      base += contour.length;
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  return geo;
}

/**
 * Rim outline segments for the neon/hologram looks: arcs along the profile's
 * edge marks plus the two cap contours. Returns a flat position array of
 * segment pairs, ready for `LineSegmentsGeometry.setPositions`.
 *
 * @param {Profile} profile
 * @param {number} thetaStart
 * @param {number} thetaLength
 * @param {{ radialResolution?: number }} [opts]
 * @returns {number[]}
 */
export function buildSliceOutlinePositions(profile, thetaStart, thetaLength, opts = {}) {
  const res = opts.radialResolution ?? 96;
  const len = Math.max(1e-5, Math.min(thetaLength, FULL));
  const isFull = len >= FULL - 1e-4;
  const N = Math.max(2, Math.ceil((len / FULL) * res));
  const out = [];

  const push = (x1, y1, z1, x2, y2, z2) => out.push(x1, y1, z1, x2, y2, z2);

  for (const mark of profile.edgeMarks) {
    if (mark.x < 0.02) continue; // arcs on the axis are invisible points
    let px = mark.x * Math.cos(thetaStart);
    let pz = mark.x * Math.sin(thetaStart);
    for (let k = 1; k <= N; k++) {
      const a = thetaStart + (len * k) / N;
      const nx = mark.x * Math.cos(a), nz = mark.x * Math.sin(a);
      push(px, mark.y, pz, nx, mark.y, nz);
      px = nx;
      pz = nz;
    }
  }

  if (!isFull) {
    for (const theta of [thetaStart, thetaStart + len]) {
      const c = Math.cos(theta), s = Math.sin(theta);
      const contour = profile.capContour;
      for (let i = 0; i < contour.length; i++) {
        const p = contour[i], q = contour[(i + 1) % contour.length];
        push(p.x * c, p.y, p.x * s, q.x * c, q.y, q.x * s);
      }
    }
  }
  return out;
}
