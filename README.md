# 漫游骑行 · Scenery Ride

以「浏览风景」为主的 3D 自行车骑行网页。没有竞速、没有终点 ——
从地球上点选国家，沿程序化闭环公路路过地标、迎宾与野生动物，
可以真正停下来看风景。

技术栈：**React 18 + TypeScript + Three.js (r0.170) + Vite 5 + Capacitor 8**。
引擎与 UI 分离。版本 `0.2.0`。

> 个人 / 内部体验向。旅途音乐走网易云 weapi，不可商用。详见 [docs/MUSIC_API.md](docs/MUSIC_API.md)。

## 运行

```bash
cd bike-scenery
npm install
npm run dev        # http://127.0.0.1:5180/（局域网可访问，host: true）
npm run build      # 产物输出到 dist/
npm run preview    # 预览构建产物
npm run typecheck
```

Android（Capacitor）：

```bash
npm run cap:sync      # build + cap sync android + 同步图标
npm run cap:android   # 打开 Android Studio
```

> 必须通过 http(s) 访问（ES Module 不支持 `file://` 直开）。
> 3D 资源走 npm 依赖（three）；封面 / 天空 / 远山在 `public/assets/`。
> 开发环境音乐请求由 Vite 把 `/weapi` 代理到 `music.163.com`，无需再起本地 Node 曲库。

## 流程

`地球选国` → `选角色 / 座驾` → `开始漫游`

1. **地球**：可拖拽自转球体，17 国热点全部开放。
2. **角色**：男骑手 / 女骑手 / 摩托车 / 房车 / 跑车。文案「不必赶路，慢一点」。开始时尝试进入全屏并解锁音效。
3. **骑行**：自动轻巡航；刹车可完全停住；Esc 返回地球换国家。

## 操作

| 操作 | 键鼠 | 触屏 |
|------|------|------|
| 加速 | `W` / `↑` | 右侧油门 |
| 刹车停住 | `S` / `↓` / `空格` | 右侧刹车 |
| 左右换道 | `A` `D` / `←` `→`（松手回中路） | 左侧滑动转向 |
| 切换视角 | `C`（跟随 / 电影 / 第一人称） | HUD 按钮 |
| 拍照留念 | `F` | HUD 相机 |
| 切换时段 | `1` `2` `3`（白天 / 黄昏 / 夜晚） | HUD 按钮 |
| 静音骑行音效 | HUD 喇叭 | 同左 |
| 隐藏帮助 | `H` | 菜单内帮助 |
| 返回地球 | `Esc` | 「切换场景」 |
| 自由环视 | 拖拽画面（松手回正，跟随视角） | 同左 |
| 全屏 | HUD / 开始页按钮 | 同左 |

触屏 HUD 会折叠次要按钮，点菜单展开；骑行中请求屏幕 Wake Lock，减少息屏。

## 玩法

- **座驾**：自行车巡航约 23 km/h、冲刺约 60 km/h；摩托车更快（冲刺约 79 km/h，过弯侧倾更大）；房车更慢更高（冲刺约 40 km/h）；跑车最快（冲刺约 101 km/h）。刹车都可到 0，停稳后不会被拉回巡航。手感见 `VEHICLE_PROFILES`。
- **17 国场景**：中国、俄罗斯、日本、美国、澳大利亚、埃及、印度、加拿大、法国、巴西、墨西哥、英国、韩国、意大利、土耳其、沙特阿拉伯、南非。各国独立闭环、色板、地标简模；部分岛国有左侧海岸与渔船。土耳其另有远近分层的卡帕多奇亚热气球（球囊花纹 / 燃烧器 / 吊篮 / 绳索附件）。
- **景点**：中国 21 站，俄罗斯 8 站，埃及 11 站，其余各国 12 站（合计约 200+）。接近 85 m 出介绍卡，42 m 内首次发现记入足迹。
- **迎宾**：地标旁民族 / 传统服饰 NPC；发现时弹出「足迹」印章卡（约 3 s）+ 音效。
- **野生动物**：按国家投放。掠食者从侧后跟上，换道躲开会轻声一句；撞上只减速 + 相机轻晃 + 2.4 s 无敌帧，文案是「它只是想打个招呼」，不结束骑行。温顺动物偶发停在路前等你刹稳，穿过后一句「路上见」；冲过去只吓跑、不惩罚。
- **路边风环**：路左/右三连光环，换道穿过去。连过三个有更长一句。错过不惩罚。
- **三时段**：光照 / 雾 / 星空 / 云逐帧插值；夜晚车灯与灯塔扫射。俄罗斯额外有雪粒子与偏冷雾色。
- **拍照**：快门音 + 白闪。Android App 写入系统相册（「漫游骑行」相簿）；手机浏览器走系统分享或长按预览图保存。靠近气球 / 动物 / 景点时会提示按 F，目标仍在范围内则留下课题成功文案。失败会诚实提示，不假装已保存。
- **足迹簿**：本次骑行最近 6 站（仅内存，换国家 / 刷新会清空）。
- **旅途音乐**：右下迷你条 + 展开面板（推荐 / 搜索 / 队列）。按国家关键词拉曲库；音量与静音写入 localStorage。发现 / 快门 / 碰撞时会短暂压低音乐。

