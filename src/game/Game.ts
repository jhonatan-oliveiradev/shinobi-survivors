import * as THREE from 'three';
import { createWorld } from './world';
import { createAyaRig } from './hero';
import { CombatEffects } from './effects';
import { BOSS_SPAWN_TIME, hasStormTrama, initialCounts, pickUpgrades, PLAYER_RADIUS, TOTAL_TIME, xpThreshold } from './progression';
import type { Phase, Snapshot, UpgradeId } from './types';

type FoeKind = 'shade' | 'hunter' | 'brute' | 'wisp' | 'boss';
interface Foe {
  x: number;
  z: number;
  hp: number;
  maxHp: number;
  speed: number;
  radius: number;
  cooldown: number;
  phase: number;
  kind: FoeKind;
  windup: number;
  flash: number;
}
interface Shot {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  damage: number;
  age: number;
}
interface Orb { mesh: THREE.Mesh; age: number; }
interface Pulse { mesh: THREE.Mesh; age: number; duration: number; }
type Listener = (snapshot: Snapshot) => void;

const ENEMY_LIMIT = 110;
const ENEMY_COLORS: Record<FoeKind, string> = {
  shade: '#9d5972', hunter: '#d88b58', brute: '#747c99', wisp: '#b77edc', boss: '#ffaf70',
};
const tmpObject = new THREE.Object3D();
const tempColor = new THREE.Color();

const safeBest = () => {
  try { return Number(window.localStorage.getItem('shinobi-best-kills') || '0') || 0; }
  catch { return 0; }
};

export class Game {
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(54, 1, 0.1, 180);
  private readonly renderer: THREE.WebGLRenderer;
  private readonly heroRig = createAyaRig();
  private readonly hero = this.heroRig.root;
  private readonly effects = new CombatEffects(this.scene);
  private readonly enemies: Foe[] = [];
  private readonly shots: Shot[] = [];
  private readonly orbs: Orb[] = [];
  private readonly pulses: Pulse[] = [];
  private readonly enemyGeometry = new THREE.IcosahedronGeometry(0.94, 0);
  private readonly enemyMaterial = new THREE.MeshStandardMaterial({ color: '#ffffff', flatShading: true, roughness: 0.65, metalness: 0.15 });
  private readonly enemyMesh = new THREE.InstancedMesh(this.enemyGeometry, this.enemyMaterial, ENEMY_LIMIT);
  private readonly shotGeometry = new THREE.OctahedronGeometry(0.27, 0);
  private readonly shotMaterial = new THREE.MeshBasicMaterial({ color: '#8effe5' });
  private readonly orbGeometry = new THREE.OctahedronGeometry(0.24, 0);
  private readonly orbMaterial = new THREE.MeshBasicMaterial({ color: '#f8cd87' });
  private readonly keys = new Set<string>();
  private readonly movement = new THREE.Vector2();
  private listener?: Listener;
  private lastFrame = 0;
  private lastEmit = 0;
  private attackClock = 0;
  private spawnClock = 0;
  private dashTime = 0;
  private dashCooldown = 0;
  private invulnerable = 0;
  private resonanceTime = 0;
  private cameraAzimuth = 0.66;
  private cameraDistance = 24;
  private dragging = false;
  private lastMouseX = 0;
  private bossSpawned = false;
  private cameraShake = 0;
  private hurtTime = 0;
  private dashTrailClock = 0;
  private readonly enemyGrid = new Map<string, Foe[]>();
  private readonly cameraTarget = new THREE.Vector3();
  private readonly snapshot: Snapshot = {
    phase: 'menu', elapsed: 0, totalTime: TOTAL_TIME, health: 100, maxHealth: 100,
    level: 1, xp: 0, xpToNext: xpThreshold(1), kills: 0, energy: 0,
    resonanceLeft: 0, storm: false, upgrades: [], counts: initialCounts(),
    bossAlive: false, bossHealth: 0, bossMaxHealth: 0, dashCooldown: 0, banner: '', best: safeBest(),
  };

