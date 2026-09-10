import CryptoJS from 'crypto-js';
import { Capacitor, CapacitorHttp } from '@capacitor/core';

const IV = '0102030405060708';
const PRESET_KEY = '0CoJUm6Qyw8W8jud';
const BASE62 = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const RSA_N = BigInt(
  '0xe0b509f6259df8642dbc35662901477df22677ec152b5ff68ace615bb7b725152b3ab17a876aea8a5aa76d2e417629ec4ee341f56135fccf695280104e0312ecbda92557c93870114af6c9d05c4f7f0c3685b7a46bee255932575cce10b424d813cfe4875d3e82047b97ddef52741d546b8e289dc6935b3ece0462db0a22b8e7',
);
const RSA_E = 0x10001n;
const MUSIC_ORIGIN = 'https://music.163.com';

function aesCbc(text: string, key: string): string {
  return CryptoJS.AES.encrypt(CryptoJS.enc.Utf8.parse(text), CryptoJS.enc.Utf8.parse(key), {
    iv: CryptoJS.enc.Utf8.parse(IV),
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  }).toString();
}

function modPow(base: bigint, exp: bigint, mod: bigint): bigint {
  let result = 1n;
  let b = base % mod;
  let e = exp;
  while (e > 0n) {
    if (e & 1n) result = (result * b) % mod;
    b = (b * b) % mod;
    e >>= 1n;
  }
  return result;
}

/** RSA with no padding — matches Netease weapi (`forge` NONE). */
function rsaEncrypt(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let m = 0n;
  for (const byte of bytes) m = (m << 8n) + BigInt(byte);
  const c = modPow(m, RSA_E, RSA_N);
  return c.toString(16).padStart(256, '0');
}

function randomSecretKey(): string {
  let key = '';
  for (let i = 0; i < 16; i++) {
    key += BASE62.charAt(Math.round(Math.random() * 61));
  }
  return key;
}

export function weapiEncrypt(object: Record<string, unknown>): { params: string; encSecKey: string } {
  const text = JSON.stringify(object);
  const secretKey = randomSecretKey();
  return {
    params: aesCbc(aesCbc(text, PRESET_KEY), secretKey),
    encSecKey: rsaEncrypt(secretKey.split('').reverse().join('')),
  };
}

function weapiUrl(apiPath: string): string {
  const suffix = apiPath.replace(/^\/api\//, '');
  if (import.meta.env.DEV) return `/weapi/${suffix}`;
  return `${MUSIC_ORIGIN}/weapi/${suffix}`;
}

function normalizeJson(raw: unknown): unknown {
  if (typeof raw !== 'string') return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

async function postForm(url: string, body: string): Promise<unknown> {
  if (Capacitor.isNativePlatform()) {
    const res = await CapacitorHttp.post({
      url: url.startsWith('http') ? url : `${MUSIC_ORIGIN}${url}`,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Referer: `${MUSIC_ORIGIN}/`,
      },
      data: Object.fromEntries(new URLSearchParams(body)),
      responseType: 'json',
    });
    if (res.status < 200 || res.status >= 300) {
      throw new Error(`曲库接口暂时不可用 (${res.status})`);
    }
    return normalizeJson(res.data);
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
    credentials: 'omit',
  });
  let json: unknown;
  try {
    json = await res.json();
  } catch {
    throw new Error(res.ok ? '曲库接口暂时不可用' : `曲库接口暂时不可用 (${res.status})`);
  }
  if (!res.ok) throw new Error(`曲库接口暂时不可用 (${res.status})`);
  return json;
}

export async function weapiPost<T = unknown>(
  apiPath: string,
  data: Record<string, unknown> = {},
): Promise<T> {
  const enc = weapiEncrypt({ ...data, csrf_token: '' });
  const body = new URLSearchParams({
    params: enc.params,
    encSecKey: enc.encSecKey,
  }).toString();
  const json = normalizeJson(await postForm(weapiUrl(apiPath), body)) as {
    code?: number;
    msg?: string;
    message?: string;
  } & T;
  const code = json?.code;
  if (code === -460) throw new Error('接口触发风控/降频，请稍后再试');
  if (typeof code === 'number' && code !== 200 && code !== 0) {
    throw new Error(json.msg || json.message || `曲库接口暂时不可用 (${apiPath})`);
  }
  return json as T;
}

function guessAudioMime(url: string, headers?: Record<string, string>): string {
  const fromHeader = headers
    ? headers['Content-Type'] || headers['content-type'] || ''
    : '';
  const mime = fromHeader.split(';')[0].trim();
  if (mime.startsWith('audio/') || mime === 'application/octet-stream') {
    return mime === 'application/octet-stream' ? 'audio/mpeg' : mime;
  }
  if (/\.flac(?:\?|$)/i.test(url)) return 'audio/flac';
  if (/\.m4a(?:\?|$)/i.test(url)) return 'audio/mp4';
  if (/\.ogg(?:\?|$)/i.test(url)) return 'audio/ogg';
  return 'audio/mpeg';
}

function base64ToObjectUrl(data: string, mime: string): string {
  const raw = data.includes('base64,') ? data.slice(data.indexOf('base64,') + 7) : data.replace(/\s/g, '');
  const binary = atob(raw);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return URL.createObjectURL(new Blob([bytes], { type: mime }));
}

/**
 * WebView cannot play NetEase CDN URLs directly (Referer + CORS).
 * On native, download with CapacitorHttp then play a blob URL.
 */
export async function toPlayableSrc(remoteUrl: string): Promise<string> {
  const url = remoteUrl.replace(/^http:\/\//i, 'https://');
  if (!Capacitor.isNativePlatform()) return url;

  const res = await CapacitorHttp.get({
    url,
    headers: {
      Referer: `${MUSIC_ORIGIN}/`,
      Origin: MUSIC_ORIGIN,
      'User-Agent':
        'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36',
    },
    responseType: 'blob',
    readTimeout: 60000,
    connectTimeout: 15000,
  });
  if (res.status < 200 || res.status >= 300 || typeof res.data !== 'string') {
    throw new Error('音频加载失败');
  }
  return base64ToObjectUrl(res.data, guessAudioMime(url, res.headers as Record<string, string> | undefined));
}

