import type { Artist, Playlist, RecommendContext, SearchType, Track } from '../types';
import { radioForScene } from '../recommendMap';
import { weapiPost } from '../weapi';
import type { MusicProvider } from './types';
import { mockProvider } from './mockProvider';

const SEARCH_TYPE_CODE: Record<SearchType, number> = {
  song: 1,
  artist: 100,
  playlist: 1000,
};

function isNeteaseSongId(id: string): boolean {
  return /^\d+$/.test(id);
}

function artistsFrom(raw: unknown): Artist[] {
  if (!Array.isArray(raw)) {
    if (raw && typeof raw === 'object' && 'name' in (raw as object)) {
      const a = raw as { id?: number | string; name?: string; picUrl?: string; img1v1Url?: string };
      return [{ id: String(a.id ?? a.name), name: a.name ?? '未知', coverUrl: a.picUrl || a.img1v1Url }];
    }
    return [{ id: 'unknown', name: '未知艺人' }];
  }
  return raw.map((a: { id?: number | string; name?: string; picUrl?: string; img1v1Url?: string }) => ({
    id: String(a.id ?? a.name ?? ''),
    name: a.name ?? '未知',
    coverUrl: a.picUrl || a.img1v1Url,
  }));
}

type SongLike = {
  id?: number | string;
  name?: string;
  ar?: unknown;
  artists?: unknown;
  al?: { name?: string; picUrl?: string };
  album?: { name?: string; picUrl?: string };
  dt?: number;
  duration?: number;
};

function mapSong(s: SongLike): Track {
  const id = String(s.id ?? '');
  return {
    id,
    sourceId: id,
    name: s.name ?? '未知曲目',
    artists: artistsFrom(s.ar ?? s.artists),
    album: s.al?.name ?? s.album?.name,
    coverUrl: s.al?.picUrl ?? s.album?.picUrl,
    durationMs: s.dt ?? s.duration,
  };
}

function mapArtist(a: { id?: number | string; name?: string; picUrl?: string; img1v1Url?: string }): Artist {
  return {
    id: String(a.id ?? ''),
    name: a.name ?? '未知艺人',
    coverUrl: a.picUrl || a.img1v1Url,
  };
}

function mapPlaylist(p: {
  id?: number | string;
  name?: string;
  coverImgUrl?: string;
  picUrl?: string;
  description?: string;
  trackCount?: number;
}): Playlist {
  return {
    id: String(p.id ?? ''),
    name: p.name ?? '歌单',
    coverUrl: p.coverImgUrl || p.picUrl,
    description: p.description,
    trackCount: p.trackCount,
  };
}

/** Parse search song list from either /search or /cloudsearch result shapes. */
function songsFromSearchResult(result: Record<string, unknown> | undefined): SongLike[] {
  if (!result) return [];
  const songs = result.songs;
  if (Array.isArray(songs)) return songs as SongLike[];
  // some proxies nest under result.song.songs
  const song = result.song as { songs?: SongLike[] } | undefined;
  if (song && Array.isArray(song.songs)) return song.songs;
  return [];
}

async function withMockFallback<T>(fn: () => Promise<T>, mockFn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch {
    return mockFn();
  }
}

