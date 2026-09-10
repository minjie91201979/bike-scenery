/** Cross-browser fullscreen helpers (iOS Safari may only honor via button gesture). */

export function isAppFullscreen(): boolean {
  const doc = document as Document & { webkitFullscreenElement?: Element | null };
  return !!(document.fullscreenElement || doc.webkitFullscreenElement);
}

export async function requestAppFullscreen(el?: Element | null): Promise<boolean> {
  const target = (el ?? document.documentElement) as HTMLElement & {
    webkitRequestFullscreen?: () => void;
    webkitEnterFullscreen?: () => void;
  };
  try {
    if (target.requestFullscreen) {
      await target.requestFullscreen();
      return true;
    }
    if (target.webkitRequestFullscreen) {
      target.webkitRequestFullscreen();
      return true;
    }
    if (typeof target.webkitEnterFullscreen === 'function') {
      target.webkitEnterFullscreen();
      return true;
    }
  } catch {
    /* user gesture / policy blocked */
  }
  return false;
}

export async function exitAppFullscreen(): Promise<void> {
  const doc = document as Document & {
    webkitExitFullscreen?: () => void;
    webkitFullscreenElement?: Element | null;
  };
  try {
    if (document.fullscreenElement && document.exitFullscreen) {
      await document.exitFullscreen();
      return;
    }
    if (doc.webkitFullscreenElement && doc.webkitExitFullscreen) {
      doc.webkitExitFullscreen();
    }
  } catch { /* ignore */ }
}

export async function toggleAppFullscreen(el?: Element | null): Promise<boolean> {
  if (isAppFullscreen()) {
    await exitAppFullscreen();
    return false;
  }
  return requestAppFullscreen(el);
}
