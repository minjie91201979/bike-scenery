import { useCallback, useEffect, useRef, useState } from 'react';
import { GameCanvas } from './components/GameCanvas';
import { GlobeSelect } from './components/GlobeSelect';
import { Hud } from './components/Hud';
import { StartScreen } from './components/StartScreen';
import { TouchControls } from './components/TouchControls';
import type { RideEngine } from './engine/RideEngine';
import { getScene, type CountryId, type RideConfig } from './engine/scenes';
import type { World } from './engine/World';
import type { CamMode, Stats, TimeOfDay } from './engine/types';
import { isTouchUi, subscribeTouchUi } from './utils/touchUi';

const INITIAL_STATS: Stats = {
  speed: 0, dist: 0, time: 0, seen: 0, total: 6,
  poi: null, poiDist: Infinity, x: 0, z: 0, yaw: 0,
};

type Phase = 'globe' | 'character' | 'ride';

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
  const [toast, setToast] = useState('');
  const [helpVisible, setHelpVisible] = useState(true);
  const [touchUi, setTouchUi] = useState(() => isTouchUi());

  const started = phase === 'ride';

  useEffect(() => subscribeTouchUi(setTouchUi), []);

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

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.clearTimeout((showToast as unknown as { t?: number }).t);
    (showToast as unknown as { t?: number }).t = window.setTimeout(() => setToast(''), 1900);
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
    setCountryId(id);
    setPhase('character');
  }, []);

  const handleLocked = useCallback((name: string) => {
    showToast(`「${name}」开发中，敬请期待`);
  }, [showToast]);

  const handleStart = useCallback((cfg: RideConfig) => {
    setConfig(cfg);
    setPhase('ride');
    setStats(INITIAL_STATS);
    setCam('follow');
    setTimeOfDay('day');
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
  }, []);

  useEffect(() => {
    const handler = () => handleChangeScene();
    window.addEventListener('ride:change-scene', handler);
    return () => window.removeEventListener('ride:change-scene', handler);
  }, [handleChangeScene]);

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
          onToast={showToast}
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
          onCam={handleCam}
          onTime={handleTime}
          onShot={() => engineRef.current?.screenshot()}
          onToggleHelp={() => setHelpVisible((v) => !v)}
          onChangeScene={handleChangeScene}
        />
      )}

      {started && touchUi && (
        <TouchControls engine={engine} />
      )}

      <div id="toast" className={toast ? 'show' : ''}>{toast}</div>

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
