#!/usr/bin/env node
/**
 * make-gallery.mjs — 把 output/ 下生成的店铺图拼成一张本地预览画廊（深色科技风）
 * 用法：node make-gallery.mjs
 */
import { readdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, 'output');

let files = [];
try {
  files = readdirSync(outDir).filter((f) => f.toLowerCase().endsWith('.png'));
} catch {
  console.error('output/ 目录不存在，请先运行 generate-shops.mjs 生成图片。');
  process.exit(1);
}

const cards = files
  .map(
    (f) =>
      `    <figure><img src="./output/${f}" alt="${f}" loading="lazy"/><figcaption>${f}</figcaption></figure>`
  )
  .join('\n');

const html = `<!doctype html>
<html lang="zh">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>各国特色店铺素材画廊</title>
<style>
  :root { color-scheme: dark; }
  body { font-family: system-ui, "PingFang SC", "Microsoft YaHei", sans-serif;
         background: radial-gradient(1200px 600px at 50% -10%, #16224a 0%, #0b0f1f 60%);
         color: #e6ecff; margin: 0; padding: 28px; }
  h1 { font-size: 22px; letter-spacing: .5px; }
  .sub { color: #8aa0d6; margin: 4px 0 22px; font-size: 14px; }
  #g { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 16px; }
  figure { margin: 0; background: #141c34; border: 1px solid #28345c; border-radius: 14px;
           overflow: hidden; box-shadow: 0 8px 24px rgba(0,0,0,.35); transition: transform .15s; }
  figure:hover { transform: translateY(-4px); border-color: #4f7bff; }
  img { width: 100%; display: block; aspect-ratio: 1 / 1; object-fit: cover; background:#0e1426; }
  figcaption { padding: 9px 11px; font-size: 13px; color: #c7d4ff; }
</style>
</head>
<body>
  <h1>🏪 各国特色店铺素材画廊</h1>
  <div class="sub">共 ${files.length} 张 · 由 Agnes Image 2.0 Flash 生成 · 风格统一卡通系列</div>
  <div id="g">
${cards}
  </div>
</body>
</html>`;

writeFileSync(join(__dirname, 'gallery.html'), html, 'utf8');
console.log(`gallery.html 已生成，包含 ${files.length} 张图 -> ${join(__dirname, 'gallery.html')}`);
