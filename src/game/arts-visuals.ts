import * as THREE from 'three';

/**
 * Wind Arts use an original swept-arc silhouette rather than generic cubes,
 * spheres or recognisable effects borrowed from other franchises.
 *
 * Both geometries and materials are reused across all projectiles.
 */
export class WindArtVisuals {
  readonly geometry: THREE.BufferGeometry;
  readonly normal: THREE.MeshBasicMaterial;
  readonly trama: THREE.MeshBasicMaterial;

  constructor() {
    const positions: number[] = [];
    const add = (a: [number, number, number], b: [number, number, number], c: [number, number, number]) => {
      positions.push(...a, ...b, ...c);
    };
    // Two offset, angular wind-sails arranged around a short radiant spine.
    add([-0.08, -0.7, 0], [-0.58, 0.28, -0.10], [0.11, 0.12, -0.05]);
    add([-0.58, 0.28, -0.10], [-0.16, 0.87, -0.20], [0.11, 0.12, -0.05]);
    add([0.06, -0.48, 0.05], [0.34, 0.35, 0], [0.53, 0.74, 0.13]);
    add([0.06, -0.48, 0.05], [0.53, 0.74, 0.13], [0.24, 0.13, 0.03]);
    add([-0.14, -0.09, 0.20], [0.15, 0.09, -0.18], [0.07, 0.48, 0.03]);
    // Slight thickness and highlights visible as the projectile rotates.
    add([-0.30, 0.18, 0.18], [0.20, 0.55, 0.14], [0.04, 0.09, 0.16]);

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    this.geometry.computeVertexNormals();
    this.normal = new THREE.MeshBasicMaterial({
      color: '#9cffe4', side: THREE.DoubleSide, transparent: true,
      opacity: 0.95, depthWrite: false, toneMapped: false,
    });
    this.trama = new THREE.MeshBasicMaterial({
      color: '#f9d49b', side: THREE.DoubleSide, transparent: true,
      opacity: 0.98, depthWrite: false, toneMapped: false,
    });
  }

  projectile(empowered: boolean): THREE.Mesh {
    const mesh = new THREE.Mesh(this.geometry, empowered ? this.trama : this.normal);
    mesh.rotation.z = Math.PI / 7;
    return mesh;
  }

  dispose(): void {
    this.geometry.dispose();
    this.normal.dispose();
    this.trama.dispose();
  }
}
