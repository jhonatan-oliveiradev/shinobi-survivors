import * as THREE from 'three';

/**
 * Aya Sen's original procedural character rig.
 * Her visual language is built around asymmetrical wind-sail panels, an open
 * copper collar and a short crescent blade. No external character assets.
 *
 * A production-authored glTF character can replace this rig without changing
 * the combat APIs: update(), strike() and root.
 */
export interface AyaRig {
  readonly root: THREE.Group;
  update(time: number, dt: number, locomotion: number, dashing: boolean, resonating: boolean, hurt: boolean): void;
  strike(): void;
}

function material(color: string, metalness = 0, emissive?: string): THREE.MeshToonMaterial {
  // Quantized lighting across the character reads as hand-painted anime shading.
  return new THREE.MeshToonMaterial({
    color,
    ...(emissive ? { emissive, emissiveIntensity: 1.35 } : {}),
    // Metallic accents use lighter tones instead of physically based reflections.
    ...(metalness > 0 ? { color: new THREE.Color(color).lerp(new THREE.Color('#f1c58f'), 0.16) } : {}),
    side: THREE.DoubleSide,
  });
}

const ink = material('#10282c');
const jade = material('#1c6b62');
const jadeLight = material('#3cbaaa');
const ivory = material('#e6dbc2');
const copper = material('#bb8257', 0.58);
const hair = material('#102024');
const skin = material('#dca58b');
const glow = material('#92ffe3', 0, '#24bda4');

