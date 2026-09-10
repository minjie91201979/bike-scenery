/** Browser download (+ optional Web Share) for ride screenshots. */
export async function savePngBlob(blob: Blob, filename: string): Promise<boolean> {
  try {
    const file = new File([blob], filename, { type: 'image/png' });
    const nav = navigator as Navigator & {
      canShare?: (data?: ShareData) => boolean;
      share?: (data?: ShareData) => Promise<void>;
    };
    if (typeof nav.canShare === 'function' && typeof nav.share === 'function') {
      try {
        if (nav.canShare({ files: [file] })) {
          await nav.share({ files: [file], title: '漫游骑行' });
          return true;
        }
      } catch (err) {
        const name = (err as DOMException)?.name;
        if (name === 'AbortError') return false;
        // fall through to download
      }
    }
  } catch {
    // File/Share unsupported — fall through
  }

  try {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 4000);
    return true;
  } catch {
    return false;
  }
}

/** Brief full-screen shutter flash overlay. */
export function triggerShutterFlash(ms = 140): void {
  const el = document.createElement('div');
  el.className = 'shutter-flash';
  document.body.appendChild(el);
  void el.offsetWidth;
  el.classList.add('on');
  window.setTimeout(() => {
    el.classList.remove('on');
    window.setTimeout(() => el.remove(), 220);
  }, ms);
}
