#!/usr/bin/env python3
"""
gen_all_shops.py — 纯本地生成 12 国 faceted low-poly 店铺 GLB 模型
不依赖任何外部 API 或 Blender，直接写入 public/assets/models/
用法: python3 gen_all_shops.py [id1,id2,...]  不加参数生成全部
"""
import struct
import json
import os
import sys
import math

# ===== GLB 二进制写入工具 =====

def pack(fmt, *args):
    return struct.pack(fmt, *args)

def write_glb(path, scene, bin_data):
    json_bytes = json.dumps(scene, separators=(',', ':')).encode('utf-8')
    json_padding = (4 - len(json_bytes) % 4) % 4
    json_bytes += b' ' * json_padding
    json_len = len(json_bytes)
    bin_len = len(bin_data)
    total_len = 12 + 8 + json_len + 8 + bin_len
    with open(path, 'wb') as f:
        f.write(b'glTF')
        f.write(pack('<I', 2))
        f.write(pack('<I', total_len))
        f.write(pack('<I', json_len))
        f.write(pack('<I', 0x46546C67))
        f.write(json_bytes)
        f.write(pack('<I', bin_len))
        f.write(pack('<I', 0x004E4942))
        f.write(bin_data)

def build_primitive(primitive):
    positions = primitive['positions']
    raw_normals = primitive.get('normals', [])
    indices = primitive.get('indices', [])
    flat_normals = []
    for n in raw_normals:
        if isinstance(n, (list, tuple)):
            flat_normals.extend(float(x) for x in n)
        else:
            flat_normals.append(float(n))
    pos_bytes = struct.pack(f'<{len(positions)}f', *positions)
    norm_bytes = struct.pack(f'<{len(flat_normals)}f', *flat_normals) if flat_normals else b''
    idx_bytes = struct.pack(f'<{len(indices)}H', *indices) if indices else b''
    bin_data = pos_bytes + norm_bytes + idx_bytes
    byte_offset = 0
    buffer_views = []
    buffer_views.append({'buffer': 0, 'byteOffset': byte_offset, 'byteLength': len(pos_bytes), 'target': 34963})
    byte_offset += len(pos_bytes)
    if flat_normals:
        buffer_views.append({'buffer': 0, 'byteOffset': byte_offset, 'byteLength': len(norm_bytes), 'target': 34963})
        byte_offset += len(norm_bytes)
    if indices:
        buffer_views.append({'buffer': 0, 'byteOffset': byte_offset, 'byteLength': len(idx_bytes), 'target': 34962})
        byte_offset += len(idx_bytes)
    pos_count = len(positions) // 3
    accessors = [{
        'bufferView': 0, 'componentType': 5126, 'count': pos_count,
        'type': 'VEC3',
        'max': [float(max(positions[i::3])) for i in range(3)],
        'min': [float(min(positions[i::3])) for i in range(3)]
    }]
    if flat_normals:
        accessors.append({
            'bufferView': 1, 'componentType': 5126,
            'count': len(flat_normals) // 3, 'type': 'VEC3',
            'max': [float(max(flat_normals[i::3])) for i in range(3)],
            'min': [float(min(flat_normals[i::3])) for i in range(3)]
        })
    if indices:
        accessors.append({'bufferView': 2, 'componentType': 5123, 'count': len(indices), 'type': 'SCALAR'})
    attributes = {'POSITION': 0}
    if flat_normals:
        attributes['NORMAL'] = 1
    prim = {'attributes': attributes, 'material': 0, 'mode': 4}
    if indices:
        prim['indices'] = 2
    scene = {
        'asset': {'version': '2.0', 'generator': 'gen_all_shops.py'},
        'accessors': accessors,
        'bufferViews': buffer_views,
        'buffers': [{'byteLength': len(bin_data)}],
        'meshes': [{'primitives': [prim]}],
        'scene': 0,
        'scenes': [{'nodes': [0]}],
        'nodes': [{'mesh': 0}],
        'materials': [{
            'pbrMetallicRoughness': {
                'baseColorFactor': [
                    ((primitive['color'] >> 16) & 0xFF) / 255.0,
                    ((primitive['color'] >> 8) & 0xFF) / 255.0,
                    (primitive['color'] & 0xFF) / 255.0,
                    1.0
                ],
                'metallicFactor': 0.0,
                'roughnessFactor': 0.8
            }
        }]
    }
    return scene, bin_data

