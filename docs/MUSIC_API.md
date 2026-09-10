# Music — NetEase weapi (client)

The app talks to `https://music.163.com/weapi/*` from the client.
Official OpenAPI has no playback URLs; weapi is used for search and song URLs (neice, not for commercial use).

No local Node music server. Phone APK does not need the PC to run an API.

## How requests go out

- Browser `npm run dev`: Vite proxies `/weapi` → `https://music.163.com/weapi` (CORS).
- Android: `CapacitorHttp` POST to `https://music.163.com` (WebView CORS does not apply).

## Quick test

1. `npm run dev`
2. Ride any country, open the music panel, search a known artist, play.

Risk-control (`code -460`): wait and retry. Some tracks have no playable URL without a NetEase login.

No account QR flows in this app.
