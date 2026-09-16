# gen3d.py — 调用腾讯混元 3D（buddy-cloud.py）按国家批量生成 LowPoly 店铺 3D 模型
# 用法：python3 gen3d.py <token>
# 流程：先 --no-poll 提交全部任务（秒级），再用 status 命令并发轮询直到 DONE，最后下载 GLB 到
#       public/assets/models/（游戏资源目录），并生成 viewer.html 预览。
#
# 注意：混元 3D 单任务通常 1~15 分钟，本脚本并发轮询，耐心等待即可。
import subprocess, sys, os, json, urllib.request, time, threading

TOKEN = sys.argv[1]
SCRIPT = r"C:/Users/minji/.workbuddy/plugins/cache/workbuddy-builtin/skill-buddy-multimodal-generation/0.1.0/scripts/buddy-cloud.py"
PY = r"C:/Users/minji/.workbuddy/binaries/python/versions/3.13.12/python3"
OUT = r"C:/Users/minji/Desktop/object/bike-scenery/public/assets/models"
os.makedirs(OUT, exist_ok=True)

# (id, 中文名, 文生3D提示词, 已知 job_id 或 None)
# fr 的 job 已在前面提交并完成，直接复用；其余现场提交。
SHOPS = [
    ("fr", "法国咖啡馆",
     "低多边形风格法国巴黎咖啡馆建筑，米色石材外墙，红白条纹遮阳棚，圆桌与咖啡杯，铁艺阳台，可爱卡通游戏风格，简洁干净，无文字",
     "1490897753017892864"),
    ("jp", "日本拉面店",
     "低多边形风格日本拉面店，木质结构店铺，红色暖帘，红灯笼，日式瓦片屋顶，可爱卡通游戏风格，简洁干净，无文字",
     None),
    ("mx", "墨西哥集市",
     "低多边形风格墨西哥市场摊位，色彩鲜艳，彩纸横幅，宽边草帽，陶罐，仙人掌，可爱卡通游戏风格，简洁干净，无文字",
     None),
    ("cn", "中国茶馆",
     "低多边形风格中国茶馆，木质结构，翘檐屋顶，红色立柱，红灯笼，可爱卡通游戏风格，简洁干净，无文字",
     None),
]

# 完整中文名表（与 SHOPS 解耦，保证补生成后 viewer 仍显示全部名称）
NAME_MAP = {s[0]: s[1] for s in SHOPS}

# 支持 SHOP_FILTER=mx,cn 只处理部分（用于补生成失败的项）
_filt = os.environ.get("SHOP_FILTER")
if _filt:
    _ids = set(_filt.split(","))
    SHOPS = [s for s in SHOPS if s[0] in _ids]


def log(*a):
    print(*a, flush=True)


def call(cmd):
    p = subprocess.run([PY, SCRIPT] + cmd, input=TOKEN,
                       capture_output=True, text=True, encoding="utf-8")
    if p.returncode != 0:
        log("ERR", p.stderr[-800:])
        return None
    out = p.stdout.strip()
    try:
        return json.loads(out)
    except Exception:
        i = out.rfind("{")
        return json.loads(out[i:])


def download(url, path):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=300) as r, open(path, "wb") as f:
        f.write(r.read())
    log("  ✓ 已下载", os.path.basename(path), os.path.getsize(path), "bytes")


def submit(shop):
    sid, name, prompt, job_id = shop
    if job_id:
        log(f"  · {sid} 复用已有 job {job_id}")
        return job_id
    data = call(["3d", prompt, "--generate-type", "LowPoly", "--model", "3.0",
                 "--face-count", "40000", "--token-stdin", "--no-poll"])
    if not data:
        log(f"  ✗ {sid} 提交失败")
        return None
    jid = data.get("job_id")
    log(f"  · 已提交 {sid} -> {jid}")
    return jid


def poll_download(sid, name, job_id, models, lock):
    if not job_id:
        return
    deadline = time.time() + 1800  # 最多等 30 分钟
    while time.time() < deadline:
        data = call(["status", job_id, "--type", "3d", "--token-stdin"])
        if not data:
            time.sleep(20)
            continue
        st = data.get("status")
        if st == "DONE":
            rr = data.get("raw_result", {})
            files = rr.get("ResultFile3Ds", [])
            glb = None
            for it in files:
                t = (it.get("Type") or "").upper()
                u = it.get("Url")
                if t == "GLB" and u:
                    download(u, os.path.join(OUT, f"{sid}_shop.glb"))
                    glb = f"{sid}_shop.glb"
                pv = it.get("PreviewImageUrl")
                if pv:
                    download(pv, os.path.join(OUT, f"{sid}_shop_preview.png"))
            if glb:
                with lock:
                    models.append({"id": sid, "name": name, "src": glb})
            return
        if st == "FAIL":
            log(f"  ✗ {sid} 生成失败: {rr.get('ErrorMessage') if (rr := data.get('raw_result', {})) else ''}")
            return
        time.sleep(20)
    log(f"  ✗ {sid} 轮询超时")


log("=== 提交阶段 ===")
jobs = {s[0]: submit(s) for s in SHOPS}

log("\n=== 并发轮询 + 下载阶段 ===")
models = []
lock = threading.Lock()
threads = []
for s in SHOPS:
    t = threading.Thread(target=poll_download,
                         args=(s[0], s[1], jobs.get(s[0]), models, lock))
    t.start()
    threads.append(t)
for t in threads:
    t.join()

# 生成预览 viewer.html（深色 UI，下拉切换模型）
# 直接扫描目录里所有 *_shop.glb，保证多次补生成后 viewer 始终包含全部模型
_name_map = NAME_MAP
glbs = sorted(f for f in os.listdir(OUT) if f.endswith("_shop.glb"))
all_models = []
for g in glbs:
    sid = g.split("_")[0]
    all_models.append({"src": g, "name": _name_map.get(sid, sid)})
opts = "\n".join(f'  {{src:"{m["src"]}", name:"{m["name"]}"}},' for m in all_models)
html = f'''<!doctype html><html lang="zh"><head><meta charset="utf-8"><title>3D Model Viewer</title>
<script type="module" src="https://unpkg.com/@google/model-viewer/dist/model-viewer.min.js"></script>
<style>body{{margin:0;font-family:system-ui,"PingFang SC","Microsoft YaHei",sans-serif;background:#0f1424;color:#e6ecff}}
header{{padding:12px 16px;display:flex;gap:12px;align-items:center;flex-wrap:wrap}}
select{{background:#1a2138;color:#e6ecff;border:1px solid #2a3458;border-radius:8px;padding:7px 12px;font-size:14px}}
model-viewer{{width:100vw;height:calc(100vh - 58px);background:#f0f0f0}}</style></head>
<body><header><b>🏪 店铺 3D 模型预览</b><select id="sel"></select></header>
<model-viewer id="mv" camera-controls auto-rotate shadow-intensity="1"></model-viewer>
<script>
const models=[{opts}];
const sel=document.getElementById('sel');
models.forEach(m=>{{const o=document.createElement('option');o.value=m.src;o.textContent=m.name;sel.appendChild(o);}});
const mv=document.getElementById('mv');
function load(){{mv.setAttribute('src',sel.value);}}
sel.onchange=load;load();
</script></body></html>'''
with open(os.path.join(OUT, "viewer.html"), "w", encoding="utf-8") as f:
    f.write(html)

log("\nALL DONE ->", OUT, "| 本批成功:", [m["id"] for m in models],
    "| 目录内模型:", [g.split("_")[0] for g in glbs])
