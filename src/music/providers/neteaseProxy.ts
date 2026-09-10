import type { Artist, Playlist, RecommendContext, SearchType, Track } from '../types';
import { radioForScene } from '../recommendMap';
import type { MusicProvider } from './types';
import { mockProvider } from './mockProvider';

const SEARCH_TYPE_CODE: Record<SearchType, number> = {
  song: 1,
  artist: 100,
  playlist: 1000,
};

function baseUrl(): string {
  const raw = (import.meta.env.VITE_MUSIC_API as string | undefined) ?? '';
  return raw.replace(/\/$/, '').trim();
}

function friendlyApiError(pathname: string, status?: number, bodyCode?: number, bodyMsg?: string): Error {
  if (bodyCode === -460 || String(bodyMsg ?? '').includes('-460')) {
    return new Error('接口触发风控/降频，请稍后再试');
  }
  if (bodyMsg && bodyCode !== undefined && bodyCode !== 200) {
    return new Error(bodyMsg);
  }
  if (status) return new Error(`曲库接口暂时不可用 (${pathname} ${status})`);
  return new Error(`曲库接口暂时不可用 (${pathname})`);
}

async function apiGet<T = unknown>(
  pathname: string,
  params: Record<string, string | number | undefined> = {},
): Promise<T> {
  const base = baseUrl();
  if (!base) throw new Error('NO_BASE');
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === '') continue;
    qs.set(k, String(v));
  }
  const url = `${base}${pathname}${qs.toString() ? `?${qs}` : ''}`;
  const res = await fetch(url, { credentials: 'omit' });
  let json: { code?: number; msg?: string; message?: string } & T;
  try {
    json = (await res.json()) as typeof json;
  } catch {
    if (!res.ok) throw friendlyApiError(pathname, res.status);
    throw friendlyApiError(pathname);
  }
  const code = json?.code;
  if (code === -460) throw friendlyApiError(pathname, res.status, -460, json.msg ?? json.message);
  if (!res.ok) throw friendlyApiError(pathname, res.status, code, json.msg ?? json.message);
  if (typeof code === 'number' && code !== 200 && code !== 0) {
    throw friendlyApiError(pathname, res.status, code, json.msg ?? json.message);
  }
  return json as T;
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
  if (!baseUrl()) return mockFn();
  try {
    return await fn();
  } catch (err) {
    if (err instanceof Error && err.message === 'NO_BASE') return mockFn();
    throw err;
  }
}

export function createNeteaseProxyProvider(): MusicProvider {
  return {
    id: 'netease-proxy',
    label: '内测曲库',

    async search(keyword, type, limit = 20) {
      return withMockFallback(
        async () => {
          const params = {
            keywords: keyword,
            type: SEARCH_TYPE_CODE[type],
            limit,
            offset: 0,
          };
          let data: {
            result?: Record<string, unknown>;
            code?: number;
          };
          try {
            data = await apiGet('/search', params);
          } catch {
            data = await apiGet('/cloudsearch', params);
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
            const hot = await apiGet<{ playlists?: { id?: number | string }[] }>('/top/playlist', {
              order: 'hot',
              limit: 6,
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
            const data = await apiGet<{ result?: { id?: number }[] }>('/personalized', { limit: 6 });
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
            const data = await apiGet<{ songs?: SongLike[] }>('/artist/top/song', {
              id: artistId,
            });
            return (data.songs ?? []).slice(0, limit).map(mapSong);
          } catch {
            const data = await apiGet<{ hotSongs?: SongLike[] }>('/artists', { id: artistId });
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
            const data = await apiGet<{ songs?: SongLike[] }>('/playlist/track/all', {
              id: playlistId,
              limit,
              offset: 0,
            });
            if (Array.isArray(data.songs) && data.songs.length) {
              return data.songs.slice(0, limit).map(mapSong);
            }
          } catch {
            /* fall through to detail */
          }
          const data = await apiGet<{
            playlist?: { tracks?: SongLike[] };
          }>('/playlist/detail', { id: playlistId });
          return (data.playlist?.tracks ?? []).slice(0, limit).map(mapSong);
        },
        () => mockProvider.playlistTracks(playlistId, limit),
      );
    },

    async resolvePlayable(track) {
      return withMockFallback(
        async () => {
          const id = track.sourceId || track.id;
          // Optional availability check — ignore failures, still try URL
          try {
            await apiGet('/check/music', { id });
          } catch {
            /* proceed */
          }
          // Always resolve fresh — do NOT cache URL (expires ~20min)
          const data = await apiGet<{
            data?: { url?: string | null; code?: number }[];
          }>('/song/url/v1', { id, level: 'exhigh' });
          const url = data.data?.[0]?.url;
          if (!url) return null;
          return url;
        },
        () => mockProvider.resolvePlayable(track),
      );
    },
  };
}
