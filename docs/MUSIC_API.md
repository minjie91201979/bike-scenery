# 旅途音乐（网易云 weapi）

bike-scenery 的伴听直接走 **music.163.com weapi**（AES-CBC + RSA 加密 POST），
不再依赖本地 `NeteaseCloudMusicApi` / 内测代理。官方开放平台没有可用播放流，
不要改接到 OpenAPI。

仅供个人 / 内部体验，不可商用。无登录、无二维码。

## 运行时路径

| 环境 | 请求 | 播放 |
|------|------|------|
| Vite 开发 | 同源 `POST /weapi/...`，`vite.config.ts` 代理到 `https://music.163.com` | 浏览器直接播 CDN URL |
| 生产网页 | 直连 `https://music.163.com/weapi/...` | 同上（可能受 CORS / 风控影响） |
| Capacitor APK | `CapacitorHttp` 直连 weapi | CDN 再拉一次，转 blob URL（WebView 无法带 Referer 直播） |

失败（网络、风控、空 URL）降级 `mockProvider`，界面仍可点播占位曲。

无需 `.env` 里的 `VITE_MUSIC_API`。开发默认见 `.env.example`：复制即可，不必填密钥。

```bash
npm run dev   # 5180；音乐走 /weapi 代理
```

## 加密与入口

实现：`src/music/weapi.ts`

- 明文 JSON → AES-CBC（preset key）→ 再 AES-CBC（随机 16 位 secret）得到 `params`
- secret 反转后 RSA（无 padding）得到 `encSecKey`
- `weapiPost('/api/...')` 会把路径改成 `/weapi/...` 再 POST `application/x-www-form-urlencoded`
- `code === -460`：界面提示「接口触发风控/降频，请稍后再试」

开发代理（`vite.config.ts`）会带上 `Referer` / `Origin: https://music.163.com/`。

## 实际调用的 weapi

搜索 / 推荐 / 播放由 `src/music/providers/neteaseProxy.ts` 封装：

| 用途 | 路径 | 说明 |
|------|------|------|
| 搜索 | `/api/search/get` | `s, type, limit, offset`；type 1=歌 / 100=艺人 / 1000=歌单 |
| 搜索兜底 | `/api/cloudsearch/pc` | 上一接口失败时 |
| 歌单详情 | `/api/v6/playlist/detail` | `id, n, s`；有 `trackIds` 再拉歌曲详情 |
| 歌曲详情 | `/api/v3/song/detail` | `c=[{"id":...},...]` |
| 热门歌单 | `/api/playlist/list` | `cat=全部, order=hot` |
| 个性化歌单 | `/api/personalized/playlist` | 无 cookie 时可能空，仅最后兜底 |
| 艺人热歌 | `/api/artist/top/song` | 失败再试 `/api/v1/artist/{id}` |
| 播放地址 | `/api/song/enhance/player/url/v1` | 先 `level=standard` mp3，空则 `exhigh` flac；**不要缓存 URL**（约 20 分钟失效） |

不要用需要登录会话的 `/recommend/songs`、`/personal_fm`。

## 国家电台

`src/music/recommendMap.ts`：每个 `SceneId` 一组关键词（可选歌单 id）。

加载顺序（无登录）：

1. 按国家关键词搜索歌曲并去重（最多 28）
2. 配置里的 playlist id
3. 热门歌单第一条的曲目
4. personalized 第一条
5. mock

进入骑行约 600 ms 后 `loadSceneRadio` + 软自动播放；浏览器拦截自动播放则保持静音，等用户点播放。

## 与骑行音效的关系

- `rideAudio`（WebAudio 底噪 + 发现/快门/警告）和 `MusicController` 分开。
- 音效触发时 `duckMusic()` 短暂压低伴听，避免盖过快门/打卡。
- 伴听音量 / 静音键写入 `localStorage`（`bike-scenery-music-volume` / `bike-scenery-music-muted`）。
- HUD 喇叭只静音骑行 SFX，不强制关掉音乐面板（两套开关）。

## UI

骑行阶段挂 `MusicDock`：

- 迷你条：封面、曲名、播放/暂停
- 展开面板：推荐 / 搜索（歌、艺人、歌单可下钻）/ 当前队列

错误用系统反馈车道显示，不弹 modal。

## 自检

1. `npm run dev`，选任意国家开始骑行。
2. 右下角约 1 秒内出现迷你条；若被自动播放策略拦住，点一次播放。
3. 打开面板搜知名艺人，点曲目应出声。
4. 发现景点或拍照时，音乐应短暂变轻再恢复。
5. `-460` 时等一会儿再试，不要连打搜索。

APK：先 `npm run cap:sync` 再装包。原生侧必须能访问 `music.163.com`；播放走 blob，不依赖 WebView 对 CDN 的 Referer。
