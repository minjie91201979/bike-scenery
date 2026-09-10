import { useCallback, useEffect, useRef, useState } from 'react';
import type { RideEngine, TouchInput } from '../engine/RideEngine';

interface Props {
  engine: RideEngine | null;
}

const EMPTY: TouchInput = { left: false, right: false, accel: false, brake: false };

/**
 * Mobile ride overlay: left zone steers, right holds accelerate (+ small brake).
 * Tracks touch identifiers so left/right fingers work independently.
 */
export function TouchControls({ engine }: Props) {
  const stateRef = useRef<TouchInput>({ ...EMPTY });
  const leftId = useRef<number | null>(null);
  const rightAccelId = useRef<number | null>(null);
  const rightBrakeId = useRef<number | null>(null);
  const leftZoneRef = useRef<HTMLDivElement>(null);
  const [, bump] = useState(0);

  const push = useCallback(() => {
    engine?.setTouchInput({ ...stateRef.current });
    bump((n) => n + 1);
  }, [engine]);

  const clearAll = useCallback(() => {
    stateRef.current = { ...EMPTY };
    leftId.current = null;
    rightAccelId.current = null;
    rightBrakeId.current = null;
    push();
  }, [push]);

  useEffect(() => {
    return () => {
      engine?.setTouchInput({ ...EMPTY });
    };
  }, [engine]);

  useEffect(() => {
    const onBlur = () => clearAll();
    window.addEventListener('blur', onBlur);
    return () => window.removeEventListener('blur', onBlur);
  }, [clearAll]);

  const updateSteerFromClientX = (clientX: number) => {
    const el = leftZoneRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const mid = rect.left + rect.width / 2;
    const dead = Math.max(18, rect.width * 0.08);
    if (clientX < mid - dead) {
      stateRef.current.left = true;
      stateRef.current.right = false;
    } else if (clientX > mid + dead) {
      stateRef.current.left = false;
      stateRef.current.right = true;
    } else {
      stateRef.current.left = false;
      stateRef.current.right = false;
    }
  };

  const onLeftStart = (e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      if (leftId.current === null) {
        leftId.current = t.identifier;
        updateSteerFromClientX(t.clientX);
        push();
        break;
      }
    }
  };

  const onLeftMove = (e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      if (t.identifier === leftId.current) {
        updateSteerFromClientX(t.clientX);
        push();
        break;
      }
    }
  };

  const onLeftEnd = (e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      if (t.identifier === leftId.current) {
        leftId.current = null;
        stateRef.current.left = false;
        stateRef.current.right = false;
        push();
        break;
      }
    }
  };

  const bindHold = (
    which: 'accel' | 'brake',
    idRef: React.MutableRefObject<number | null>,
  ) => ({
    onTouchStart: (e: React.TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        if (idRef.current === null) {
          idRef.current = t.identifier;
          stateRef.current[which] = true;
          push();
          break;
        }
      }
    },
    onTouchEnd: (e: React.TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        if (t.identifier === idRef.current) {
          idRef.current = null;
          stateRef.current[which] = false;
          push();
          break;
        }
      }
    },
    onTouchCancel: (e: React.TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        if (t.identifier === idRef.current) {
          idRef.current = null;
          stateRef.current[which] = false;
          push();
          break;
        }
      }
    },
  });

  const s = stateRef.current;
  const accelBind = bindHold('accel', rightAccelId);
  const brakeBind = bindHold('brake', rightBrakeId);

  return (
    <div id="touch-controls" aria-hidden="true">
      <div
        id="touch-steer"
        ref={leftZoneRef}
        className={`touch-zone${s.left || s.right ? ' active' : ''}`}
        onTouchStart={onLeftStart}
        onTouchMove={onLeftMove}
        onTouchEnd={onLeftEnd}
        onTouchCancel={onLeftEnd}
      >
        <div className={`touch-pad-half left${s.left ? ' pressed' : ''}`}>
          <span className="touch-label">←</span>
        </div>
        <div className={`touch-pad-half right${s.right ? ' pressed' : ''}`}>
          <span className="touch-label">→</span>
        </div>
      </div>

      <div id="touch-throttle">
        <button
          type="button"
          id="touch-brake"
          className={`touch-btn brake${s.brake ? ' pressed' : ''}`}
          {...brakeBind}
        >
          刹
        </button>
        <button
          type="button"
          id="touch-accel"
          className={`touch-btn accel${s.accel ? ' pressed' : ''}`}
          {...accelBind}
        >
          加速
        </button>
      </div>
    </div>
  );
}
