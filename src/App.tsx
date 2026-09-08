import { useCallback, useEffect, useRef, useState } from 'react';
import { GameCanvas } from './components/GameCanvas';
import { Hud } from './components/Hud';
import { StartScreen } from './components/StartScreen';
import type { RideEngine } from './engine/RideEngine';
import type { World } from './engine/World';
import type { CamMode, Stats, TimeOfDay } from './engine/types';

const INITIAL_STATS: Stats = {
  speed: 0, dist: 0, time: 0, seen: 0, total: 6,
  poi: null, poiDist: Infinity, x: 0, z: 0, yaw: 0,
};

export default function App() {
  const engineRef = useRef<RideEngine | null>(null);
  const [world, setWorld] = useState<World | null>(null);
  const [started, setStarted] = useState(false);
  const [cam, setCam] = useState<CamMode>('follow');
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>('day');
  const [stats, setStats] = useState<Stats>(INITIAL_STATS);
  const [toast, setToast] = useState('');
  const [helpVisible, setHelpVisible] = useState(true);

  const handleReady = useCallback((engine: RideEngine | null) => {
    engineRef.current = engine;
    setWorld(engine ? engine.world : null);
  }, []);

  // 引擎按键 H → 切换帮助面板
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

  const handleStart = useCallback(() => setStarted(true), []);

  return (
    <>
      <GameCanvas
        started={started}
        onReady={handleReady}
        onStats={setStats}
        onCamChange={setCam}
        onTimeChange={setTimeOfDay}
        onToast={showToast}
      />

      <Hud
        stats={stats}
        cam={cam}
        timeOfDay={timeOfDay}
        world={world}
        helpVisible={helpVisible}
        onCam={handleCam}
        onTime={handleTime}
        onShot={() => engineRef.current?.screenshot()}
        onToggleHelp={() => setHelpVisible((v) => !v)}
      />

      <div id="toast" className={toast ? 'show' : ''}>{toast}</div>

      {!started && <StartScreen onStart={handleStart} />}
    </>
  );
}
