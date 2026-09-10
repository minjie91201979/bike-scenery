import { useCallback, useEffect, useRef, useState } from 'react';
import { GameCanvas } from './components/GameCanvas';
import { GlobeSelect } from './components/GlobeSelect';
import { Hud } from './components/Hud';
import { StartScreen } from './components/StartScreen';
import { TouchControls } from './components/TouchControls';
import { MusicDock } from './components/MusicDock';
import type { DiscoverEvent, RideEngine } from './engine/RideEngine';
import { getScene, type CountryId, type RideConfig } from './engine/scenes';
import type { World } from './engine/World';
import type { CamMode, Stats, TimeOfDay } from './engine/types';
import { isTouchUi, subscribeTouchUi } from './utils/touchUi';
import { bindRideWakeLockVisibility, setRideWakeLock } from './utils/wakeLock';
import { rideAudio } from './utils/rideAudio';

const INITIAL_STATS: Stats = {
  speed: 0, dist: 0, time: 0, seen: 0, total: 6,
  poi: null, poiDist: Infinity, x: 0, z: 0, yaw: 0,
};

type Phase = 'globe' | 'character' | 'ride';

interface LaneMsg {
  text: string;
  key: number;
}

interface DiscoverCard extends DiscoverEvent {
  key: number;
}

interface Footprint {
  poiName: string;
  countryName: string;
}

