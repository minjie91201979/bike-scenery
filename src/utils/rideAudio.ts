import { duckMusic } from '../music';
/** Quiet procedural WebAudio cues for scenery ride. Unlock on first gesture. */
type Cue = 'discover' | 'shutter' | 'warn';

class RideAudio {
  private ctx: AudioContext | null = null;
  private muted = false;
  private unlocked = false;
  private ambientGain: GainNode | null = null;
  private ambientOsc: OscillatorNode | null = null;
  /** Optional hook for future BGM / music layer */
  private muteListeners = new Set<(muted: boolean) => void>();

  get isMuted(): boolean {
    return this.muted;
  }

  setMuted(v: boolean): void {
    if (this.muted === v) return;
    this.muted = v;
    if (this.ambientGain && this.ctx) {
      const g = v ? 0 : 0.018;
      this.ambientGain.gain.cancelScheduledValues(this.ctx.currentTime);
      this.ambientGain.gain.setTargetAtTime(g, this.ctx.currentTime, 0.08);
    }
    for (const fn of this.muteListeners) fn(v);
  }

  /** Subscribe to SFX mute changes (music layer can mirror later). Returns unsubscribe. */
  subscribeMute(fn: (muted: boolean) => void): () => void {
    this.muteListeners.add(fn);
    fn(this.muted);
    return () => { this.muteListeners.delete(fn); };
  }

  get audioContext(): AudioContext | null {
    return this.ctx;
  }

  get isUnlocked(): boolean {
    return this.unlocked;
  }

  toggleMute(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  /** Call from any user gesture (keydown / pointer / start button). */
  unlock(): void {
    if (this.unlocked) {
      void this.ctx?.resume();
      return;
    }
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.unlocked = true;
    void this.ctx.resume();
    this.startAmbient();
  }

  play(cue: Cue): void {
    if (this.muted || !this.ctx) return;
    try {
      duckMusic(cue === 'shutter' ? 0.35 : 0.22, cue === 'discover' ? 1.4 : 0.9);
    } catch {
      /* music optional */
    }
    const ctx = this.ctx;
    if (ctx.state === 'suspended') void ctx.resume();
    const t0 = ctx.currentTime;

    if (cue === 'discover') {
      this.tone(523.25, t0, 0.55, 0.07, 'sine');
      this.tone(659.25, t0 + 0.12, 0.65, 0.055, 'sine');
      this.tone(783.99, t0 + 0.28, 0.9, 0.04, 'triangle');
      return;
    }
    if (cue === 'shutter') {
      this.noiseBurst(t0, 0.045, 0.12);
      this.tone(880, t0, 0.06, 0.05, 'square');
      return;
    }
    // soft warn
    this.tone(220, t0, 0.22, 0.06, 'triangle');
    this.tone(185, t0 + 0.14, 0.28, 0.045, 'sine');
  }

  private startAmbient(): void {
    if (!this.ctx || this.ambientOsc) return;
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 68;
    gain.gain.value = this.muted ? 0 : 0.018;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    this.ambientOsc = osc;
    this.ambientGain = gain;
  }

  private tone(
    freq: number,
    when: number,
    dur: number,
    peak: number,
    type: OscillatorType,
  ): void {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.exponentialRampToValueAtTime(peak, when + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(when);
    osc.stop(when + dur + 0.02);
  }

  private noiseBurst(when: number, dur: number, peak: number): void {
    if (!this.ctx) return;
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    const gain = this.ctx.createGain();
    src.buffer = buf;
    gain.gain.setValueAtTime(peak, when);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    src.connect(gain);
    gain.connect(this.ctx.destination);
    src.start(when);
  }
}

export const rideAudio = new RideAudio();
