import { useEffect, useRef } from 'react';
import { RideEngine, type EngineCallbacks } from '../engine/RideEngine';
import type { RideConfig } from '../engine/scenes';

interface Props extends EngineCallbacks {
  started: boolean;
  config: RideConfig;
  onReady: (engine: RideEngine | null) => void;
}

/** Three.js 画布：引擎的生命周期与 React 组件绑定 */
export function GameCanvas(props: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<RideEngine | null>(null);
  const cbRef = useRef(props);
  cbRef.current = props;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engine = new RideEngine(canvas, {
      onStats: (s) => cbRef.current.onStats(s),
      onCamChange: (m) => cbRef.current.onCamChange(m),
      onTimeChange: (t) => cbRef.current.onTimeChange(t),
      onDiscover: (ev) => cbRef.current.onDiscover(ev),
      onWarn: (m) => cbRef.current.onWarn(m),
      onSystem: (m) => cbRef.current.onSystem(m),
    }, props.config);
    engineRef.current = engine;
    cbRef.current.onReady(engine);

    return () => {
      cbRef.current.onReady(null);
      engineRef.current = null;
      engine.dispose();
    };
  }, [props.config]);

  useEffect(() => {
    engineRef.current?.setStarted(props.started);
  }, [props.started]);

  return <canvas ref={canvasRef} className="scene" />;
}
