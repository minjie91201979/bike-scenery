import * as THREE from 'three';
import { rand, ROWS } from './World';
import type { World } from './World';
import type { LandmarkKind } from './types';

/* ============================================================
 *  道路两侧散布物（松树 / 阔叶树 / 灌木 / 石头 / 野花）
 *  按段索引确定性生成，用实例池滚动复用
 * ============================================================ */

const POOL_SEGS = 210;
const TREES_PER_SEG = 2;
const BUSH_PER_SEG = 2;
const ROCK_PER_SEG = 1;
const FLOWER_PER_SEG = 4;

const MAT = {
  trunk: new THREE.MeshStandardMaterial({ color: 0x6e4f35, roughness: 0.9, flatShading: true }),
  pine: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85, flatShading: true }),
  leaf: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85, flatShading: true }),
  bush: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, flatShading: true }),
  rock: new THREE.MeshStandardMaterial({ color: 0x9a9a94, roughness: 0.95, flatShading: true }),
  flower: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6, flatShading: true }),
  snow: new THREE.MeshStandardMaterial({ color: 0xeef4fa, roughness: 0.88, flatShading: true }),
};

interface MeshGroup {
  meshes: THREE.InstancedMesh[];
  count: number;
}

export interface Animatable {
  tick: (dt: number, ctx: { night: number }, t: number) => void;
}

export class Scatter {
  private world: World;
  private scene: THREE.Scene;
  private m = new THREE.Matrix4();
  private q = new THREE.Quaternion();
  private e = new THREE.Euler();
  private p = new THREE.Vector3();
  private s = new THREE.Vector3(1, 1, 1);
  private col = new THREE.Color();
  private treeSlots!: MeshGroup;
  private pineSlots!: MeshGroup;
  private leafSlots!: MeshGroup;
  private pineSnow: MeshGroup | null = null;
  private leafSnow: MeshGroup | null = null;
  private bush!: MeshGroup;
  private rock!: MeshGroup;
  private flower!: MeshGroup;
  private lastBase = -99999;

  constructor(scene: THREE.Scene, world: World) {
    this.scene = scene;
    this.world = world;

    const treeCount = POOL_SEGS * TREES_PER_SEG;
    this.treeSlots = this.mkInstanced(
      treeCount, new THREE.CylinderGeometry(0.13, 0.24, 1.2, 5).translate(0, 0.6, 0), MAT.trunk);
    this.pineSlots = this.mkInstanced(
      treeCount, new THREE.ConeGeometry(1.25, 3.1, 6).translate(0, 2.5, 0), MAT.pine);
    this.leafSlots = this.mkInstanced(
      treeCount, new THREE.IcosahedronGeometry(1.4, 0).scale(1, 1.2, 1).translate(0, 2.15, 0), MAT.leaf);
    this.bush = this.mkInstanced(
      POOL_SEGS * BUSH_PER_SEG, new THREE.IcosahedronGeometry(0.85, 0).scale(1, 0.75, 1).translate(0, 0.5, 0), MAT.bush);
    this.rock = this.mkInstanced(
      POOL_SEGS * ROCK_PER_SEG, new THREE.DodecahedronGeometry(0.65, 0), MAT.rock);
    this.flower = this.mkInstanced(
      POOL_SEGS * FLOWER_PER_SEG, new THREE.IcosahedronGeometry(0.11, 0).scale(1, 0.8, 1).translate(0, 0.16, 0), MAT.flower);

    // 俄罗斯：松冠雪帽 + 阔叶轻雪尘（中国不创建，零开销）
    if (world.packId === 'russia') {
      // 扁平白锥：坐在松树尖顶附近，与 pineSlots 同槽复用变换
      this.pineSnow = this.mkInstanced(
        treeCount, new THREE.ConeGeometry(0.72, 0.82, 6).translate(0, 3.95, 0), MAT.snow);
      // 阔叶树顶薄雪尘
      this.leafSnow = this.mkInstanced(
        treeCount, new THREE.IcosahedronGeometry(0.55, 0).scale(1.15, 0.42, 1.15).translate(0, 3.05, 0), MAT.snow);
    }

    // 逐实例配色
    const cold = world.packId === 'russia';
    for (let i = 0; i < treeCount; i++) {
      if (cold) {
        this.col.setHSL(0.33 + rand(i * 1.7) * 0.06, 0.28 + rand(i * 2.3) * 0.18, 0.26 + rand(i * 3.1) * 0.12);
      } else {
        this.col.setHSL(0.29 + rand(i * 1.7) * 0.07, 0.52 + rand(i * 2.3) * 0.18, 0.30 + rand(i * 3.1) * 0.13);
      }
      this.pineSlots.meshes[0].setColorAt(i, this.col);
      this.leafSlots.meshes[0].setColorAt(i, this.col);
    }
    const bushCount = POOL_SEGS * BUSH_PER_SEG;
    for (let i = 0; i < bushCount; i++) {
      if (cold) {
        this.col.setHSL(0.30 + rand(i * 4.1) * 0.06, 0.28, 0.34 + rand(i * 5.2) * 0.1);
      } else {
        this.col.setHSL(0.27 + rand(i * 4.1) * 0.08, 0.5, 0.32 + rand(i * 5.2) * 0.1);
      }
      this.bush.meshes[0].setColorAt(i, this.col);
    }
    const palette = [0xff8fb5, 0xffd166, 0xff6b6b, 0xffffff, 0xc39bff, 0xffa94d];
    const flowerCount = POOL_SEGS * FLOWER_PER_SEG;
    for (let i = 0; i < flowerCount; i++) {
      this.col.setHex(palette[Math.floor(rand(i * 6.6) * palette.length)]);
      this.flower.meshes[0].setColorAt(i, this.col);
    }
    for (const grp of this.all()) {
      grp.meshes[0].instanceMatrix.needsUpdate = true;
    }
  }

  private all(): MeshGroup[] {
    const g: MeshGroup[] = [this.treeSlots, this.pineSlots, this.leafSlots, this.bush, this.rock, this.flower];
    if (this.pineSnow) g.push(this.pineSnow);
    if (this.leafSnow) g.push(this.leafSnow);
    return g;
  }

  private mkInstanced(count: number, geo: THREE.BufferGeometry, mat: THREE.Material): MeshGroup {
    const m = new THREE.InstancedMesh(geo, mat, count);
    m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    m.castShadow = true;
    m.frustumCulled = false;
    this.scene.add(m);
    return { meshes: [m], count };
  }

  private write(grp: MeshGroup, i: number, x: number, y: number, z: number, ry: number, sx: number, sy: number, sz: number): void {
    this.p.set(x, y, z);
    this.e.set(0, ry, 0);
    this.q.setFromEuler(this.e);
    this.s.set(sx, sy, sz);
    this.m.compose(this.p, this.q, this.s);
    for (const mesh of grp.meshes) mesh.setMatrixAt(i, this.m);
  }

  private hide(grp: MeshGroup, i: number): void {
    this.p.set(0, -999, 0);
    this.q.identity();
    this.s.set(0.0001, 0.0001, 0.0001);
    this.m.compose(this.p, this.q, this.s);
    for (const mesh of grp.meshes) mesh.setMatrixAt(i, this.m);
  }

  /** 玩家跨段后：重建可见窗口内所有段的实例 */
  update(baseRow: number): void {
    if (baseRow === this.lastBase) return;
    this.lastBase = baseRow;

    for (let r = 0; r < ROWS; r++) {
      const k = baseRow + r;
      const slot = ((k % POOL_SEGS) + POOL_SEGS) % POOL_SEGS;
      this.placeSegment(k, slot);
    }
    for (const grp of this.all()) {
      for (const mesh of grp.meshes) {
        mesh.instanceMatrix.needsUpdate = true;
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      }
    }
  }

