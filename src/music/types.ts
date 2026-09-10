export type SearchType = 'song' | 'artist' | 'playlist';

export interface Artist {
  id: string;
  name: string;
  coverUrl?: string;
}

export interface Track {
  id: string;
  name: string;
  artists: Artist[];
  album?: string;
  coverUrl?: string;
  durationMs?: number;
  /** Provider-native id (e.g. NetEase song id) */
  sourceId?: string;
}

export interface Playlist {
  id: string;
  name: string;
  coverUrl?: string;
  description?: string;
  trackCount?: number;
}

export interface RecommendContext {
  sceneId?: string;
  timeOfDay?: string;
}

export interface MusicState {
  queue: Track[];
  index: number;
  playing: boolean;
  volume: number;
  muted: boolean;
  current: Track | null;
  loading: boolean;
  error: string | null;
  duckFactor: number;
}
