#!/usr/bin/env node
/**
 * generate-shops.mjs — 各国特色店铺卡通图「参数化批量生成器」
 *
 * 用途：通过 Agnes Image 2.0 Flash 接口，按国家参数批量产出风格统一的卡通店铺素材，
 *       直接服务于游戏（自行车环游 / 风景类）中的地点装饰与收集系统。
 *
 * 设计：
 *   - 国家差异来自 countries.mjs（数据层）
 *   - 画风统一来自 style.mjs（风格层）
 *   - 本文件只负责「编排 + 调用 API + 落盘」，零业务耦合，便于复用与扩展
 *
 * 用法：
 *   node generate-shops.mjs --list                        列出所有可生成的国家
 *   node generate-shops.mjs --country fr,jp,mx            只生成指定国家
 *   node generate-shops.mjs --all                         生成全部国家
 *   node generate-shops.mjs --all --dry-run               仅打印提示词，不消耗配额
 *   node generate-shops.mjs --all --size 1024x768 --out ./assets
 *
 * 依赖：仅 Node 18+ 内置模块（child_process / fs / path / os），无需 npm install。
 */

import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { COUNTRIES, getCountry, slug } from './countries.mjs';
import { buildPrompt } from './style.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

// 默认调用同机已安装的 agnes-image skill 的 CLI；可用 --agnes-script 覆盖（便于 CI / 其他机器）。
const DEFAULT_AGNES = join(
  homedir(),
  '.workbuddy',
  'skills',
  'agnes-image',
  'scripts',
  'generate.cjs'
);
const DEFAULT_OUT = join(__dirname, 'output');

function parseArgs(argv) {
  const opts = {
    countries: [],
    all: false,
    list: false,
    dryRun: false,
    size: '1024x1024',
    out: DEFAULT_OUT,
    agnes: process.env.AGNES_GENERATE_SCRIPT || DEFAULT_AGNES,
    concurrency: 4,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    switch (a) {
      case '--list':
        opts.list = true;
        break;
      case '--all':
        opts.all = true;
        break;
      case '--dry-run':
        opts.dryRun = true;
        break;
      case '--country':
        opts.countries = argv[++i].split(',').map((s) => s.trim());
        break;
      case '--size':
        opts.size = argv[++i];
        break;
      case '--out':
      case '--output':
        opts.out = resolve(argv[++i]);
        break;
      case '--agnes-script':
        opts.agnes = resolve(argv[++i]);
        break;
      case '--concurrency':
        opts.concurrency = parseInt(argv[++i], 10) || 4;
        break;
      default:
        console.error(`未知参数: ${a}`);
        process.exit(1);
    }
  }
  return opts;
}

/** 调用 agnes generate.cjs 生成单张图 */
function runOne(country, opts) {
  const { prompt, negative } = buildPrompt(country);
  const outFile = join(opts.out, `${country.id}_${slug(country.en)}.png`);
  const args = [
    opts.agnes,
    '--prompt',
    `${prompt}. ${negative}`,
    '--size',
    opts.size,
    '--output',
    outFile,
  ];
  if (opts.dryRun) args.push('--dry-run');

  return new Promise((resolveP, reject) => {
    // 复用当前 node 进程路径，保证跨环境一致
    const child = spawn(process.execPath, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => (stdout += d));
    child.stderr.on('data', (d) => (stderr += d));
    child.on('close', (code) => {
      if (code !== 0) {
        reject(
          new Error(`[${country.id}] 失败 (exit ${code}): ${stderr.slice(0, 400)}`)
        );
        return;
      }
      try {
        const json = JSON.parse(stdout);
        resolveP({ id: country.id, name: country.name, output: outFile, ...json });
      } catch {
        resolveP({ id: country.id, name: country.name, output: outFile, raw: stdout });
      }
    });
  });
}

/** 带并发限制的批量生成 */
async function runBatch(targets, opts) {
  mkdirSync(opts.out, { recursive: true });
  const results = [];
  const errors = [];
  let cursor = 0;

  async function worker() {
    while (cursor < targets.length) {
      const idx = cursor++;
      const c = targets[idx];
      process.stderr.write(`▶ [${idx + 1}/${targets.length}] ${c.name} ...\n`);
      try {
        const r = await runOne(c, opts);
        results.push(r);
        process.stderr.write(`  ✓ ${c.name} -> ${r.output}\n`);
      } catch (e) {
        errors.push(e);
        process.stderr.write(`  ✗ ${e.message}\n`);
      }
    }
  }

  const n = Math.max(1, Math.min(opts.concurrency, targets.length));
  await Promise.all(Array.from({ length: n }, worker));
  return { results, errors };
}

async function main() {
  const opts = parseArgs(process.argv);

  if (opts.list) {
    console.log('可用国家 / 店铺配置（共 ' + COUNTRIES.length + ' 个）：');
    for (const c of COUNTRIES) {
      console.log(`  ${c.id.padEnd(4)} ${c.name}  (${c.en})`);
    }
    return;
  }

  const targets = opts.all
    ? COUNTRIES
    : opts.countries.map((id) => getCountry(id)).filter(Boolean);

  if (targets.length === 0) {
    console.error(
      '未选择任何国家。使用 --all 或 --country fr,jp,mx ...，或 --list 查看列表。'
    );
    process.exit(1);
  }

  const { results, errors } = await runBatch(targets, opts);
  console.log(
    JSON.stringify(
      { generated: results.length, failed: errors.length, results },
      null,
      2
    )
  );
  if (errors.length) process.exitCode = 2;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