  private placeSegment(k: number, slot: number): void {
    const w = this.world;
    const n = w.sampleCount;
    const idx = ((k % n) + n) % n;
    const p = w.samples[idx];
    const right = w.rights[idx];

    let treeI = slot * TREES_PER_SEG;
    let bushI = slot * BUSH_PER_SEG;
    let rockI = slot * ROCK_PER_SEG;
    let flowerI = slot * FLOWER_PER_SEG;

    // 花海区域：树更少、花更多
    let nearMeadow = false;
    for (const poi of w.pois) {
      const dx = p.x - poi.pos.x, dz = p.z - poi.pos.z;
      if (poi.type === 'meadow' && dx * dx + dz * dz < (poi.radius + 26) ** 2) nearMeadow = true;
    }

    const place = (lat: number): { x: number; y: number; z: number } | null => {
      const x = p.x + right.x * lat;
      const z = p.z + right.z * lat;
      for (const lake of w.lakes) {
        const ddx = x - lake.x, ddz = z - lake.z;
        if (ddx * ddx + ddz * ddz < (lake.r + 1.5) ** 2) return null;
      }
      for (const poi of w.pois) {
        if (poi.type === 'meadow') continue;
        const ddx = x - poi.pos.x, ddz = z - poi.pos.z;
        if (ddx * ddx + ddz * ddz < (poi.radius + 3) ** 2) return null;
      }
      return { x, y: w.groundY(k, lat), z };
    };

    // ---- 树 ----
    const treeChance = nearMeadow ? 0.25 : 0.52;
    for (let s = 0; s < TREES_PER_SEG; s++) {
      const seed = k * 31.7 + s * 7.3;
      const spot = rand(seed) < treeChance
        ? place((rand(seed + 0.11) < 0.5 ? -1 : 1) * (10 + rand(seed + 0.23) * (nearMeadow ? 30 : 58)))
        : null;
      if (spot) {
        const sc = 0.75 + rand(seed + 0.37) * 0.85;
        const ry = rand(seed + 0.41) * Math.PI * 2;
        this.write(this.treeSlots, treeI, spot.x, spot.y - 0.1, spot.z, ry, sc, sc, sc);
        const pineChance = this.world.packId === 'russia' ? 0.84 : 0.55;
        if (rand(seed + 0.53) < pineChance) {
          this.write(this.pineSlots, treeI, spot.x, spot.y - 0.1, spot.z, ry, sc, sc, sc);
          this.hide(this.leafSlots, treeI);
          // 雪帽：同位姿、略扁略小，几何已上移到冠顶
          if (this.pineSnow) {
            this.write(this.pineSnow, treeI, spot.x, spot.y - 0.1, spot.z, ry, sc * 0.92, sc * 0.7, sc * 0.92);
          }
          if (this.leafSnow) this.hide(this.leafSnow, treeI);
        } else {
          this.write(this.leafSlots, treeI, spot.x, spot.y - 0.1, spot.z, ry, sc, sc, sc);
          this.hide(this.pineSlots, treeI);
          if (this.pineSnow) this.hide(this.pineSnow, treeI);
          // 俄罗斯残留阔叶：轻薄雪尘
          if (this.leafSnow) {
            this.write(this.leafSnow, treeI, spot.x, spot.y - 0.1, spot.z, ry, sc * 0.72, sc * 0.5, sc * 0.72);
          }
        }
      } else {
        this.hide(this.treeSlots, treeI);
        this.hide(this.pineSlots, treeI);
        this.hide(this.leafSlots, treeI);
        if (this.pineSnow) this.hide(this.pineSnow, treeI);
        if (this.leafSnow) this.hide(this.leafSnow, treeI);
      }
      treeI++;
    }

    // ---- 灌木 ----
    for (let s = 0; s < BUSH_PER_SEG; s++) {
      const seed = k * 17.9 + s * 5.1;
      const spot = rand(seed) < 0.45
        ? place((rand(seed + 0.13) < 0.5 ? -1 : 1) * (6.5 + rand(seed + 0.29) * 48))
        : null;
      if (spot) {
        const sc = 0.6 + rand(seed + 0.41) * 1.1;
        this.write(this.bush, bushI, spot.x, spot.y - 0.06, spot.z, rand(seed) * 6.28, sc, sc * (0.8 + rand(seed + 0.7) * 0.4), sc);
      } else {
        this.hide(this.bush, bushI);
      }
      bushI++;
    }

    // ---- 石头 ----
    {
      const seed = k * 23.3;
      const spot = rand(seed) < 0.18
        ? place((rand(seed + 0.17) < 0.5 ? -1 : 1) * (5.5 + rand(seed + 0.31) * 55))
        : null;
      if (spot) {
        const sc = 0.4 + rand(seed + 0.51) * 1.3;
        this.write(this.rock, rockI, spot.x, spot.y + 0.05, spot.z, rand(seed) * 6.28, sc, sc * 0.8, sc);
      } else {
        this.hide(this.rock, rockI);
      }
    }

    // ---- 野花 ----
    const flowerChance = nearMeadow ? 1.0 : 0.5;
    for (let s = 0; s < FLOWER_PER_SEG; s++) {
      const seed = k * 11.3 + s * 3.7;
      const spot = rand(seed) < flowerChance
        ? place((rand(seed + 0.19) < 0.5 ? -1 : 1) * (5 + rand(seed + 0.27) * 55))
        : null;
      if (spot) {
        const sc = 0.8 + rand(seed + 0.33) * 0.9;
        this.write(this.flower, flowerI, spot.x, spot.y, spot.z, 0, sc, sc, sc);
      } else {
        this.hide(this.flower, flowerI);
      }
    }
  }
}

/* ============================================================
 *  POI 地标：省级 landmark 简模 / 通用风车·观星台·灯塔 / 湖面 / 花海
 * ============================================================ */

