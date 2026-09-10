/**
 * Resize public/app-icon.png into Android mipmap launcher icons.
 * Capacitor web sync copies the PNG into assets/public, but the home-screen
 * icon still comes from res/mipmap — this fills those densities.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = path.join(root, 'public', 'app-icon.png');
const resDir = path.join(root, 'android', 'app', 'src', 'main', 'res');

const LAUNCHER = {
  'mipmap-mdpi': 48,
  'mipmap-hdpi': 72,
  'mipmap-xhdpi': 96,
  'mipmap-xxhdpi': 144,
  'mipmap-xxxhdpi': 192,
};

const FOREGROUND = {
  'mipmap-mdpi': 108,
  'mipmap-hdpi': 162,
  'mipmap-xhdpi': 216,
  'mipmap-xxhdpi': 324,
  'mipmap-xxxhdpi': 432,
};

if (!fs.existsSync(src)) {
  console.warn('[icons] missing public/app-icon.png');
  process.exit(0);
}
if (!fs.existsSync(resDir)) {
  console.warn('[icons] android/ res not found — skip (run cap add/sync first)');
  process.exit(0);
}

const jobs = [];
for (const [folder, size] of Object.entries(LAUNCHER)) {
  jobs.push({ dest: path.join(resDir, folder, 'ic_launcher.png'), size, pad: 1 });
  jobs.push({ dest: path.join(resDir, folder, 'ic_launcher_round.png'), size, pad: 1 });
}
for (const [folder, size] of Object.entries(FOREGROUND)) {
  jobs.push({ dest: path.join(resDir, folder, 'ic_launcher_foreground.png'), size, pad: 0.66 });
}

const psJobs = jobs.map((j) => ({
  dest: j.dest.replace(/\\/g, '/'),
  size: j.size,
  pad: j.pad,
}));

const ps = `
Add-Type -AssemblyName System.Drawing
$srcPath = ${JSON.stringify(src)}
$jobs = @'
${JSON.stringify(psJobs)}
'@ | ConvertFrom-Json
$src = [System.Drawing.Image]::FromFile($srcPath)
function Save-Resized($dest, $size, $pad) {
  $bmp = New-Object System.Drawing.Bitmap ([int]$size), ([int]$size), ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.Clear([System.Drawing.Color]::Transparent)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
  $inner = [Math]::Max(1, [int][Math]::Round($size * $pad))
  $ox = [int][Math]::Round(($size - $inner) / 2)
  $g.DrawImage($src, $ox, $ox, $inner, $inner)
  $dir = Split-Path $dest
  if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir | Out-Null }
  $bmp.Save($dest, [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose()
  $bmp.Dispose()
}
foreach ($job in $jobs) { Save-Resized $job.dest $job.size $job.pad }
$src.Dispose()
Write-Output ('wrote ' + $jobs.Count + ' launcher pngs')
`;

const result = spawnSync('powershell', ['-NoProfile', '-Command', ps], {
  encoding: 'utf8',
});
if (result.status !== 0) {
  console.error(result.stderr || result.stdout || 'icon resize failed');
  process.exit(result.status ?? 1);
}
console.log(`[icons] ${String(result.stdout).trim()}`);

const bgFile = path.join(resDir, 'values', 'ic_launcher_background.xml');
fs.writeFileSync(
  bgFile,
  `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">#8EB9CE</color>
</resources>
`,
  'utf8',
);