# ===== 几何构造工具 =====

def cube(cx, cy, cz, sx, sy, sz, color):
    hdx, hdy, hdz = sx/2, sy/2, sz/2
    verts = [
        cx-hdx,cy-hdy,cz+hdz, cx+hdx,cy-hdy,cz+hdz, cx+hdx,cy+hdy,cz+hdz, cx-hdx,cy+hdy,cz+hdz,
        cx+hdx,cy-hdy,cz-hdz, cx-hdx,cy-hdy,cz-hdz, cx-hdx,cy+hdy,cz-hdz, cx+hdx,cy+hdy,cz-hdz,
        cx-hdx,cy+hdy,cz+hdz, cx+hdx,cy+hdy,cz+hdz, cx+hdx,cy+hdy,cz-hdz, cx-hdx,cy+hdy,cz-hdz,
        cx-hdx,cy-hdy,cz-hdz, cx+hdx,cy-hdy,cz-hdz, cx+hdx,cy-hdy,cz+hdz, cx-hdx,cy-hdy,cz+hdz,
        cx+hdx,cy-hdy,cz+hdz, cx+hdx,cy-hdy,cz-hdz, cx+hdx,cy+hdy,cz-hdz, cx+hdx,cy+hdy,cz+hdz,
        cx-hdx,cy-hdy,cz-hdz, cx-hdx,cy-hdy,cz+hdz, cx-hdx,cy+hdy,cz+hdz, cx-hdx,cy+hdy,cz-hdz,
    ]
    face_normals = [
        (0,0,1),(0,0,1),(0,0,1),(0,0,1),
        (0,0,-1),(0,0,-1),(0,0,-1),(0,0,-1),
        (0,1,0),(0,1,0),(0,1,0),(0,1,0),
        (0,-1,0),(0,-1,0),(0,-1,0),(0,-1,0),
        (1,0,0),(1,0,0),(1,0,0),(1,0,0),
        (-1,0,0),(-1,0,0),(-1,0,0),(-1,0,0),
    ]
    indices = []
    for i in range(0, 24, 4):
        a,b,c,d = i,i+1,i+2,i+3
        indices.extend([a,b,d, b,c,d])
    return {'positions': verts, 'normals': face_normals, 'indices': indices, 'color': color}

def cone(base_r, height, sides, color, offset=(0,0,0)):
    ox,oy,oz = offset
    verts = [ox, oy+height/2, oz]
    normals = [(0,1,0)]
    for i in range(sides):
        a = 2*math.pi*i/sides
        x = ox + base_r*math.cos(a)
        z = oz + base_r*math.sin(a)
        verts.extend([x, oy-height/2, z])
        dx=x-ox; dz=z-oz; l=math.sqrt(dx*dx+dz*dz)
        if l > 0: nx,ny,nz = dx/l*0.5, 0.7, dz/l*0.5
        else: nx,ny,nz = 0,1,0
        normals.extend([nx,ny,nz])
    verts.extend([ox, oy-height/2, oz])
    normals.extend([0,-1,0])
    indices = []
    for i in range(1, sides+1):
        indices.extend([0, i, 1+(i%sides)])
    bs = sides+1
    for i in range(sides):
        indices.extend([bs, bs+i, bs+((i+1)%sides)])
    return {'positions': verts, 'normals': normals, 'indices': indices, 'color': color}

def cylinder(r, h, sides, color, offset=(0,0,0)):
    ox,oy,oz = offset
    verts, normals = [], []
    for i in range(sides):
        a = 2*math.pi*i/sides
        x,z = ox+r*math.cos(a), oz+r*math.sin(a)
        verts.extend([x, oy+h/2, z]); normals.extend([math.cos(a),0,math.sin(a)])
        verts.extend([x, oy-h/2, z]); normals.extend([math.cos(a),0,math.sin(a)])
    tc = len(verts)//3
    verts.extend([ox,oy+h/2,oz]); normals.extend([0,1,0])
    bc = len(verts)//3
    verts.extend([ox,oy-h/2,oz]); normals.extend([0,-1,0])
    indices = []
    for i in range(sides):
        ni = (i+1)%sides
        indices.extend([i,ni,i+sides, ni,ni+1,i+sides+1])
        indices.extend([tc,i,ni])
        indices.extend([bc,ni,i])
    return {'positions': verts, 'normals': normals, 'indices': indices, 'color': color}