const WOOD = new THREE.MeshStandardMaterial({ color: 0x8a6a48, roughness: 0.9, flatShading: true });
const WHITE = new THREE.MeshStandardMaterial({ color: 0xf2f0ea, roughness: 0.8, flatShading: true });
const DARKROOF = new THREE.MeshStandardMaterial({ color: 0x43506b, roughness: 0.7, flatShading: true });
const GLASS = new THREE.MeshStandardMaterial({
  color: 0xffe9a8, emissive: 0xffcf70, emissiveIntensity: 0.2, roughness: 0.3, flatShading: true
});
const REDWALL = new THREE.MeshStandardMaterial({ color: 0xa8322a, roughness: 0.85, flatShading: true });
const STONE = new THREE.MeshStandardMaterial({ color: 0x9a958c, roughness: 0.95, flatShading: true });
const GOLDROOF = new THREE.MeshStandardMaterial({ color: 0xc9a227, roughness: 0.65, flatShading: true });
const GREENLEAF = new THREE.MeshStandardMaterial({ color: 0x3d7a3a, roughness: 0.85, flatShading: true });
const BAMBOO = new THREE.MeshStandardMaterial({ color: 0x6a9a3e, roughness: 0.8, flatShading: true });
const DARKWOOD = new THREE.MeshStandardMaterial({ color: 0x5a3d28, roughness: 0.9, flatShading: true });
const SANDSTONE = new THREE.MeshStandardMaterial({ color: 0xb8a078, roughness: 0.95, flatShading: true });
const ICE = new THREE.MeshStandardMaterial({
  color: 0xb8e4f5, roughness: 0.25, metalness: 0.15, transparent: true, opacity: 0.85, flatShading: true
});
const GRAYSTONE = new THREE.MeshStandardMaterial({ color: 0x7a7e82, roughness: 0.95, flatShading: true });
const PINKWALL = new THREE.MeshStandardMaterial({ color: 0xf0ebe3, roughness: 0.9, flatShading: true });
const BLACKTILE = new THREE.MeshStandardMaterial({ color: 0x2a2e33, roughness: 0.8, flatShading: true });
const EARTH = new THREE.MeshStandardMaterial({ color: 0x8b6b4a, roughness: 0.95, flatShading: true });
const ORANGEACCENT = new THREE.MeshStandardMaterial({ color: 0xd46a2c, roughness: 0.7, flatShading: true });
const ONION_RED = new THREE.MeshStandardMaterial({ color: 0xc43c3c, roughness: 0.7, flatShading: true });
const ONION_GREEN = new THREE.MeshStandardMaterial({ color: 0x2f8f5b, roughness: 0.7, flatShading: true });
const ONION_BLUE = new THREE.MeshStandardMaterial({ color: 0x3a6ec9, roughness: 0.7, flatShading: true });
const ONION_TEAL = new THREE.MeshStandardMaterial({ color: 0x2a9aa0, roughness: 0.7, flatShading: true });
const SNOWWHITE = new THREE.MeshStandardMaterial({ color: 0xeef4fa, roughness: 0.85, flatShading: true });
const COLDGLASS = new THREE.MeshStandardMaterial({
  color: 0xb8d8f0, emissive: 0x4a8a70, emissiveIntensity: 0.15, roughness: 0.25,
  metalness: 0.1, transparent: true, opacity: 0.72, flatShading: true,
});
const TENTHIDE = new THREE.MeshStandardMaterial({ color: 0xb8956a, roughness: 0.9, flatShading: true });
const DEERBROWN = new THREE.MeshStandardMaterial({ color: 0x8a6238, roughness: 0.9, flatShading: true });
const BALTICBAND = new THREE.MeshStandardMaterial({ color: 0x3a5a7a, roughness: 0.75, flatShading: true });

function mesh(
  geo: THREE.BufferGeometry,
  mat: THREE.Material,
  x = 0, y = 0, z = 0,
  sx = 1, sy = 1, sz = 1,
  rx = 0, ry = 0, rz = 0,
): THREE.Mesh {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.scale.set(sx, sy, sz);
  m.rotation.set(rx, ry, rz);
  m.castShadow = true;
  return m;
}

/** 天安门城楼简模 */
function lmTiananmen(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(14, 4.5, 6), REDWALL, 0, 2.25, 0));
  g.add(mesh(new THREE.BoxGeometry(15, 0.5, 7), STONE, 0, 0.25, 0));
  // 门洞
  for (const x of [-4.5, -1.5, 1.5, 4.5]) {
    g.add(mesh(new THREE.BoxGeometry(1.4, 2.6, 0.4), DARKWOOD, x, 1.4, 3.1));
  }
  // 黄琉璃重檐
  g.add(mesh(new THREE.BoxGeometry(16, 0.8, 8), GOLDROOF, 0, 5.0, 0));
  g.add(mesh(new THREE.BoxGeometry(12, 1.6, 5), REDWALL, 0, 6.2, 0));
  g.add(mesh(new THREE.ConeGeometry(9, 2.2, 4), GOLDROOF, 0, 7.8, 0, 1, 1, 1, 0, Math.PI / 4, 0));
  // 两侧望柱
  for (const x of [-8, 8]) {
    g.add(mesh(new THREE.CylinderGeometry(0.35, 0.4, 5, 6), STONE, x, 2.5, 4));
  }
  return g;
}

/** 长城垛口墙段 */
function lmGreatwall(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(22, 3.2, 2.4), STONE, 0, 1.6, 0));
  for (let i = -4; i <= 4; i++) {
    g.add(mesh(new THREE.BoxGeometry(1.6, 1.2, 2.6), GRAYSTONE, i * 2.4, 3.8, 0));
  }
  // 敌楼
  g.add(mesh(new THREE.BoxGeometry(4.5, 5, 4.5), STONE, -2, 2.5, 0));
  g.add(mesh(new THREE.BoxGeometry(5.2, 0.7, 5.2), GRAYSTONE, -2, 5.3, 0));
  g.add(mesh(new THREE.BoxGeometry(4.5, 5, 4.5), STONE, 8, 2.5, 0));
  g.add(mesh(new THREE.BoxGeometry(5.2, 0.7, 5.2), GRAYSTONE, 8, 5.3, 0));
  return g;
}

/** 应县木塔风格多层塔 */
function lmPagoda(): THREE.Group {
  const g = new THREE.Group();
  const tiers = [
    { y: 1.5, w: 5.5, h: 3 },
    { y: 4.6, w: 4.6, h: 2.6 },
    { y: 7.4, w: 3.7, h: 2.4 },
    { y: 10.0, w: 2.8, h: 2.2 },
    { y: 12.3, w: 2.0, h: 2.0 },
  ];
  for (const t of tiers) {
    g.add(mesh(new THREE.CylinderGeometry(t.w * 0.42, t.w * 0.48, t.h, 8), WOOD, 0, t.y, 0));
    g.add(mesh(new THREE.CylinderGeometry(t.w * 0.55, t.w * 0.55, 0.35, 8), DARKROOF, 0, t.y + t.h * 0.5, 0));
  }
  g.add(mesh(new THREE.ConeGeometry(1.4, 2.2, 8), GOLDROOF, 0, 14.2, 0));
  return g;
}

/** 大雁塔四方密檐 */
function lmDayan(): THREE.Group {
  const g = new THREE.Group();
  const levels = [5.5, 4.6, 3.8, 3.1, 2.5, 2.0, 1.6];
  let y = 0;
  for (let i = 0; i < levels.length; i++) {
    const w = levels[i];
    const h = 2.0 - i * 0.08;
    g.add(mesh(new THREE.BoxGeometry(w, h, w), SANDSTONE, 0, y + h / 2, 0));
    g.add(mesh(new THREE.BoxGeometry(w + 0.6, 0.25, w + 0.6), GRAYSTONE, 0, y + h, 0));
    y += h + 0.15;
  }
  g.add(mesh(new THREE.BoxGeometry(1.2, 1.5, 1.2), SANDSTONE, 0, y + 0.75, 0));
  return g;
}

/** 竹林与大熊猫简模 */
function lmPanda(): THREE.Group {
  const g = new THREE.Group();
  // 竹丛
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const r = 3.5 + (i % 3) * 0.8;
    const h = 6 + (i % 4) * 1.2;
    g.add(mesh(new THREE.CylinderGeometry(0.12, 0.16, h, 5), BAMBOO, Math.cos(a) * r, h / 2, Math.sin(a) * r));
    g.add(mesh(new THREE.ConeGeometry(0.6, 1.4, 5), GREENLEAF, Math.cos(a) * r, h + 0.4, Math.sin(a) * r));
  }
  // 熊猫身体
  const body = mesh(new THREE.SphereGeometry(1.3, 8, 6), WHITE, 0, 1.4, 0, 1.1, 0.95, 1.0);
  g.add(body);
  g.add(mesh(new THREE.SphereGeometry(0.85, 8, 6), WHITE, 0, 2.9, 0.2));
  // 黑耳黑眼黑肢
  const BLACK = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.85, flatShading: true });
  g.add(mesh(new THREE.SphereGeometry(0.28, 6, 5), BLACK, -0.55, 3.4, 0.1));
  g.add(mesh(new THREE.SphereGeometry(0.28, 6, 5), BLACK, 0.55, 3.4, 0.1));
  g.add(mesh(new THREE.SphereGeometry(0.22, 6, 5), BLACK, -0.35, 2.95, 0.85));
  g.add(mesh(new THREE.SphereGeometry(0.22, 6, 5), BLACK, 0.35, 2.95, 0.85));
  g.add(mesh(new THREE.SphereGeometry(0.45, 6, 5), BLACK, -1.1, 0.7, 0.5));
  g.add(mesh(new THREE.SphereGeometry(0.45, 6, 5), BLACK, 1.1, 0.7, 0.5));
  return g;
}

