/**
 * Synthesized dark fantasy sound effects. Built from oscillators and a shared
 * noise buffer — no audio assets required.
 */
export class Sfx {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;

  unlock(): void {
    if (!this.context) {
      const Ctor = window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      try {
        this.context = new Ctor();
        this.master = this.context.createGain();
        this.master.gain.value = 0.14;
        this.master.connect(this.context.destination);
        this.noiseBuffer = this.makeNoise(this.context);
      } catch { this.context = null; this.master = null; }
    }
    if (this.context?.state === 'suspended') void this.context.resume();
  }

  jump(): void { this.tone(240, 420, 0.09, 'sine', 0.05); this.noise(0.05, 0.02, 'highpass', 900); }
  land(impact: number): void {
    const s = Math.min(1, impact / 900);
    this.tone(90, 50, 0.08, 'sine', 0.04 + s * 0.07);
    this.noise(0.07, 0.02 + s * 0.04, 'lowpass', 400);
  }
  attack(index: number): void {
    this.noise(0.09, 0.04, 'bandpass', 500, index === 2 ? 2000 : 1400);
    this.tone(index === 2 ? 200 : 260, 110, 0.08, 'triangle', 0.025);
  }
  hit(heavy: boolean): void {
    this.tone(heavy ? 80 : 110, 45, heavy ? 0.12 : 0.07, 'sine', heavy ? 0.09 : 0.06);
    this.noise(heavy ? 0.09 : 0.05, heavy ? 0.06 : 0.04, 'lowpass', 800, 380);
    this.tone(heavy ? 300 : 400, 160, 0.04, 'square', 0.015);
  }
  parry(): void {
    this.tone(600, 800, 0.1, 'sine', 0.045);
    this.noise(0.08, 0.05, 'bandpass', 1200, 2800);
    this.tone(900, 900, 0.12, 'triangle', 0.02, 0.05);
  }
  enemyWindup(): void { this.tone(460, 540, 0.1, 'triangle', 0.02); }
  enemyAttack(): void {
    this.noise(0.1, 0.035, 'bandpass', 500, 1500);
    this.tone(200, 110, 0.09, 'triangle', 0.018);
  }
  playerHurt(): void {
    this.tone(140, 60, 0.16, 'sine', 0.08);
    this.noise(0.1, 0.05, 'lowpass', 550, 240);
    this.tone(85, 65, 0.18, 'triangle', 0.035, 0.04);
  }
  enemyDeath(): void {
    this.tone(210, 60, 0.3, 'triangle', 0.045);
    this.noise(0.24, 0.035, 'lowpass', 850, 280);
  }
  playerDeath(): void {
    this.tone(170, 50, 0.45, 'sine', 0.07);
    this.noise(0.35, 0.04, 'lowpass', 650, 160);
    this.tone(110, 55, 0.5, 'triangle', 0.03, 0.08);
  }
  roll(): void {
    this.noise(0.12, 0.05, 'bandpass', 600, 2000);
    this.tone(150, 80, 0.1, 'triangle', 0.02);
  }
  reset(): void {
    this.tone(300, 300, 0.1, 'triangle', 0.025);
    this.tone(400, 400, 0.12, 'triangle', 0.022, 0.08);
    this.tone(600, 600, 0.18, 'sine', 0.02, 0.16);
  }
  scrollDamage(): void {
    this.tone(120, 60, 0.2, 'sine', 0.06);
    this.noise(0.15, 0.04, 'lowpass', 500, 200);
  }

  private ensure(): AudioContext | null {
    if (!this.context || !this.master) return null;
    if (this.context.state === 'suspended') void this.context.resume();
    return this.context;
  }

  private tone(startFreq: number, endFreq: number, duration: number, type: OscillatorType, gain: number, delay = 0): void {
    const ctx = this.ensure();
    if (!ctx || !this.master) return;
    const start = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const envelope = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(20, startFreq), start);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), start + duration);
    envelope.gain.setValueAtTime(0.0001, start);
    envelope.gain.exponentialRampToValueAtTime(gain, start + 0.01);
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(envelope);
    envelope.connect(this.master);
    osc.start(start);
    osc.stop(start + duration + 0.02);
  }

  private noise(duration: number, gain: number, filterType: BiquadFilterType, freqStart: number, freqEnd: number = freqStart, delay = 0): void {
    const ctx = this.ensure();
    if (!ctx || !this.master || !this.noiseBuffer) return;
    const start = ctx.currentTime + delay;
    const source = ctx.createBufferSource();
    source.buffer = this.noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.setValueAtTime(freqStart, start);
    filter.frequency.exponentialRampToValueAtTime(Math.max(40, freqEnd), start + duration);
    filter.Q.value = 0.8;
    const envelope = ctx.createGain();
    envelope.gain.setValueAtTime(0.0001, start);
    envelope.gain.exponentialRampToValueAtTime(gain, start + 0.01);
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    source.connect(filter);
    filter.connect(envelope);
    envelope.connect(this.master);
    source.start(start);
    source.stop(start + duration + 0.02);
  }

  private makeNoise(ctx: AudioContext): AudioBuffer {
    const len = Math.floor(ctx.sampleRate * 0.4);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  }
}