  constructor(private readonly host: HTMLElement) {
    createWorld(this.scene);
    this.scene.add(this.hero);
    this.enemyMesh.count = 0;
    this.enemyMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.enemyMesh.frustumCulled = false;
    this.scene.add(this.enemyMesh);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.25;
    this.renderer.domElement.className = 'game-canvas';
    this.renderer.domElement.setAttribute('aria-label', 'Arena 3D do jogo Shinobi Survivors');
    this.host.appendChild(this.renderer.domElement);
    this.resize();

    window.addEventListener('resize', this.resize);
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onBlur);
    document.addEventListener('visibilitychange', this.onVisibilityChange);
    this.renderer.domElement.addEventListener('pointerdown', this.onPointerDown);
    window.addEventListener('pointermove', this.onPointerMove);
    window.addEventListener('pointerup', this.onPointerUp);
    this.renderer.domElement.addEventListener('wheel', this.onWheel, { passive: false });
    this.renderer.domElement.addEventListener('contextmenu', this.onContextMenu);
    this.renderer.setAnimationLoop(this.loop);
  }

  subscribe(callback: Listener): () => void {
    this.listener = callback;
    callback(this.getSnapshot());
    return () => { if (this.listener === callback) this.listener = undefined; };
  }

  getSnapshot(): Snapshot {
    return { ...this.snapshot, counts: { ...this.snapshot.counts }, upgrades: [...this.snapshot.upgrades] };
  }

  start(): void {
    this.clearDynamicObjects();
    Object.assign(this.snapshot, {
      phase: 'playing', elapsed: 0, health: 100, maxHealth: 100,
      level: 1, xp: 0, xpToNext: xpThreshold(1), kills: 0, energy: 0,
      resonanceLeft: 0, storm: false, upgrades: [], counts: initialCounts(),
      bossAlive: false, bossHealth: 0, bossMaxHealth: 0, dashCooldown: 0, banner: 'A PROVAÇÃO COMEÇOU',
    } satisfies Partial<Snapshot>);
    this.hero.position.set(0, 0, 0);
    this.hero.rotation.y = 0;
    this.attackClock = 0.4;
    this.spawnClock = 0.65;
    this.dashTime = 0;
    this.dashCooldown = 0;
    this.invulnerable = 0;
    this.resonanceTime = 0;
    this.bossSpawned = false;
    this.cameraShake = 0;
    this.hurtTime = 0;
    this.dashTrailClock = 0;
    this.keys.clear();
    this.emit(true);
  }

  togglePause(): void {
    if (this.snapshot.phase === 'playing') this.snapshot.phase = 'paused';
    else if (this.snapshot.phase === 'paused') this.snapshot.phase = 'playing';
    else return;
    this.emit(true);
  }

  chooseUpgrade(id: UpgradeId): void {
    if (this.snapshot.phase !== 'levelup' || !this.snapshot.upgrades.some((item) => item.id === id)) return;
    this.snapshot.counts[id]++;
    if (id === 'vitality') {
      this.snapshot.maxHealth += 20;
      this.snapshot.health = Math.min(this.snapshot.maxHealth, this.snapshot.health + 30);
    }
    if (hasStormTrama(this.snapshot.counts) && !this.snapshot.storm) {
      this.snapshot.storm = true;
      this.snapshot.banner = 'TRAMA DESPERTA · TEMPESTADE DE AGULHAS';
      this.addPulse(this.hero.position.x, this.hero.position.z, '#87f7d5', 3.5);
    } else {
      this.snapshot.banner = '';
    }
    this.snapshot.upgrades = [];
    this.snapshot.phase = 'playing';
    if (this.snapshot.xp >= this.snapshot.xpToNext) this.levelUp();
    this.emit(true);
  }

  activateResonance(): void {
    if (this.snapshot.phase !== 'playing' || this.snapshot.energy < 100 || this.resonanceTime > 0) return;
    this.snapshot.energy = 0;
    this.resonanceTime = 9;
    this.snapshot.banner = 'OLHO DA TEMPESTADE';
    this.addPulse(this.hero.position.x, this.hero.position.z, '#a2fff0', 5);
    this.effects.burst(this.hero.position.x, this.hero.position.z, '#a2ffdf', 36, 1.45); 
    this.cameraShake = Math.max(this.cameraShake, 0.3);
    this.emit(true);
  }

  private readonly resize = () => {
    const width = Math.max(1, this.host.clientWidth);
    const height = Math.max(1, this.host.clientHeight);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  };
  private readonly onKeyDown = (event: KeyboardEvent) => {
    const key = event.key.toLowerCase();
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(key) && !['INPUT', 'TEXTAREA'].includes((event.target as HTMLElement)?.tagName)) {
      event.preventDefault();
    }
    if (!event.repeat && (key === 'escape' || key === 'p')) this.togglePause();
    if (!event.repeat && key === 'r') this.activateResonance();
    if (!event.repeat && (key === ' ' || key === 'shift')) this.dash();
    this.keys.add(key);
  };
  private readonly onKeyUp = (event: KeyboardEvent) => this.keys.delete(event.key.toLowerCase());
  private readonly onBlur = () => {
    this.keys.clear();
    if (this.snapshot.phase === 'playing') this.togglePause();
  };
  private readonly onVisibilityChange = () => { if (document.hidden) this.onBlur(); };
  private readonly onContextMenu = (event: MouseEvent) => event.preventDefault();
  private readonly onPointerDown = (event: PointerEvent) => {
    if (event.button === 2) { this.dragging = true; this.lastMouseX = event.clientX; }
  };
  private readonly onPointerMove = (event: PointerEvent) => {
    if (!this.dragging) return;
    this.cameraAzimuth += (event.clientX - this.lastMouseX) * 0.008;
    this.lastMouseX = event.clientX;
  };
  private readonly onPointerUp = () => { this.dragging = false; };
  private readonly onWheel = (event: WheelEvent) => {
    event.preventDefault();
    this.cameraDistance = THREE.MathUtils.clamp(this.cameraDistance + Math.sign(event.deltaY) * 2, 15, 36);
  };

  private dash(): void {
    if (this.snapshot.phase !== 'playing' || this.dashCooldown > 0) return;
    this.dashTime = 0.23;
    this.invulnerable = 0.33;
    this.dashCooldown = Math.max(0.7, 1.55 - this.snapshot.counts.stride * 0.12);
    this.snapshot.energy = Math.min(100, this.snapshot.energy + 4);
    this.addPulse(this.hero.position.x, this.hero.position.z, '#74e9e0', 1.8);
    this.effects.dash(this.hero.position.x, this.hero.position.z, this.movement.x, this.movement.y);
    this.dashTrailClock = 0.07;
  }

  private readonly loop = (milliseconds: number) => {
    const delta = this.lastFrame ? Math.min((milliseconds - this.lastFrame) / 1000, 0.048) : 0;
    this.lastFrame = milliseconds;
    if (this.snapshot.phase === 'playing' && delta > 0) this.update(delta);
    this.updateCamera(delta);
    this.renderer.render(this.scene, this.camera);
    if (milliseconds - this.lastEmit > 130) this.emit();
  };

  private update(dt: number): void {
    this.snapshot.elapsed += dt;
    this.dashCooldown = Math.max(0, this.dashCooldown - dt);
    this.snapshot.dashCooldown = this.dashCooldown;
    this.dashTime = Math.max(0, this.dashTime - dt);
    this.hurtTime = Math.max(0, this.hurtTime - dt);
    this.invulnerable = Math.max(0, this.invulnerable - dt);
    this.resonanceTime = Math.max(0, this.resonanceTime - dt);
    this.snapshot.resonanceLeft = this.resonanceTime;

    this.updatePlayer(dt);
    this.spawnClock -= dt;
    if (this.spawnClock <= 0) {
      const count = 1 + Math.floor(this.snapshot.elapsed / 70);
      for (let i = 0; i < count; i++) this.spawnEnemy();
      this.spawnClock = Math.max(0.26, 1.08 - this.snapshot.elapsed * 0.0035);
    }
    if (!this.bossSpawned && this.snapshot.elapsed >= BOSS_SPAWN_TIME) this.spawnBoss();

    this.updateEnemies(dt);
    this.attackClock -= dt;
    if (this.attackClock <= 0) {
      this.fire();
      this.attackClock = Math.max(0.22, 0.74 / (1 + this.snapshot.counts.tempo * 0.18)) * (this.resonanceTime > 0 ? 0.60 : 1);
    }
    this.updateShots(dt);
    this.updateOrbs(dt);
    this.updatePulses(dt);
    this.effects.update(dt);
    this.updateEnemyInstances();

    if (this.snapshot.health <= 0) this.endRun('defeat');
    else if (this.snapshot.elapsed >= TOTAL_TIME) this.endRun(this.snapshot.bossAlive ? 'defeat' : 'victory');
  }

  private updatePlayer(dt: number): void {
    const forward = Number(this.keys.has('w') || this.keys.has('arrowup')) - Number(this.keys.has('s') || this.keys.has('arrowdown'));
    const right = Number(this.keys.has('d') || this.keys.has('arrowright')) - Number(this.keys.has('a') || this.keys.has('arrowleft'));
    const dx = right * Math.cos(this.cameraAzimuth) - forward * Math.sin(this.cameraAzimuth);
    const dz = -right * Math.sin(this.cameraAzimuth) - forward * Math.cos(this.cameraAzimuth);
    if (dx || dz) this.movement.set(dx, dz).normalize();
    const moving = dx !== 0 || dz !== 0;
    const baseSpeed = 9.5 * (1 + this.snapshot.counts.stride * 0.12) * (this.resonanceTime > 0 ? 1.23 : 1);
    const speed = baseSpeed * (this.dashTime > 0 ? 3.45 : 1);
    if (moving || this.dashTime > 0) {
      this.hero.position.x += this.movement.x * speed * dt;
      this.hero.position.z += this.movement.y * speed * dt;
      const radial = Math.hypot(this.hero.position.x, this.hero.position.z);
      if (radial > PLAYER_RADIUS) {
        this.hero.position.x *= PLAYER_RADIUS / radial;
        this.hero.position.z *= PLAYER_RADIUS / radial;
      }
      const facing = Math.atan2(-this.movement.x, -this.movement.y);
      this.hero.rotation.y = THREE.MathUtils.lerp(this.hero.rotation.y, facing, Math.min(1, dt * 12));
    }
    const bob = moving ? Math.sin(this.snapshot.elapsed * 14) * 0.052 : Math.sin(this.snapshot.elapsed * 2.5) * 0.028;
    this.hero.position.y = bob;
    this.heroRig.update(this.snapshot.elapsed, dt, moving ? 1 : 0, this.dashTime > 0, this.resonanceTime > 0, this.hurtTime > 0);
    if (this.dashTime > 0) {
      this.dashTrailClock -= dt;
      if (this.dashTrailClock <= 0) {
        this.effects.dash(this.hero.position.x, this.hero.position.z, this.movement.x, this.movement.y);
        this.dashTrailClock = 0.08;
      }
    }
  }

  private spawnEnemy(kind?: FoeKind): void {
    if (this.enemies.length >= ENEMY_LIMIT) return;
    const roll = Math.random();
    const type = kind ?? (roll < 0.12 ? 'brute' : roll < 0.32 ? 'hunter' : roll < 0.51 ? 'wisp' : 'shade');
    const angle = Math.random() * Math.PI * 2;
    const distance = 27 + Math.random() * 7;
    const x = THREE.MathUtils.clamp(this.hero.position.x + Math.cos(angle) * distance, -62, 62);
    const z = THREE.MathUtils.clamp(this.hero.position.z + Math.sin(angle) * distance, -62, 62);
    const stats = {
      shade: [28, 3.3, 0.88],
      hunter: [22, 4.9, 0.75],
      brute: [86, 2.15, 1.32],
      wisp: [17, 5.6, 0.67],
      boss: [1250, 2.7, 3],
    }[type];
    const hp = stats[0] * (1 + this.snapshot.elapsed * 0.005);
    this.enemies.push({ x, z, hp, maxHp: hp, speed: stats[1], radius: stats[2], cooldown: 0, windup: 0, flash: 0, phase: Math.random() * 6.28, kind: type });
  }

  private spawnBoss(): void {
    this.bossSpawned = true;
    this.spawnEnemy('boss');
    this.snapshot.bossAlive = true;
    const boss = this.enemies.find((foe) => foe.kind === 'boss');
    this.snapshot.bossHealth = boss?.hp ?? 0;
    this.snapshot.bossMaxHealth = boss?.maxHp ?? 0;
    this.snapshot.banner = 'SENTINELA PARTIDA · O GUARDIÃO DESPERTOU';
    this.addPulse(this.hero.position.x, this.hero.position.z, '#f0a26a', 8);
    this.emit(true);
  }

  private updateEnemies(dt: number): void {
    const px = this.hero.position.x;
    const pz = this.hero.position.z;
    // Small spatial hash prevents solid piles of enemies without quadratic checks.
    const cellSize = 3.3;
    this.enemyGrid.clear();
    for (const foe of this.enemies) {
      const key = Math.floor(foe.x / cellSize) + ':' + Math.floor(foe.z / cellSize);
      let cell = this.enemyGrid.get(key);
      if (!cell) { cell = []; this.enemyGrid.set(key, cell); }
      cell.push(foe);
    }
    for (const enemy of this.enemies) {
      enemy.flash = Math.max(0, enemy.flash - dt);
      enemy.cooldown = Math.max(0, enemy.cooldown - dt);
      const vx = px - enemy.x;
      const vz = pz - enemy.z;
      const distance = Math.max(0.01, Math.hypot(vx, vz));

      if (enemy.windup > 0) {
        enemy.windup -= dt;
        if (enemy.windup <= 0) {
          const hitRange = enemy.kind === 'boss' ? 4.1 : enemy.radius + 0.95;
          if (distance < hitRange && this.invulnerable <= 0) {
            this.snapshot.health = Math.max(0, this.snapshot.health - (enemy.kind === 'boss' ? 22 : enemy.kind === 'brute' ? 13 : 8));
            this.invulnerable = 0.4;
            this.hurtTime = 0.32;
            this.cameraShake = Math.max(this.cameraShake, enemy.kind === 'boss' ? 0.9 : 0.38);
            this.effects.burst(px, pz, '#ff8e82', 20, 1.1);
            this.addPulse(px, pz, '#f7928c', 1.5);
          }
          enemy.cooldown = enemy.kind === 'boss' ? 2.3 : enemy.kind === 'hunter' ? 1.3 : 1.8;
        }
        continue;
      }

      if (distance < (enemy.kind === 'boss' ? 4.15 : enemy.radius + 1.45) && enemy.cooldown <= 0) {
        const windup = enemy.kind === 'boss' ? 0.88 : enemy.kind === 'hunter' ? 0.35 : 0.6;
        enemy.windup = windup;
        this.effects.telegraph(enemy.x, enemy.z, enemy.kind === 'boss' ? 4.1 : enemy.radius + 0.95, windup);
        continue;
      }

      if (distance > enemy.radius + 1.5) {
        let repelX = 0;
        let repelZ = 0;
        const ix = Math.floor(enemy.x / cellSize);
        const iz = Math.floor(enemy.z / cellSize);
        for (let dx = -1; dx <= 1; dx++) {
          for (let dz = -1; dz <= 1; dz++) {
            const neighbors = this.enemyGrid.get((ix + dx) + ':' + (iz + dz));
            if (!neighbors) continue;
            for (const other of neighbors) {
              if (other === enemy) continue;
              const ox = enemy.x - other.x;
              const oz = enemy.z - other.z;
              const separation = Math.max(0.001, Math.hypot(ox, oz));
              const desired = (enemy.radius + other.radius) * 1.08;
              if (separation < desired) {
                const strength = (desired - separation) / desired;
                repelX += (ox / separation) * strength;
                repelZ += (oz / separation) * strength;
              }
            }
          }
        }
        const sway = Math.sin(this.snapshot.elapsed * 2.5 + enemy.phase) * (enemy.kind === 'wisp' ? 1.25 : 0.28);
        const steerX = vx / distance + repelX * 1.2;
        const steerZ = vz / distance + repelZ * 1.2;
        const steerLength = Math.max(0.01, Math.hypot(steerX, steerZ));
        enemy.x += (steerX / steerLength * enemy.speed - vz / distance * sway) * dt;
        enemy.z += (steerZ / steerLength * enemy.speed + vx / distance * sway) * dt;
      }
    }
  }

  private nearestEnemy(maxRange: number): Foe | undefined {
    let best: Foe | undefined;
    let nearest = maxRange * maxRange;
    for (const enemy of this.enemies) {
      const dx = enemy.x - this.hero.position.x;
      const dz = enemy.z - this.hero.position.z;
      const distance = dx * dx + dz * dz;
      if (distance < nearest) { best = enemy; nearest = distance; }
    }
    return best;
  }

  private fire(): void {
    const target = this.nearestEnemy(23);
    if (!target) return;
    this.heroRig.strike();
    const counts = this.snapshot.counts;
    const count = Math.min(5, 1 + counts.echo + (this.resonanceTime > 0 ? 1 : 0));
    const dx = target.x - this.hero.position.x;
    const dz = target.z - this.hero.position.z;
    const aim = Math.atan2(dz, dx);
    const damage = (18 + counts.wind * 7) * Math.pow(1.25, counts.edge) * (this.resonanceTime > 0 ? 1.75 : 1);
    this.effects.burst(this.hero.position.x, this.hero.position.z, '#90fbe3', 4, 0.4, 1.6);
    for (let i = 0; i < count; i++) {
      const spread = (i - (count - 1) / 2) * 0.14;
      const direction = aim + spread;
      const shot = new THREE.Mesh(this.shotGeometry, this.shotMaterial);
      shot.position.set(this.hero.position.x, 1.35, this.hero.position.z);
      shot.scale.setScalar(1 + counts.wind * 0.12);
      this.scene.add(shot);
      this.shots.push({ mesh: shot, velocity: new THREE.Vector3(Math.cos(direction) * 29, 0, Math.sin(direction) * 29), damage, age: 0 });
    }
  }

  private updateShots(dt: number): void {
    for (let i = this.shots.length - 1; i >= 0; i--) {
      const shot = this.shots[i];
      shot.age += dt;
      shot.mesh.position.addScaledVector(shot.velocity, dt);
      shot.mesh.rotation.x += dt * 9;
      shot.mesh.rotation.y += dt * 6;
      let consumed = shot.age > 1.6;
      if (!consumed) {
        for (let j = this.enemies.length - 1; j >= 0; j--) {
          const foe = this.enemies[j];
          if (Math.hypot(foe.x - shot.mesh.position.x, foe.z - shot.mesh.position.z) < foe.radius + 0.38) {
            this.hitFoe(foe, shot.damage);
            if (this.snapshot.storm) this.chainLightning(foe.x, foe.z, shot.damage * 0.36, foe);
            this.snapshot.energy = Math.min(100, this.snapshot.energy + 2);
            this.effects.burst(foe.x, foe.z, foe.kind === 'boss' ? '#f7ba79' : '#a1fce7', foe.kind === 'boss' ? 17 : 9, 0.7, foe.radius);
            this.cameraShake = Math.max(this.cameraShake, foe.kind === 'boss' ? 0.17 : 0.055);
            this.addPulse(foe.x, foe.z, '#6df2de', 1.05);
            consumed = true;
            break;
          }
        }
      }
      if (consumed) {
        this.scene.remove(shot.mesh);
        this.shots.splice(i, 1);
      }
    }
  }

  private hitFoe(enemy: Foe, damage: number): void {
    enemy.hp -= damage;
    enemy.flash = 0.13;
    if (enemy.kind === 'boss') this.snapshot.bossHealth = Math.max(0, enemy.hp);
    if (enemy.hp > 0) return;
    const index = this.enemies.indexOf(enemy);
    if (index < 0) return;
    this.enemies.splice(index, 1);
    this.snapshot.kills++;
    this.effects.burst(enemy.x, enemy.z, enemy.kind === 'boss' ? '#ffb785' : '#c4ffdb', enemy.kind === 'boss' ? 70 : 16, enemy.kind === 'boss' ? 2.0 : 1.2, enemy.radius);
    this.snapshot.energy = Math.min(100, this.snapshot.energy + (enemy.kind === 'boss' ? 30 : 5));
    const amount = enemy.kind === 'boss' ? 18 : enemy.kind === 'brute' ? 4 : 2;
    for (let i = 0; i < amount; i++) {
      if (this.orbs.length >= 160) break;
      const orb = new THREE.Mesh(this.orbGeometry, this.orbMaterial);
      orb.position.set(enemy.x + (Math.random() - 0.5) * 2, 0.45, enemy.z + (Math.random() - 0.5) * 2);
      this.scene.add(orb);
      this.orbs.push({ mesh: orb, age: Math.random() * 2 });
    }
    if (enemy.kind === 'boss') {
      this.snapshot.bossAlive = false;
      this.snapshot.bossHealth = 0;
      this.cameraShake = 1.6;
      this.snapshot.banner = 'A SENTINELA FOI DERROTADA';
      this.addPulse(enemy.x, enemy.z, '#ffe0a6', 9);
    }
  }

  private chainLightning(x: number, z: number, damage: number, original: Foe): void {
    const nearby = this.enemies
      .filter((foe) => foe !== original && Math.hypot(foe.x - x, foe.z - z) < 4.9)
      .slice(0, 2);
    for (const foe of nearby) this.hitFoe(foe, damage);
  }

  private updateOrbs(dt: number): void {
    for (let i = this.orbs.length - 1; i >= 0; i--) {
      const orb = this.orbs[i];
      orb.age += dt;
      orb.mesh.rotation.y += dt * 2;
      orb.mesh.position.y = 0.48 + Math.sin(orb.age * 3) * 0.17;
      const dx = this.hero.position.x - orb.mesh.position.x;
      const dz = this.hero.position.z - orb.mesh.position.z;
      const distance = Math.hypot(dx, dz);
      if (distance < 6 && distance > 0.01) {
        const pull = Math.min(distance, dt * 19 * (1 + (6 - distance) * 0.24));
        orb.mesh.position.x += dx / distance * pull;
        orb.mesh.position.z += dz / distance * pull;
      }
      if (distance < 1.22) {
        this.scene.remove(orb.mesh);
        this.orbs.splice(i, 1);
        this.gainXp(1);
      } else if (orb.age > 30) {
        this.scene.remove(orb.mesh);
        this.orbs.splice(i, 1);
      }
    }
  }

  private gainXp(value: number): void {
    this.snapshot.xp += value;
    if (this.snapshot.xp >= this.snapshot.xpToNext && this.snapshot.phase === 'playing') this.levelUp();
  }

  private levelUp(): void {
    this.snapshot.xp -= this.snapshot.xpToNext;
    this.snapshot.level++;
    this.snapshot.xpToNext = xpThreshold(this.snapshot.level);
    this.snapshot.phase = 'levelup';
    this.snapshot.upgrades = pickUpgrades();
    this.snapshot.banner = '';
    this.emit(true);
  }

  private addPulse(x: number, z: number, color: string, scale: number): void {
    const mesh = new THREE.Mesh(
      new THREE.RingGeometry(0.82, 0.96, 36),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.7, side: THREE.DoubleSide, depthWrite: false }),
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, 0.12, z);
    mesh.scale.setScalar(scale);
    this.scene.add(mesh);
    this.pulses.push({ mesh, age: 0, duration: 0.58 });
  }

  private updatePulses(dt: number): void {
    for (let i = this.pulses.length - 1; i >= 0; i--) {
      const pulse = this.pulses[i];
      pulse.age += dt;
      pulse.mesh.scale.multiplyScalar(1 + dt * 1.5);
      (pulse.mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.7 * (1 - pulse.age / pulse.duration));
      if (pulse.age >= pulse.duration) {
        this.scene.remove(pulse.mesh);
        pulse.mesh.geometry.dispose();
        (pulse.mesh.material as THREE.Material).dispose();
        this.pulses.splice(i, 1);
      }
    }
  }

  private updateEnemyInstances(): void {
    this.enemyMesh.count = this.enemies.length;
    for (let i = 0; i < this.enemies.length; i++) {
      const foe = this.enemies[i];
      const wobble = Math.sin(this.snapshot.elapsed * 4 + foe.phase) * 0.15;
      tmpObject.position.set(foe.x, foe.radius + wobble, foe.z);
      tmpObject.scale.setScalar(foe.radius);
      tmpObject.rotation.set(0, foe.phase + this.snapshot.elapsed * 0.48, 0.15 * Math.sin(this.snapshot.elapsed * 3 + i));
      tmpObject.updateMatrix();
      this.enemyMesh.setMatrixAt(i, tmpObject.matrix);
      tempColor.set(foe.flash > 0 ? '#fff8d7' : foe.windup > 0 ? '#f9a26d' : ENEMY_COLORS[foe.kind]);
      this.enemyMesh.setColorAt(i, tempColor);
    }
    this.enemyMesh.instanceMatrix.needsUpdate = true;
    if (this.enemyMesh.instanceColor) this.enemyMesh.instanceColor.needsUpdate = true;
  }

  private updateCamera(dt: number): void {
    const x = this.hero.position.x;
    const z = this.hero.position.z;
    this.cameraTarget.set(
      x + Math.sin(this.cameraAzimuth) * this.cameraDistance,
      this.cameraDistance * 0.85,
      z + Math.cos(this.cameraAzimuth) * this.cameraDistance,
    );
    this.camera.position.lerp(this.cameraTarget, Math.min(1, dt * 6 + 0.025));
    this.cameraShake = Math.max(0, this.cameraShake - dt * 2.8);
    if (this.cameraShake > 0) {
      this.camera.position.x += (Math.random() - 0.5) * this.cameraShake;
      this.camera.position.y += (Math.random() - 0.5) * this.cameraShake * 0.45;
      this.camera.position.z += (Math.random() - 0.5) * this.cameraShake;
    }
    this.camera.lookAt(x, 0.5, z);
  }

  private endRun(phase: Extract<Phase, 'victory' | 'defeat'>): void {
    if (this.snapshot.phase !== 'playing') return;
    this.snapshot.phase = phase;
    this.snapshot.banner = '';
    if (this.snapshot.kills > this.snapshot.best) {
      this.snapshot.best = this.snapshot.kills;
      try { window.localStorage.setItem('shinobi-best-kills', String(this.snapshot.best)); }
      catch { /* Browsers may disable persistence. */ }
    }
    this.emit(true);
  }

  private clearDynamicObjects(): void {
    for (const shot of this.shots) this.scene.remove(shot.mesh);
    for (const orb of this.orbs) this.scene.remove(orb.mesh);
    for (const pulse of this.pulses) {
      this.scene.remove(pulse.mesh);
      pulse.mesh.geometry.dispose();
      (pulse.mesh.material as THREE.Material).dispose();
    }
    this.shots.length = 0;
    this.orbs.length = 0;
    this.pulses.length = 0;
    this.enemies.length = 0;
    this.enemyMesh.count = 0;
    this.effects.clear();
  }

  private emit(force = false): void {
    const now = performance.now();
    if (force || now - this.lastEmit > 125) {
      this.lastEmit = now;
      this.listener?.(this.getSnapshot());
    }
  }

  dispose(): void {
    this.renderer.setAnimationLoop(null);
    window.removeEventListener('resize', this.resize);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onBlur);
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    this.renderer.domElement.removeEventListener('pointerdown', this.onPointerDown);
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerup', this.onPointerUp);
    this.renderer.domElement.removeEventListener('wheel', this.onWheel);
    this.renderer.domElement.removeEventListener('contextmenu', this.onContextMenu);
    this.clearDynamicObjects();
    this.effects.dispose();
    this.scene.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      object.geometry.dispose();
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      materials.forEach((material) => material.dispose());
    });
    this.shotGeometry.dispose();
    this.shotMaterial.dispose();
    this.orbGeometry.dispose();
    this.orbMaterial.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
