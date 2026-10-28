import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { CreatureArt } from './creatures';
import { VeilAtmosphere } from './atmosphere';
import { WindArtVisuals } from './arts-visuals';

describe('original procedural art', () => {
  it('renders each creature silhouette in its own instanced colony', () => {
    const scene = new THREE.Scene();
    const creatures = new CreatureArt(scene, 8);
    creatures.update([
      { kind: 'shade', x: 1, z: 2, radius: 0.8, phase: 0, flash: 0, windup: 0 },
      { kind: 'hunter', x: 4, z: 5, radius: 0.8, phase: 1, flash: 0, windup: 0 },
      { kind: 'brute', x: 6, z: 7, radius: 1.1, phase: 2, flash: 0, windup: 0 },
      { kind: 'wisp', x: 8, z: 9, radius: 0.7, phase: 3, flash: 0, windup: 0 },
      { kind: 'boss', x: 10, z: 11, radius: 3, phase: 0, flash: 0, windup: 0 },
    ], 1);
    const meshes: THREE.InstancedMesh[] = [];
    scene.traverse((object) => { if (object instanceof THREE.InstancedMesh) meshes.push(object); });
    expect(meshes.filter((mesh) => mesh.count === 1).length).toBe(15);
    expect(scene.getObjectByName('Sentinela Partida — original guardian')?.visible).toBe(true);
    creatures.clear();
    expect(meshes.every((mesh) => mesh.count === 0)).toBe(true);
    creatures.dispose();
  });

  it('provides reusable wind and golden Trama materials', () => {
    const arts = new WindArtVisuals();
    expect(arts.projectile(false).material).toBe(arts.normal);
    expect(arts.projectile(true).material).toBe(arts.trama);
    expect(arts.geometry.getAttribute('position').count).toBeGreaterThan(12);
    arts.dispose();
  });

  it('creates a living environment without affecting gameplay collision', () => {
    const scene = new THREE.Scene();
    const environment = new VeilAtmosphere(scene);
    environment.update(12);
    expect(scene.getObjectByName('Vale do Véu · environmental art pass')).toBeDefined();
    environment.dispose();
    expect(scene.getObjectByName('Vale do Véu · environmental art pass')).toBeUndefined();
  });
});
