/** Publish HUD card heights so the left rail can stack without overlap or extra gap. */
export function observeHudRailSize(
  el: HTMLElement | null,
  varName: '--hud-dash-h' | '--hud-music-h',
): () => void {
  if (!el) return () => undefined;
  const apply = () => {
    const h = Math.ceil(el.getBoundingClientRect().height);
    if (h > 0) document.body.style.setProperty(varName, `${h}px`);
  };
  const ro = new ResizeObserver(apply);
  ro.observe(el);
  apply();
  return () => {
    ro.disconnect();
    document.body.style.removeProperty(varName);
  };
}
