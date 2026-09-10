import { useEffect, useState } from 'react';
import { createMusicController, type MusicController, type MusicState } from '../music';
import { MusicMiniBar } from './MusicMiniBar';
import { MusicPanel } from './MusicPanel';

interface Props {
  sceneId?: string;
  active: boolean;
  onFeedback?: (msg: string) => void;
}

const INITIAL: MusicState = {
  queue: [],
  index: -1,
  playing: false,
  volume: 0.55,
  muted: false,
  current: null,
  loading: false,
  error: null,
  duckFactor: 1,
};

/**
 * Ride-phase music shell: mini bar + expandable panel.
 * Soft-autoplays after mount; falls back to waiting for a play gesture.
 */
export function MusicDock({ sceneId, active, onFeedback }: Props) {
  const [controller] = useState<MusicController>(() => createMusicController());
  const [state, setState] = useState<MusicState>(INITIAL);
  const [panelOpen, setPanelOpen] = useState(false);

  useEffect(() => controller.subscribe(setState), [controller]);

  useEffect(() => {
    controller.setSceneId(sceneId);
  }, [controller, sceneId]);

  useEffect(() => {
    if (!active) {
      controller.pause();
      return;
    }
    let cancelled = false;
    const t = window.setTimeout(() => {
      // Crossing borders / re-entering ride: always refresh country radio
      void controller.loadSceneRadio(true).then(() => {
        if (cancelled) return;
        return controller.trySoftAutoplay();
      }).then((ok) => {
        if (!cancelled && ok === false) {
          // Browser blocked autoplay — stay quiet until gesture
        }
      });
    }, 600);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [active, controller, sceneId]);

  useEffect(() => () => controller.dispose(), [controller]);

  if (!active) return null;

  return (
    <div id="music-dock" className="music-dock">
      <MusicMiniBar
        state={state}
        onTogglePlay={() => {
          void controller.togglePlay();
        }}
        onOpenPanel={() => setPanelOpen(true)}
      />
      <MusicPanel
        open={panelOpen}
        controller={controller}
        state={state}
        sceneId={sceneId}
        onClose={() => setPanelOpen(false)}
        onFeedback={onFeedback}
      />
    </div>
  );
}
