export type Phase = 'menu' | 'playing' | 'paused' | 'levelup' | 'victory' | 'defeat';

export type UpgradeId = 'wind' | 'echo' | 'edge' | 'tempo' | 'vitality' | 'stride';

export interface Upgrade {
  id: UpgradeId;
  label: string;
  category: string;
  description: string;
  icon: string;
}

export interface Snapshot {
  phase: Phase;
  elapsed: number;
  totalTime: number;
  health: number;
  maxHealth: number;
  level: number;
  xp: number;
  xpToNext: number;
  kills: number;
  energy: number;
  resonanceLeft: number;
  storm: boolean;
  upgrades: Upgrade[];
  counts: Record<UpgradeId, number>;
  bossAlive: boolean;
  banner: string;
  best: number;
}
