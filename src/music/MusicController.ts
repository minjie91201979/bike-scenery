import type { MusicProvider } from './providers/types';
import type { MusicState, RecommendContext, Track } from './types';

const LS_VOLUME = 'bike-scenery-music-volume';
const LS_MUTED = 'bike-scenery-music-muted';

type Listener = (state: MusicState) => void;

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function readStoredVolume(): number {
  try {
    const v = Number(localStorage.getItem(LS_VOLUME));
    if (Number.isFinite(v)) return clamp(v, 0, 1);
  } catch { /* ignore */ }
  return 0.55;
}

function readStoredMuted(): boolean {
  try {
    return localStorage.getItem(LS_MUTED) === '1';
  } catch { /* ignore */ }
  return false;
}

/**
 * Quiet travel companion audio controller.
 * Separate from ride SFX (rideAudio). Exposes duck() for SFX to call later.
 */
export class MusicController {
  private provider: MusicProvider;
  private audio: HTMLAudioElement;
  private listeners = new Set<Listener>();
  private queue: Track[] = [];
  private index = -1;
  private playing = false;
  private volume = readStoredVolume();
  private muted = readStoredMuted();
  private loading = false;
  private error: string | null = null;
  private duckFactor = 1;
  private duckTimer = 0;
  private sceneId: string | undefined;
  private recommendLoaded = false;
  private loadToken = 0;
  private urlRetryUsed = false;

  constructor(provider: MusicProvider) {
    this.provider = provider;
    this.audio = new Audio();
    this.audio.preload = 'metadata';
    this.audio.crossOrigin = 'anonymous';
    this.applyGain();

    this.audio.addEventListener('ended', () => {
      void this.next();
    });
    this.audio.addEventListener('error', () => {
      void this.handleAudioError();
    });
  }

  getProvider(): MusicProvider {
    return this.provider;
  }

  setSceneId(sceneId: string | undefined): void {
    if (sceneId === this.sceneId) return;
    this.sceneId = sceneId;
    this.recommendLoaded = false;
    // Mark queue dirty so next load replaces country radio
    this.queue = [];
    this.index = -1;
    this.audio.pause();
    this.playing = false;
    this.emit();
  }

  getState(): MusicState {
    return {
      queue: this.queue.slice(),
      index: this.index,
      playing: this.playing,
      volume: this.volume,
      muted: this.muted,
      current: this.index >= 0 ? this.queue[this.index] ?? null : null,
      loading: this.loading,
      error: this.error,
      duckFactor: this.duckFactor,
    };
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    fn(this.getState());
    return () => {
      this.listeners.delete(fn);
    };
  }

  private emit(): void {
    const state = this.getState();
    for (const fn of this.listeners) fn(state);
  }

  private persist(): void {
    try {
      localStorage.setItem(LS_VOLUME, String(this.volume));
      localStorage.setItem(LS_MUTED, this.muted ? '1' : '0');
    } catch { /* ignore */ }
  }

  private applyGain(): void {
    const base = this.muted ? 0 : this.volume;
    this.audio.volume = clamp(base * this.duckFactor, 0, 1);
  }

  /**
   * Temporarily lower music for SFX. factor in 0..1, recovers after seconds.
   * Safe no-op if already ducked harder.
   */
  duck(factor = 0.25, seconds = 1.2): void {
    const f = clamp(factor, 0, 1);
    this.duckFactor = Math.min(this.duckFactor, f);
    this.applyGain();
    this.emit();
    window.clearTimeout(this.duckTimer);
    this.duckTimer = window.setTimeout(() => {
      this.duckFactor = 1;
      this.applyGain();
      this.emit();
    }, Math.max(0.05, seconds) * 1000);
  }

  setVolume(v: number): void {
    this.volume = clamp(v, 0, 1);
    if (this.volume > 0) this.muted = false;
    this.persist();
    this.applyGain();
    this.emit();
  }

  setMuted(m: boolean): void {
    this.muted = m;
    this.persist();
    this.applyGain();
    this.emit();
  }

