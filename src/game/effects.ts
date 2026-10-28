import * as THREE from 'three';

interface Spark {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  life: number;
  duration: number;
  size: number;
  color: THREE.Color;
}

interface Link {
  line: THREE.Line;
  life: number;
  duration: number;
}

interface Warning {
  x: number;
  z: number;
  radius: number;
  remaining: number;
  duration: number;
}

/** Instanced, geometry-only combat feedback. No textures or external assets. */
export class CombatEffects {
  private readonly maxSparks = 250;
  private readonly maxWarnings = 38;
  private readonly sparks: Spark[] = [];
  private readonly warnings: Warning[] = [];
  private readonly links: Link[] = [];
  private readonly sparkMesh: THREE.InstancedMesh;
  private readonly warningMesh: THREE.InstancedMesh;
  private readonly temp = new THREE.Object3D();
  private readonly tempColor = new THREE.Color();

  constructor(private readonly scene: THREE.Scene) {
    this.sparkMesh = new THREE.InstancedMesh(
      new THREE.OctahedronGeometry(0.13, 0),
      new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false, depthWrite: false }),
      this.maxSparks,
    );
    this.sparkMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.sparkMesh.frustumCulled = false;
    this.sparkMesh.count = 0;
    this.scene.add(this.sparkMesh);

    this.warningMesh = new THREE.InstancedMesh(
      new THREE.RingGeometry(0.83, 1, 36),
      new THREE.MeshBasicMaterial({
        color: '#ff775e', transparent: true, opacity: 0.75,
        depthWrite: false, side: THREE.DoubleSide, toneMapped: false,
      }),
      this.maxWarnings,
    );
    this.warningMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.warningMesh.count = 0;
    this.warningMesh.frustumCulled = false;
    this.scene.add(this.warningMesh);
  }

  burst(x: number, z: number, tint: string, count = 11, intensity = 1, y = 1.2): void {
    const color = new THREE.Color(tint);
    for (let i = 0; i < count && this.sparks.length < this.maxSparks; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = (1.8 + Math.random() * 5) * intensity;
      const duration = 0.23 + Math.random() * 0.39;
      this.sparks.push({
        position: new THREE.Vector3(x + (Math.random() - 0.5) * 0.25, y, z + (Math.random() - 0.5) * 0.25),
        velocity: new THREE.Vector3(Math.cos(angle) * radius, (Math.random() * 4 + 1) * intensity, Math.sin(angle) * radius),
        life: duration, duration, size: 0.5 + Math.random() * 1.4,
        color,
      });
    }
  }

  dash(x: number, z: number, dx: number, dz: number): void {
    for (let i = 0; i < 16 && this.sparks.length < this.maxSparks; i++) {
      const duration = 0.2 + Math.random() * 0.24;
      this.sparks.push({
        position: new THREE.Vector3(x + (Math.random() - 0.5) * 1.1, 0.5 + Math.random() * 1.9, z + (Math.random() - 0.5) * 1.1),
        velocity: new THREE.Vector3(-dx * (5 + Math.random() * 5) + (Math.random() - 0.5) * 2, Math.random() * 1.4, -dz * (5 + Math.random() * 5) + (Math.random() - 0.5) * 2),
        life: duration, duration, size: 0.7 + Math.random(),
        color: new THREE.Color('#91f9dc'),
      });
    }
  }

  telegraph(x: number, z: number, radius: number, duration: number): void {
    if (this.warnings.length >= this.maxWarnings) return;
    this.warnings.push({ x, z, radius, duration, remaining: duration });
  }

  /** Momentary zig-zag Flux links for the Storm Trama chain reaction. */
  link(x: number, z: number, targetX: number, targetZ: number): void {
    if (this.links.length >= 36) return;
    const dx = targetX - x;
    const dz = targetZ - z;
    const length = Math.hypot(dx, dz);
    if (length < 0.1) return;
    const acrossX = -dz / length;
    const acrossZ = dx / length;
    const points: THREE.Vector3[] = [new THREE.Vector3(x, 1.35, z)];
    for (let i = 1; i < 4; i++) {
      const t = i / 4;
      const offset = (Math.random() - 0.5) * Math.min(1.5, length * 0.26);
      points.push(new THREE.Vector3(x + dx * t + acrossX * offset, 1.35 + Math.sin(t * Math.PI) * 0.38, z + dz * t + acrossZ * offset));
    }
    points.push(new THREE.Vector3(targetX, 1.35, targetZ));
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({ color: '#f8d38d', transparent: true, opacity: 0.95, depthWrite: false, toneMapped: false });
    const line = new THREE.Line(geometry, material);
    line.frustumCulled = false;
    this.scene.add(line);
    this.links.push({ line, life: 0.17, duration: 0.17 });
  }

  update(dt: number): void {
    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const spark = this.sparks[i];
      spark.life -= dt;
      spark.position.addScaledVector(spark.velocity, dt);
      spark.velocity.y -= dt * 7;
      if (spark.life <= 0) this.sparks.splice(i, 1);
    }
    this.sparkMesh.count = this.sparks.length;
    for (let i = 0; i < this.sparks.length; i++) {
      const spark = this.sparks[i];
      const fade = Math.max(0.001, spark.life / spark.duration);
      this.temp.position.copy(spark.position);
      this.temp.scale.setScalar(spark.size * fade);
      this.temp.rotation.set(0, i * 1.93, i * 0.71);
      this.temp.updateMatrix();
      this.sparkMesh.setMatrixAt(i, this.temp.matrix);
      this.tempColor.copy(spark.color).multiplyScalar(0.6 + 0.4 * fade);
      this.sparkMesh.setColorAt(i, this.tempColor);
    }
    this.sparkMesh.instanceMatrix.needsUpdate = true;
    if (this.sparkMesh.instanceColor) this.sparkMesh.instanceColor.needsUpdate = true;

    for (let i = this.links.length - 1; i >= 0; i--) {
      const link = this.links[i];
      link.life -= dt;
      (link.line.material as THREE.LineBasicMaterial).opacity = Math.max(0, 0.95 * link.life / link.duration);
      if (link.life <= 0) {
        this.scene.remove(link.line);
        link.line.geometry.dispose();
        (link.line.material as THREE.Material).dispose();
        this.links.splice(i, 1);
      }
    }
    for (let i = this.warnings.length - 1; i >= 0; i--) {
      const warning = this.warnings[i];
      warning.remaining -= dt;
      if (warning.remaining <= 0) this.warnings.splice(i, 1);
    }
    this.warningMesh.count = this.warnings.length;
    for (let i = 0; i < this.warnings.length; i++) {
      const warning = this.warnings[i];
      const progress = 1 - warning.remaining / warning.duration;
      const expansion = 0.6 + 0.4 * progress;
      this.temp.position.set(warning.x, 0.13, warning.z);
      this.temp.rotation.set(-Math.PI / 2, 0, 0);
      this.temp.scale.setScalar(warning.radius * expansion);
      this.temp.updateMatrix();
      this.warningMesh.setMatrixAt(i, this.temp.matrix);
    }
    this.warningMesh.instanceMatrix.needsUpdate = true;
  }

  clear(): void {
    this.sparks.length = 0;
    this.warnings.length = 0;
    for (const link of this.links) {
      this.scene.remove(link.line);
      link.line.geometry.dispose();
      (link.line.material as THREE.Material).dispose();
    }
    this.links.length = 0;
    this.sparkMesh.count = 0;
    this.warningMesh.count = 0;
  }

  dispose(): void {
    this.clear();
    this.scene.remove(this.sparkMesh, this.warningMesh);
    this.sparkMesh.geometry.dispose();
    (this.sparkMesh.material as THREE.Material).dispose();
    this.warningMesh.geometry.dispose();
    (this.warningMesh.material as THREE.Material).dispose();
    this.sparkMesh.dispose();
    this.warningMesh.dispose();
  }
}
