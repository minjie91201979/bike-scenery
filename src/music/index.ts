import { MusicController } from './MusicController';
import { mockProvider } from './providers/mockProvider';
import { createNeteaseProxyProvider } from './providers/neteaseProxy';
import type { MusicProvider } from './providers/types';

export type { Track, Artist, Playlist, SearchType, RecommendContext, MusicState } from './types';
export type { MusicProvider } from './providers/types';
export { MusicController } from './MusicController';
export { playlistsForScene, radioForScene, keywordsForScene } from './recommendMap';
export type { SceneRadio } from './recommendMap';

/** Shared singleton for optional SFX ducking without hard dependency. */
let shared: MusicController | null = null;

export function getMusicApiBase(): string {
  return String(import.meta.env.VITE_MUSIC_API ?? '').trim();
}

export function createMusicProvider(): MusicProvider {
  const base = getMusicApiBase();
  if (base) return createNeteaseProxyProvider();
  return mockProvider;
}

export function createMusicController(): MusicController {
  const ctrl = new MusicController(createMusicProvider());
  shared = ctrl;
  return ctrl;
}

export function getSharedMusicController(): MusicController | null {
  return shared;
}

/**
 * Duck in-app music for SFX. No-op if music controller is not mounted.
 * Usage from rideAudio later: import { duckMusic } from '../music'; duckMusic(0.2, 1);
 */
export function duckMusic(factor = 0.25, seconds = 1.2): void {
  shared?.duck(factor, seconds);
}

/** Point VITE_MUSIC_API at a running NeteaseCloudMusicApi (e.g. http://127.0.0.1:3000). Empty = mock. See .env.example. */

