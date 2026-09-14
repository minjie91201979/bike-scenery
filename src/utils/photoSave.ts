import { Capacitor } from '@capacitor/core';
import { Media } from '@capacitor-community/media';
import { isTouchUi } from './touchUi';

const ALBUM_NAME = '漫游骑行';

export type PhotoSaveDest = 'album' | 'share' | 'file';

export interface PhotoSaveResult {
  ok: boolean;
  dest?: PhotoSaveDest;
}

let albumId: string | null = null;

/**
 * 把骑行截图写入系统相册（原生 App），或走分享 / 下载（网页）。
 * 须在用户手势内同步调用分享分支，勿先 await 再 share。
 */
export async function saveRidePhoto(dataUrl: string, filename: string): Promise<PhotoSaveResult> {
  if (Capacitor.isNativePlatform()) {
    try {
      await saveToNativeAlbum(dataUrl, filename);
      return { ok: true, dest: 'album' };
    } catch (err) {
      console.error('save to album failed', err);
      return { ok: false };
    }
  }

  if (isTouchUi()) {
    return showMobileSaveSheet(dataUrl, filename);
  }

  return downloadDataUrl(dataUrl, filename) ? { ok: true, dest: 'file' } : { ok: false };
}

async function saveToNativeAlbum(dataUrl: string, filename: string): Promise<void> {
  const fileName = filename.replace(/\.png$/i, '');
  const id = await ensureAlbumId();
  await Media.savePhoto({
    path: dataUrl,
    fileName,
    ...(id ? { albumIdentifier: id } : {}),
  });
}

async function ensureAlbumId(): Promise<string | undefined> {
  if (Capacitor.getPlatform() !== 'android') return undefined;
  if (albumId) return albumId;

  const albumsPath = (await Media.getAlbumsPath()).path;
  const matchAlbum = (albums: { name: string; identifier: string }[]) =>
    albums.find((a) => a.name === ALBUM_NAME && a.identifier.startsWith(albumsPath));

  let found = matchAlbum((await Media.getAlbums()).albums);
  if (!found) {
    await Media.createAlbum({ name: ALBUM_NAME });
    found = matchAlbum((await Media.getAlbums()).albums);
  }
  albumId = found?.identifier ?? null;
  if (!albumId) throw new Error('album missing');
  return albumId;
}

type ShareOutcome = 'ok' | 'abort' | 'skip';

async function tryShare(dataUrl: string, filename: string): Promise<ShareOutcome> {
  try {
    const file = dataUrlToFile(dataUrl, filename);
    const nav = navigator as Navigator & {
      canShare?: (data?: ShareData) => boolean;
      share?: (data?: ShareData) => Promise<void>;
    };
    if (typeof nav.canShare !== 'function' || typeof nav.share !== 'function') return 'skip';
    if (!nav.canShare({ files: [file] })) return 'skip';
    await nav.share({ files: [file], title: '漫游骑行' });
    return 'ok';
  } catch (err) {
    const name = (err as DOMException)?.name;
    if (name === 'AbortError') return 'abort';
    return 'skip';
  }
}

function showMobileSaveSheet(dataUrl: string, filename: string): Promise<PhotoSaveResult> {
  return new Promise((resolve) => {
    const root = document.createElement('div');
    root.className = 'photo-save-sheet';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-label', '保存到相册');
    root.innerHTML = `
      <div class="photo-save-sheet__card panel">
        <p class="photo-save-sheet__hint">长按图片可存到相册，或点下方保存</p>
        <img class="photo-save-sheet__img" alt="本次骑行照片" />
        <div class="photo-save-sheet__row">
          <button type="button" class="btn photo-save-sheet__save">保存到相册</button>
          <button type="button" class="btn photo-save-sheet__close">关闭</button>
        </div>
      </div>
    `;
    const img = root.querySelector('img') as HTMLImageElement;
    img.src = dataUrl;
    const done = (result: PhotoSaveResult) => {
      root.remove();
      resolve(result);
    };
    root.querySelector('.photo-save-sheet__close')?.addEventListener('click', () => {
      done({ ok: false });
    });
    root.querySelector('.photo-save-sheet__save')?.addEventListener('click', () => {
      void (async () => {
        const shared = await tryShare(dataUrl, filename);
        if (shared === 'ok') {
          done({ ok: true, dest: 'share' });
          return;
        }
        if (shared === 'abort') {
          done({ ok: false });
          return;
        }
        done(downloadDataUrl(dataUrl, filename) ? { ok: true, dest: 'file' } : { ok: false });
      })();
    });
    document.body.appendChild(root);
  });
}

function downloadDataUrl(dataUrl: string, filename: string): boolean {
  try {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
    return true;
  } catch {
    return false;
  }
}

function dataUrlToFile(dataUrl: string, filename: string): File {
  const comma = dataUrl.indexOf(',');
  const b64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new File([bytes], filename, { type: 'image/png' });
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