/** 傣塔 / 白塔 */
function lmStupa(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(3.2, 3.6, 1.2, 8), WHITE, 0, 0.6, 0));
  g.add(mesh(new THREE.CylinderGeometry(2.2, 2.8, 3.5, 8), WHITE, 0, 3.0, 0));
  g.add(mesh(new THREE.SphereGeometry(2.0, 8, 6), WHITE, 0, 6.2, 0, 1, 1.15, 1));
  g.add(mesh(new THREE.CylinderGeometry(0.9, 1.4, 2.2, 8), WHITE, 0, 8.5, 0));
  g.add(mesh(new THREE.ConeGeometry(1.6, 3.5, 8), GOLDROOF, 0, 11.2, 0));
  g.add(mesh(new THREE.SphereGeometry(0.35, 6, 5), GOLDROOF, 0, 13.2, 0));
  return g;
}

/** 侗族鼓楼 */
function lmDrumtower(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(1.8, 2.2, 4, 6), DARKWOOD, 0, 2, 0));
  const eaves = [4.5, 3.8, 3.1, 2.4, 1.7];
  let y = 4.2;
  for (const w of eaves) {
    g.add(mesh(new THREE.CylinderGeometry(0.6, 0.9, 1.1, 6), WOOD, 0, y, 0));
    g.add(mesh(new THREE.ConeGeometry(w * 0.55, 0.7, 6), BLACKTILE, 0, y + 0.7, 0));
    y += 1.35;
  }
  g.add(mesh(new THREE.ConeGeometry(1.4, 2.0, 6), GOLDROOF, 0, y + 0.6, 0));
  return g;
}

/** 张家界石峰 */
function lmPillars(): THREE.Group {
  const g = new THREE.Group();
  const pillars: [number, number, number, number][] = [
    [-3, 0, 0, 14], [0, 0, -2, 18], [3.5, 0, 1, 12], [-1.5, 0, 3, 10], [5, 0, -1, 9],
  ];
  for (const [x, , z, h] of pillars) {
    g.add(mesh(new THREE.CylinderGeometry(0.9 + h * 0.02, 1.4 + h * 0.03, h, 6), SANDSTONE, x, h / 2, z));
    g.add(mesh(new THREE.ConeGeometry(1.0, 1.6, 5), GREENLEAF, x, h + 0.5, z));
  }
  return g;
}

/** 黄鹤楼简模 */
function lmCraneTower(): THREE.Group {
  const g = new THREE.Group();
  const floors = [
    { y: 2.0, w: 7, h: 3.5 },
    { y: 5.8, w: 5.5, h: 3.0 },
    { y: 9.2, w: 4.2, h: 2.6 },
  ];
  for (const f of floors) {
    g.add(mesh(new THREE.BoxGeometry(f.w, f.h, f.w), REDWALL, 0, f.y, 0));
    g.add(mesh(new THREE.ConeGeometry(f.w * 0.75, 1.2, 4), GOLDROOF, 0, f.y + f.h * 0.55, 0, 1, 1, 1, 0, Math.PI / 4, 0));
  }
  g.add(mesh(new THREE.ConeGeometry(2.2, 2.4, 4), GOLDROOF, 0, 12.2, 0, 1, 1, 1, 0, Math.PI / 4, 0));
  return g;
}

/** 徽派马头墙民居 */
function lmHuizhou(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(8, 4, 5), PINKWALL, 0, 2, 0));
  g.add(mesh(new THREE.BoxGeometry(6, 3.5, 4.5), PINKWALL, 5.5, 1.75, 0.5));
  // 马头墙阶梯
  for (const [x, h] of [[-4.2, 5.5], [-2.5, 6.2], [0, 5.8], [2.5, 6.5], [4.2, 5.2], [7.5, 5.0]] as const) {
    g.add(mesh(new THREE.BoxGeometry(0.4, h, 5.2), PINKWALL, x, h / 2, 0));
    g.add(mesh(new THREE.BoxGeometry(0.6, 0.3, 5.4), BLACKTILE, x, h, 0));
  }
  g.add(mesh(new THREE.BoxGeometry(8.5, 0.4, 5.5), BLACKTILE, 0, 4.2, 0));
  g.add(mesh(new THREE.BoxGeometry(6.5, 0.35, 5), BLACKTILE, 5.5, 3.7, 0.5));
  return g;
}

/** 园林亭台 */
function lmPavilion(): THREE.Group {
  const g = new THREE.Group();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    g.add(mesh(new THREE.CylinderGeometry(0.18, 0.22, 4.5, 5), WOOD, Math.cos(a) * 2.4, 2.25, Math.sin(a) * 2.4));
  }
  g.add(mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.4, 6), WOOD, 0, 4.5, 0));
  g.add(mesh(new THREE.ConeGeometry(4.2, 2.2, 6), BLACKTILE, 0, 5.6, 0));
  g.add(mesh(new THREE.CylinderGeometry(3.2, 3.2, 0.25, 6), WOOD, 0, 0.15, 0));
  return g;
}

/** 断桥残雪亭（亭 + 小桥） */
function lmWestlake(): THREE.Group {
  const g = new THREE.Group();
  g.add(lmPavilion());
  // 拱桥
  g.add(mesh(new THREE.BoxGeometry(8, 0.5, 2.2), STONE, 6, 0.8, 0));
  g.add(mesh(new THREE.BoxGeometry(2.5, 1.4, 2.4), STONE, 4, 0.7, 0));
  g.add(mesh(new THREE.BoxGeometry(2.5, 1.4, 2.4), STONE, 8, 0.7, 0));
  for (const x of [3, 5, 7, 9]) {
    g.add(mesh(new THREE.CylinderGeometry(0.12, 0.12, 1.2, 5), STONE, x, 1.5, 1.0));
    g.add(mesh(new THREE.CylinderGeometry(0.12, 0.12, 1.2, 5), STONE, x, 1.5, -1.0));
  }
  return g;
}

/** 圆形土楼 */
function lmTulou(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(7, 7.2, 6, 16), EARTH, 0, 3, 0));
  // 内院挖空感：矮内环
  g.add(mesh(new THREE.CylinderGeometry(4.2, 4.2, 5.5, 12), PINKWALL, 0, 2.75, 0));
  g.add(mesh(new THREE.CylinderGeometry(7.5, 7.5, 0.5, 16), BLACKTILE, 0, 6.2, 0));
  // 门洞
  g.add(mesh(new THREE.BoxGeometry(2.2, 3.2, 1.2), DARKWOOD, 0, 1.6, 7.1));
  return g;
}