  toggleMute(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  setQueue(tracks: Track[], startIndex = 0): void {
    this.queue = tracks.slice();
    this.index = this.queue.length ? clamp(startIndex, 0, this.queue.length - 1) : -1;
    this.emit();
  }

  async playIndex(i: number): Promise<void> {
    if (i < 0 || i >= this.queue.length) return;
    this.index = i;
    await this.loadAndPlay(this.queue[i]);
  }

  async playTrack(track: Track, opts?: { enqueueRest?: Track[] }): Promise<void> {
    if (opts?.enqueueRest) {
      this.queue = [track, ...opts.enqueueRest.filter((t) => t.id !== track.id)];
      this.index = 0;
    } else {
      const existing = this.queue.findIndex((t) => t.id === track.id);
      if (existing >= 0) {
        this.index = existing;
      } else {
        this.queue = [...this.queue, track];
        this.index = this.queue.length - 1;
      }
    }
    await this.loadAndPlay(track);
  }

  async togglePlay(): Promise<void> {
    if (this.playing) {
      this.pause();
      return;
    }
    if (this.index < 0 || !this.queue[this.index]) {
      if (this.queue.length) {
        await this.playIndex(0);
      } else {
        await this.ensureRecommendAndPlay();
      }
      return;
    }
    try {
      await this.audio.play();
      this.playing = true;
      this.error = null;
      this.emit();
    } catch {
      // Autoplay blocked — wait for explicit gesture
      this.playing = false;
      this.error = null;
      this.emit();
    }
  }

  pause(): void {
    this.audio.pause();
    this.playing = false;
    this.emit();
  }

  async next(): Promise<void> {
    if (!this.queue.length) return;
    const next = (this.index + 1) % this.queue.length;
    await this.playIndex(next);
  }

  async prev(): Promise<void> {
    if (!this.queue.length) return;
    if (this.audio.currentTime > 3) {
      this.audio.currentTime = 0;
      return;
    }
    const prev = (this.index - 1 + this.queue.length) % this.queue.length;
    await this.playIndex(prev);
  }

  /**
   * Load / refresh country radio for current sceneId.
   * force=true always re-fetches (used when crossing borders).
   */
  async loadSceneRadio(force = false): Promise<Track[]> {
    if (!force && this.recommendLoaded && this.queue.length) {
      return this.queue.slice();
    }
    this.loading = true;
    this.error = null;
    this.emit();
    try {
      const tracks = await this.provider.recommend({ sceneId: this.sceneId });
      if (!tracks.length) {
        this.error = '暂无推荐曲目';
        this.recommendLoaded = false;
        this.loading = false;
        this.emit();
        return [];
      }
      this.setQueue(tracks, 0);
      this.recommendLoaded = true;
      this.loading = false;
      this.emit();
      return tracks;
    } catch (e) {
      this.error = e instanceof Error ? e.message : '推荐加载失败';
      this.recommendLoaded = false;
      this.loading = false;
      this.emit();
      return [];
    }
  }

  /** Soft autoplay attempt after ride starts; fails silently if browser blocks. */
  async trySoftAutoplay(): Promise<boolean> {
    try {
      await this.loadSceneRadio(!this.recommendLoaded || !this.queue.length);
      if (!this.queue.length) return false;
      if (this.index < 0) this.index = 0;
      await this.loadAndPlay(this.queue[this.index], { soft: true });
      return this.playing;
    } catch {
      return false;
    }
  }

  async ensureRecommendAndPlay(ctx?: RecommendContext): Promise<void> {
    if (ctx?.sceneId !== undefined && ctx.sceneId !== this.sceneId) {
      this.setSceneId(ctx.sceneId);
    }
    const need = !this.recommendLoaded || !this.queue.length;
    if (need) {
      const tracks = await this.loadSceneRadio(true);
      if (!tracks.length) return;
    }
    if (this.index < 0) this.index = 0;
    await this.loadAndPlay(this.queue[this.index]);
  }


  /** On media error, re-resolve URL once (CDN links expire ~20min). */
  private async handleAudioError(): Promise<void> {
    const track = this.index >= 0 ? this.queue[this.index] ?? null : null;
    if (track && !this.urlRetryUsed) {
      this.urlRetryUsed = true;
      try {
        const url = await this.provider.resolvePlayable(track);
        if (url) {
          this.audio.src = url;
          this.applyGain();
          await this.audio.play();
          this.playing = true;
          this.error = null;
          this.emit();
          return;
        }
      } catch {
        /* fall through */
      }
    }
    this.error = '当前曲目无法播放';
    this.playing = false;
    this.emit();
  }
  private async loadAndPlay(track: Track, opts?: { soft?: boolean }): Promise<void> {
    const token = ++this.loadToken;
    this.urlRetryUsed = false;
    this.loading = true;
    this.error = null;
    this.emit();
    try {
      const url = await this.provider.resolvePlayable(track);
      if (token !== this.loadToken) return;
      if (!url) {
        this.error = '当前曲目暂不可播';
        this.loading = false;
        this.playing = false;
        this.emit();
        if (!opts?.soft) {
          // Skip to next once
          const next = (this.index + 1) % Math.max(this.queue.length, 1);
          if (this.queue.length > 1 && next !== this.index) {
            this.index = next;
            await this.loadAndPlay(this.queue[next], opts);
          }
        }
        return;
      }
      this.audio.src = url;
      this.applyGain();
      try {
        await this.audio.play();
        if (token !== this.loadToken) return;
        this.playing = true;
        this.error = null;
      } catch {
        if (token !== this.loadToken) return;
        this.playing = false;
        if (!opts?.soft) {
          this.error = '需要点击播放（浏览器限制自动播放）';
        }
      }
    } catch (e) {
      if (token !== this.loadToken) return;
      this.playing = false;
      this.error = e instanceof Error ? e.message : '加载失败';
    } finally {
      if (token === this.loadToken) {
        this.loading = false;
        this.emit();
      }
    }
  }

  dispose(): void {
    window.clearTimeout(this.duckTimer);
    this.audio.pause();
    this.audio.removeAttribute('src');
    this.listeners.clear();
  }
}