## 分层反馈

不再用单条 toast 互顶。三条车道独立：

| 车道 | 用途 | 时长 |
|------|------|------|
| 发现 | 足迹印章卡（国家 + 景点 + 迎宾句） | 3.0 s |
| 警告 | 野生动物碰撞 | 2.4 s |
| 系统 | 躲开、风环、过马路、拍照课题、音乐、全屏等 | 2.2 s |

容器带 `aria-live="polite"`。

## 架构

引擎（Three.js / 游戏循环）与 React（HUD / 地球 / 开始页 / 音乐）严格分离：
`RideEngine` 持有 3D 场景并自驱 `requestAnimationFrame`，只通过限频（10Hz）的
`onStats` / `onDiscover` / `onWarn` / `onSystem` 把状态推给 React。

```
src/
  main.tsx
  App.tsx                 # 三相：globe / character / ride；三车道反馈 + 足迹簿
  style.css
  components/
    GlobeSelect.tsx       # 程序地球 + 热点拾取
    StartScreen.tsx       # 国家确认 + 选骑手
    GameCanvas.tsx        # 创建/销毁 RideEngine（StrictMode 安全）
    Hud.tsx               # 仪表 + 工具 + 景点卡 + 帮助；触屏折叠
    Minimap.tsx
    TouchControls.tsx     # 左转向 / 右油门刹车
    MusicDock.tsx         # 迷你条 + 面板
    MusicMiniBar.tsx
    MusicPanel.tsx
  engine/
    types.ts              # TimeOfDay / CamMode / LandmarkKind / Stats
    constants.ts          # CRUISE / SPRINT / BRAKE_MIN / REST_EPS / VEHICLE_PROFILES
    scenes.ts             # 17 国 ScenePack + GLOBE_HOTSPOTS + CHARACTERS
    World.ts              # CatmullRom 闭环 + 走廊地形 + 弧长采样
    Props.ts              # 实例池装饰 + 地标简模 + 迎宾
    Bike.ts               # 圆角方块座驾：自行车(+IK 骑手) / 摩托 / 房车 / 跑车
    Sky.ts                # 天空/远山/三时段插值/星空；俄罗斯雪
    Wildlife.ts           # 各国动物表驱动
    Birds.ts / CoastBoats.ts / Balloons.ts / Greeter.ts / ethnic.ts
    RideEngine.ts         # 场景/相机/输入/主循环/截图/对外 API
  music/
    weapi.ts              # 网易云 weapi 加密 + 开发代理 / 原生 CapacitorHttp
    MusicController.ts    # 队列、音量、duck、软自动播放
    recommendMap.ts       # 各国电台关键词
    providers/neteaseProxy.ts
    providers/mockProvider.ts
  utils/
    rideAudio.ts          # WebAudio 环境底噪 + 发现/快门/警告
    photoSave.ts          # 分享或下载 + 快门闪
    wakeLock.ts / fullscreen.ts / touchUi.ts / hudRail.ts
docs/MUSIC_API.md
public/assets/            # 天空全景 / 远山 / 封面
tools/make_mountains_alpha.py
```

## 技术要点

- **无限骑行**：地形走廊按弧长滚动；装饰实例池按段索引确定性生成。
- **可停稳**：刹车到 0；`speed < REST_EPS` 时不再被巡航拉走。
- **圆角方块**：模型用 `RoundedBoxGeometry` / 低模盒体拼装。
- **两骨节 IK**：腿部绕 X 轴踩踏；躯干前倾与肩臂对齐。
- **三时段插值**：`Sky.update` 每帧 lerp 光照/雾/星空，不是瞬时硬切。
- **StrictMode 安全**：`GameCanvas` cleanup 调用 `engine.dispose()`，释放 rAF / 事件 / WebGL。
- **触屏**：`touch-ui` 类名驱动 HUD 轨道高度（`--hud-dash-h` / `--hud-music-h`），避免控件互相遮挡。
- **音乐**：浏览器走同源 `/weapi`；APK 用 CapacitorHttp 拉流再转 blob，绕开 WebView Referer/CORS。失败降级 mock。

## 已知缺口（文档对齐现状，不表示已排期）

- 足迹 / `seen` 只活在本次会话，没有护照或 localStorage 进度。
- `GLOBE_HOTSPOTS` 17 国全 `open: true`，「开发中」锁定回调目前走不到。
- 无障碍仍弱：触控层 `aria-hidden="true"`；缺 `:focus-visible` / `prefers-reduced-motion`。
- 环境音是极轻的程序振荡，不是采样风声/鸟鸣；音乐依赖外网曲库可用性。
