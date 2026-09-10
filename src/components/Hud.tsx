import { useEffect, useRef, useState } from 'react';
import type { CamMode, Stats, TimeOfDay } from '../engine/types';
import { SPEED_BAR_MAX_KMH } from '../engine/constants';
import { Minimap } from './Minimap';
import type { World } from '../engine/World';
import { isTouchUi, subscribeTouchUi } from '../utils/touchUi';
import { isAppFullscreen, toggleAppFullscreen } from '../utils/fullscreen';
import { rideAudio } from '../utils/rideAudio';
import { observeHudRailSize } from '../utils/hudRail';

interface Props {
  stats: Stats;
  cam: CamMode;
  timeOfDay: TimeOfDay;
  world: World | null;
  sceneName: string;
  helpVisible: boolean;
  muted: boolean;
  onCam: (m: CamMode) => void;
  onTime: (t: TimeOfDay) => void;
  onShot: () => void;
  onToggleHelp: () => void;
  onChangeScene: () => void;
  onToggleMute: () => void;
}

const TIMES: { key: TimeOfDay; label: string }[] = [
  { key: 'day', label: '白天' },
  { key: 'sunset', label: '黄昏' },
  { key: 'night', label: '夜晚' },
];

const CAMS: { key: CamMode; label: string }[] = [
  { key: 'follow', label: '跟随' },
  { key: 'cinema', label: '电影' },
  { key: 'fpv', label: '第一人称' },
];