def plane(w, h, color, offset=(0,0,0)):
    ox,oy,oz = offset
    hw,hh = w/2, h/2
    verts = [ox-hw,oy-hh,oz, ox+hw,oy-hh,oz, ox+hw,oy+hh,oz, ox-hw,oy+hh,oz]
    normals = [(0,0,1)]*4
    return {'positions': verts, 'normals': normals, 'indices': [0,1,2,0,2,3], 'color': color}

def merge_parts(parts):
    all_pos, all_norm, all_idx, offset = [], [], [], 0
    for p in parts:
        all_pos.extend(p['positions'])
        all_norm.extend(p['normals'])
        if p.get('indices'):
            all_idx.extend([i+offset for i in p['indices']])
        offset += len(p['positions'])//3
    return {'positions': all_pos, 'normals': all_norm, 'indices': all_idx or None, 'color': 0xffffff}

# ===== 12 国店铺生成器 =====

def gen_fr():
    parts = []
    parts.append(cube(0, 1.5, 0, 2.4, 3, 1.2, 0xf2eee4))
    for i, c in enumerate([0xc43c3c, 0xf2f0ea]):
        parts.append(cube(-1.2+i*1.2, 3.2, 0.6, 1.0, 0.15, 1.4, c))
    parts.append(cube(0, 2.5, 0.7, 2.2, 0.05, 0.05, 0x2a2a2c))
    parts.append(cube(-1.0, 2.5, 0.7, 0.05, 0.6, 0.05, 0x2a2a2c))
    parts.append(cube(1.0, 2.5, 0.7, 0.05, 0.6, 0.05, 0x2a2a2c))
    parts.append(cube(-0.5, 2.0, 0.65, 0.5, 0.6, 0.05, 0x3a3a4c))
    parts.append(cube(0.5, 2.0, 0.65, 0.5, 0.6, 0.05, 0x3a3a4c))
    parts.append(cube(0, 0.9, 0.65, 0.7, 1.6, 0.05, 0x5a3a2a))
    parts.append(cube(0, 0, 0, 3.0, 0.1, 2.0, 0x8a7a6a))
    return merge_parts(parts)

def gen_jp():
    parts = []
    parts.append(cube(0, 1.2, 0, 2.0, 2.4, 1.0, 0xf7f1e1))
    rh = 1.0
    parts.append(cone(1.3, rh, 4, 0x2a2a2c, offset=(0, 2.4+rh/2, 0)))
    for i in range(3):
        parts.append(cube(-0.4+i*0.4, 1.5, 0.55, 0.3, 1.2, 0.05, 0xc43c3c))
    parts.append(cylinder(0.15, 0.3, 8, 0xff6b35, offset=(-1.3, 2.0, 0.3)))
    parts.append(cylinder(0.15, 0.3, 8, 0xff6b35, offset=(1.3, 2.0, 0.3)))
    parts.append(cube(0, 0.8, 0.55, 0.6, 1.4, 0.05, 0x3a2a1a))
    parts.append(cube(0, 0, 0, 2.6, 0.1, 1.6, 0x6a6a5a))
    return merge_parts(parts)