export default function App() {
  const engineRef = useRef<RideEngine | null>(null);
  const [engine, setEngine] = useState<RideEngine | null>(null);
  const [world, setWorld] = useState<World | null>(null);
  const [config, setConfig] = useState<RideConfig | null>(null);
  const [phase, setPhase] = useState<Phase>('globe');
  const [countryId, setCountryId] = useState<CountryId | null>(null);
  const [cam, setCam] = useState<CamMode>('follow');
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>('day');
  const [stats, setStats] = useState<Stats>(INITIAL_STATS);
  const [helpVisible, setHelpVisible] = useState(true);
  const [touchUi, setTouchUi] = useState(() => isTouchUi());
  const [muted, setMuted] = useState(() => rideAudio.isMuted);

  // 三车道反馈，互不覆盖
  const [discoverCard, setDiscoverCard] = useState<DiscoverCard | null>(null);
  const [warnMsg, setWarnMsg] = useState<LaneMsg | null>(null);
  const [systemMsg, setSystemMsg] = useState<LaneMsg | null>(null);
  const [footprints, setFootprints] = useState<Footprint[]>([]);

  const discoverTimer = useRef(0);
  const warnTimer = useRef(0);
  const systemTimer = useRef(0);
  const msgSeq = useRef(0);

  const started = phase === 'ride';

  useEffect(() => subscribeTouchUi(setTouchUi), []);

  useEffect(() => bindRideWakeLockVisibility(), []);

  useEffect(() => {
    setRideWakeLock(started);
    return () => setRideWakeLock(false);
  }, [started]);

  useEffect(() => {
    document.documentElement.classList.toggle('touch-ui', touchUi);
    document.body.classList.toggle('touch-ui', touchUi);
    document.documentElement.classList.toggle('riding', started);
    document.body.classList.toggle('riding', started);
  }, [touchUi, started]);

  const handleReady = useCallback((eng: RideEngine | null) => {
    engineRef.current = eng;
    setEngine(eng);
    setWorld(eng ? eng.world : null);
  }, []);

  useEffect(() => {
    const handler = () => setHelpVisible((v) => !v);
    window.addEventListener('ride:toggle-help', handler);
    return () => window.removeEventListener('ride:toggle-help', handler);
  }, []);

  const showSystem = useCallback((msg: string) => {
    const key = ++msgSeq.current;
    setSystemMsg({ text: msg, key });
    window.clearTimeout(systemTimer.current);
    systemTimer.current = window.setTimeout(() => {
      setSystemMsg((cur) => (cur?.key === key ? null : cur));
    }, 2200);
  }, []);

  const showWarn = useCallback((msg: string) => {
    const key = ++msgSeq.current;
    setWarnMsg({ text: msg, key });
    window.clearTimeout(warnTimer.current);
    warnTimer.current = window.setTimeout(() => {
      setWarnMsg((cur) => (cur?.key === key ? null : cur));
    }, 2400);
  }, []);

  const handleDiscover = useCallback((ev: DiscoverEvent) => {
    const key = ++msgSeq.current;
    setDiscoverCard({ ...ev, key });
    setFootprints((list) => {
      if (list.some((f) => f.poiName === ev.poiName && f.countryName === ev.countryName)) return list;
      return [...list, { poiName: ev.poiName, countryName: ev.countryName }];
    });
    window.clearTimeout(discoverTimer.current);
    discoverTimer.current = window.setTimeout(() => {
      setDiscoverCard((cur) => (cur?.key === key ? null : cur));
    }, 3000);
  }, []);

  const handleCam = useCallback((m: CamMode) => {
    setCam(m);
    engineRef.current?.setCamMode(m);
  }, []);

  const handleTime = useCallback((t: TimeOfDay) => {
    setTimeOfDay(t);
    engineRef.current?.setTimeOfDay(t);
  }, []);

  const handleCountrySelect = useCallback((id: CountryId) => {
    rideAudio.unlock();
    setCountryId(id);
    setPhase('character');
  }, []);

  const handleLocked = useCallback((name: string) => {
    showSystem(`「${name}」开发中，敬请期待`);
  }, [showSystem]);

  const handleStart = useCallback((cfg: RideConfig) => {
    rideAudio.unlock();
    setConfig(cfg);
    setPhase('ride');
    setStats(INITIAL_STATS);
    setCam('follow');
    setTimeOfDay('day');
    setFootprints([]);
    setDiscoverCard(null);
    setWarnMsg(null);
    setSystemMsg(null);
  }, []);

  const handleBackToGlobe = useCallback(() => {
    setCountryId(null);
    setPhase('globe');
  }, []);

  const handleChangeScene = useCallback(() => {
    setConfig(null);
    setWorld(null);
    setEngine(null);
    engineRef.current = null;
    setCountryId(null);
    setPhase('globe');
    setDiscoverCard(null);
    setWarnMsg(null);
    setSystemMsg(null);
  }, []);

  const handleToggleMute = useCallback(() => {
    rideAudio.unlock();
    setMuted(rideAudio.toggleMute());
  }, []);

  useEffect(() => {
    const handler = () => handleChangeScene();
    window.addEventListener('ride:change-scene', handler);
    return () => window.removeEventListener('ride:change-scene', handler);
  }, [handleChangeScene]);

  useEffect(() => () => {
    window.clearTimeout(discoverTimer.current);
    window.clearTimeout(warnTimer.current);
    window.clearTimeout(systemTimer.current);
  }, []);

  return (
    <>
      {config && (
        <GameCanvas
          key={`${config.sceneId}-${config.characterId}`}
          config={config}
          started={started}
          onReady={handleReady}
          onStats={setStats}
          onCamChange={setCam}
          onTimeChange={setTimeOfDay}
          onDiscover={handleDiscover}
          onWarn={showWarn}
          onSystem={showSystem}
        />
      )}

      {started && config && (
        <Hud
          stats={stats}
          cam={cam}
          timeOfDay={timeOfDay}
          world={world}
          sceneName={getScene(config.sceneId).name}
          helpVisible={helpVisible}
          muted={muted}
          onCam={handleCam}
          onTime={handleTime}
          onShot={() => engineRef.current?.screenshot()}
          onToggleHelp={() => setHelpVisible((v) => !v)}
          onChangeScene={handleChangeScene}
          onToggleMute={handleToggleMute}
        />
      )}

      {started && touchUi && (
        <TouchControls engine={engine} />
      )}

      {started && config && (
        <MusicDock
          active={started}
          sceneId={config.sceneId}
          onFeedback={showSystem}
        />
      )}

      {/* 分层反馈：发现 / 警告 / 系统 */}
      <div id="feedback-stack" aria-live="polite">
        <div id="toast-discover" className={`fb-lane discover${discoverCard ? ' show' : ''}`}>
          {discoverCard && (
            <>
              <div className="stamp-mark">足迹</div>
              <div className="stamp-body">
                <div className="stamp-country">{discoverCard.countryName}</div>
                <div className="stamp-poi">{discoverCard.poiName}</div>
                <div className="stamp-note">
                  {discoverCard.welcome ?? `在此留下第 ${discoverCard.stampIndex} 枚足迹`}
                </div>
              </div>
            </>
          )}
        </div>
        <div id="toast-warn" className={`fb-lane warn${warnMsg ? ' show' : ''}`}>
          {warnMsg?.text}
        </div>
        <div id="toast-system" className={`fb-lane system${systemMsg ? ' show' : ''}`}>
          {systemMsg?.text}
        </div>
      </div>

      {started && footprints.length > 0 && (
        <div id="footprint-book" className="panel" title="本次漫游足迹">
          <div className="fp-title">足迹簿</div>
          <ul className="fp-list">
            {footprints.slice(-6).map((f) => (
              <li key={`${f.countryName}-${f.poiName}`}>{f.poiName}</li>
            ))}
          </ul>
        </div>
      )}

      {phase === 'globe' && (
        <GlobeSelect onSelect={handleCountrySelect} onLocked={handleLocked} />
      )}

      {phase === 'character' && countryId && (
        <StartScreen
          countryId={countryId}
          onStart={handleStart}
          onBack={handleBackToGlobe}
        />
      )}
    </>
  );
}
