import * as THREE from 'three';

/**
 * Environmental storytelling for Vale do Véu.
 * Everything is original procedural geometry; decorations never take part in
 * collision or game balance and remain outside the central combat readability zone.
 */
export class VeilAtmosphere {
  private readonly root = new THREE.Group();
  private readonly shardMeshes: THREE.Mesh[] = [];
  private readonly motes: THREE.InstancedMesh;
  private readonly particles: Array<{ x: number; z: number; height: number; phase: number; speed: number }> = [];
  private readonly dummy = new THREE.Object3D();
  private readonly rift = new THREE.Group();

  constructor(private readonly scene: THREE.Scene) {
    this.root.name = 'Vale do Véu · environmental art pass';
    scene.add(this.root);

    const darkStone = new THREE.MeshStandardMaterial({ color: '#2c4346', roughness: 0.85, flatShading: true });
    const middleStone = new THREE.MeshStandardMaterial({ color: '#55716d', roughness: 0.86, flatShading: true });
    const bronze = new THREE.MeshStandardMaterial({ color: '#b3875b', metalness: 0.44, roughness: 0.52, flatShading: true });
    const luminous = new THREE.MeshBasicMaterial({ color: '#76f4dc', toneMapped: false, transparent: true, opacity: 0.85, depthWrite: false });
    const amber = new THREE.MeshBasicMaterial({ color: '#eeb17a', toneMapped: false, transparent: true, opacity: 0.70, depthWrite: false });

    const rng = (() => {
      let seed = 81337;
      return () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
    })();

    const add = (parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material, x: number, y: number, z: number) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(x, y, z);
      mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    };

    // Layered basalt mountain backdrop. GPU-instanced, no colliders.
    const cliffs = new THREE.InstancedMesh(new THREE.ConeGeometry(5, 18, 5), darkStone, 65);
    cliffs.frustumCulled = false;
    for (let i = 0; i < 65; i++) {
      const angle = Math.PI * 2 * i / 65 + rng() * 0.055;
      const radius = 77 + rng() * 27;
      const height = 0.58 + rng() * 1.14;
      this.dummy.position.set(Math.cos(angle) * radius, 3.5 * height, Math.sin(angle) * radius);
      this.dummy.scale.set(0.9 + rng() * 0.72, height, 0.82 + rng() * 0.55);
      this.dummy.rotation.set(0, rng() * 6.28, 0);
      this.dummy.updateMatrix();
      cliffs.setMatrixAt(i, this.dummy.matrix);
    }
    cliffs.instanceMatrix.needsUpdate = true;
    this.root.add(cliffs);

    // Six decayed stepped stone monuments mark the border of the Trial.
    for (let i = 0; i < 6; i++) {
      const angle = Math.PI * 2 * i / 6 + 0.43;
      const x = Math.cos(angle) * 62;
      const z = Math.sin(angle) * 62;
      const relic = new THREE.Group();
      relic.position.set(x, 0, z);
      relic.rotation.y = -angle;
      this.root.add(relic);
      const plinth = add(relic, new THREE.CylinderGeometry(2.8, 3.4, 1.2, 6), darkStone, 0, 0.4, 0);
      plinth.rotation.y = Math.PI / 6;
      add(relic, new THREE.CylinderGeometry(1.65, 2.2, 5.1, 5), middleStone, 0, 3.35, 0);
      add(relic, new THREE.OctahedronGeometry(1.12), bronze, 0, 6.3, 0).scale.y = 1.85;
      const sigil = add(relic, new THREE.RingGeometry(0.5, 0.65, 6), luminous, 0, 3.55, -1.85);
      sigil.material.side = THREE.DoubleSide;
      const banner = add(relic, new THREE.PlaneGeometry(0.34, 1.85), amber, 0, 2.7, -1.91);
      banner.material.side = THREE.DoubleSide;
      banner.rotation.z = Math.PI / 6;
    }

