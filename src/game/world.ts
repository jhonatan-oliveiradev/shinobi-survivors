import * as THREE from 'three';

const jade = new THREE.MeshStandardMaterial({ color: '#204c43', roughness: 0.91 });
const deep = new THREE.MeshStandardMaterial({ color: '#143331', roughness: 0.96 });
const stone = new THREE.MeshStandardMaterial({ color: '#344b48', roughness: 0.95 });
const copper = new THREE.MeshStandardMaterial({ color: '#b7855f', metalness: 0.32, roughness: 0.52 });
const leaf = new THREE.MeshStandardMaterial({ color: '#285f52', roughness: 0.92 });
const energy = new THREE.MeshStandardMaterial({ color: '#77f7e7', emissive: '#1abfab', emissiveIntensity: 1.7, roughness: 0.3 });

function random(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function addMesh(parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material, x: number, y: number, z: number) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

export function createWorld(scene: THREE.Scene): void {
  scene.background = new THREE.Color('#071b20');
  scene.fog = new THREE.FogExp2('#0a2428', 0.0105);

  scene.add(new THREE.HemisphereLight('#d6fcf2', '#112c28', 2.4));
  const sun = new THREE.DirectionalLight('#ffe1ae', 2.8);
  sun.position.set(24, 48, 12);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -65;
  sun.shadow.camera.right = 65;
  sun.shadow.camera.top = 65;
  sun.shadow.camera.bottom = -65;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 105;
  sun.shadow.bias = -0.0002;
  scene.add(sun);

  const base = addMesh(scene, new THREE.CylinderGeometry(73, 77, 2, 96), deep, 0, -1.2, 0);
  base.receiveShadow = true;

  const field = addMesh(scene, new THREE.CircleGeometry(70, 112), jade, 0, -0.16, 0);
  field.rotation.x = -Math.PI / 2;
  field.castShadow = false;

  const path = new THREE.Mesh(
    new THREE.RingGeometry(13, 14.3, 96),
    new THREE.MeshBasicMaterial({ color: '#3b7162', transparent: true, opacity: 0.24, side: THREE.DoubleSide }),
  );
  path.rotation.x = -Math.PI / 2;
  path.position.y = -0.105;
  scene.add(path);

  for (const radius of [33, 56, 69.2]) {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(radius, radius + (radius > 65 ? 0.35 : 0.09), 128),
      new THREE.MeshBasicMaterial({ color: radius > 65 ? '#d99a60' : '#77d3bc', transparent: true, opacity: radius > 65 ? 0.45 : 0.15, side: THREE.DoubleSide }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = -0.09;
    scene.add(ring);
  }

  const rand = random(19407);
  // Low-poly trees, standing stones and luminous crystals: all procedural, original assets.
  const trunkGeo = new THREE.CylinderGeometry(0.35, 0.58, 3.3, 5);
  const crownGeo = new THREE.ConeGeometry(2.25, 6.7, 6);
  const rockGeo = new THREE.DodecahedronGeometry(1, 0);
  const crystalGeo = new THREE.OctahedronGeometry(1, 0);

  for (let i = 0; i < 115; i++) {
    const angle = rand() * Math.PI * 2;
    const radius = 27 + Math.sqrt(rand()) * 41;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    const size = 0.72 + rand() * 1.2;
    if (i % 4 === 0) {
      const rock = addMesh(scene, rockGeo, stone, x, 0.5 * size, z);
      rock.scale.set(1.15 * size, 0.75 * size, 1.25 * size);
      rock.rotation.set(rand(), rand() * 6.28, rand());
    } else {
      const trunk = addMesh(scene, trunkGeo, deep, x, 1.4 * size, z);
      trunk.scale.setScalar(size);
      const crown = addMesh(scene, crownGeo, leaf, x, 5.25 * size, z);
      crown.scale.set(size, size, size);
      crown.rotation.y = rand() * Math.PI;
    }
  }

  for (let i = 0; i < 38; i++) {
    const angle = rand() * Math.PI * 2;
    const radius = 16 + rand() * 46;
    const crystal = addMesh(scene, crystalGeo, i % 3 === 0 ? copper : energy, Math.sin(angle) * radius, 0.68, Math.cos(angle) * radius);
    const size = 0.35 + rand() * 0.62;
    crystal.scale.set(size * 0.65, size * 1.8, size * 0.65);
    crystal.rotation.y = rand() * 6.28;
  }

  const fragment = new THREE.Group();
  for (let i = 0; i < 5; i++) {
    const pillar = addMesh(fragment, new THREE.CylinderGeometry(0.9, 1.15, 4.5 + i * 0.8, 5), stone, (i - 2) * 2.8, 2.2, 0);
    pillar.rotation.z = (i - 2) * 0.1;
    const shard = addMesh(fragment, new THREE.OctahedronGeometry(1.0, 0), copper, (i - 2) * 2.8, 5.0 + i * 0.33, 0);
    shard.scale.set(0.65, 1.6, 0.65);
  }
  fragment.position.set(-29, 0, -25);
  fragment.rotation.y = -0.65;
  scene.add(fragment);
}

export function createHero(): THREE.Group {
  const hero = new THREE.Group();
  hero.name = 'Aya Sen — provisional original model';
  const charcoal = new THREE.MeshStandardMaterial({ color: '#102b31', roughness: 0.81 });
  const cloth = new THREE.MeshStandardMaterial({ color: '#2da69b', roughness: 0.72, metalness: 0.12 });
  const skin = new THREE.MeshStandardMaterial({ color: '#dfb08c', roughness: 0.87 });
  const pale = new THREE.MeshStandardMaterial({ color: '#bfe4d6', roughness: 0.84 });
  const hair = new THREE.MeshStandardMaterial({ color: '#0a2025', roughness: 0.97 });

  const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.75, 24), new THREE.MeshBasicMaterial({ color: '#030f12', transparent: true, opacity: 0.34, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.018;
  hero.add(shadow);

  const torso = addMesh(hero, new THREE.CylinderGeometry(0.35, 0.48, 1.13, 7), cloth, 0, 1.25, 0);
  torso.rotation.z = -0.03;
  addMesh(hero, new THREE.ConeGeometry(0.68, 0.94, 7), charcoal, 0, 0.78, 0);
  addMesh(hero, new THREE.SphereGeometry(0.35, 8, 7), skin, 0, 2.04, 0);
  const fringe = addMesh(hero, new THREE.ConeGeometry(0.38, 0.4, 6), hair, 0, 2.36, -0.02);
  fringe.rotation.z = 0.3;
  addMesh(hero, new THREE.BoxGeometry(0.76, 0.19, 0.49), charcoal, 0, 1.46, 0);
  addMesh(hero, new THREE.BoxGeometry(0.14, 0.23, 0.17), copper, 0, 1.45, -0.28);
  for (const side of [-1, 1]) {
    const leg = addMesh(hero, new THREE.CylinderGeometry(0.14, 0.18, 0.74, 6), charcoal, side * 0.23, 0.38, 0);
    leg.rotation.z = side * 0.08;
    const arm = addMesh(hero, new THREE.CylinderGeometry(0.14, 0.18, 0.82, 6), pale, side * 0.49, 1.34, 0);
    arm.rotation.z = side * 0.24;
  }
  const sword = addMesh(hero, new THREE.BoxGeometry(0.075, 1.45, 0.19), energy, -0.62, 1.38, -0.28);
  sword.rotation.z = -0.54;
  return hero;
}
