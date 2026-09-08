from pathlib import Path
import re
p = Path(r"C:\Users\musou\Desktop\object\bike-scenery\src\engine\World.ts")
t = p.read_text(encoding="utf-8")

# 1) fields: remove dashMarks/dashDummy
old_f = """  private dashMarks!: THREE.InstancedMesh;
  private dashDummy = new THREE.Object3D();
  private edges: { mesh: THREE.Mesh; pos: Float32Array; side: number }[] = [];"""
new_f = """  private edges: { mesh: THREE.Mesh; pos: Float32Array; side: number }[] = [];"""
assert old_f in t, "fields"
t = t.replace(old_f, new_f, 1)

# 2) remove instanced dash build block
old_b = """    // 中心白虚线：实例化色块（沿切线摆放），避免条带网格被盖住
    const dashGeo = new THREE.BoxGeometry(0.7, 0.08, 3.4);
    const dashMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      toneMapped: false,
      depthTest: false,
      depthWrite: false,
    });
    this.dashMarks = new THREE.InstancedMesh(dashGeo, dashMat, segs);
    this.dashMarks.frustumCulled = false;
    this.dashMarks.renderOrder = 5;
    this.dashMarks.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.scene.add(this.dashMarks);
    // 初始全部隐藏
    this.dashDummy.scale.set(0, 0, 0);
    this.dashDummy.updateMatrix();
    for (let i = 0; i < segs; i++) this.dashMarks.setMatrixAt(i, this.dashDummy.matrix);
    this.dashMarks.instanceMatrix.needsUpdate = true;

"""
assert old_b in t, "build block"
t = t.replace(old_b, "", 1)

# 3) simplify update loop - remove dash instance logic
old_u = """      const tn = this.tangents[idx];
      // 略抬高路面，减少与地形 z-fight
      const y = p.y + 0.11;
      // 路面 UV：横向铺满，纵向按弧长重复沥青颗粒
      const roadV = k * this.segLen * 0.35;
      // 白虚线色块：约 4m 实 / 4m 空
      const dashOn = (Math.floor((Math.abs(k) * this.segLen) / 4) % 2) === 0;

      rp[ri++] = p.x - rt.x * ROAD_HALF; rp[ri++] = y; rp[ri++] = p.z - rt.z * ROAD_HALF;
      rp[ri++] = p.x + rt.x * ROAD_HALF; rp[ri++] = y; rp[ri++] = p.z + rt.z * ROAD_HALF;
      ru[ui++] = 0; ru[ui++] = roadV;
      ru[ui++] = 1; ru[ui++] = roadV;

      if (dashOn) {
        this.dashDummy.position.set(p.x, y + 0.06, p.z);
        this.dashDummy.scale.set(1, 1, 1);
        this.dashDummy.lookAt(p.x + tn.x, y + 0.06, p.z + tn.z);
        this.dashDummy.updateMatrix();
        this.dashMarks.setMatrixAt(r, this.dashDummy.matrix);
      } else {
        this.dashDummy.position.set(0, -100, 0);
        this.dashDummy.scale.set(0, 0, 0);
        this.dashDummy.updateMatrix();
        this.dashMarks.setMatrixAt(r, this.dashDummy.matrix);
      }

"""
new_u = """      // 略抬高路面，减少与地形 z-fight
      const y = p.y + 0.11;
      // U：横向；V：沿路重复（贴图内已含中线白虚线）
      const roadV = (k * this.segLen) / 8; // 约每 8m 一个虚线周期（贴图高一半白一半空）

      rp[ri++] = p.x - rt.x * ROAD_HALF; rp[ri++] = y; rp[ri++] = p.z - rt.z * ROAD_HALF;
      rp[ri++] = p.x + rt.x * ROAD_HALF; rp[ri++] = y; rp[ri++] = p.z + rt.z * ROAD_HALF;
      ru[ui++] = 0; ru[ui++] = roadV;
      ru[ui++] = 1; ru[ui++] = roadV;

"""
assert old_u in t, "update block"
t = t.replace(old_u, new_u, 1)

old_dm = """    this.dashMarks.instanceMatrix.needsUpdate = true;
    this.dashMarks.computeBoundingSphere();

"""
assert old_dm in t, "dashmarks update"
t = t.replace(old_dm, "", 1)

# 4) replace makeAsphaltTexture to paint center dashed line
old_tex = """/** 沥青噪点贴图：深灰底 + 轻微明暗颗粒 */
function makeAsphaltTexture(): THREE.CanvasTexture {
  const size = 128;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d')!;
  const img = ctx.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      // 确定性噪点，避免每帧闪烁
      const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
      const f = n - Math.floor(n);
      const n2 = Math.sin((x + 17) * 39.233 + (y + 9) * 11.135) * 24634.121;
      const f2 = n2 - Math.floor(n2);
      const base = 8 + f * 10 + f2 * 5; // ~8–23 更深
      img.data[i] = base;
      img.data[i + 1] = base + 1;
      img.data[i + 2] = base + 3;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}"""

# try flexible match if comment/base differ
if old_tex not in t:
    m = re.search(r"/\*\* 沥青噪点贴图[\s\S]*?function makeAsphaltTexture\(\): THREE\.CanvasTexture \{[\s\S]*?\n\}", t)
    assert m, "asphalt tex fn not found"
    old_tex = m.group(0)

new_tex = """/** 沥青贴图：深灰颗粒 + 中央白色虚线（画在贴图上，非独立色块） */
function makeAsphaltTexture(): THREE.CanvasTexture {
  const w = 256;
  const h = 256;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  const img = ctx.createImageData(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
      const f = n - Math.floor(n);
      const n2 = Math.sin((x + 17) * 39.233 + (y + 9) * 11.135) * 24634.121;
      const f2 = n2 - Math.floor(n2);
      let r = 8 + f * 10 + f2 * 5;
      let g = r + 1;
      let b = r + 3;
      // 中央标线带：约路面宽度的 ~4%（U 中心）
      const u = x / (w - 1);
      const onDash = y < h * 0.55; // V 向：前半实线、后半留空 → 重复即虚线
      if (Math.abs(u - 0.5) < 0.018 && onDash) {
        r = 245; g = 248; b = 252;
      } else if (Math.abs(u - 0.5) < 0.022 && onDash) {
        // 轻微软边
        r = Math.min(255, r + 120);
        g = Math.min(255, g + 120);
        b = Math.min(255, b + 120);
      }
      // 两侧细边线
      if (u < 0.035 || u > 0.965) {
        r = 220; g = 224; b = 230;
      }
      img.data[i] = r;
      img.data[i + 1] = g;
      img.data[i + 2] = b;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  return tex;
}"""

t = t.replace(old_tex, new_tex, 1)

# road material: slightly brighter multiply so white dashes in map stay bright
t = t.replace("color: 0x3d4045,", "color: 0x9aa0a6,", 1)

p.write_text(t, encoding="utf-8")
print("ok baked dashes into asphalt")
