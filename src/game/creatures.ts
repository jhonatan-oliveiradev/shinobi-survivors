import * as THREE from 'three';

/** Original enemy identities: Shade, Thorn, Bulwark, Lantern and Fractured Sentinel. */
export type CreatureKind = 'shade' | 'hunter' | 'brute' | 'wisp' | 'boss';
export interface CreaturePose {
  x: number;
  z: number;
  radius: number;
  kind: CreatureKind;
  phase: number;
  windup: number;
  flash: number;
}

type Segment = {
  mesh: THREE.InstancedMesh;
  at: [number, number, number];
  scale: [number, number, number];
  spin?: number;
};
type Colony = { segments: Segment[]; capacity: number };
type SimplePart = THREE.Mesh<THREE.BufferGeometry, THREE.Material>;

const PROFILES: Record<Exclude<CreatureKind, 'boss'>, { coat: string; core: string; accent: string; bob: number }> = {
  shade:  { coat: '#423550', core: '#f08da7', accent: '#8f729c', bob: 0.09 },
  hunter: { coat: '#6d433f', core: '#ffc06e', accent: '#cb7850', bob: 0.07 },
  brute:  { coat: '#3a565b', core: '#c6efe1', accent: '#799b96', bob: 0.055 },
  wisp:   { coat: '#584076', core: '#d4a8ff', accent: '#a182c1', bob: 0.27 },
};
const unit = new THREE.Object3D();
const tone = new THREE.Color();

function mat(color: string, intensity = 0): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color, roughness: 0.67, flatShading: true, metalness: 0.08,
    ...(intensity ? { emissive: color, emissiveIntensity: intensity } : {}),
  });
}

function mesh(geometry: THREE.BufferGeometry, surface: THREE.Material, parent: THREE.Group, x: number, y: number, z: number): SimplePart {
  const part = new THREE.Mesh(geometry, surface);
  part.position.set(x, y, z);
  parent.add(part);
  part.castShadow = true;
  return part;
}

export class CreatureArt {
  private readonly colonies = new Map<Exclude<CreatureKind, 'boss'>, Colony>();
  private readonly sentinel: THREE.Group;
  private readonly sentinelCore: SimplePart;
  private readonly sentinelCrown: THREE.Group;
  private readonly sentinelArms: THREE.Group[] = [];
  private readonly sentinelMaterials: THREE.MeshStandardMaterial[] = [];
  private readonly root = new THREE.Group();

