/** Keep the screen awake while riding (mobile sleep / dim). */
type WakeLockSentinelLike = {
  released: boolean;
  release: () => Promise<void>;
  addEventListener?: (type: 'release', listener: () => void) => void;
};

let sentinel: WakeLockSentinelLike | null = null;
let wantLock = false;

function wakeLockApi(): { request: (type: 'screen') => Promise<WakeLockSentinelLike> } | null {
  const nav = navigator as Navigator & {
    wakeLock?: { request: (type: 'screen') => Promise<WakeLockSentinelLike> };
  };
  return nav.wakeLock ?? null;
}

async function acquire(): Promise<boolean> {
  const api = wakeLockApi();
  if (!api) return false;
  try {
    if (sentinel && !sentinel.released) return true;
    sentinel = await api.request('screen');
    sentinel.addEventListener?.('release', () => {
      sentinel = null;
      if (wantLock && document.visibilityState === 'visible') {
        void acquire();
      }
    });
    return true;
  } catch {
    sentinel = null;
    return false;
  }
}

async function release(): Promise<void> {
  const s = sentinel;
  sentinel = null;
  if (s && !s.released) {
    try {
      await s.release();
    } catch {
      /* ignore */
    }
  }
}

/**
 * Enable/disable screen wake lock for the ride session.
 * Re-acquires when the tab becomes visible again (OS often drops the lock on hide).
 */
export function setRideWakeLock(enabled: boolean): void {
  wantLock = enabled;
  if (!enabled) {
    void release();
    return;
  }
  void acquire();
}

/** Call once from App mount to re-request after backgrounding. */
export function bindRideWakeLockVisibility(): () => void {
  const onVis = () => {
    if (wantLock && document.visibilityState === 'visible') void acquire();
  };
  document.addEventListener('visibilitychange', onVis);
  return () => document.removeEventListener('visibilitychange', onVis);
}