    // Four large floating prisms hold open the breach in the far-off skyline.
    this.rift.position.set(-40, 20, -68);
    this.root.add(this.rift);
    for (let i = 0; i < 4; i++) {
      const angle = i * Math.PI / 2 + 0.6;
      const shard = add(this.rift, new THREE.OctahedronGeometry(3.1, 0), i % 2 ? bronze : middleStone,
        Math.cos(angle) * 8.8, Math.sin(angle * 1.5) * 3.0, Math.sin(angle) * 8.8);
      shard.scale.set(0.78, 2.5, 0.72);
      shard.rotation.z = i * 0.22;
      this.shardMeshes.push(shard);
    }
    const halo = add(this.rift, new THREE.TorusGeometry(11.2, 0.12, 5, 62), luminous, 0, 0, 0);
    halo.rotation.x = Math.PI / 2.6;
    this.shardMeshes.push(halo);
    const heart = add(this.rift, new THREE.IcosahedronGeometry(3.3, 0), luminous, 0, 0, 0);
    heart.scale.set(0.8, 1.6, 0.8);
    this.shardMeshes.push(heart);

    // Discrete engraved wayfinding arcs, interrupted so the floor remains readable.
    const groove = new THREE.MeshBasicMaterial({ color: '#80a99a', transparent: true, opacity: 0.30, side: THREE.DoubleSide, depthWrite: false });
    for (const radius of [20, 42]) {
      for (let i = 0; i < 12; i++) {
        const start = i * Math.PI / 6 + 0.05;
        const circle = add(this.root, new THREE.RingGeometry(radius, radius + 0.13, 18, 1, start, Math.PI / 7), groove, 0, -0.075, 0);
        circle.rotation.x = -Math.PI / 2;
      }
    }

    // Floating Flux pollen; one GPU-instanced draw call and predictable bounds.
    const moteGeometry = new THREE.IcosahedronGeometry(0.09, 0);
    this.motes = new THREE.InstancedMesh(moteGeometry, luminous, 85);
    this.motes.frustumCulled = false;
    this.motes.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.root.add(this.motes);
    for (let i = 0; i < 85; i++) {
      const angle = rng() * Math.PI * 2;
      const radius = Math.sqrt(rng()) * 63;
      this.particles.push({ x: Math.cos(angle) * radius, z: Math.sin(angle) * radius, height: 0.5 + rng() * 2.6, phase: rng() * Math.PI * 2, speed: 0.4 + rng() * 1.7 });
    }

    // Prevent optimizer/linter from mistaking a decorative surface as unused.
    void bronze;
  }

  update(time: number): void {
    for (let i = 0; i < this.particles.length; i++) {
      const mote = this.particles[i];
      this.dummy.position.set(mote.x + Math.sin(time * 0.7 + mote.phase) * 0.35,
        mote.height + Math.sin(time * mote.speed + mote.phase) * 0.35,
        mote.z + Math.cos(time * 0.5 + mote.phase) * 0.35);
      this.dummy.rotation.set(time * 0.7 + mote.phase, time * 0.34, 0);
      const scale = 0.58 + Math.sin(time * 2.1 + mote.phase) * 0.25;
      this.dummy.scale.setScalar(scale);
      this.dummy.updateMatrix();
      this.motes.setMatrixAt(i, this.dummy.matrix);
    }
    this.motes.instanceMatrix.needsUpdate = true;
    this.rift.rotation.y = Math.sin(time * 0.11) * 0.07;
    for (let i = 0; i < this.shardMeshes.length; i++) {
      this.shardMeshes[i].rotation.y = time * (i % 2 ? -0.12 : 0.13);
      if (i < 4) this.shardMeshes[i].position.y = Math.sin(time * 0.75 + i) * 1.45;
    }
  }

  dispose(): void {
    this.scene.remove(this.root);
    const geometries = new Set<THREE.BufferGeometry>();
    const materials = new Set<THREE.Material>();
    this.root.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      geometries.add(object.geometry);
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) materials.add(material);
      if (object instanceof THREE.InstancedMesh) object.dispose();
    });
    for (const geometry of geometries) geometry.dispose();
    for (const material of materials) material.dispose();
  }
}