/** 广州塔细高简模 */
function lmCantonTower(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(1.6, 2.4, 3, 8), GRAYSTONE, 0, 1.5, 0));
  // 扭转腰身：若干扁环
  for (let i = 0; i < 10; i++) {
    const t = i / 9;
    const y = 3.5 + i * 2.0;
    const r = 1.8 - Math.sin(t * Math.PI) * 0.9;
    const mat = i % 2 === 0 ? ORANGEACCENT : GRAYSTONE;
    g.add(mesh(new THREE.CylinderGeometry(r, r + 0.15, 1.7, 8), mat, 0, y, 0));
  }
  g.add(mesh(new THREE.CylinderGeometry(0.35, 0.5, 6, 6), GRAYSTONE, 0, 27, 0));
  g.add(mesh(new THREE.SphereGeometry(0.6, 6, 5), ORANGEACCENT, 0, 30.5, 0));
  return g;
}

/** 象鼻山拱门 */
function lmKarstArch(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(2.2, 2.8, 10, 6), GRAYSTONE, -3, 5, 0));
  g.add(mesh(new THREE.CylinderGeometry(2.0, 2.5, 8, 6), GRAYSTONE, 3, 4, 0));
  // 拱顶
  g.add(mesh(new THREE.TorusGeometry(4.5, 1.4, 6, 10, Math.PI), GRAYSTONE, 0, 8, 0, 1, 1, 1, 0, 0, Math.PI));
  g.add(mesh(new THREE.ConeGeometry(1.5, 2.5, 5), GREENLEAF, -3, 10.5, 0));
  g.add(mesh(new THREE.ConeGeometry(1.2, 2.0, 5), GREENLEAF, 3, 8.5, 0));
  return g;
}

/** 椰树 + 木屋 */
function lmCoconut(): THREE.Group {
  const g = new THREE.Group();
  // 木屋
  g.add(mesh(new THREE.BoxGeometry(5, 3, 4), WOOD, 0, 1.5, 0));
  g.add(mesh(new THREE.ConeGeometry(4, 2, 4), DARKROOF, 0, 4.0, 0, 1, 1, 1, 0, Math.PI / 4, 0));
  g.add(mesh(new THREE.BoxGeometry(1.2, 2.0, 0.3), DARKWOOD, 0, 1.1, 2.1));
  // 椰树
  for (const [x, z] of [[-5, 2], [5.5, -1], [-3, -4]] as const) {
    g.add(mesh(new THREE.CylinderGeometry(0.2, 0.35, 9, 5), WOOD, x, 4.5, z, 1, 1, 1, 0.15, 0, 0));
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      const leaf = mesh(new THREE.BoxGeometry(0.3, 0.15, 3.5), GREENLEAF, x + Math.cos(a) * 1.2, 9.2, z + Math.sin(a) * 1.2);
      leaf.lookAt(x, 8.5, z);
      g.add(leaf);
    }
  }
  return g;
}

/** 少林寺院山门 */
function lmShaolin(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(10, 5, 3), REDWALL, 0, 2.5, 0));
  g.add(mesh(new THREE.BoxGeometry(3.5, 3.5, 0.4), DARKWOOD, 0, 1.9, 1.6));
  g.add(mesh(new THREE.BoxGeometry(12, 1.0, 5), GOLDROOF, 0, 5.5, 0));
  g.add(mesh(new THREE.ConeGeometry(7, 1.8, 4), GOLDROOF, 0, 6.8, 0, 1, 1, 1, 0, Math.PI / 4, 0));
  for (const x of [-6, 6]) {
    g.add(mesh(new THREE.BoxGeometry(2, 6, 2), REDWALL, x, 3, 0));
    g.add(mesh(new THREE.ConeGeometry(1.6, 1.2, 4), GOLDROOF, x, 6.5, 0, 1, 1, 1, 0, Math.PI / 4, 0));
  }
  return g;
}

/** 泰山石阶牌坊 */
function lmTaishan(): THREE.Group {
  const g = new THREE.Group();
  // 牌坊
  for (const x of [-3.5, 3.5]) {
    g.add(mesh(new THREE.BoxGeometry(1.2, 8, 1.2), STONE, x, 4, 0));
  }
  g.add(mesh(new THREE.BoxGeometry(9, 1.2, 1.6), STONE, 0, 7.5, 0));
  g.add(mesh(new THREE.BoxGeometry(10, 0.6, 2.0), GRAYSTONE, 0, 8.4, 0));
  g.add(mesh(new THREE.BoxGeometry(5, 0.8, 1.4), STONE, 0, 5.5, 0));
  // 石阶
  for (let i = 0; i < 8; i++) {
    g.add(mesh(new THREE.BoxGeometry(5 - i * 0.15, 0.35, 1.2), STONE, 0, 0.2 + i * 0.35, 2 + i * 1.0));
  }
  return g;
}

/** 故宫式屋顶 / 城楼 */
function lmPalaceRoof(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(10, 4.5, 6), REDWALL, 0, 2.25, 0));
  g.add(mesh(new THREE.BoxGeometry(12, 0.8, 8), GOLDROOF, 0, 4.9, 0));
  g.add(mesh(new THREE.BoxGeometry(8, 2.5, 5), REDWALL, 0, 6.5, 0));
  g.add(mesh(new THREE.ConeGeometry(7, 2.4, 4), GOLDROOF, 0, 8.8, 0, 1, 1, 1, 0, Math.PI / 4, 0));
  for (const x of [-4, -1.3, 1.3, 4]) {
    g.add(mesh(new THREE.BoxGeometry(1.3, 2.4, 0.3), DARKWOOD, x, 1.3, 3.1));
  }
  return g;
}

/** 天池观景台 */
function lmChangbai(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(4.5, 5, 0.6, 8), STONE, 0, 0.3, 0));
  g.add(mesh(new THREE.CylinderGeometry(3.5, 3.5, 0.4, 8), WOOD, 0, 0.8, 0));
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    g.add(mesh(new THREE.CylinderGeometry(0.15, 0.15, 2.8, 5), WOOD, Math.cos(a) * 3.8, 2.0, Math.sin(a) * 3.8));
  }
  g.add(mesh(new THREE.TorusGeometry(3.9, 0.12, 6, 16), WOOD, 0, 3.4, 0, 1, 1, 1, Math.PI / 2, 0, 0));
  // 望远檐
  g.add(mesh(new THREE.ConeGeometry(2.5, 1.5, 6), DARKROOF, 0, 4.5, 0));
  g.add(mesh(new THREE.CylinderGeometry(0.8, 0.8, 2, 6), WOOD, 0, 3.2, 0));
  return g;
}

/** 冰雕塔 */
function lmIceTower(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(2.5, 3.2, 2, 8), ICE, 0, 1, 0));
  g.add(mesh(new THREE.CylinderGeometry(1.8, 2.4, 4, 8), ICE, 0, 4, 0));
  g.add(mesh(new THREE.CylinderGeometry(1.0, 1.6, 3.5, 8), ICE, 0, 7.5, 0));
  g.add(mesh(new THREE.ConeGeometry(1.4, 3.5, 8), ICE, 0, 11, 0));
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    g.add(mesh(new THREE.BoxGeometry(0.4, 2.5, 0.4), ICE, Math.cos(a) * 3.5, 1.5, Math.sin(a) * 3.5));
  }
  return g;
}


