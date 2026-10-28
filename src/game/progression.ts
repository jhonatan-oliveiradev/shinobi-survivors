import type { Upgrade, UpgradeId } from './types';

export const UPGRADES: readonly Upgrade[] = [
  { id: 'wind', label: 'Fio de Vendaval', category: 'ARTE ELEMENTAL', description: 'Lâminas de ar ganham força. No nível 2, podem iniciar uma Trama.', icon: '✦' },
  { id: 'echo', label: 'Eco Errante', category: 'ARTE DE ECO', description: 'Seu próximo disparo cria uma réplica adicional.', icon: '◈' },
  { id: 'edge', label: 'Lâmina Afiada', category: 'PODER', description: '+25% de dano em todas as Artes.', icon: '╱' },
  { id: 'tempo', label: 'Ritmo de Combate', category: 'VELOCIDADE', description: '+18% de velocidade dos ataques automáticos.', icon: '⌁' },
  { id: 'vitality', label: 'Fôlego Vital', category: 'RESISTÊNCIA', description: '+20 de vida máxima e recuperação imediata de vida.', icon: '✚' },
  { id: 'stride', label: 'Passo Leve', category: 'MOBILIDADE', description: '+12% de velocidade e esquiva mais frequente.', icon: '↗' },
];

export const TOTAL_TIME = 240;
export const BOSS_SPAWN_TIME = 160;
export const PLAYER_RADIUS = 54;

export const initialCounts = (): Record<UpgradeId, number> =>
  ({ wind: 0, echo: 0, edge: 0, tempo: 0, vitality: 0, stride: 0 });

export const xpThreshold = (level: number) => Math.round(11 + (level - 1) * 7 + Math.pow(level - 1, 1.22) * 3);
export const hasStormTrama = (counts: Record<UpgradeId, number>) => counts.wind >= 2 && counts.echo >= 1;

export function pickUpgrades(previous: readonly UpgradeId[] = []): Upgrade[] {
  const primary = UPGRADES.filter((u) => !previous.includes(u.id));
  const shuffled = [...primary, ...UPGRADES.filter((u) => previous.includes(u.id))];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, 3);
}

export const formatTime = (seconds: number) => {
  const total = Math.max(0, Math.floor(seconds));
  return String(Math.floor(total / 60)).padStart(2, '0') + ':' + String(total % 60).padStart(2, '0');
};
