/**
 * @module fx/studioEnv
 * Lustre's signature environment: a black studio with a handful of bright
 * softboxes. Unlike a lit "room" environment, this contributes almost no
 * diffuse wash (colors stay saturated) while giving glossy, metallic and
 * glass materials long, elegant specular streaks — the look in every good
 * product render.
 */

import * as THREE from 'three';

/**
 * Build the studio scene used to generate the PMREM environment.
 * Dispose it right after `pmrem.fromScene(...)`.
 *
 * Dark themes get a black studio (max contrast streaks). Light themes get
 * the same softboxes inside a bright surround, so metals read silver on a
 * white page instead of reflecting a void.
 *
 * @param {'dark' | 'light'} [kind]
 * @returns {THREE.Scene}
 */
export function createStudioScene(kind = 'dark') {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#000000');

  if (kind === 'light') {
    const surroundMat = new THREE.MeshBasicMaterial({ side: THREE.BackSide });
    surroundMat.color.set('#ffffff').multiplyScalar(0.42);
    const surround = new THREE.Mesh(new THREE.SphereGeometry(18, 24, 16), surroundMat);
    scene.add(surround);
  }

  const panels = [
    // key softbox, high and slightly behind — lands its reflection on the
    // top faces from the default 24–28° camera elevation
    { size: [7, 3.6], pos: [1.5, 8, -2.2], lookAt: [0, 0, 0], color: '#ffffff', intensity: 8 },
    // long horizon strip, camera-left — fills side walls of slices
    { size: [1.6, 9], pos: [-8, 2.5, 1.5], lookAt: [0, 0.5, 0], color: '#ffffff', intensity: 2.6 },
    // cool rim card behind-right
    { size: [2.4, 5], pos: [7.5, 3, -5], lookAt: [0, 0, 0], color: '#bfe4ff', intensity: 3.2 },
    // violet accent, behind-left — gives reflections a hint of character
    { size: [5, 1.6], pos: [-4, 4.5, -7.5], lookAt: [0, 0, 0], color: '#a48fff', intensity: 2.2 },
    // faint warm bounce card below the horizon
    { size: [8, 2], pos: [0, -6, 5], lookAt: [0, 0, 0], color: '#ffe1c4', intensity: 0.55 },
  ];

  for (const p of panels) {
    const mat = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
    mat.color.set(p.color).multiplyScalar(p.intensity);
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(p.size[0], p.size[1]), mat);
    mesh.position.set(...p.pos);
    mesh.lookAt(...p.lookAt);
    scene.add(mesh);
  }

  // dim floor so bottom reflections aren't pure void
  const floorMat = new THREE.MeshBasicMaterial({});
  floorMat.color.set('#ffffff').multiplyScalar(kind === 'light' ? 0.3 : 0.04);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -7;
  scene.add(floor);

  return scene;
}

/** Dispose all geometries/materials of the studio scene. */
export function disposeStudioScene(scene) {
  scene.traverse((obj) => {
    obj.geometry?.dispose();
    obj.material?.dispose();
  });
}