def gen_mx():
    parts = []
    parts.append(cube(0, 1.0, 0, 2.4, 2.0, 1.0, 0xe8c44a))
    parts.append(cone(1.4, 0.8, 4, 0xd45a8c, offset=(0, 2.0, 0)))
    colors = [0xc43c3c, 0x2f6b4f, 0xffd166, 0x3a6ec9]
    for i, c in enumerate(colors):
        a = (i-1.5)*0.4
        x = 0.8*math.sin(a)
        parts.append(plane(0.3, 0.5, c, offset=(x, 2.4, 0.5)))
    parts.append(cylinder(0.2, 0.4, 8, 0xc45a3a, offset=(-0.8, 0.2, 0.6)))
    parts.append(cylinder(0.2, 0.4, 8, 0xc45a3a, offset=(0.8, 0.2, 0.6)))
    for x,z in [(-1.1,-0.4),(1.1,-0.4),(-1.1,0.4),(1.1,0.4)]:
        parts.append(cylinder(0.08, 2.0, 6, 0x6a4a32, offset=(x, 1.0, z)))
    parts.append(cube(0, 0, 0, 3.0, 0.1, 1.6, 0x8a7a5a))
    return merge_parts(parts)

def gen_cn():
    parts = []
    parts.append(cube(0, 1.2, 0, 2.2, 2.4, 1.0, 0xf7f1e1))
    parts.append(cone(1.4, 0.6, 4, 0xc43c3c, offset=(0, 2.4, 0)))
    parts.append(cone(1.1, 0.5, 4, 0xd4a017, offset=(0, 2.9, 0)))
    for x,y,z in [(-1.0,1.2,-0.45),(1.0,1.2,-0.45),(-1.0,1.2,0.45),(1.0,1.2,0.45)]:
        parts.append(cylinder(0.06, 2.4, 8, 0xc43c3c, offset=(x,y,z)))
    parts.append(cylinder(0.15, 0.35, 8, 0xff3535, offset=(-0.7, 2.0, 0.55)))
    parts.append(cylinder(0.15, 0.35, 8, 0xff3535, offset=(0.7, 2.0, 0.55)))
    parts.append(cube(0, 0.9, 0.55, 0.6, 1.4, 0.05, 0x5a3a2a))
    parts.append(cube(0, 0, 0, 2.8, 0.1, 1.6, 0x7a6a5a))
    return merge_parts(parts)

def gen_it():
    parts = []
    parts.append(cube(0, 1.2, 0, 2.2, 2.4, 1.0, 0xe8c4a0))
    for i, c in enumerate([0x2f6b4f, 0xf2f0ea, 0xc43c3c]):
        parts.append(cube(-1.1+i*1.1, 2.5, 0.55, 0.9, 0.12, 1.2, c))
    parts.append(cube(-0.5, 1.5, 0.55, 0.5, 0.6, 0.05, 0x3a6b4f))
    parts.append(cube(0.5, 1.5, 0.55, 0.5, 0.6, 0.05, 0x3a6b4f))
    parts.append(cube(0, 0.8, 0.55, 0.6, 1.4, 0.05, 0x5a3a2a))
    parts.append(cube(0, 0, 0, 2.8, 0.1, 1.6, 0xc4a070))
    return merge_parts(parts)

def gen_gb():
    parts = []
    parts.append(cube(0, 1.2, 0, 2.2, 2.6, 1.0, 0xc45a3a))
    parts.append(cube(-1.0, 1.8, 0.55, 0.3, 0.8, 0.05, 0xf2f0ea))
    parts.append(cube(1.0, 1.8, 0.55, 0.3, 0.8, 0.05, 0xf2f0ea))
    parts.append(cube(0, 0.9, 0.55, 0.6, 1.6, 0.05, 0x3a2a1a))
    parts.append(cube(-1.5, 0.5, 0.8, 0.4, 1.0, 0.05, 0xc43c3c))
    parts.append(cube(0, 0, 0, 2.8, 0.1, 1.6, 0x6a6a5a))
    return merge_parts(parts)

def gen_us():
    parts = []
    parts.append(cube(0, 1.0, 0, 2.6, 2.0, 1.0, 0xf2f0ea))
    parts.append(cube(0, 2.2, 0.55, 2.4, 0.15, 0.1, 0xc43c3c))
    parts.append(cube(0, 1.5, 0.55, 2.4, 0.8, 0.05, 0x3a6ec9))
    parts.append(cube(0, 0.7, 0.55, 0.7, 1.2, 0.05, 0x2a2a2c))
    parts.append(cube(0, 0, 0, 3.2, 0.1, 1.6, 0x8a8a8a))
    return merge_parts(parts)

