import * as THREE from 'three';
import type { Poi, PoiDef, Pose } from './types';
import type { CurveParams, PaletteHints, ScenePack } from './scenes';

/* ============================================================
 *  噪声：轻量 value noise + fbm（无外部依赖）
 * ============================================================ */
function hash2(x: number, y: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
  return n - Math.floor(n);
}

function vnoise(x: number, y: number): number {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const a = hash2(xi, yi), b = hash2(xi + 1, yi);
  const c = hash2(xi, yi + 1), d = hash2(xi + 1, yi + 1);
  return a * (1 - u) * (1 - v) + b * u * (1 - v) + c * (1 - u) * v + d * u * v;
}

export function fbm(x: number, y: number, octaves = 4): number {
  let sum = 0, amp = 1, freq = 1, norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += vnoise(x * freq, y * freq) * amp;
    norm += amp;
    amp *= 0.5;
    freq *= 2.03;
  }
  return sum / norm;
}

/** 确定性伪随机：同一 seed 永远得到同一值 */
export function rand(seed: number): number {
  const n = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return n - Math.floor(n);
}

export const smoothstep = (a: number, b: number, x: number): number => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/* ============================================================
 *  地形走廊尺寸
 * ============================================================ */
export const SEG_LEN = 2.2;
export const SEGS_AHEAD = 128;
export const SEGS_BEHIND = 10;
export const ROWS = SEGS_AHEAD + SEGS_BEHIND + 1;
export const ROAD_HALF = 3.6;
const DASH_LEN = 4;
const DASH_GAP = 4;
const DASH_PERIOD = DASH_LEN + DASH_GAP;

/** 横向偏移：靠近路面密集、远处稀疏 */
export const LAT: number[] = [
  -150, -133, -117, -102, -88, -75, -63, -53, -44, -36, -29, -23.5, -18.5, -14.5, -11.5,
  -9.2, -7.5, -6.3, -5.4, -4.7, -4.05, -3.4, -2.75, -2.1, -1.5, -0.95, -0.45, 0,
  0.45, 0.95, 1.5, 2.1, 2.75, 3.4, 4.05, 4.7, 5.4, 6.3, 7.5, 9.2, 11.5, 14.5, 18.5,
  23.5, 29, 36, 44, 53, 63, 75, 88, 102, 117, 133, 150
];
export const COLS = LAT.length;

interface Lake {
  x: number;
  z: number;
  r: number;
  level: number;
}

export class World {
  scene: THREE.Scene;
  curve: THREE.CatmullRomCurve3;
  length: number;
  sampleCount: number;
  segLen: number;
  samples: THREE.Vector3[] = [];
  tangents: THREE.Vector3[] = [];
  rights: THREE.Vector3[] = [];
  pois: Poi[] = [];
  lakes: Lake[] = [];
  readonly packId: string;
  private curveParams: CurveParams;
  private palette: PaletteHints;
  lastRow = -999;
  lastSkirtX = 1e9;
  lastSkirtZ = 1e9;

  private terrain!: THREE.Mesh;
  private terrainPos!: Float32Array;
  private terrainCol!: Float32Array;
  private road!: THREE.Mesh;
  private roadPos!: Float32Array;
  private roadUV!: Float32Array;
  private dashMarks!: THREE.InstancedMesh;
  private dashDummy = new THREE.Object3D();
  private dashUp = new THREE.Vector3();
  private edges: { mesh: THREE.Mesh; pos: Float32Array; side: number }[] = [];
  private skirt!: THREE.Mesh;
  private skirtPos!: Float32Array;
  private skirtCol!: Float32Array;
  private skirtRadii: number[] = [];
  private skirtAng = 72;
  private skirtRad = 6;
  private tmpPos = new THREE.Vector3();
  private tmpCol = new THREE.Color();

