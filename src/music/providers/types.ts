import type { Artist, Playlist, RecommendContext, SearchType, Track } from '../types';

export interface MusicProvider {
  readonly id: string;
  readonly label: string;
  search(keyword: string, type: SearchType, limit?: number): Promise<Track[] | Artist[] | Playlist[]>;
  recommend(ctx?: RecommendContext): Promise<Track[]>;
  artistTop(artistId: string, limit?: number): Promise<Track[]>;
  playlistTracks(playlistId: string, limit?: number): Promise<Track[]>;
  /** Resolve a playable audio URL for the track. May return null if unavailable. */
  resolvePlayable(track: Track): Promise<string | null>;
}