def gen_nl():
    parts = []
    parts.append(cube(0, 1.2, 0, 1.8, 2.6, 1.0, 0xc45a3a))
    parts.append(cone(1.2, 0.8, 4, 0x8a4a2a, offset=(0, 2.9, 0)))
    parts.append(cube(0, 1.5, 0.55, 1.4, 0.8, 0.05, 0x3a6ec9))
    parts.append(cube(0, 0.8, 0.55, 0.5, 1.2, 0.05, 0x5a3a2a))
    parts.append(cylinder(0.25, 0.3, 8, 0xffd166, offset=(-0.6, 0.3, 0.6)))
    parts.append(cylinder(0.25, 0.3, 8, 0xffd166, offset=(0.6, 0.3, 0.6)))
    parts.append(cube(0, 0, 0, 2.4, 0.1, 1.6, 0x8a7a6a))
    return merge_parts(parts)

def gen_gr():
    parts = []
    parts.append(cube(0, 1.0, 0, 2.2, 2.0, 1.0, 0xf7f7ff))
    parts.append(cone(1.3, 0.6, 8, 0x3a6ec9, offset=(0, 2.3, 0)))
    parts.append(cube(-0.5, 1.2, 0.55, 0.5, 0.6, 0.05, 0x3a6ec9))
    parts.append(cube(0.5, 1.2, 0.55, 0.5, 0.6, 0.05, 0x3a6ec9))
    parts.append(cube(0, 0.7, 0.55, 0.6, 1.2, 0.05, 0x8a7a6a))
    parts.append(cube(0, 0, 0, 2.8, 0.1, 1.6, 0xe8d5a3))
    return merge_parts(parts)

def gen_in():
    parts = []
    parts.append(cube(0, 1.0, 0, 2.0, 2.2, 1.0, 0xe07a28))
    parts.append(cone(1.2, 0.7, 6, 0x6b2d5c, offset=(0, 2.5, 0)))
    colors = [0xffd166, 0xc45a3a, 0x2f6b4f, 0xe07a28]
    for i, c in enumerate(colors):
        parts.append(cylinder(0.08, 0.3, 6, c, offset=(-0.6+i*0.4, 1.8, 0.55)))
    parts.append(cube(0, 0.6, 0.55, 0.5, 1.0, 0.05, 0x3a2a1a))
    parts.append(cube(0, 0, 0, 2.6, 0.1, 1.6, 0xc4a070))
    return merge_parts(parts)

def gen_ma():
    parts = []
    parts.append(cube(0, 1.0, 0, 2.0, 2.4, 1.0, 0xf0ead2))
    parts.append(cone(1.2, 0.8, 4, 0x3a6ec9, offset=(0, 2.8, 0)))
    tiles = [0x3a6ec9, 0xf2f0ea, 0xc45a3a, 0xd4a017]
    for i, c in enumerate(tiles):
        parts.append(cube(-0.6+i*0.4, 1.5, 0.55, 0.25, 0.25, 0.05, c))
    parts.append(cylinder(0.12, 0.25, 8, 0xd4a017, offset=(0, 1.8, 0.55)))
    parts.append(cube(0, 0.7, 0.55, 0.5, 1.2, 0.05, 0x5a3a2a))
    parts.append(cube(0, 0, 0, 2.6, 0.1, 1.6, 0xc4a070))
    return merge_parts(parts)

def gen_th():
    parts = []
    parts.append(cube(0, 0.8, 0, 2.0, 1.8, 1.0, 0xffd166))
    parts.append(cone(1.3, 0.6, 4, 0xc43c3c, offset=(0, 2.1, 0)))
    parts.append(cone(1.0, 0.4, 4, 0x2f6b4f, offset=(0, 2.7, 0)))
    parts.append(cylinder(0.12, 0.3, 8, 0xff3535, offset=(-0.8, 1.8, 0.55)))
    parts.append(cylinder(0.12, 0.3, 8, 0xff3535, offset=(0.8, 1.8, 0.55)))
    parts.append(cube(0, 0.6, 0.55, 0.5, 1.0, 0.05, 0x5a3a2a))
    parts.append(cube(0, 0, 0, 2.6, 0.1, 1.6, 0x8a7a5a))
    return merge_parts(parts)

