export type Cue = 'start' | 'slash' | 'impact' | 'dash' | 'hurt' | 'level' | 'resonance' | 'boss' | 'victory' | 'defeat';

/**
 * Small procedural sound palette. Nothing is streamed or sampled from
 * copyrighted media. AudioContext is created only after a user gesture.
 */
export class SoundPalette {
  private context: AudioContext | null = null;
  private enabled = true;
  private lastImpact = 0;

  constructor() {
    try { this.enabled = window.localStorage.getItem('shinobi-sound-enabled') !== 'false'; }
    catch { this.enabled = true; }
  }

  get isEnabled(): boolean { return this.enabled; }

  toggle(): boolean {
    this.enabled = !this.enabled;
    try { window.localStorage.setItem('shinobi-sound-enabled', String(this.enabled)); }
    catch { /* local storage is optional */ }
    if (this.enabled) this.unlock();
    return this.enabled;
  }

  unlock(): void {
    if (!this.enabled) return;
    try {
      if (!this.context) this.context = new AudioContext();
      if (this.context.state === 'suspended') void this.context.resume().catch(() => {});
    } catch { /* Some browsers have no audio hardware or block audio. */ }
  }

  play(cue: Cue): void {
    if (!this.enabled || !this.context || this.context.state !== 'running') return;
    const now = this.context.currentTime;
    if (cue === 'impact') {
      if (now - this.lastImpact < 0.095) return;
      this.lastImpact = now;
    }
    const settings: Record<Cue, [number, number, number, OscillatorType, number]> = {
      start: [330, 490, 0.18, 'sine', 0.047],
      slash: [440, 145, 0.10, 'triangle', 0.023],
      impact: [160, 64, 0.13, 'triangle', 0.032],
      dash: [320, 560, 0.14, 'sine', 0.036],
      hurt: [140, 72, 0.22, 'sawtooth', 0.05],
      level: [420, 840, 0.34, 'sine', 0.066],
      resonance: [170, 770, 0.55, 'triangle', 0.08],
      boss: [110, 68, 0.72, 'sawtooth', 0.05],
      victory: [440, 880, 0.65, 'sine', 0.08],
      defeat: [260, 85, 0.58, 'triangle', 0.065],
    };
    const [startFrequency, endFrequency, duration, waveform, gain] = settings[cue];
    try {
      const oscillator = this.context.createOscillator();
      const volume = this.context.createGain();
      oscillator.type = waveform;
      oscillator.frequency.setValueAtTime(startFrequency, now);
      oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, endFrequency), now + duration);
      volume.gain.setValueAtTime(0.0001, now);
      volume.gain.exponentialRampToValueAtTime(gain, now + Math.min(0.023, duration * 0.2));
      volume.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      oscillator.connect(volume);
      volume.connect(this.context.destination);
      oscillator.start(now);
      oscillator.stop(now + duration + 0.025);
      oscillator.onended = () => { oscillator.disconnect(); volume.disconnect(); };
    } catch { /* Never let optional audio break the game loop. */ }
  }

  dispose(): void {
    const context = this.context;
    this.context = null;
    if (context) void context.close().catch(() => {});
  }
}