export function Hud({
  stats, cam, timeOfDay, world, sceneName, helpVisible, muted,
  onCam, onTime, onShot, onToggleHelp, onChangeScene, onToggleMute,
}: Props) {
  const kmh = stats.speed * 3.6;
  const mm = Math.floor(stats.time / 60);
  const ss = Math.floor(stats.time % 60);
  const [touchUi, setTouchUi] = useState(() => isTouchUi());
  const [menuOpen, setMenuOpen] = useState(false);
  const [fs, setFs] = useState(() => isAppFullscreen());
  const dashRef = useRef<HTMLDivElement>(null);

  useEffect(() => subscribeTouchUi(setTouchUi), []);

  useEffect(() => {
    if (!touchUi) return;
    return observeHudRailSize(dashRef.current, '--hud-dash-h');
  }, [touchUi]);

  useEffect(() => {
    const sync = () => setFs(isAppFullscreen());
    document.addEventListener('fullscreenchange', sync);
    document.addEventListener('webkitfullscreenchange', sync as EventListener);
    return () => {
      document.removeEventListener('fullscreenchange', sync);
      document.removeEventListener('webkitfullscreenchange', sync as EventListener);
    };
  }, []);

  const handleFullscreen = () => {
    void toggleAppFullscreen(document.documentElement).then(() => {
      setFs(isAppFullscreen());
    });
  };

  const secondaryClass = touchUi && !menuOpen ? ' hud-secondary-collapsed' : '';

  return (
    <div className={`hud${touchUi ? ' hud-touch' : ''}${menuOpen ? ' hud-menu-open' : ''}`}>
      <div id="dash" ref={dashRef} className="panel">
        <div className="speed-row">
          <span id="speed">{Math.round(kmh)}</span>
          <span className="unit">km/h</span>
        </div>
        <div id="speed-bar">
          <div
            id="speed-fill"
            style={{ width: `${Math.min(100, (kmh / SPEED_BAR_MAX_KMH) * 100)}%` }}
          />
        </div>
        <div className="stats">
          <div className="stat">
            <span className="stat-label">里程</span>
            <span className="stat-value">{(stats.dist / 1000).toFixed(2)} km</span>
          </div>
          <div className="stat">
            <span className="stat-label">用时</span>
            <span className="stat-value">
              {String(mm).padStart(2, '0')}:{String(ss).padStart(2, '0')}
            </span>
          </div>
          <div className="stat">
            <span className="stat-label">足迹</span>
            <span className="stat-value">{stats.seen}/{stats.total}</span>
          </div>
        </div>
      </div>

      <div id="tools">
        <div className="btn-group panel hud-essential-tools">
          <button
            type="button"
            className={`btn icon-btn tool-icon${fs ? ' active' : ''}`}
            title="全屏"
            aria-label="全屏"
            onClick={handleFullscreen}
          >
            {fs ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <polyline points="4 14 10 14 10 20" />
                <polyline points="20 10 14 10 14 4" />
                <line x1="14" y1="10" x2="21" y2="3" />
                <line x1="3" y1="21" x2="10" y2="14" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <polyline points="15 3 21 3 21 9" />
                <polyline points="9 21 3 21 3 15" />
                <line x1="21" y1="3" x2="14" y2="10" />
                <line x1="3" y1="21" x2="10" y2="14" />
              </svg>
            )}
          </button>
          <button
            type="button"
            className={`btn icon-btn tool-icon${muted ? ' active' : ''}`}
            title={muted ? '取消静音' : '静音'}
            aria-label={muted ? '取消静音' : '静音'}
            onClick={() => {
              rideAudio.unlock();
              onToggleMute();
            }}
          >
            {muted ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <line x1="23" y1="9" x2="17" y2="15" />
                <line x1="17" y1="9" x2="23" y2="15" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
              </svg>
            )}
          </button>
          {touchUi && (
            <button
              type="button"
              className={`btn icon-btn tool-icon${menuOpen ? ' active' : ''}`}
              title="菜单"
              aria-label="菜单"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((v) => !v)}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <line x1="4" y1="7" x2="20" y2="7" />
                <line x1="4" y1="12" x2="20" y2="12" />
                <line x1="4" y1="17" x2="20" y2="17" />
              </svg>
            </button>
          )}
        </div>

        <div className={`hud-secondary${secondaryClass}`}>
          <div className="btn-group panel scene-switch">
            <span className="scene-now">{sceneName}</span>
            <button
              type="button"
              className="btn"
              title="返回地球选择其他国家 (Esc)"
              onClick={onChangeScene}
            >
              切换场景
            </button>
          </div>
          <div className="btn-group panel">
            {TIMES.map((t) => (
              <button
                key={t.key}
                className={`btn${timeOfDay === t.key ? ' active' : ''}`}
                onClick={() => onTime(t.key)}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="btn-group panel">
            {CAMS.map((c) => (
              <button
                key={c.key}
                className={`btn${cam === c.key ? ' active' : ''}`}
                onClick={() => onCam(c.key)}
              >
                {c.label}
              </button>
            ))}
          </div>

          <Minimap world={world} stats={stats} />

          <div className="btn-group panel">
            <button className="btn icon-btn" id="btn-shot" title="保存当前画面 (F)" onClick={onShot}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
            </button>
            <button className="btn icon-btn" id="btn-help" title="显示/隐藏操作提示 (H)" onClick={onToggleHelp}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div id="poi-card" className={`panel${stats.poi ? ' show' : ''}`}>
        <div id="poi-dot">{String(stats.poi?.id ?? 0).padStart(2, '0')}</div>
        <div id="poi-text">
          <span id="poi-name">{stats.poi?.name ?? '观景点'}</span>
          <span id="poi-desc">{stats.poi?.desc ?? '正在前往…'}</span>
          <span id="poi-dist">
            {stats.poi ? (stats.poiDist < 40 ? '就在眼前' : `前方 ${Math.round(stats.poiDist)} m`) : ''}
          </span>
        </div>
      </div>

      <div id="help" className={`panel${helpVisible && !(touchUi && !menuOpen) ? '' : ' hidden'}`}>
        <div className="title">操作指南</div>
        <div><span className="k">W</span><span className="k">↑</span> 加速 · <span className="k">S</span><span className="k">↓</span> 刹车停住</div>
        <div><span className="k">A</span><span className="k">D</span> 左右换道</div>
        <div><span className="k">C</span> 切换视角 · <span className="k">F</span> 拍照</div>
        <div><span className="k">H</span> 隐藏提示 · <span className="k">1</span><span className="k">2</span><span className="k">3</span> 时段</div>
        <div><span className="k">Esc</span> 返回地球切换场景</div>
        <div style={{ marginTop: 6, opacity: 0.75 }}>松开油门可轻巡航；刹车可完全停住看风景</div>
      </div>
    </div>
  );
}
