# Music API (NeteaseCloudMusicApi / neice)

bike-scenery uses a third-party NeteaseCloudMusicApi-compatible proxy for search and playback.
Official NetEase OpenAPI has no stream URLs. Do not switch to it.

Neice: not for commercial use. Personal / internal experience only.

## Start the API

    npx NeteaseCloudMusicApi@latest
    # default PORT=3000
    # or docker run -d -p 3000:3000 binaryify/netease_cloud_music_api

## App env

- Vite dev: VITE_MUSIC_API=/ncm (proxy to 127.0.0.1:3000)
- Direct: VITE_MUSIC_API=http://127.0.0.1:3000
- APK LAN: VITE_MUSIC_API=http://<pc-lan-ip>:3000
- Offline: empty = mock provider

Copy .env.example to .env. Dev default /ncm.

## Key routes we use

- Search: GET /search?keywords=&type=&limit=&offset= (type 1=song / 100=artist / 1000=playlist); fallback /cloudsearch
- Song URL: GET /song/url/v1?id=&level=exhigh — do not cache (~20 min expiry); resolve on each play
- Check: GET /check/music?id= (optional before play)
- Playlist tracks: GET /playlist/track/all?id=&limit=&offset= ; fallback /playlist/detail
- Artist top: GET /artist/top/song?id= ; fallback /artists
- Recommend (no session): scene playlist ids from recommendMap; else /top/playlist?order=hot then first playlist tracks; soft last /personalized. Avoid /recommend/songs and /personal_fm.

Errors: friendly UI message; API code -460 briefly notes risk-control / rate-limit.

## CORS / proxy

Prefer VITE_MUSIC_API=/ncm so the browser stays same-origin.
vite.config.ts rewrites /ncm/* to http://127.0.0.1:3000/*.

## Quick test

1. Start API on port 3000.
2. Run vite dev server (port 5180).
3. Music panel: search a known artist, pick a track, play.
4. On risk-control errors, wait and retry.

No account QR flows in this app.
