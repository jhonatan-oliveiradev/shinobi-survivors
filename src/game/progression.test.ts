import { describe, expect, it } from 'vitest';
import { formatTime, hasStormTrama, initialCounts, pickUpgrades, xpThreshold } from './progression';

describe('game progression', () => {
  it('increases the experience requirement each level', () => {
    expect(xpThreshold(2)).toBeGreaterThan(xpThreshold(1));
    expect(xpThreshold(10)).toBeGreaterThan(xpThreshold(5));
  });

  it('requires two wind upgrades and one echo for a Trama', () => {
    const counts = initialCounts();
    counts.wind = 2;
    expect(hasStormTrama(counts)).toBe(false);
    counts.echo = 1;
    expect(hasStormTrama(counts)).toBe(true);
  });

  it('returns three distinct choices', () => {
    for (let index = 0; index < 20; index++) {
      const choices = pickUpgrades();
      expect(choices).toHaveLength(3);
      expect(new Set(choices.map((choice) => choice.id)).size).toBe(3);
    }
  });

  it('formats the timer in minutes', () => {
    expect(formatTime(0)).toBe('00:00');
    expect(formatTime(125.8)).toBe('02:05');
  });
});