/** 圣瓦西里式彩色洋葱穹顶 */
function lmOnionCathedral(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(10, 3.2, 8), WHITE, 0, 1.6, 0));
  g.add(mesh(new THREE.BoxGeometry(11, 0.4, 9), STONE, 0, 0.2, 0));
  const domes: [number, number, THREE.Material, number][] = [
    [-3.2, -1.5, ONION_GREEN, 0.95],
    [3.2, -1.5, ONION_BLUE, 0.95],
    [-2.8, 2.2, ONION_TEAL, 0.85],
    [2.8, 2.2, GOLDROOF, 0.85],
    [0, -2.8, ONION_RED, 0.75],
    [-3.5, 0.5, ONION_RED, 0.7],
  ];
  for (const [x, z, mat, s] of domes) {
    g.add(mesh(new THREE.CylinderGeometry(0.9 * s, 1.05 * s, 2.4 * s, 8), WHITE, x, 3.2 + 1.2 * s, z));
    g.add(mesh(new THREE.SphereGeometry(1.35 * s, 8, 6), mat, x, 3.2 + 2.6 * s, z, 1, 1.35, 1));
    g.add(mesh(new THREE.ConeGeometry(0.35 * s, 1.1 * s, 6), GOLDROOF, x, 3.2 + 4.1 * s, z));
  }
  // 中央主塔更高
  g.add(mesh(new THREE.CylinderGeometry(1.2, 1.4, 4.5, 8), WHITE, 0, 5.5, 0));
  g.add(mesh(new THREE.SphereGeometry(1.8, 8, 6), ONION_GREEN, 0, 8.6, 0, 1, 1.4, 1));
  g.add(mesh(new THREE.ConeGeometry(0.45, 1.6, 6), GOLDROOF, 0, 10.5, 0));
  return g;
}

/** 西伯利亚原木木屋（izba） */
function lmIzba(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(7, 3.4, 5.5), WOOD, 0, 1.7, 0));
  // 原木横纹感：几道深色条
  for (let i = 0; i < 5; i++) {
    g.add(mesh(new THREE.BoxGeometry(7.1, 0.18, 5.6), DARKWOOD, 0, 0.5 + i * 0.7, 0));
  }
  g.add(mesh(new THREE.ConeGeometry(5.2, 2.6, 4), SNOWWHITE, 0, 4.7, 0, 1, 1, 1, 0, Math.PI / 4, 0));
  g.add(mesh(new THREE.BoxGeometry(1.4, 2.2, 0.35), DARKWOOD, 0, 1.2, 2.85));
  g.add(mesh(new THREE.BoxGeometry(1.1, 1.0, 0.2), GLASS, -2.0, 2.0, 2.8));
  g.add(mesh(new THREE.BoxGeometry(1.1, 1.0, 0.2), GLASS, 2.0, 2.0, 2.8));
  // 烟囱
  g.add(mesh(new THREE.BoxGeometry(0.7, 2.2, 0.7), STONE, 2.2, 5.5, -0.8));
  return g;
}

/** 贝加尔湖木栈桥 */
function lmBaikalPier(): THREE.Group {
  const g = new THREE.Group();
  // 栈桥板
  g.add(mesh(new THREE.BoxGeometry(3.2, 0.25, 16), WOOD, 0, 0.8, 4));
  for (const z of [0, 4, 8, 12]) {
    g.add(mesh(new THREE.CylinderGeometry(0.18, 0.22, 1.6, 5), DARKWOOD, -1.3, 0.4, z));
    g.add(mesh(new THREE.CylinderGeometry(0.18, 0.22, 1.6, 5), DARKWOOD, 1.3, 0.4, z));
  }
  // 栏杆
  for (const x of [-1.4, 1.4]) {
    g.add(mesh(new THREE.BoxGeometry(0.12, 0.9, 16), WOOD, x, 1.4, 4));
  }
  // 岸边小屋
  g.add(mesh(new THREE.BoxGeometry(4, 2.4, 3.5), WOOD, 0, 1.2, -4));
  g.add(mesh(new THREE.ConeGeometry(3.2, 1.6, 4), SNOWWHITE, 0, 3.2, -4, 1, 1, 1, 0, Math.PI / 4, 0));
  // 冰缘块
  for (const [x, z] of [[-3, 2], [3.5, 6], [-2.5, 10]] as const) {
    g.add(mesh(new THREE.DodecahedronGeometry(0.7, 0), ICE, x, 0.35, z, 1.2, 0.5, 1));
  }
  return g;
}

/** 苔原驯鹿营地帐篷 */
function lmTundraTent(): THREE.Group {
  const g = new THREE.Group();
  // 主圆锥帐篷
  g.add(mesh(new THREE.ConeGeometry(3.2, 5.5, 8), TENTHIDE, 0, 2.75, 0));
  g.add(mesh(new THREE.CylinderGeometry(0.12, 0.12, 6.2, 5), WOOD, 0, 3.1, 0));
  // 侧帐
  g.add(mesh(new THREE.ConeGeometry(2.2, 3.8, 7), TENTHIDE, 5.5, 1.9, 1.5));
  // 营火石圈
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    g.add(mesh(new THREE.DodecahedronGeometry(0.28, 0), STONE, Math.cos(a) * 1.4 - 4, 0.2, Math.sin(a) * 1.4));
  }
  g.add(mesh(new THREE.ConeGeometry(0.5, 1.2, 5), ORANGEACCENT, -4, 0.7, 0));
  // 简易驯鹿
  const deer = new THREE.Group();
  deer.position.set(-6, 0, 3);
  deer.add(mesh(new THREE.SphereGeometry(0.55, 6, 5), DEERBROWN, 0, 1.1, 0, 1.4, 0.9, 0.8));
  deer.add(mesh(new THREE.SphereGeometry(0.35, 6, 5), DEERBROWN, 0.7, 1.55, 0));
  deer.add(mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.9, 4), DEERBROWN, 0.85, 2.1, -0.15, 1, 1, 1, 0.4, 0, 0.2));
  deer.add(mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.9, 4), DEERBROWN, 0.85, 2.1, 0.15, 1, 1, 1, -0.4, 0, -0.2));
  for (const [x, z] of [[-0.35, 0.3], [0.25, 0.3], [-0.35, -0.3], [0.25, -0.3]] as const) {
    deer.add(mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.9, 4), DEERBROWN, x, 0.45, z));
  }
  g.add(deer);
  return g;
}

/** 伏尔加河岸木磨坊 */
function lmVolgaMill(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(2.0, 2.6, 9, 8), WOOD, 0, 4.5, 0));
  g.add(mesh(new THREE.ConeGeometry(2.8, 2.0, 8), SNOWWHITE, 0, 10.2, 0));
  g.add(mesh(new THREE.BoxGeometry(4, 2.5, 3.5), WOOD, 3.5, 1.25, 0));
  g.add(mesh(new THREE.ConeGeometry(3.2, 1.5, 4), DARKROOF, 3.5, 3.2, 0, 1, 1, 1, 0, Math.PI / 4, 0));
  // 磨翼（静态扇叶，buildPois 会挂旋转）
  const hub = new THREE.Group();
  hub.name = 'volgaHub';
  hub.position.set(0, 8.2, 2.5);
  const axle = mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.6, 6), DARKWOOD, 0, 0, 0);
  axle.rotation.x = Math.PI / 2;
  hub.add(axle);
  for (let i = 0; i < 4; i++) {
    const arm = new THREE.Group();
    arm.add(mesh(new THREE.BoxGeometry(0.45, 7.5, 0.12), WOOD, 0, 3.9, 0));
    arm.rotation.z = (i / 4) * Math.PI * 2;
    hub.add(arm);
  }
  g.add(hub);
  return g;
}

