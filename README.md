# 漫游骑行 · Scenery Ride

一个以「浏览风景」为主的 3D 自行车骑行网页。没有竞速、没有终点 ——
一条约 3.2 km 的程序化环湖公路，沿途有风车、镜湖、花田、观星台、灯塔与松林。

技术栈：**React 18 + TypeScript + Three.js (r0.170) + Vite**，引擎与 UI 分离。

## 运行

```bash
cd bike-scenery
npm install
npm run dev        # 开发服务器 http://127.0.0.1:5180/
# 或
npm run build      # 产物输出到 dist/
npm run preview    # 预览构建产物
```

> 必须通过 http 访问（ES Module 不支持 file:// 直开）。
> 3D 资源走 npm 依赖（three），AI 生成素材在 `public/assets/`，离线可运行。

## 操作

| 操作 | 按键 |
|------|------|
| 加速 | `W` / `↑` |
| 减速 | `S` / `↓` / `空格` |
| 左右换道 | `A` `D` / `←` `→`（松手自动回中路） |
| 切换视角 | `C`（跟随 / 电影 / 第一人称） |
| 拍照留念 | `F`（PNG 存到下载目录） |
| 切换时段 | `1` `2` `3`（白天 / 黄昏 / 夜晚） |
| 自由环视 | 鼠标拖拽（松手回正） |
| 隐藏帮助 | `H` |

## 玩法

- 默认自动巡航（约 23 km/h），按 `W` 冲刺到 60 km/h，`S` 刹到慢行
- 沿途 6 个景点，接近时自动弹出介绍卡片，全部发现会累计在 HUD
- 夜晚模式下车灯自动亮起，灯塔开始扫射光束，星空浮现
- 小地图显示完整环线、景点与当前位置

## 架构

引擎（Three.js / 游戏循环）与 React（HUD / 小地图 / 开始页）严格分离：
`RideEngine` 持有整个 3D 场景并自驱 `requestAnimationFrame`，只通过
限频（10Hz）的 `onStats` 回调把状态推给 React，避免高频重渲染。

```
src/
  main.tsx              # createRoot + StrictMode 挂载
  App.tsx               # 根组件：持有 engine 引用与 UI 状态（started/cam/time/stats/toast）
  style.css             # 全部 HUD / 开始页样式
  components/
    GameCanvas.tsx      # 创建/销毁 RideEngine，生命周期与 canvas 绑定（含 StrictMode 清理）
    Hud.tsx             # 仪表盘 + 工具按钮 + 景点卡 + 帮助面板
    Minimap.tsx         # Canvas 2D 小地图（底图一次绘制 + 玩家标记按需重绘）
    StartScreen.tsx     # 封面 + 开始漫游
  engine/
    types.ts            # TimeOfDay / CamMode / Poi / Stats 等类型
    constants.ts        # POI 定义、巡航/冲刺/刹车速度、横向限值
    World.ts            # CatmullRom 闭环赛道 + 走廊地形(顶点色) + 裙边 + 道路；弧长采样
    Props.ts            # 树/灌木/石头/野花 实例池滚动复用；风车/观星台/灯塔/湖面/花海 + 光点
    Bike.ts             # 圆角方块自行车 + 骑手（两骨节 IK 踩踏、躯干前倾、车灯）
    Sky.ts              # AI 天空全景/远山；三时段光照/雾/星空/云平滑过渡
    RideEngine.ts       # 中央引擎：场景/相机/输入/主循环/截图/对外 API
public/assets/          # AI 生成素材（天空全景 / 远山透明剪影 / 封面插画）
tools/                  # mountains 白底转透明后处理脚本（Pillow）
```

## 技术要点

- 无限骑行：地形走廊按弧长滚动更新（`World.update`），实例池按段索引确定性生成装饰，规避槽位碰撞
- 圆角方块：所有模型用 `RoundedBoxGeometry` 拼装，避免锋利硬角
- 两骨节 IK：骑手腿部绕 X 轴旋转驱动踩踏，膝部前凸；躯干前倾 `0.70 rad` 与肩部/手臂对齐
- 三时段：所有光照/雾/天空参数逐帧向目标插值，切换如日暮西沉；夜晚自动车灯 + 灯塔扫射
- StrictMode 安全：`GameCanvas` 在 effect cleanup 中调用 `engine.dispose()`，释放 rAF / 事件 / WebGL 上下文
