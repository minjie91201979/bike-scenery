/** Detect coarse pointer / touch-primary UI (phones, tablets). */
export function isTouchUi(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    if (window.matchMedia('(pointer: coarse)').matches) return true;
  } catch { /* ignore */ }
  return 'ontouchstart' in window || (navigator.maxTouchPoints ?? 0) > 0;
}

/** Subscribe to touch-UI changes (e.g. hybrid laptop). Returns unsubscribe. */
export function subscribeTouchUi(cb: (touch: boolean) => void): () => void {
  if (typeof window === 'undefined') return () => {};
  let mq: MediaQueryList | null = null;
  const fire = () => cb(isTouchUi());
  try {
    mq = window.matchMedia('(pointer: coarse)');
    mq.addEventListener('change', fire);
  } catch { /* ignore */ }
  return () => {
    try { mq?.removeEventListener('change', fire); } catch { /* ignore */ }
  };
}