  constructor(private readonly scene: THREE.Scene, capacity = 110) {
    this.root.name = 'Original creatures of the Veil';
    scene.add(this.root);
    const makeColony = (kind: Exclude<CreatureKind, 'boss'>, designs: Array<{ geo: THREE.BufferGeometry; offset: [number, number, number]; size: [number, number, number]; tint: string; spin?: number }>) => {
      const segments: Segment[] = [];
      for (const design of designs) {
        const surface = mat(design.tint, design.tint === PROFILES[kind].core ? 0.55 : 0);
        const instance = new THREE.InstancedMesh(design.geo, surface, capacity);
        instance.name = kind + '-silhouette';
        instance.count = 0;
        instance.frustumCulled = false;
        instance.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        this.root.add(instance);
        segments.push({ mesh: instance, at: design.offset, scale: design.size, spin: design.spin });
      }
      this.colonies.set(kind, { segments, capacity });
    };

    // Broad center body, mask/energy core and one iconic structural element per species.
    makeColony('shade', [
      { geo: new THREE.DodecahedronGeometry(1, 0), offset: [0, 0.8, 0], size: [0.86, 0.83, 1.02], tint: PROFILES.shade.coat },
      { geo: new THREE.OctahedronGeometry(1, 0), offset: [0, 0.91, -0.82], size: [0.31, 0.39, 0.16], tint: PROFILES.shade.core },
      { geo: new THREE.ConeGeometry(0.57, 1.3, 3), offset: [-0.5, 1.65, 0.06], size: [0.56, 0.9, 0.76], tint: PROFILES.shade.accent },
      { geo: new THREE.ConeGeometry(0.57, 1.3, 3), offset: [0.5, 1.65, 0.06], size: [0.56, 0.9, 0.76], tint: PROFILES.shade.accent },
    ]);

    makeColony('hunter', [
      { geo: new THREE.ConeGeometry(0.9, 1.95, 5), offset: [0, 0.95, 0], size: [0.72, 1.05, 1.08], tint: PROFILES.hunter.coat },
      { geo: new THREE.BoxGeometry(1.0, 0.19, 0.24), offset: [0, 1.25, -0.60], size: [0.80, 1, 1], tint: PROFILES.hunter.core },
      { geo: new THREE.ConeGeometry(0.35, 1.75, 4), offset: [-0.83, 0.93, 0.2], size: [0.8, 1, 0.8], tint: PROFILES.hunter.accent },
      { geo: new THREE.ConeGeometry(0.35, 1.75, 4), offset: [0.83, 0.93, 0.2], size: [0.8, 1, 0.8], tint: PROFILES.hunter.accent },
    ]);

    makeColony('brute', [
      { geo: new THREE.DodecahedronGeometry(1, 0), offset: [0, 0.95, 0], size: [1.20, 0.85, 0.88], tint: PROFILES.brute.coat },
      { geo: new THREE.BoxGeometry(1.0, 0.26, 0.23), offset: [0, 1.05, -0.83], size: [0.63, 0.95, 0.95], tint: PROFILES.brute.core },
      { geo: new THREE.BoxGeometry(0.83, 0.8, 0.95), offset: [-1.05, 1.25, -0.13], size: [1, 0.95, 0.95], tint: PROFILES.brute.accent },
      { geo: new THREE.BoxGeometry(0.83, 0.8, 0.95), offset: [1.05, 1.25, -0.13], size: [1, 0.95, 0.95], tint: PROFILES.brute.accent },
    ]);

    makeColony('wisp', [
      { geo: new THREE.OctahedronGeometry(1, 0), offset: [0, 1.12, 0], size: [0.89, 1.22, 0.89], tint: PROFILES.wisp.coat },
      { geo: new THREE.IcosahedronGeometry(0.41, 0), offset: [0, 1.22, -0.82], size: [0.95, 0.95, 0.95], tint: PROFILES.wisp.core },
      { geo: new THREE.TorusGeometry(0.91, 0.075, 4, 17), offset: [0, 1.12, 0], size: [1.05, 1.05, 1.05], tint: PROFILES.wisp.accent, spin: 1.6 },
    ]);

    this.sentinel = new THREE.Group();
    this.sentinel.name = 'Sentinela Partida — original guardian';
    this.sentinel.visible = false;
    this.root.add(this.sentinel);
    const obsidian = mat('#263e42');
    const armor = mat('#607a78');
    const gold = mat('#c9955d');
    const ember = mat('#ffac71', 1.0);
    this.sentinelMaterials.push(obsidian, armor, gold, ember);

    const pelvis = mesh(new THREE.CylinderGeometry(0.9, 1.2, 1.5, 6), obsidian, this.sentinel, 0, 1.25, 0);
    pelvis.rotation.y = Math.PI / 6;
    mesh(new THREE.DodecahedronGeometry(1.3, 0), armor, this.sentinel, 0, 2.8, 0).scale.set(1.27, 1.30, 0.87);
    const chest = mesh(new THREE.OctahedronGeometry(0.73, 0), ember, this.sentinel, 0, 3.0, -1.0);
    chest.scale.set(0.85, 1.15, 0.40);
    this.sentinelCore = chest;
    mesh(new THREE.DodecahedronGeometry(0.83, 0), obsidian, this.sentinel, 0, 4.45, 0).scale.set(0.89, 1.0, 0.8);
    mesh(new THREE.BoxGeometry(1.14, 0.18, 0.26), ember, this.sentinel, 0, 4.51, -0.73);
    for (const sign of [-1, 1]) {
      const arm = new THREE.Group();
      arm.position.set(sign * 1.56, 3.4, 0);
      this.sentinel.add(arm);
      mesh(new THREE.DodecahedronGeometry(0.79, 0), armor, arm, sign * 0.30, -0.23, 0).scale.set(1.05, 1.0, 1.05);
      mesh(new THREE.ConeGeometry(0.52, 1.68, 5), obsidian, arm, sign * 0.68, -1.26, -0.05).rotation.z = sign * Math.PI;
      mesh(new THREE.OctahedronGeometry(0.30, 0), gold, arm, sign * 0.81, -1.88, -0.08);
      this.sentinelArms.push(arm);
      const leg = mesh(new THREE.CylinderGeometry(0.35, 0.57, 1.6, 5), obsidian, this.sentinel, sign * 0.70, 0.42, 0);
      leg.rotation.z = sign * 0.17;
      mesh(new THREE.ConeGeometry(0.40, 1.7, 5), gold, this.sentinel, sign * 1.05, 4.65, 0.35).rotation.z = sign * 0.38;
    }
    this.sentinelCrown = new THREE.Group();
    this.sentinelCrown.position.set(0, 3.17, 0.1);
    this.sentinel.add(this.sentinelCrown);
    const ring = mesh(new THREE.TorusGeometry(2.15, 0.075, 5, 36), gold, this.sentinelCrown, 0, 0, 0);
    ring.rotation.x = 0.6;
    const second = mesh(new THREE.TorusGeometry(1.84, 0.04, 5, 36), ember, this.sentinelCrown, 0, 0, 0);
    second.rotation.x = -0.65;
  }