/** 波罗的海冷色灯塔 */
function lmBalticLighthouse(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(3.2, 3.6, 1.0, 10), STONE, 0, 0.5, 0));
  g.add(mesh(new THREE.CylinderGeometry(1.1, 1.9, 14, 10), SNOWWHITE, 0, 8, 0));
  for (const [yy, hh] of [[4.5, 1.8], [9.0, 1.8]] as const) {
    g.add(mesh(
      new THREE.CylinderGeometry(1.1 + (14 - yy) * 0.057, 1.1 + (14 - yy - hh) * 0.057, hh, 10),
      BALTICBAND, 0, yy, 0,
    ));
  }
  const lamp = mesh(new THREE.CylinderGeometry(0.95, 0.95, 1.8, 8), COLDGLASS, 0, 15.8, 0);
  lamp.name = 'balticLamp';
  g.add(lamp);
  g.add(mesh(new THREE.ConeGeometry(1.4, 1.3, 8), BALTICBAND, 0, 17.3, 0));
  // 灯束
  const beamMat = new THREE.MeshBasicMaterial({
    color: 0xc8e4ff, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide,
  });
  const beamGeo = new THREE.ConeGeometry(3.0, 24, 4, 1, true);
  beamGeo.translate(0, -12, 0);
  const beam = new THREE.Mesh(beamGeo, beamMat);
  beam.rotation.z = Math.PI / 2;
  const beamGrp = new THREE.Group();
  beamGrp.name = 'balticBeam';
  beamGrp.position.y = 15.8;
  beamGrp.add(beam);
  beamGrp.userData.beamMat = beamMat;
  g.add(beamGrp);
  return g;
}

/** 乌拉尔林海木哨塔 */
function lmUralWatchtower(): THREE.Group {
  const g = new THREE.Group();
  for (const [x, z] of [[-1.6, -1.6], [1.6, -1.6], [-1.6, 1.6], [1.6, 1.6]] as const) {
    g.add(mesh(new THREE.CylinderGeometry(0.22, 0.28, 12, 5), WOOD, x, 6, z));
  }
  g.add(mesh(new THREE.BoxGeometry(4.2, 0.35, 4.2), WOOD, 0, 10.2, 0));
  g.add(mesh(new THREE.BoxGeometry(3.8, 2.4, 3.8), WOOD, 0, 11.5, 0));
  g.add(mesh(new THREE.ConeGeometry(3.2, 1.8, 4), SNOWWHITE, 0, 13.6, 0, 1, 1, 1, 0, Math.PI / 4, 0));
  // 斜撑
  for (const [x, z] of [[-1.6, -1.6], [1.6, 1.6]] as const) {
    g.add(mesh(new THREE.BoxGeometry(0.18, 7, 0.18), DARKWOOD, x * 0.5, 5, z * 0.5, 1, 1, 1, 0.35, 0, 0.35));
  }
  g.add(mesh(new THREE.BoxGeometry(0.8, 1.6, 0.15), DARKWOOD, 0, 11.3, 1.95));
  return g;
}

/** 极光观测玻璃穹顶 */
function lmAuroraDome(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(4.5, 5.0, 1.2, 10), STONE, 0, 0.6, 0));
  g.add(mesh(new THREE.CylinderGeometry(3.8, 4.0, 2.8, 10), WHITE, 0, 2.4, 0));
  const dome = mesh(new THREE.SphereGeometry(4.2, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), COLDGLASS, 0, 3.6, 0);
  dome.name = 'auroraDomeGlass';
  g.add(dome);
  // 穹顶骨架
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    g.add(mesh(new THREE.TorusGeometry(4.0, 0.08, 4, 12, Math.PI * 0.55), GRAYSTONE, 0, 3.6, 0, 1, 1, 1, 0, a, Math.PI / 2));
  }
  g.add(mesh(new THREE.CylinderGeometry(0.4, 0.5, 2.5, 6), GRAYSTONE, 0, 7.2, 0));
  g.add(mesh(new THREE.SphereGeometry(0.55, 6, 5), ONION_GREEN, 0, 8.6, 0));
  // 侧翼仪器房
  g.add(mesh(new THREE.BoxGeometry(3.5, 2.2, 3), WHITE, 5.5, 1.1, 0));
  g.add(mesh(new THREE.BoxGeometry(3.7, 0.3, 3.2), BALTICBAND, 5.5, 2.3, 0));
  return g;
}


const LANDMARK_BUILDERS: Record<LandmarkKind, () => THREE.Group> = {
  tiananmen: lmTiananmen,
  greatwall: lmGreatwall,
  pagoda: lmPagoda,
  dayan: lmDayan,
  panda: lmPanda,
  stupa: lmStupa,
  drumtower: lmDrumtower,
  pillars: lmPillars,
  crane_tower: lmCraneTower,
  huizhou: lmHuizhou,
  pavilion: lmPavilion,
  westlake: lmWestlake,
  tulou: lmTulou,
  canton_tower: lmCantonTower,
  karst_arch: lmKarstArch,
  coconut: lmCoconut,
  shaolin: lmShaolin,
  taishan: lmTaishan,
  palace_roof: lmPalaceRoof,
  changbai: lmChangbai,
  ice_tower: lmIceTower,
  onion_cathedral: lmOnionCathedral,
  izba: lmIzba,
  baikal_pier: lmBaikalPier,
  tundra_tent: lmTundraTent,
  volga_mill: lmVolgaMill,
  baltic_lighthouse: lmBalticLighthouse,
  ural_watchtower: lmUralWatchtower,
  aurora_dome: lmAuroraDome,
};

const LANDMARK_POLE_H: Partial<Record<LandmarkKind, number>> = {
  tiananmen: 12,
  greatwall: 10,
  pagoda: 18,
  dayan: 18,
  panda: 12,
  stupa: 16,
  drumtower: 16,
  pillars: 22,
  crane_tower: 16,
  huizhou: 10,
  pavilion: 10,
  westlake: 10,
  tulou: 12,
  canton_tower: 34,
  karst_arch: 14,
  coconut: 14,
  shaolin: 12,
  taishan: 14,
  palace_roof: 14,
  changbai: 10,
  ice_tower: 16,
  onion_cathedral: 16,
  izba: 10,
  baikal_pier: 8,
  tundra_tent: 10,
  volga_mill: 16,
  baltic_lighthouse: 22,
  ural_watchtower: 18,
  aurora_dome: 14,
};

