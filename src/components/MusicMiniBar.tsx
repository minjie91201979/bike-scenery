import type { MusicState } from '../music';

interface Props {
  state: MusicState;
  onTogglePlay: () => void;
  onOpenPanel: () => void;
}

export function MusicMiniBar({ state, onTogglePlay, onOpenPanel }: Props) {
  const title = state.current?.name ?? '旅途伴听';
  const artist = state.current?.artists.map((a) => a.name).join(' / ') || '轻点开始';
  const cover = state.current?.coverUrl;

  return (
    <div className="music-mini panel" role="region" aria-label="旅途音乐">
      <button type="button" className="music-mini-main" onClick={onOpenPanel} title="打开曲库">
        <div className="music-cover" aria-hidden>
          {cover ? <img src={cover} alt="" /> : <span className="music-cover-ph">♪</span>}
        </div>
        <div className="music-meta">
          <div className="music-title">{title}</div>
          <div className="music-artist">{artist}</div>
        </div>
      </button>
      <button
        type="button"
        className="music-play-btn"
        title={state.playing ? '暂停' : '播放'}
        onClick={(e) => {
          e.stopPropagation();
          onTogglePlay();
        }}
      >
        {state.loading ? '…' : state.playing ? '暂停' : '播放'}
      </button>
    </div>
  );
}
