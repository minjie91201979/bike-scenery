# 各国特色店铺卡通素材生成器

为自行车环游 / 风景类游戏批量产出**风格统一的卡通店铺素材**。每个国家一座具有文化辨识度的店铺（法国咖啡馆、日本拉面店、墨西哥集市……），通过 Agnes Image 2.0 Flash 文生图接口生成。

## 设计要点

| 层 | 文件 | 职责 |
|----|------|------|
| 数据层 | `countries.mjs` | 每个国家的建筑 / 文化符号 / 配色 / 光照配置（要加国家只改这里） |
| 风格层 | `style.mjs` | 统一的卡通画风底座 + 负面约束，保证整套素材辨识度一致 |
| 编排层 | `generate-shops.mjs` | 参数化批量调用 API、并发控制、落盘 |
| 预览层 | `make-gallery.mjs` | 把 `output/` 拼成一张深色风本地画廊 |

**统一画风**靠 `style.mjs` 的 `base` 提示词底座实现（粗黑描边、饱和配色、正面店铺立面、无文字水印），国家差异只通过 `building / signature / palette / light` 注入——这是系列素材「不像东拼西凑」的关键。

## 快速开始

```bash
cd tools/shop-generator

# 1. 查看支持的国家
npm run list
# 或： node generate-shops.mjs --list

# 2. 先做一次 dry-run，校验提示词（不消耗配额）
node generate-shops.mjs --all --dry-run

# 3. 生成指定国家
node generate-shops.mjs --country fr,jp,mx

# 4. 生成全部 12 国（并发 4，落盘到 output/）
npm run gen:all

# 5. 生成预览画廊
npm run gallery
# 打开 gallery.html 即可浏览
```

## 命令行参数

| 参数 | 说明 |
|------|------|
| `--list` | 列出所有可生成国家 |
| `--country a,b,c` | 只生成指定 id（逗号分隔） |
| `--all` | 生成全部国家 |
| `--dry-run` | 仅打印提示词，不调用接口 |
| `--size WxH` | 输出尺寸，默认 `1024x1024` |
| `--out <dir>` | 输出目录，默认 `./output` |
| `--agnes-script <path>` | 覆盖 agnes CLI 路径（CI / 其他机器用） |
| `--concurrency <n>` | 并发数，默认 4 |

> API Key：脚本自动读取 agnes-image skill 内置的 `config.json`，或用环境变量 `AGNES_API_KEY` 覆盖。请勿把 key 写进前端代码或提交到 git。

## 在游戏里使用

生成的图片位于 `output/<id>_<slug>.png`（如 `fr_french_cafe.png`）。在游戏中作为纹理 / 精灵图直接引用即可：

```ts
// React / Three.js 示例
import frCafe from '../tools/shop-generator/output/fr_french_cafe.png';
<Sprite src={frCafe} />
```

建议：把 `output/` 当作「美术资源输入目录」，按需裁剪 / 做透明背景 / 打包进 atlas。新增国家时只需在 `countries.mjs` 追加一条配置，无需改动任何生成逻辑。
