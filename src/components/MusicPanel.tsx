import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { MusicController } from '../music';
import type { Artist, MusicState, Playlist, SearchType, Track } from '../music';

type Tab = 'recommend' | 'search' | 'queue';
type Drill =
  | { kind: 'none' }
  | { kind: 'artist'; artist: Artist; tracks: Track[]; loading: boolean }
  | { kind: 'playlist'; playlist: Playlist; tracks: Track[]; loading: boolean };

interface Props {
  open: boolean;
  controller: MusicController;
  state: MusicState;
  sceneId?: string;
  onClose: () => void;
  onFeedback?: (msg: string) => void;
}

function artistLine(t: Track): string {
  return t.artists.map((a) => a.name).join(' / ') || '未知';
}

export function MusicPanel({ open, controller, state, sceneId, onClose, onFeedback }: Props) {
  const provider = controller.getProvider();
  const [tab, setTab] = useState<Tab>('recommend');
  const [recommend, setRecommend] = useState<Track[]>([]);
  const [recLoading, setRecLoading] = useState(false);
  const [searchType, setSearchType] = useState<SearchType>('song');
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [songHits, setSongHits] = useState<Track[]>([]);
  const [artistHits, setArtistHits] = useState<Artist[]>([]);
  const [playlistHits, setPlaylistHits] = useState<Playlist[]>([]);
  const [drill, setDrill] = useState<Drill>({ kind: 'none' });
  const debounceRef = useRef(0);
  const loadedRec = useRef(false);

  const feedback = useCallback(
    (msg: string) => {
      onFeedback?.(msg);
    },
    [onFeedback],
  );

  const loadRecommend = useCallback(async () => {
    setRecLoading(true);
    try {
      controller.setSceneId(sceneId);
      const list = await provider.recommend({ sceneId });
      setRecommend(list);
      loadedRec.current = true;
      if (!state.queue.length && list.length) {
        controller.setQueue(list, 0);
      }
    } catch (e) {
      feedback(e instanceof Error ? e.message : '推荐加载失败');
    } finally {
      setRecLoading(false);
    }
  }, [controller, provider, sceneId, state.queue.length, feedback]);

  useEffect(() => {
    if (!open) return;
    if (!loadedRec.current) void loadRecommend();
  }, [open, loadRecommend]);

  useEffect(() => {
    window.clearTimeout(debounceRef.current);
    const q = query.trim();
    if (!q) {
      setSongHits([]);
      setArtistHits([]);
      setPlaylistHits([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    debounceRef.current = window.setTimeout(() => {
      void (async () => {
        try {
          const result = await provider.search(q, searchType, 24);
          if (searchType === 'song') {
            setSongHits(result as Track[]);
            setArtistHits([]);
            setPlaylistHits([]);
          } else if (searchType === 'artist') {
            setArtistHits(result as Artist[]);
            setSongHits([]);
            setPlaylistHits([]);
          } else {
            setPlaylistHits(result as Playlist[]);
            setSongHits([]);
            setArtistHits([]);
          }
        } catch (e) {
          feedback(e instanceof Error ? e.message : '搜索失败');
        } finally {
          setSearching(false);
        }
      })();
    }, 300);
    return () => window.clearTimeout(debounceRef.current);
  }, [query, searchType, provider, feedback]);

  const playOne = async (track: Track, rest?: Track[]) => {
    try {
      await controller.playTrack(track, rest ? { enqueueRest: rest } : undefined);
    } catch (e) {
      feedback(e instanceof Error ? e.message : '播放失败');
    }
  };

  const openArtist = async (artist: Artist) => {
    setDrill({ kind: 'artist', artist, tracks: [], loading: true });
    try {
      const tracks = await provider.artistTop(artist.id, 30);
      setDrill({ kind: 'artist', artist, tracks, loading: false });
    } catch (e) {
      setDrill({ kind: 'none' });
      feedback(e instanceof Error ? e.message : '艺人曲目加载失败');
    }
  };

  const openPlaylist = async (playlist: Playlist) => {
    setDrill({ kind: 'playlist', playlist, tracks: [], loading: true });
    try {
      const tracks = await provider.playlistTracks(playlist.id, 50);
      setDrill({ kind: 'playlist', playlist, tracks, loading: false });
    } catch (e) {
      setDrill({ kind: 'none' });
      feedback(e instanceof Error ? e.message : '歌单加载失败');
    }
  };

  const volumePct = useMemo(() => Math.round(state.volume * 100), [state.volume]);

  if (!open) return null;

  return (
    <div className="music-panel-backdrop" onClick={onClose} role="presentation">
      <div
        className="music-panel panel"
        role="dialog"
        aria-label="旅途伴听"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="music-panel-head">
          <div>
            <div className="music-panel-title">旅途伴听</div>
            <div className="music-panel-badge">内测曲库，仅供体验</div>
          </div>
          <button type="button" className="btn music-close" onClick={onClose}>
            关闭
          </button>
        </div>

        <div className="music-now">
          <div className="music-cover lg" aria-hidden>
            {state.current?.coverUrl ? (
              <img src={state.current.coverUrl} alt="" />
            ) : (
              <span className="music-cover-ph">♪</span>
            )}
          </div>
          <div className="music-now-meta">
            <div className="music-title">{state.current?.name ?? '尚未播放'}</div>
            <div className="music-artist">
              {state.current ? artistLine(state.current) : '点推荐或搜索开始'}
            </div>
            {state.error && <div className="music-error">{state.error}</div>}
          </div>
        </div>

        <div className="music-transport">
          <button type="button" className="btn" onClick={() => void controller.prev()}>
            上一首
          </button>
          <button
            type="button"
            className="btn active"
            onClick={() => void controller.togglePlay()}
          >
            {state.playing ? '暂停' : '播放'}
          </button>
          <button type="button" className="btn" onClick={() => void controller.next()}>
            下一首
          </button>
          <button
            type="button"
            className={`btn${state.muted ? ' active' : ''}`}
            onClick={() => controller.toggleMute()}
          >
            {state.muted ? '已静音' : '静音'}
          </button>
        </div>

        <div className="music-volume">
          <span>音量</span>
          <input
            type="range"
            min={0}
            max={100}
            value={volumePct}
            onChange={(e) => controller.setVolume(Number(e.target.value) / 100)}
          />
          <span className="music-vol-val">{volumePct}</span>
        </div>

        <div className="music-tabs">
          {(
            [
              ['recommend', '推荐'],
              ['search', '搜索'],
              ['queue', '队列'],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              type="button"
              className={`btn${tab === k ? ' active' : ''}`}
              onClick={() => {
                setTab(k);
                setDrill({ kind: 'none' });
              }}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="music-body">
          {drill.kind !== 'none' ? (
            <div className="music-drill">
              <button type="button" className="btn music-back" onClick={() => setDrill({ kind: 'none' })}>
                ← 返回
              </button>
              <div className="music-drill-title">
                {drill.kind === 'artist' ? drill.artist.name : drill.playlist.name}
              </div>
              {drill.loading ? (
                <div className="music-empty">加载中…</div>
              ) : (
                <ul className="music-list">
                  {drill.tracks.map((t) => (
                    <li key={t.id}>
                      <button type="button" className="music-row" onClick={() => void playOne(t, drill.tracks)}>
                        <span className="music-row-title">{t.name}</span>
                        <span className="music-row-sub">{artistLine(t)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : tab === 'recommend' ? (
            <div>
              <div className="music-section-actions">
                <button
                  type="button"
                  className="btn"
                  onClick={() => {
                    loadedRec.current = false;
                    void loadRecommend();
                  }}
                >
                  刷新推荐
                </button>
                <button
                  type="button"
                  className="btn active"
                  onClick={() => void controller.ensureRecommendAndPlay({ sceneId })}
                >
                  开始收听
                </button>
              </div>
              {recLoading ? (
                <div className="music-empty">正在准备旅途歌单…</div>
              ) : recommend.length === 0 ? (
                <div className="music-empty">暂无推荐，可改用搜索</div>
              ) : (
                <ul className="music-list">
                  {recommend.map((t) => (
                    <li key={t.id}>
                      <button
                        type="button"
                        className={`music-row${state.current?.id === t.id ? ' current' : ''}`}
                        onClick={() => void playOne(t, recommend)}
                      >
                        <span className="music-row-title">{t.name}</span>
                        <span className="music-row-sub">{artistLine(t)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : tab === 'search' ? (
            <div>
              <div className="music-search-bar">
                <input
                  type="search"
                  placeholder="搜歌曲 / 艺人 / 歌单"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
              <div className="music-search-types">
                {(
                  [
                    ['song', '歌曲'],
                    ['artist', '艺人'],
                    ['playlist', '歌单'],
                  ] as const
                ).map(([k, label]) => (
                  <button
                    key={k}
                    type="button"
                    className={`btn${searchType === k ? ' active' : ''}`}
                    onClick={() => setSearchType(k)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {searching && <div className="music-empty">搜索中…</div>}
              {!searching && searchType === 'song' && (
                <ul className="music-list">
                  {songHits.map((t) => (
                    <li key={t.id}>
                      <button type="button" className="music-row" onClick={() => void playOne(t)}>
                        <span className="music-row-title">{t.name}</span>
                        <span className="music-row-sub">{artistLine(t)}</span>
                      </button>
                    </li>
                  ))}
                  {query.trim() && !songHits.length && <li className="music-empty">没有找到歌曲</li>}
                </ul>
              )}
              {!searching && searchType === 'artist' && (
                <ul className="music-list">
                  {artistHits.map((a) => (
                    <li key={a.id}>
                      <button type="button" className="music-row" onClick={() => void openArtist(a)}>
                        <span className="music-row-title">{a.name}</span>
                        <span className="music-row-sub">热门曲目 →</span>
                      </button>
                    </li>
                  ))}
                  {query.trim() && !artistHits.length && <li className="music-empty">没有找到艺人</li>}
                </ul>
              )}
              {!searching && searchType === 'playlist' && (
                <ul className="music-list">
                  {playlistHits.map((p) => (
                    <li key={p.id}>
                      <button type="button" className="music-row" onClick={() => void openPlaylist(p)}>
                        <span className="music-row-title">{p.name}</span>
                        <span className="music-row-sub">{p.description || '打开歌单 →'}</span>
                      </button>
                    </li>
                  ))}
                  {query.trim() && !playlistHits.length && <li className="music-empty">没有找到歌单</li>}
                </ul>
              )}
            </div>
          ) : (
            <div>
              {state.queue.length === 0 ? (
                <div className="music-empty">队列为空，先去推荐或搜索加几首</div>
              ) : (
                <ul className="music-list">
                  {state.queue.map((t, i) => (
                    <li key={`${t.id}-${i}`}>
                      <button
                        type="button"
                        className={`music-row${i === state.index ? ' current' : ''}`}
                        onClick={() => void controller.playIndex(i)}
                      >
                        <span className="music-row-title">{t.name}</span>
                        <span className="music-row-sub">{artistLine(t)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