function buildGenericStructure(g: THREE.Group, type: string, animatables: Animatable[]): void {
  if (type === 'windmill') {
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 2.7, 11, 8), WHITE);
    tower.position.y = 5.5;
    tower.castShadow = true;
    g.add(tower);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(1.95, 1.5, 8), DARKROOF);
    cap.position.y = 11.7;
    g.add(cap);

    const hub = new THREE.Group();
    hub.position.set(0, 10.4, 2.4);
    const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.5, 8), WOOD);
    axle.rotation.x = Math.PI / 2;
    hub.add(axle);
    for (let i = 0; i < 4; i++) {
      const arm = new THREE.Group();
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.55, 8.6, 0.1), WHITE);
      b.position.y = 4.5;
      arm.add(b);
      arm.rotation.z = (i / 4) * Math.PI * 2;
      hub.add(arm);
    }
    g.add(hub);
    animatables.push({ tick: (dt) => { hub.rotation.z += dt * 0.7; } });

  } else if (type === 'observatory') {
    const base = new THREE.Mesh(new THREE.CylinderGeometry(5.2, 5.6, 0.6, 8), WOOD);
    base.position.y = 0.3;
    base.castShadow = true;
    g.add(base);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      const c = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 3.4, 6), WOOD);
      c.position.set(Math.cos(a) * 4.2, 2.2, Math.sin(a) * 4.2);
      c.castShadow = true;
      g.add(c);
    }
    const roof = new THREE.Mesh(new THREE.ConeGeometry(6.4, 2.4, 4), DARKROOF);
    roof.position.y = 4.9;
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = true;
    g.add(roof);
    for (const s of [-1, 1]) {
      const chair = new THREE.Group();
      chair.add(new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.12, 1.9), WOOD));
      const back = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.9, 0.12), WOOD);
      back.position.set(0, 0.42, -0.85);
      back.rotation.x = -0.4;
      chair.add(back);
      chair.position.set(s * 1.6, 0.72, 0);
      chair.rotation.y = s * 0.4;
      g.add(chair);
    }

  } else if (type === 'lighthouse') {
    const base = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 3.9, 1.2, 10), WHITE);
    base.position.y = 0.6;
    g.add(base);
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 2.0, 13, 10), WHITE);
    tower.position.y = 7.6;
    tower.castShadow = true;
    g.add(tower);
    for (const [yy, hh] of [[4.2, 1.7], [8.2, 1.7]] as const) {
      const bandMat = DARKROOF.clone();
      bandMat.color.setHex(0xd8574e);
      const band = new THREE.Mesh(
        new THREE.CylinderGeometry(1.15 + (13 - yy) * 0.065, 1.15 + (13 - yy - hh) * 0.065, hh, 10),
        bandMat
      );
      band.position.y = yy;
      g.add(band);
    }
    const lampRoom = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, 1.7, 8), GLASS);
    lampRoom.position.y = 15.0;
    g.add(lampRoom);
    const top = new THREE.Mesh(new THREE.ConeGeometry(1.45, 1.2, 8), DARKROOF);
    top.position.y = 16.4;
    g.add(top);

    const beamMat = new THREE.MeshBasicMaterial({
      color: 0xfff2b0, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide
    });
    const beamGeo = new THREE.ConeGeometry(3.2, 26, 4, 1, true);
    beamGeo.translate(0, -13, 0);
    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.rotation.z = Math.PI / 2;
    const beamGrp = new THREE.Group();
    beamGrp.position.y = 15.0;
    beamGrp.add(beam);
    g.add(beamGrp);
    animatables.push({
      tick: (dt, ctx) => {
        beamGrp.rotation.y += dt * 0.9;
        beamMat.opacity = ctx.night * 0.16;
      }
    });
  }
}

export function buildPois(scene: THREE.Scene, world: World): Animatable[] {
  const animatables: Animatable[] = [];

  for (const poi of world.pois) {
    const g = new THREE.Group();
    g.position.copy(poi.pos);
    g.lookAt(poi.roadPos.x, poi.pos.y, poi.roadPos.z);
    scene.add(g);

    // 地标主体：有 landmark 则建简模，否则走通用风车/观景台/灯塔
    if (poi.landmark && LANDMARK_BUILDERS[poi.landmark]) {
      g.add(LANDMARK_BUILDERS[poi.landmark]());
      // 俄罗斯部分地标的轻量动画
      if (poi.landmark === 'volga_mill') {
        const hub = g.getObjectByName('volgaHub');
        if (hub) animatables.push({ tick: (dt) => { hub.rotation.z += dt * 0.55; } });
      } else if (poi.landmark === 'baltic_lighthouse') {
        const beamGrp = g.getObjectByName('balticBeam');
        if (beamGrp) {
          const beamMat = beamGrp.userData.beamMat as THREE.MeshBasicMaterial;
          animatables.push({
            tick: (dt, ctx) => {
              beamGrp.rotation.y += dt * 0.85;
              if (beamMat) beamMat.opacity = ctx.night * 0.18;
            },
          });
        }
      } else if (poi.landmark === 'aurora_dome') {
        const glass = g.getObjectByName('auroraDomeGlass') as THREE.Mesh | undefined;
        const mat = glass?.material as THREE.MeshStandardMaterial | undefined;
        if (mat) {
          animatables.push({
            tick: (_dt, ctx, time) => {
              mat.emissiveIntensity = 0.12 + ctx.night * (0.35 + Math.sin(time * 1.4) * 0.15);
            },
          });
        }
      }
    } else if (poi.type === 'windmill' || poi.type === 'observatory' || poi.type === 'lighthouse') {
      buildGenericStructure(g, poi.type, animatables);
    }

    // 湖面水域（与 landmark 可并存）
    if (poi.type === 'lake') {
      const coldLake = world.packId === 'russia';
      const water = new THREE.Mesh(
        new THREE.CircleGeometry(poi.radius * 0.99, 40),
        new THREE.MeshStandardMaterial({
          color: coldLake ? 0x2a5a78 : 0x3f8fc9,
          roughness: 0.12, metalness: coldLake ? 0.45 : 0.35,
          transparent: true, opacity: 0.94,
        })
      );
      water.rotation.x = -Math.PI / 2;
      water.position.y = (poi.waterLevel ?? 0) + 0.06;
      scene.add(water);
      const level = poi.waterLevel ?? 0;
      animatables.push({
        tick: (_dt, _ctx, t) => { water.position.y = level + 0.06 + Math.sin(t * 1.3) * 0.03; }
      });
    }

    // 花海（与 landmark 可并存）
    if (poi.type === 'meadow') {
      const count = 650;
      const inst = new THREE.InstancedMesh(
        new THREE.IcosahedronGeometry(0.14, 0).scale(1, 0.8, 1).translate(0, 0.2, 0),
        new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6, flatShading: true }),
        count
      );
      inst.castShadow = true;
      const palette = [0xff8fb5, 0xffd166, 0xff6b6b, 0xffffff, 0xc39bff, 0xffa94d, 0xffe08a];
      const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
      const pv = new THREE.Vector3(), sv = new THREE.Vector3(), col = new THREE.Color();
      let placed = 0, guard = 0;
      while (placed < count && guard++ < count * 6) {
        const a = Math.random() * Math.PI * 2;
        const rr = Math.sqrt(Math.random()) * poi.radius;
        const x = poi.pos.x + Math.cos(a) * rr;
        const z = poi.pos.z + Math.sin(a) * rr;
        const y = world.heightAt(x, z);
        if (y < (poi.waterLevel ?? -1e9)) continue;
        pv.set(x, y, z);
        e.set(0, Math.random() * 6.28, 0);
        q.setFromEuler(e);
        const s = 0.8 + Math.random() * 1.4;
        sv.set(s, s * (0.8 + Math.random() * 0.5), s);
        m.compose(pv, q, sv);
        inst.setMatrixAt(placed, m);
        col.setHex(palette[Math.floor(Math.random() * palette.length)]);
        inst.setColorAt(placed, col);
        placed++;
      }
      inst.instanceMatrix.needsUpdate = true;
      scene.add(inst);
    }

    // ---- 浮动地标 ----
    const marker = new THREE.Group();
    const poiY = poi.type === 'lake' ? (poi.waterLevel ?? poi.pos.y) + 2.2 : poi.pos.y;
    marker.position.set(poi.pos.x, poiY, poi.pos.z);
    const poleH = poi.landmark
      ? (LANDMARK_POLE_H[poi.landmark] ?? 12)
      : poi.type === 'windmill' ? 15.5 : poi.type === 'lighthouse' ? 20 : poi.type === 'lake' ? 1.6 : 7.5;
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.05, poleH, 5),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 })
    );
    pole.position.y = poleH / 2;
    marker.add(pole);
    const gem = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.72, 0),
      new THREE.MeshBasicMaterial({ color: 0x59c8ff, transparent: true, opacity: 0.92 })
    );
    gem.position.y = poleH + 1.1;
    marker.add(gem);
    scene.add(marker);
    animatables.push({
      tick: (dt, _ctx, t) => {
        gem.rotation.y += dt * 1.6;
        gem.position.y = poleH + 1.1 + Math.sin(t * 2.2) * 0.28;
      }
    });
  }

  return animatables;
}