# Build the shop registry
SHOPS = {
    'fr': gen_fr, 'jp': gen_jp, 'mx': gen_mx, 'cn': gen_cn,
    'it': gen_it, 'gb': gen_gb, 'us': gen_us, 'nl': gen_nl,
    'gr': gen_gr, 'in': gen_in, 'ma': gen_ma, 'th': gen_th,
}
_NAMES = {
    'fr': 'France Cafe', 'jp': 'Japan Ramen', 'mx': 'Mexico Market',
    'cn': 'China Tea', 'it': 'Italy Gelato', 'gb': 'UK Pub',
    'us': 'USA Diner', 'nl': 'Netherlands Cheese', 'gr': 'Greece Taverna',
    'in': 'India Spice', 'ma': 'Morocco Shop', 'th': 'Thailand Street',
}

# ===== 主流程 =====
OUT_DIR = 'C:/Users/minji/Desktop/object/bike-scenery/public/assets/models'
os.makedirs(OUT_DIR, exist_ok=True)

_ids = sys.argv[1:] if len(sys.argv) > 1 else list(SHOPS.keys())
if len(sys.argv) > 1:
    _ids = sys.argv[1].split(',')

LOG = []
for sid in _ids:
    sid = sid.strip().lower()
    if sid not in SHOPS:
        LOG.append(f'  ✗ {sid} 未知国家')
        continue
    LOG.append(f'  · 生成 {sid} 店铺...')
    try:
        primitive = SHOPS[sid]()
        scene, bin_data = build_primitive(primitive)
        path = os.path.join(OUT_DIR, f'{sid}_shop.glb')
        write_glb(path, scene, bin_data)
        size = os.path.getsize(path)
        LOG.append(f'  ✓ {sid}_shop.glb ({size:,} bytes)')
    except Exception as e:
        LOG.append(f'  ✗ {sid} 失败: {e}')
        import traceback
        LOG.append(traceback.format_exc())

print('\n'.join(LOG))
print(f'\n全部完成! 模型保存在: {OUT_DIR}')

# Rebuild viewer.html
glbs = sorted(f for f in os.listdir(OUT_DIR) if f.endswith('_shop.glb'))
opts_lines = []
for g in glbs:
    sid = g.split('_')[0]
    name = _NAMES.get(sid, sid)
    opts_lines.append(f'  {{src:"{g}", name:"{name}"}},')
opts = '\n'.join(opts_lines)
html = '''<!doctype html><html lang="zh"><head><meta charset="utf-8"><title>3D Shop Models</title>
<script type="module" src="https://unpkg.com/@google/model-viewer/dist/model-viewer.min.js"></script>
<style>
body{margin:0;font-family:system-ui,sans-serif;background:#0f1424;color:#e6ecff}
header{padding:12px 16px;display:flex;gap:12px;align-items:center;flex-wrap:wrap;border-bottom:1px solid #2a3458}
select{background:#1a2138;color:#e6ecff;border:1px solid #2a3458;border-radius:8px;padding:7px 12px;font-size:14px}
model-viewer{width:100vw;height:calc(100vh - 60px);background:#f0f0f0}
.info{padding:8px 16px;font-size:12px;color:#8a9ab0}
</style></head>
<body>
<header><b>🏪 各国店铺 3D 模型</b><select id="sel"></select></header>
<div class="info" id="info"></div>
<moxi id="mv" camera-controls auto-rotate shadow-intensity="1"></model-viewer>
<script>
const models=[{opts}];
const sel=document.getElementById('sel');
models.forEach(m=>{{const o=document.createElement('option');o.value=m.src;o.textContent=m.name;sel.appendChild(o);}});
const mv=document.getElementById('mv');
function load(){{mv.setAttribute('src','./'+sel.value);document.getElementById('info').textContent='📐 '+sel.value;}}
sel.onchange=load;load();
</script></body></html>'''
with open(os.path.join(OUT_DIR, 'viewer.html'), 'w', encoding='utf-8') as f:
    f.write(html)
print(f'viewer.html 已重建，共 {len(glbs)} 个模型')