  update(poses: readonly CreaturePose[], time: number): void {
    const counters: Record<Exclude<CreatureKind, 'boss'>, number> = {
      shade: 0, hunter: 0, brute: 0, wisp: 0,
    };
    let boss: CreaturePose | undefined;
    for (const pose of poses) {
      if (pose.kind === 'boss') { boss = pose; continue; }
      const colony = this.colonies.get(pose.kind);
      if (!colony) continue;
      const index = counters[pose.kind]++;
      if (index >= colony.capacity) { counters[pose.kind]--; continue; }
      const profile = PROFILES[pose.kind];
      const bob = Math.sin(time * (pose.kind === 'wisp' ? 4.8 : 7) + pose.phase) * profile.bob;
      // The attack tell and damage feedback tint each material on the same tick.
      const hitTint = pose.flash > 0 ? '#fff9db' : pose.windup > 0 ? '#ffc18d' : null;
      for (const segment of colony.segments) {
        unit.position.set(pose.x + segment.at[0] * pose.radius, (segment.at[1] + bob) * pose.radius, pose.z + segment.at[2] * pose.radius);
        unit.scale.set(segment.scale[0] * pose.radius, segment.scale[1] * pose.radius, segment.scale[2] * pose.radius);
        unit.rotation.set(0, pose.kind === 'wisp' && segment.spin ? time * segment.spin + pose.phase : Math.sin(time * 2 + pose.phase) * 0.06, 0);
        unit.updateMatrix();
        segment.mesh.setMatrixAt(index, unit.matrix);
        tone.set(hitTint ?? '#ffffff');
        segment.mesh.setColorAt(index, tone);
      }
    }
    for (const [kind, colony] of this.colonies) {
      const count = counters[kind];
      for (const segment of colony.segments) {
        segment.mesh.count = count;
        segment.mesh.instanceMatrix.needsUpdate = true;
        if (segment.mesh.instanceColor) segment.mesh.instanceColor.needsUpdate = true;
      }
    }

    this.sentinel.visible = Boolean(boss);
    if (boss) {
      this.sentinel.position.set(boss.x, Math.sin(time * 1.8) * 0.08, boss.z);
      this.sentinel.scale.setScalar(boss.radius / 2.45);
      this.sentinel.rotation.y = Math.sin(time * 0.64 + boss.phase) * 0.19;
      this.sentinelCore.scale.setScalar((boss.windup > 0 ? 1.3 : 1) + Math.sin(time * 4.2) * 0.08);
      this.sentinelCrown.rotation.y += 0.013;
      this.sentinelArms[0].rotation.z = 0.13 + Math.sin(time * 1.9) * 0.18;
      this.sentinelArms[1].rotation.z = -0.13 - Math.sin(time * 1.9) * 0.18;
      this.sentinelMaterials[3].emissiveIntensity = boss.windup > 0 ? 2.2 : boss.flash > 0 ? 3.2 : 1.1;
    }
  }

  clear(): void {
    this.sentinel.visible = false;
    for (const colony of this.colonies.values()) {
      for (const segment of colony.segments) segment.mesh.count = 0;
    }
  }

  /** Called before scene traversal to avoid leaving InstancedMesh GPU buffers alive. */
  dispose(): void {
    this.scene.remove(this.root);
    this.root.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose();
        const surfaces = Array.isArray(object.material) ? object.material : [object.material];
        for (const surface of surfaces) surface.dispose();
      }
      if (object instanceof THREE.InstancedMesh) object.dispose();
    });
  }
}