export function createNeteaseProxyProvider(): MusicProvider {
  return {
    id: 'netease',
    label: '网易云音乐',

    async search(keyword, type, limit = 20) {
      return withMockFallback(
        async () => {
          const params = {
            s: keyword,
            type: SEARCH_TYPE_CODE[type],
            limit,
            offset: 0,
          };
          let data: {
            result?: Record<string, unknown>;
            code?: number;
          };
          try {
            data = await weapiPost('/api/search/get', params);
          } catch {
            data = await weapiPost('/api/cloudsearch/pc', { ...params, total: true });
          }
          const result = data.result ?? {};
          if (type === 'song') return songsFromSearchResult(result).map(mapSong);
          if (type === 'artist') {
            return ((result.artists as Parameters<typeof mapArtist>[0][]) ?? []).map(mapArtist);
          }
          return ((result.playlists as Parameters<typeof mapPlaylist>[0][]) ?? []).map(mapPlaylist);
        },
        () => mockProvider.search(keyword, type, limit),
      );
    },

    async recommend(ctx?: RecommendContext) {
      return withMockFallback(
        async () => {
          const radio = radioForScene(ctx?.sceneId);
          const merged: Track[] = [];
          const seen = new Set<string>();
          const CAP = 28;

          const pushUnique = (list: Track[]) => {
            for (const t of list) {
              if (!t.id || seen.has(t.id)) continue;
              seen.add(t.id);
              merged.push(t);
              if (merged.length >= CAP) return true;
            }
            return false;
          };

          // 1) Keyword search per scene (primary; no cookie)
          for (const kw of radio.keywords) {
            try {
              const found = (await this.search(kw, 'song', 12)) as Track[];
              if (pushUnique(found)) return merged;
            } catch {
              /* try next keyword */
            }
          }
          if (merged.length >= 8) return merged;

          // 2) Optional playlist ids
          for (const id of radio.playlistIds ?? []) {
            try {
              const tracks = await this.playlistTracks(id, 30);
              if (pushUnique(tracks)) return merged;
            } catch {
              /* try next */
            }
          }
          if (merged.length) return merged;

          // 3) Hot playlists → first playlist tracks
          try {
            const hot = await weapiPost<{ playlists?: { id?: number | string }[] }>('/api/playlist/list', {
              cat: '全部',
              order: 'hot',
              limit: 6,
              offset: 0,
              total: true,
            });
            const firstId = hot.playlists?.[0]?.id;
            if (firstId) {
              const tracks = await this.playlistTracks(String(firstId), 30);
              if (tracks.length) return tracks;
            }
          } catch {
            /* ignore */
          }
          // 4) Soft last try: /personalized (may work without cookie on some proxies)
          try {
            const data = await weapiPost<{ result?: { id?: number }[] }>('/api/personalized/playlist', {
              limit: 6,
              total: true,
              n: 1000,
            });
            const first = data.result?.[0]?.id;
            if (first) {
              const tracks = await this.playlistTracks(String(first), 30);
              if (tracks.length) return tracks;
            }
          } catch {
            /* ignore */
          }
          return mockProvider.recommend(ctx);
        },
        () => mockProvider.recommend(ctx),
      );
    },

    async artistTop(artistId, limit = 20) {
      return withMockFallback(
        async () => {
          try {
            const data = await weapiPost<{ songs?: SongLike[] }>('/api/artist/top/song', {
              id: artistId,
            });
            return (data.songs ?? []).slice(0, limit).map(mapSong);
          } catch {
            const data = await weapiPost<{ hotSongs?: SongLike[] }>(`/api/v1/artist/${artistId}`, {});
            return (data.hotSongs ?? []).slice(0, limit).map(mapSong);
          }
        },
        () => mockProvider.artistTop(artistId, limit),
      );
    },

    async playlistTracks(playlistId, limit = 50) {
      return withMockFallback(
        async () => {
          try {
            const detail = await weapiPost<{
              playlist?: { trackIds?: { id?: number }[]; tracks?: SongLike[] };
            }>('/api/v6/playlist/detail', {
              id: playlistId,
              n: 100000,
              s: 8,
            });
            const trackIds = detail.playlist?.trackIds ?? [];
            if (trackIds.length) {
              const slice = trackIds.slice(0, limit);
              const songs = await weapiPost<{ songs?: SongLike[] }>('/api/v3/song/detail', {
                c: `[${slice.map((item) => `{"id":${item.id}}`).join(',')}]`,
              });
              if (Array.isArray(songs.songs) && songs.songs.length) {
                return songs.songs.slice(0, limit).map(mapSong);
              }
            }
            return (detail.playlist?.tracks ?? []).slice(0, limit).map(mapSong);
          } catch {
            const data = await weapiPost<{
              playlist?: { tracks?: SongLike[] };
            }>('/api/v6/playlist/detail', { id: playlistId, n: 100000, s: 8 });
            return (data.playlist?.tracks ?? []).slice(0, limit).map(mapSong);
          }
        },
        () => mockProvider.playlistTracks(playlistId, limit),
      );
    },

    async resolvePlayable(track) {
      const id = String(track.sourceId || track.id);
      if (!isNeteaseSongId(id)) return mockProvider.resolvePlayable(track);
      try {
        const data = await weapiPost<{
          data?: { url?: string | null; code?: number }[];
        }>('/api/song/enhance/player/url/v1', {
          ids: `[${id}]`,
          level: 'standard',
          encodeType: 'mp3',
        });
        const url = data.data?.[0]?.url;
        if (url) return url;
        const hi = await weapiPost<{
          data?: { url?: string | null; code?: number }[];
        }>('/api/song/enhance/player/url/v1', {
          ids: `[${id}]`,
          level: 'exhigh',
          encodeType: 'flac',
        });
        return hi.data?.[0]?.url ?? null;
      } catch {
        return null;
      }
    },
  };
}