function part(
  parent: THREE.Object3D,
  geometry: THREE.BufferGeometry,
  surface: THREE.Material,
  x: number, y: number, z: number,
): THREE.Mesh {
  const mesh = new THREE.Mesh(geometry, surface);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function sail(parent: THREE.Object3D, color: THREE.Material, length: number): THREE.Mesh {
  const geometry = new THREE.BufferGeometry();
  const vertices = new Float32Array([
    -0.24, 0, 0,
    0.24, 0, 0,
    -0.12, -length, -0.16,
    0.24, 0, 0,
    0.10, -length * 0.89, -0.34,
    -0.12, -length, -0.16,
  ]);
  geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
  geometry.computeVertexNormals();
  return part(parent, geometry, color, 0, 0, 0);
}

export function createAyaRig(): AyaRig {
  const root = new THREE.Group();
  root.name = 'Aya Sen — original articulated wind shinobi';

  // Ground contact is a semi-transparent disk, intentionally independent of animation.
  const shadow = part(root, new THREE.CircleGeometry(0.7, 32),
    new THREE.MeshBasicMaterial({ color: '#020f12', opacity: 0.35, transparent: true, depthWrite: false }),
    0, 0.018, 0);
  shadow.rotation.x = -Math.PI / 2;
  shadow.castShadow = false;

  const body = new THREE.Group();
  body.position.y = 1.12;
  root.add(body);

  // Sculpted coat with angular collar, asymmetrical sash, front tabard and metal fastener.
  part(body, new THREE.CylinderGeometry(0.32, 0.40, 0.91, 7), jade, 0, 0.23, 0);
  const coat = part(body, new THREE.ConeGeometry(0.51, 0.76, 7), ink, 0, -0.28, 0);
  coat.rotation.y = Math.PI / 7;
  part(body, new THREE.BoxGeometry(0.64, 0.11, 0.46), ivory, 0, 0.45, -0.04);
  part(body, new THREE.TorusGeometry(0.17, 0.045, 6, 9, Math.PI * 1.65), copper, 0, 0.51, -0.32);
  part(body, new THREE.BoxGeometry(0.11, 0.19, 0.09), copper, 0.20, 0.07, -0.35);
  const sash = part(body, new THREE.BoxGeometry(0.82, 0.13, 0.5), copper, 0, -0.17, 0);
  sash.rotation.z = -0.18;
  const tabard = sail(body, ivory, 0.72);
  tabard.position.set(-0.07, -0.25, -0.33);
  tabard.rotation.x = 0.1;

  const head = new THREE.Group();
  head.position.set(0, 0.76, -0.03);
  body.add(head);
  part(head, new THREE.IcosahedronGeometry(0.32, 1), skin, 0, 0.13, 0);
  part(head, new THREE.SphereGeometry(0.323, 8, 5, 0, Math.PI * 2, 0, Math.PI * 0.48), hair, 0, 0.21, 0);
  // Hair has swept-back segmented blades, not an anime headband or franchise silhouette.
  for (let i = 0; i < 5; i++) {
    const strand = part(head, new THREE.ConeGeometry(0.10 + i * 0.013, 0.48 + i * 0.07, 4),
      hair, (i - 2) * 0.12, 0.49, 0.05 + i * 0.025);
    strand.rotation.z = 0.58 + i * 0.12;
    strand.rotation.x = -0.35;
  }
  part(head, new THREE.BoxGeometry(0.46, 0.095, 0.13), ink, 0, 0.015, -0.284);
  for (const side of [-1, 1]) {
    part(head, new THREE.BoxGeometry(0.09, 0.035, 0.035), glow, side * 0.12, 0.14, -0.291);
  }
  const earPlate = part(head, new THREE.OctahedronGeometry(0.09), copper, 0.32, 0.12, 0);
  earPlate.scale.set(0.7, 1.2, 0.6);

  const leftArm = new THREE.Group();
  const rightArm = new THREE.Group();
  leftArm.position.set(-0.48, 0.48, 0);
  rightArm.position.set(0.48, 0.48, 0);
  body.add(leftArm, rightArm);
  for (const [side, arm] of [[-1, leftArm], [1, rightArm]] as const) {
    part(arm, new THREE.CylinderGeometry(0.17, 0.13, 0.64, 7), side === -1 ? ink : jade, 0, -0.31, 0);
    part(arm, new THREE.CylinderGeometry(0.13, 0.16, 0.34, 6), ivory, 0, -0.69, 0);
    part(arm, new THREE.SphereGeometry(0.13, 6, 5), skin, 0, -0.87, 0);
    part(arm, new THREE.BoxGeometry(0.28, 0.11, 0.28), copper, 0, -0.55, 0);
  }

  // Short, hook-shaped bronze saber, deliberately unlike a katana.
  const blade = new THREE.Group();
  blade.position.set(0.02, -0.97, -0.05);
  rightArm.add(blade);
  const hilt = part(blade, new THREE.CylinderGeometry(0.06, 0.07, 0.43, 6), ink, 0, 0.04, 0);
  hilt.rotation.z = -0.14;
  part(blade, new THREE.BoxGeometry(0.45, 0.08, 0.11), copper, -0.10, 0.24, 0);
  const crescent = part(blade, new THREE.BoxGeometry(0.10, 1.0, 0.07), glow, -0.14, 0.79, 0);
  crescent.rotation.z = -0.32;
  const hook = part(blade, new THREE.ConeGeometry(0.13, 0.40, 4), glow, -0.32, 1.24, 0);
  hook.rotation.z = -0.90;

  const leftLeg = new THREE.Group();
  const rightLeg = new THREE.Group();
  leftLeg.position.set(-0.21, 0.83, 0);
  rightLeg.position.set(0.21, 0.83, 0);
  root.add(leftLeg, rightLeg);
  for (const leg of [leftLeg, rightLeg]) {
    part(leg, new THREE.CylinderGeometry(0.19, 0.15, 0.68, 7), ink, 0, -0.37, 0);
    part(leg, new THREE.BoxGeometry(0.31, 0.15, 0.43), jade, 0, -0.72, -0.12);
    part(leg, new THREE.BoxGeometry(0.34, 0.12, 0.51), copper, 0, -0.57, -0.06);
  }

  // Three asymmetrical trailing wind-sails are signature silhouette landmarks.
  const sails = [-1, 0, 1].map((index) => {
    const pivot = new THREE.Group();
    pivot.position.set(index * 0.20, 0.27, 0.27);
    pivot.rotation.y = index * 0.34;
    body.add(pivot);
    const surface = sail(pivot, index === 0 ? jadeLight : index === -1 ? ivory : jade, 1.22 + Math.abs(index) * 0.28);
    surface.rotation.x = -0.26;
    return pivot;
  });

  const windHalo = new THREE.Group();
  const haloRing = part(windHalo, new THREE.TorusGeometry(1.23, 0.036, 5, 56), glow, 0, 1.30, 0);
  haloRing.rotation.x = Math.PI / 2.8;
  const haloSecond = part(windHalo, new THREE.TorusGeometry(0.94, 0.026, 5, 52), glow, 0, 1.45, 0);
  haloSecond.rotation.x = -Math.PI / 3;
  root.add(windHalo);
  windHalo.visible = false;

  let swing = 0;
  return {
    root,
    strike() { swing = 1; },
    update(time, dt, locomotion, dashing, resonating, hurt) {
      swing = Math.max(0, swing - dt * 4.5);
      const cycle = time * (dashing ? 24 : 11.3);
      const run = Math.min(1, locomotion);
      const stride = Math.sin(cycle) * run;
      leftLeg.rotation.x = stride * 0.74;
      rightLeg.rotation.x = -stride * 0.74;
      leftArm.rotation.x = -stride * 0.45 - swing * 0.13;
      rightArm.rotation.x = stride * 0.45 - swing * 1.8;
      rightArm.rotation.z = -0.13 - swing * 0.42;
      leftArm.rotation.z = 0.12 + swing * 0.22;
      body.rotation.z = Math.sin(time * 2.2) * 0.025 + (dashing ? 0.16 : 0);
      body.rotation.x = dashing ? -0.26 : -0.045 * run;
      body.position.y = 1.12 + Math.abs(Math.sin(cycle)) * run * 0.065;
      head.rotation.y = Math.sin(time * 1.3) * 0.07;
      head.rotation.z = Math.sin(time * 1.7) * 0.045;
      sails.forEach((pivot, index) => {
        pivot.rotation.x = -0.16 + Math.sin(time * 5 + index * 1.8) * (dashing ? 0.33 : 0.15);
        pivot.rotation.z = Math.sin(time * 4 + index * 1.7) * 0.12;
      });
      windHalo.visible = resonating;
      windHalo.rotation.y += dt * 2.8;
      windHalo.scale.setScalar(1 + Math.sin(time * 7) * 0.045);
      root.scale.setScalar(resonating ? 1.13 : 1);
      body.rotation.y = hurt ? Math.sin(time * 42) * 0.09 : 0;
      glow.emissiveIntensity = resonating ? 2.3 : 1.35;
    },
  };
}