  constructor(scene: THREE.Scene, pack: ScenePack) {
    this.scene = scene;
    this.packId = pack.id;
    this.curveParams = pack.curve;
    this.palette = pack.palette ?? {};
    this.curve = this.buildCurve(pack.curve);
    this.length = this.curve.getLength();
    this.sampleCount = Math.max(600, Math.round(this.length / SEG_LEN));
    this.segLen = this.length / this.sampleCount;

    this.buildSamples();
    this.resolvePois(pack.poiDefs);
    this.buildTerrain();
    this.buildRoad();
    this.buildSkirt();
  }

  private buildCurve(c: CurveParams): THREE.CatmullRomCurve3 {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i < c.ctrlCount; i++) {
      const a = (i / c.ctrlCount) * Math.PI * 2;
      const n1 = fbm(Math.cos(a) * c.radiusNoiseScale + c.seedOffset1, Math.sin(a) * c.radiusNoiseScale + c.seedOffset1, 2);
      const n2 = fbm(Math.cos(a) * c.radiusNoiseScale2 + c.seedOffset2, Math.sin(a) * c.radiusNoiseScale2 + c.seedOffset2, 2);
      const r = c.baseRadius * (0.62 + 0.5 * n1 + 0.14 * (n2 - 0.5));
      pts.push(new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r));
    }
    return new THREE.CatmullRomCurve3(pts, true, 'catmullrom', 0.5);
  }

  /** 道路纵向高度：只取低频，保证坡度平缓 */
  private roadHeight(x: number, z: number): number {
    const c = this.curveParams;
    return (fbm(x * c.heightFreq + c.heightSeedX, z * c.heightFreq + c.heightSeedZ, 3) - c.heightBias) * c.heightScale;
  }

  private macroHeight(x: number, z: number): number {
    return this.roadHeight(x, z);
  }

  /* ---------- 等弧长采样 + 切线 / 右向量 ---------- */
  private buildSamples(): void {
    const raw = this.curve.getSpacedPoints(this.sampleCount);
    const pts = raw.slice(0, this.sampleCount);

    for (const p of pts) p.y = this.roadHeight(p.x, p.z);
    // 多轮移动平均，消除过陡的坡
    for (let pass = 0; pass < 6; pass++) {
      const prev = pts.map((p) => p.y);
      for (let i = 0; i < pts.length; i++) {
        const a = prev[(i - 1 + pts.length) % pts.length];
        const b = prev[i];
        const c = prev[(i + 1) % pts.length];
        pts[i].y = a * 0.25 + b * 0.5 + c * 0.25;
      }
    }

    const UP = new THREE.Vector3(0, 1, 0);
    for (let i = 0; i < pts.length; i++) {
      const next = pts[(i + 1) % pts.length];
      const prev = pts[(i - 1 + pts.length) % pts.length];
      const t = new THREE.Vector3().subVectors(next, prev).normalize();
      this.tangents.push(t);
      this.rights.push(new THREE.Vector3().crossVectors(t, UP).normalize());
    }
    this.samples = pts;
  }

  /** 把 POI 定义解析成世界坐标 */
  private resolvePois(defs: PoiDef[]): void {
    this.pois = defs.map((def, i) => {
      const pose = this.poseAt(def.t * this.length);
      const off = (def.side || 1) * (def.dist || 26);
      const x = pose.pos.x + pose.right.x * off;
      const z = pose.pos.z + pose.right.z * off;
      const y = this.rawHeight(x, z) - 0.25;
      const poi: Poi = {
        ...def,
        id: i + 1,
        pos: new THREE.Vector3(x, y, z),
        roadPos: pose.pos.clone(),
        radius: def.radius || 8,
      };
      if (def.type === 'lake') poi.waterLevel = y - 2.0;
      return poi;
    });

    this.lakes = this.pois
      .filter((p) => p.type === 'lake')
      .map((p) => ({ x: p.pos.x, z: p.pos.z, r: p.radius, level: p.waterLevel ?? p.pos.y }));
  }

  /** 弧长 s（米）→ 插值后的位姿 */
  poseAt(s: number): Pose {
    const n = this.sampleCount;
    let u = (s / this.segLen) % n;
    if (u < 0) u += n;
    const i = Math.floor(u);
    const f = u - i;
    const j = (i + 1) % n;

    return {
      pos: new THREE.Vector3().lerpVectors(this.samples[i], this.samples[j], f),
      tan: new THREE.Vector3().lerpVectors(this.tangents[i], this.tangents[j], f).normalize(),
      right: new THREE.Vector3().lerpVectors(this.rights[i], this.rights[j], f).normalize(),
      index: i,
      frac: f,
    };
  }

  /* ---------- 高度场 ---------- */
  /** 自然地形（不含湖盆） */
  rawHeight(x: number, z: number): number {
    const c = this.curveParams;
    const macro = this.macroHeight(x, z);
    const hills = (fbm(x * 0.0042 + 21 + c.seedOffset1 * 0.1, z * 0.0042 + 13 + c.seedOffset2 * 0.1, 4) - 0.5) * (c.heightScale * 0.87);
    const detail = (fbm(x * 0.021 + 61, z * 0.021 + 41, 3) - 0.5) * 2.2;
    return macro + hills + detail;
  }

  /** 最终高度：叠加湖盆凹陷 */
  heightAt(x: number, z: number): number {
    let h = this.rawHeight(x, z);
    for (const lake of this.lakes) {
      const dx = x - lake.x, dz = z - lake.z;
      const d = Math.sqrt(dx * dx + dz * dz);
      if (d < lake.r) {
        h = lerp(h, lake.level, smoothstep(lake.r, lake.r * 0.62, d));
      }
    }
    return h;
  }

  /** 走廊上 (段索引, 横向偏移) 处的地面高度 */
  groundY(k: number, lat: number): number {
    const n = this.sampleCount;
    const idx = ((k % n) + n) % n;
    const p = this.samples[idx];
    const r = this.rights[idx];
    const x = p.x + r.x * lat;
    const z = p.z + r.z * lat;
    const ad = Math.abs(lat);
    const t = smoothstep(ROAD_HALF + 0.9, ROAD_HALF + 20, ad);
    const outer = smoothstep(105, 142, ad);
    const macro = this.macroHeight(x, z);
    const natural = this.heightAt(x, z);
    let y = p.y + (natural - macro) * t * (1 - outer) + (natural - p.y) * outer;
    const shoulder = smoothstep(ROAD_HALF - 0.4, ROAD_HALF + 0.2, ad) *
      (1 - smoothstep(ROAD_HALF + 0.2, ROAD_HALF + 2.6, ad));
    return y - shoulder * 0.22;
  }

  /** 计算走廊顶点（位置 + 顶点色） */
  private vertex(k: number, lat: number, outPos: THREE.Vector3, outColor: THREE.Color): void {
    const n = this.sampleCount;
    const idx = ((k % n) + n) % n;
    const p = this.samples[idx];
    const r = this.rights[idx];

    const x = p.x + r.x * lat;
    const z = p.z + r.z * lat;

    const ad = Math.abs(lat);
    const t = smoothstep(ROAD_HALF + 0.9, ROAD_HALF + 20, ad);
    const outer = smoothstep(105, 142, ad);
    const macro = this.macroHeight(x, z);
    const natural = this.heightAt(x, z);
    let y = p.y + (natural - macro) * t * (1 - outer) + (natural - p.y) * outer;
    const shoulder = smoothstep(ROAD_HALF - 0.4, ROAD_HALF + 0.2, ad) *
      (1 - smoothstep(ROAD_HALF + 0.2, ROAD_HALF + 2.6, ad));
    y -= shoulder * 0.22;
    outPos.set(x, y, z);

    // ---- 顶点色 ----
    const rise = y - p.y;
    const v = fbm(x * 0.055, z * 0.055, 2);
    const grass = fbm(x * 0.012 + 5, z * 0.012 + 9, 2);
    const g0 = this.palette.grass ?? [0.30, 0.55, 0.24];
    let cr = lerp(g0[0], g0[0] + 0.12, grass);
    let cg = lerp(g0[1], Math.min(0.78, g0[1] + 0.13), grass);
    let cb = lerp(g0[2], g0[2] + 0.07, v);

    if (rise > 7) {
      const rt = smoothstep(7, 16, rise);
      cr = lerp(cr, 0.55, rt); cg = lerp(cg, 0.53, rt); cb = lerp(cb, 0.46, rt);
    }
    for (const lake of this.lakes) {
      const dx = x - lake.x, dz = z - lake.z;
      const d = Math.sqrt(dx * dx + dz * dz);
      if (d < lake.r + 6) {
        const st = smoothstep(lake.r + 6, lake.r + 0.5, d);
        cr = lerp(cr, 0.78, st); cg = lerp(cg, 0.71, st); cb = lerp(cb, 0.52, st);
      }
    }
    // 俄罗斯：雪意斑驳 + 更冷的地面色
    if (this.packId === 'russia') {
      const snow = fbm(x * 0.028 + 3.1, z * 0.028 + 7.4, 2);
      const st = smoothstep(0.48, 0.82, snow);
      cr = lerp(cr, 0.90, st * 0.72);
      cg = lerp(cg, 0.92, st * 0.72);
      cb = lerp(cb, 0.95, st * 0.72);
      cr *= 0.93; cg *= 0.96; cb = Math.min(1, cb * 1.06);
      // 湖岸偏灰白冰缘
      for (const lake of this.lakes) {
        const dx2 = x - lake.x, dz2 = z - lake.z;
        const d2 = Math.sqrt(dx2 * dx2 + dz2 * dz2);
        if (d2 < lake.r + 8) {
          const ice = smoothstep(lake.r + 8, lake.r + 0.5, d2);
          cr = lerp(cr, 0.86, ice * 0.55);
          cg = lerp(cg, 0.90, ice * 0.55);
          cb = lerp(cb, 0.94, ice * 0.55);
        }
      }
    }

    // 路廊下地形：深沥青灰（含软路肩），中/俄共用，压过草地与雪斑
    {
      const roadCore = 1 - smoothstep(ROAD_HALF - 0.15, ROAD_HALF + 0.05, ad);
      const roadShoulder = (1 - smoothstep(ROAD_HALF + 0.05, ROAD_HALF + 1.8, ad)) *
        smoothstep(ROAD_HALF - 0.15, ROAD_HALF + 0.05, ad);
      const asphaltAmt = Math.min(1, roadCore + roadShoulder * 0.85);
      if (asphaltAmt > 0.001) {
        const grit = 0.06 + 0.04 * v + 0.01 * grass; // ~0.06–0.11
        const ar = grit;
        const ag = grit * 1.02;
        const ab = grit * 1.05;
        cr = lerp(cr, ar, asphaltAmt);
        cg = lerp(cg, ag, asphaltAmt);
        cb = lerp(cb, ab, asphaltAmt);
      }
    }

    const shade = 0.9 + 0.2 * v;
    // 路面略少明暗起伏，保持沥青可读
    const roadShadeAmt = 1 - smoothstep(ROAD_HALF + 0.05, ROAD_HALF + 1.8, ad);
    const shadeEff = lerp(shade, 0.96 + 0.06 * v, roadShadeAmt);
    outColor.setRGB(cr * shadeEff, cg * shadeEff, cb * shadeEff);
  }

  /* ---------- 地形网格 ---------- */
  private buildTerrain(): void {
    const vCount = ROWS * COLS;
    const geo = new THREE.BufferGeometry();
    this.terrainPos = new Float32Array(vCount * 3);
    this.terrainCol = new Float32Array(vCount * 3);
    geo.setAttribute('position', new THREE.BufferAttribute(this.terrainPos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(this.terrainCol, 3));

    const idx: number[] = [];
    for (let r = 0; r < ROWS - 1; r++) {
      for (let c = 0; c < COLS - 1; c++) {
        const a = r * COLS + c;
        const b = a + 1;
        const d = (r + 1) * COLS + c;
        const e = d + 1;
        idx.push(a, b, d, b, e, d);
      }
    }
    geo.setIndex(idx);

    this.terrain = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true }));
    this.terrain.receiveShadow = true;
    this.terrain.frustumCulled = false;
    this.scene.add(this.terrain);
  }

  /* ---------- 道路 ---------- */
  private buildRoad(): void {
    const segs = ROWS;
    const g = new THREE.BufferGeometry();
    this.roadPos = new Float32Array(segs * 2 * 3);
    this.roadUV = new Float32Array(segs * 2 * 2);
    g.setAttribute('position', new THREE.BufferAttribute(this.roadPos, 3));
    g.setAttribute('uv', new THREE.BufferAttribute(this.roadUV, 2));
    const idx: number[] = [];
    for (let r = 0; r < segs - 1; r++) {
      const a = r * 2, b = a + 1, c = a + 2, d = a + 3;
      idx.push(a, c, b, b, c, d);
    }
    g.setIndex(idx);
    // 更深沥青：Basic 不受光照洗白，颜色更沉
    this.road = new THREE.Mesh(g, new THREE.MeshBasicMaterial({
      map: makeAsphaltTexture(),
      color: 0x3d4045,
      toneMapped: false,
    }));
    this.road.receiveShadow = true;
    this.road.frustumCulled = false;
    this.scene.add(this.road);

    // 中心白虚线：贴地薄片，避免厚盒子穿进车轮
    const dashGeo = new THREE.PlaneGeometry(0.55, DASH_LEN);
    dashGeo.rotateX(-Math.PI / 2);
    const dashMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      toneMapped: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });
    this.dashMarks = new THREE.InstancedMesh(dashGeo, dashMat, segs);
    this.dashMarks.frustumCulled = false;
    this.dashMarks.renderOrder = 2;
    this.dashMarks.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.scene.add(this.dashMarks);
    this.dashDummy.matrixAutoUpdate = false;
    this.dashDummy.matrix.makeScale(0, 0, 0);
    for (let i = 0; i < segs; i++) this.dashMarks.setMatrixAt(i, this.dashDummy.matrix);
    this.dashMarks.instanceMatrix.needsUpdate = true;

    // 两侧细白边线
    const edgeMat = new THREE.MeshBasicMaterial({
      color: 0xf5f7fa, transparent: true, opacity: 0.85, depthWrite: false, toneMapped: false,
    });
    for (let s = 0; s < 2; s++) {
      const ge = new THREE.BufferGeometry();
      const ep = new Float32Array(segs * 2 * 3);
      ge.setAttribute('position', new THREE.BufferAttribute(ep, 3));
      ge.setIndex(idx.slice());
      const m = new THREE.Mesh(ge, edgeMat);
      m.frustumCulled = false;
      m.renderOrder = 1;
      this.scene.add(m);
      this.edges.push({ mesh: m, pos: ep, side: s === 0 ? -1 : 1 });
    }
  }

  /* ---------- 裙边地形（150m → 650m，接远山） ---------- */
  private buildSkirt(): void {
    const ANG = 72, RADIAL = 6;
    this.skirtAng = ANG;
    this.skirtRad = RADIAL;
    this.skirtRadii = [150, 208, 278, 362, 462, 560, 650];

    const vCount = (ANG + 1) * (RADIAL + 1);
    const geo = new THREE.BufferGeometry();
    this.skirtPos = new Float32Array(vCount * 3);
    this.skirtCol = new Float32Array(vCount * 3);
    geo.setAttribute('position', new THREE.BufferAttribute(this.skirtPos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(this.skirtCol, 3));

    const idx: number[] = [];
    for (let a = 0; a < ANG; a++) {
      for (let r = 0; r < RADIAL; r++) {
        const A = a * (RADIAL + 1) + r;
        const B = A + 1;
        const C = (a + 1) * (RADIAL + 1) + r;
        const D = C + 1;
        idx.push(A, C, B, B, C, D);
      }
    }
    geo.setIndex(idx);
    this.skirt = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true }));
    this.skirt.frustumCulled = false;
    this.scene.add(this.skirt);
  }

  /** 玩家移动后刷新裙边（节流） */
  updateSkirt(px: number, pz: number): void {
    if (Math.abs(px - this.lastSkirtX) < 4 && Math.abs(pz - this.lastSkirtZ) < 4) return;
    this.lastSkirtX = px;
    this.lastSkirtZ = pz;

    let vi = 0;
    for (let a = 0; a <= this.skirtAng; a++) {
      const ang = (a / this.skirtAng) * Math.PI * 2;
      const ca = Math.cos(ang), sa = Math.sin(ang);
      for (let r = 0; r <= this.skirtRad; r++) {
        const rr = this.skirtRadii[r];
        const x = px + ca * rr;
        const z = pz + sa * rr;
        const y = this.heightAt(x, z);

        const v = fbm(x * 0.055, z * 0.055, 2);
        const grass = fbm(x * 0.012 + 5, z * 0.012 + 9, 2);
        const shade = 0.88 + 0.2 * v;
        const sk = this.palette.skirt ?? this.palette.grass ?? [0.30, 0.55, 0.24];
        let sr = (sk[0] + grass * 0.12) * shade;
        let sg = (sk[1] + grass * 0.13) * shade;
        let sb = (sk[2] + v * 0.07) * shade;
        if (this.packId === 'russia') {
          const snow = fbm(x * 0.022 + 1.5, z * 0.022 + 4.2, 2);
          const st = smoothstep(0.5, 0.85, snow);
          sr = lerp(sr, 0.88 * shade, st * 0.65);
          sg = lerp(sg, 0.91 * shade, st * 0.65);
          sb = lerp(sb, 0.95 * shade, st * 0.65);
        }
        this.skirtPos[vi] = x; this.skirtPos[vi + 1] = y; this.skirtPos[vi + 2] = z;
        this.skirtCol[vi] = sr;
        this.skirtCol[vi + 1] = sg;
        this.skirtCol[vi + 2] = sb;
        vi += 3;
      }
    }
    const g = this.skirt.geometry;
    g.attributes.position.needsUpdate = true;
    g.attributes.color.needsUpdate = true;
    g.computeVertexNormals();
    g.computeBoundingSphere();
  }

  /** 每帧刷新（只在前进跨段时重算） */
  update(s: number): boolean {
    const baseRow = Math.floor(s / this.segLen) - SEGS_BEHIND;
    if (baseRow === this.lastRow) return false;
    this.lastRow = baseRow;

    const tp = this.terrainPos, tc = this.terrainCol;
    const P = this.tmpPos, C = this.tmpCol;
    let vi = 0;
    for (let r = 0; r < ROWS; r++) {
      const k = baseRow + r;
      for (let c = 0; c < COLS; c++) {
        this.vertex(k, LAT[c], P, C);
        tp[vi] = P.x; tp[vi + 1] = P.y; tp[vi + 2] = P.z;
        tc[vi] = C.r; tc[vi + 1] = C.g; tc[vi + 2] = C.b;
        vi += 3;
      }
    }
    const tg = this.terrain.geometry;
    tg.attributes.position.needsUpdate = true;
    tg.attributes.color.needsUpdate = true;
    tg.computeVertexNormals();
    tg.computeBoundingSphere();

    const rp = this.roadPos, ru = this.roadUV;
    let ri = 0, ui = 0;
    for (let r = 0; r < ROWS; r++) {
      const k = baseRow + r;
      const n = this.sampleCount;
      const idx = ((k % n) + n) % n;
      const p = this.samples[idx];
      const rt = this.rights[idx];
      // 略抬高路面，减少与地形 z-fight
      const y = p.y + 0.11;
      const roadV = k * this.segLen * 0.35;

      rp[ri++] = p.x - rt.x * ROAD_HALF; rp[ri++] = y; rp[ri++] = p.z - rt.z * ROAD_HALF;
      rp[ri++] = p.x + rt.x * ROAD_HALF; rp[ri++] = y; rp[ri++] = p.z + rt.z * ROAD_HALF;
      ru[ui++] = 0; ru[ui++] = roadV;
      ru[ui++] = 1; ru[ui++] = roadV;

      for (const e of this.edges) {
        const off = e.side * (ROAD_HALF - 0.32);
        const o = r * 6;
        e.pos[o] = p.x + rt.x * off - rt.x * 0.09; e.pos[o + 1] = y + 0.03; e.pos[o + 2] = p.z + rt.z * off - rt.z * 0.09;
        e.pos[o + 3] = p.x + rt.x * off + rt.x * 0.09; e.pos[o + 4] = y + 0.03; e.pos[o + 5] = p.z + rt.z * off + rt.z * 0.09;
      }
    }
    const rg = this.road.geometry;
    rg.attributes.position.needsUpdate = true;
    rg.attributes.uv.needsUpdate = true;
    rg.computeVertexNormals();
    rg.computeBoundingSphere();

    this.placeDashes(baseRow);

    for (const e of this.edges) {
      e.mesh.geometry.attributes.position.needsUpdate = true;
      e.mesh.geometry.computeBoundingSphere();
    }
    return true;
  }

  /** 按弧长均匀放置虚线：4m 实 / 4m 空，每周期一块，避免重叠导致长短不一 */
  private placeDashes(baseRow: number): void {
    const startS = baseRow * this.segLen;
    const endS = (baseRow + ROWS) * this.segLen;
    const first = Math.floor(startS / DASH_PERIOD) - 1;
    const last = Math.ceil(endS / DASH_PERIOD) + 1;
    const cap = ROWS;
    let i = 0;

    for (let d = first; d <= last && i < cap; d++) {
      const pose = this.poseAt(d * DASH_PERIOD + DASH_LEN * 0.5);
      const rt = pose.right;
      const tn = pose.tan;
      tn.normalize();
      this.dashUp.crossVectors(tn, rt).normalize();
      if (this.dashUp.y < 0) this.dashUp.negate();
      rt.crossVectors(this.dashUp, tn).normalize();
      this.dashDummy.matrix.makeBasis(rt, this.dashUp, tn);
      this.dashDummy.matrix.setPosition(pose.pos.x, pose.pos.y + 0.112, pose.pos.z);
      this.dashMarks.setMatrixAt(i, this.dashDummy.matrix);
      i++;
    }

    this.dashDummy.matrix.makeScale(0, 0, 0);
    this.dashDummy.matrix.setPosition(0, -200, 0);
    while (i < cap) {
      this.dashMarks.setMatrixAt(i, this.dashDummy.matrix);
      i++;
    }
    this.dashMarks.instanceMatrix.needsUpdate = true;
    this.dashMarks.computeBoundingSphere();
  }
}

/** 沥青噪点贴图：深灰底 + 轻微明暗颗粒 */
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
      const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
      const f = n - Math.floor(n);
      const n2 = Math.sin((x + 17) * 39.233 + (y + 9) * 11.135) * 24634.121;
      const f2 = n2 - Math.floor(n2);
      const base = 8 + f * 10 + f2 * 5;
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
}

