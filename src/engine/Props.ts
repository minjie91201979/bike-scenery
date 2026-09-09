import * as THREE from 'three';
import { rand, ROWS } from './World';
import type { World } from './World';
import type { LandmarkKind } from './types';

/* ============================================================
 *  道路两侧散布物（松树 / 阔叶树 / 灌木 / 石头 / 野花 + 各国特有植物）
 *  按段索引确定性生成，用实例池滚动复用
 * ============================================================ */

const POOL_SEGS = 210;
const TREES_PER_SEG = 2;
const BUSH_PER_SEG = 2;
const ROCK_PER_SEG = 1;
const FLOWER_PER_SEG = 4;

const DEFAULT_FLOWERS = [0xff8fb5, 0xffd166, 0xff6b6b, 0xffffff, 0xc39bff, 0xffa94d];
const PACK_FLOWERS: Record<string, number[]> = {
  japan: [0xff8fb5, 0xffc0d4, 0xffffff, 0xffd6e5, 0xf4a6c4, 0xffeef4],
  usa: [0xffd166, 0xffffff, 0xff6b6b, 0xffa94d, 0xffe08a, 0x7ec8e3],
  australia: [0xe8c44a, 0xffd166, 0xc23b2e, 0xffffff, 0xffa94d, 0xd46a2c],
  egypt: [0xe8c44a, 0xffffff, 0xd4a574, 0xc9a227, 0xffe08a, 0xc47a3a],
  india: [0xe07a28, 0xffd166, 0xe8a8a0, 0xffffff, 0xc9a227, 0xff6b6b],
  canada: [0xc43c3c, 0xffffff, 0xffd166, 0xeef4fa, 0xffa94d, 0x7ec8e3],
  france: [0x9b7ec8, 0xffd166, 0xc23b2e, 0xffffff, 0x3a6ec9, 0xff8fb5],
  brazil: [0xffd166, 0x2f8f5b, 0xff6b6b, 0xffffff, 0x2a9aaa, 0xe07a28],
  mexico: [0xe07a28, 0xc43c8c, 0xffd166, 0xffffff, 0xc23b2e, 0x2a9aaa],
  uk: [0xc43c3c, 0xffffff, 0xffd166, 0x9b7ec8, 0x7ec8e3, 0xff8fb5],
  korea: [0xff8fb5, 0xe07a28, 0xffffff, 0xffd166, 0xf4a6c4, 0xff6b6b],
  italy: [0xc23b2e, 0xffd166, 0xffffff, 0x3a6ec9, 0xff8fb5, 0xe8c44a],
  turkey: [0xc23b2e, 0xffd166, 0x3a6ec9, 0xffffff, 0xe07a28, 0xc9a227],
  saudi: [0xe8c44a, 0xffffff, 0xd4a574, 0xc47a3a, 0xc9a227, 0xffe08a],
  south_africa: [0xc23b2e, 0xffd166, 0xffffff, 0x2a9aaa, 0xe07a28, 0x7ec8e3],
};

const MAT = {
  trunk: new THREE.MeshStandardMaterial({ color: 0x6e4f35, roughness: 0.9, flatShading: true }),
  pine: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85, flatShading: true }),
  leaf: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85, flatShading: true }),
  bush: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, flatShading: true }),
  rock: new THREE.MeshStandardMaterial({ color: 0x9a9a94, roughness: 0.95, flatShading: true }),
  flower: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6, flatShading: true }),
  snow: new THREE.MeshStandardMaterial({ color: 0xeef4fa, roughness: 0.88, flatShading: true }),
  cactus: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.82, flatShading: true }),
  palm: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.82, flatShading: true }),
  bamboo: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8, flatShading: true }),
  cypress: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85, flatShading: true }),
  baobab: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.88, flatShading: true }),
  maple: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.82, flatShading: true }),
  sakura: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.75, flatShading: true }),
};

type AccentKind = 'cactus' | 'palm' | 'bamboo' | 'cypress' | 'baobab' | 'maple' | 'sakura';

const PACK_ACCENT: Partial<Record<string, AccentKind>> = {
  egypt: 'cactus',
  saudi: 'cactus',
  mexico: 'cactus',
  australia: 'cactus',
  usa: 'cactus',
  india: 'palm',
  brazil: 'palm',
  china: 'bamboo',
  korea: 'bamboo',
  japan: 'sakura',
  italy: 'cypress',
  turkey: 'cypress',
  canada: 'maple',
  south_africa: 'baobab',
};

function cactusMixChance(pack: string): number {
  if (pack === 'usa') return 0.22;
  if (pack === 'australia') return 0.42;
  return 1;
}

function packBushGeo(pack: string): THREE.BufferGeometry {
  if (pack === 'france') {
    return new THREE.ConeGeometry(0.42, 1.55, 6).translate(0, 0.78, 0);
  }
  if (pack === 'uk') {
    return new THREE.BoxGeometry(1.15, 1.05, 0.5).translate(0, 0.52, 0);
  }
  if (pack === 'egypt' || pack === 'saudi' || pack === 'mexico') {
    return new THREE.CylinderGeometry(0.16, 0.22, 1.45, 6).translate(0, 0.72, 0);
  }
  if (pack === 'italy' || pack === 'turkey') {
    return new THREE.ConeGeometry(0.38, 1.8, 6).translate(0, 0.9, 0);
  }
  return new THREE.IcosahedronGeometry(0.85, 0).scale(1, 0.75, 1).translate(0, 0.5, 0);
}

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
  private accent: MeshGroup | null = null;
  private accentKind: AccentKind | null = null;
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
      POOL_SEGS * BUSH_PER_SEG, packBushGeo(world.packId), MAT.bush);
    this.rock = this.mkInstanced(
      POOL_SEGS * ROCK_PER_SEG, new THREE.DodecahedronGeometry(0.65, 0), MAT.rock);
    this.flower = this.mkInstanced(
      POOL_SEGS * FLOWER_PER_SEG, new THREE.IcosahedronGeometry(0.11, 0).scale(1, 0.8, 1).translate(0, 0.16, 0), MAT.flower);

    // 俄罗斯：松冠雪帽 + 阔叶轻雪尘（其他包不创建，零开销）
    if (world.packId === 'russia') {
      this.pineSnow = this.mkInstanced(
        treeCount, new THREE.ConeGeometry(0.72, 0.82, 6).translate(0, 3.95, 0), MAT.snow);
      this.leafSnow = this.mkInstanced(
        treeCount, new THREE.IcosahedronGeometry(0.55, 0).scale(1.15, 0.42, 1.15).translate(0, 3.05, 0), MAT.snow);
    }

    const accentKind = PACK_ACCENT[world.packId] ?? null;
    this.accentKind = accentKind;
    if (accentKind) {
      this.accent = this.makeAccent(accentKind, treeCount);
    }

    // 逐实例配色
    const pack = world.packId;
    for (let i = 0; i < treeCount; i++) {
      this.tintPine(pack, i);
      this.pineSlots.meshes[0].setColorAt(i, this.col);
      this.tintCanopy(pack, i);
      this.leafSlots.meshes[0].setColorAt(i, this.col);
    }
    if (this.accent && accentKind) {
      for (let i = 0; i < treeCount; i++) this.colorAccent(accentKind, i);
    }
    const bushCount = POOL_SEGS * BUSH_PER_SEG;
    for (let i = 0; i < bushCount; i++) {
      this.tintBush(pack, i);
      this.bush.meshes[0].setColorAt(i, this.col);
    }
    const palette = PACK_FLOWERS[pack] ?? DEFAULT_FLOWERS;
    const flowerCount = POOL_SEGS * FLOWER_PER_SEG;
    for (let i = 0; i < flowerCount; i++) {
      this.col.setHex(palette[Math.floor(rand(i * 6.6) * palette.length)]);
      this.flower.meshes[0].setColorAt(i, this.col);
    }
    for (const grp of this.all()) {
      for (const mesh of grp.meshes) mesh.instanceMatrix.needsUpdate = true;
    }
  }

  private all(): MeshGroup[] {
    const g: MeshGroup[] = [this.treeSlots, this.pineSlots, this.leafSlots, this.bush, this.rock, this.flower];
    if (this.pineSnow) g.push(this.pineSnow);
    if (this.leafSnow) g.push(this.leafSnow);
    if (this.accent) g.push(this.accent);
    return g;
  }

  private mkInstanced(count: number, geo: THREE.BufferGeometry, mat: THREE.Material): MeshGroup {
    return this.mkInstancedParts(count, [geo], mat);
  }

  private mkInstancedParts(count: number, geos: THREE.BufferGeometry[], mat: THREE.Material): MeshGroup {
    const meshes: THREE.InstancedMesh[] = [];
    for (const geo of geos) {
      const m = new THREE.InstancedMesh(geo, mat, count);
      m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      m.castShadow = true;
      m.frustumCulled = false;
      this.scene.add(m);
      meshes.push(m);
    }
    return { meshes, count };
  }

  private makeAccent(kind: AccentKind, count: number): MeshGroup {
    if (kind === 'cactus') {
      const body = new THREE.CylinderGeometry(0.22, 0.30, 2.55, 6).translate(0, 1.28, 0);
      const armR = new THREE.CylinderGeometry(0.11, 0.14, 1.05, 5);
      armR.rotateZ(1.12);
      armR.translate(0.58, 1.58, 0);
      const armL = new THREE.CylinderGeometry(0.10, 0.13, 0.88, 5);
      armL.rotateZ(-1.05);
      armL.translate(-0.50, 1.18, 0);
      return this.mkInstancedParts(count, [body, armR, armL], MAT.cactus);
    }
    if (kind === 'palm') {
      const crown = new THREE.SphereGeometry(1.45, 6, 4).scale(1.25, 0.32, 1.25).translate(0, 3.05, 0);
      return this.mkInstanced(count, crown, MAT.palm);
    }
    if (kind === 'bamboo') {
      const s1 = new THREE.CylinderGeometry(0.07, 0.09, 4.4, 5).translate(0, 2.2, 0);
      const s2 = new THREE.CylinderGeometry(0.06, 0.08, 3.8, 5).translate(0.28, 1.9, 0.12);
      const s3 = new THREE.CylinderGeometry(0.05, 0.07, 3.2, 5).translate(-0.22, 1.6, -0.16);
      return this.mkInstancedParts(count, [s1, s2, s3], MAT.bamboo);
    }
    if (kind === 'cypress') {
      return this.mkInstanced(count, new THREE.ConeGeometry(0.55, 4.8, 7).translate(0, 2.4, 0), MAT.cypress);
    }
    if (kind === 'baobab') {
      // 瓶状粗干 + 顶肩 + 稀疏叶簇：一眼能认的猴面包树剪影
      const trunk = new THREE.CylinderGeometry(0.95, 0.72, 3.7, 7).translate(0, 1.85, 0);
      const shoulder = new THREE.SphereGeometry(1.05, 6, 4).scale(1.08, 0.48, 1.08).translate(0, 3.55, 0);
      const puffA = new THREE.IcosahedronGeometry(0.52, 0).scale(1.55, 0.62, 1.55).translate(0.28, 4.28, 0.12);
      const puffB = new THREE.IcosahedronGeometry(0.44, 0).scale(1.35, 0.55, 1.35).translate(-0.42, 4.12, -0.18);
      const puffC = new THREE.IcosahedronGeometry(0.38, 0).scale(1.2, 0.5, 1.2).translate(0.08, 4.48, 0.38);
      return this.mkInstancedParts(count, [trunk, shoulder, puffA, puffB, puffC], MAT.baobab);
    }
    if (kind === 'maple') {
      return this.mkInstanced(
        count, new THREE.IcosahedronGeometry(1.5, 0).scale(1.35, 0.95, 1.35).translate(0, 2.2, 0), MAT.maple);
    }
    return this.mkInstanced(
      count, new THREE.IcosahedronGeometry(1.35, 0).scale(1.25, 1.05, 1.25).translate(0, 2.1, 0), MAT.sakura);
  }

  private tintPine(pack: string, i: number): void {
    if (pack === 'russia' || pack === 'canada') {
      this.col.setHSL(0.33 + rand(i * 1.7) * 0.06, 0.28 + rand(i * 2.3) * 0.18, 0.26 + rand(i * 3.1) * 0.12);
    } else if (pack === 'egypt' || pack === 'saudi' || pack === 'mexico') {
      this.col.setHSL(0.26 + rand(i * 1.7) * 0.06, 0.32 + rand(i * 2.3) * 0.14, 0.34 + rand(i * 3.1) * 0.10);
    } else {
      this.col.setHSL(0.29 + rand(i * 1.7) * 0.07, 0.52 + rand(i * 2.3) * 0.18, 0.30 + rand(i * 3.1) * 0.13);
    }
  }

  private tintCanopy(pack: string, i: number): void {
    if (pack === 'canada') {
      this.col.setHSL(0.06 + rand(i * 1.7) * 0.08, 0.62 + rand(i * 2.3) * 0.18, 0.38 + rand(i * 3.1) * 0.12);
    } else if (pack === 'russia') {
      this.col.setHSL(0.33 + rand(i * 1.7) * 0.06, 0.28 + rand(i * 2.3) * 0.18, 0.26 + rand(i * 3.1) * 0.12);
    } else if (pack === 'egypt' || pack === 'saudi' || pack === 'mexico') {
      this.col.setHSL(0.26 + rand(i * 1.7) * 0.06, 0.32 + rand(i * 2.3) * 0.14, 0.34 + rand(i * 3.1) * 0.10);
    } else if (pack === 'australia') {
      this.col.setHSL(0.20 + rand(i * 1.7) * 0.06, 0.42 + rand(i * 2.3) * 0.16, 0.32 + rand(i * 3.1) * 0.10);
    } else if (pack === 'brazil' || pack === 'india') {
      this.col.setHSL(0.32 + rand(i * 1.7) * 0.05, 0.62 + rand(i * 2.3) * 0.16, 0.32 + rand(i * 3.1) * 0.10);
    } else if (pack === 'japan') {
      this.col.setHSL(0.30 + rand(i * 1.7) * 0.06, 0.48 + rand(i * 2.3) * 0.16, 0.38 + rand(i * 3.1) * 0.12);
    } else {
      this.col.setHSL(0.29 + rand(i * 1.7) * 0.07, 0.52 + rand(i * 2.3) * 0.18, 0.30 + rand(i * 3.1) * 0.13);
    }
  }

  private colorAccent(kind: AccentKind, i: number): void {
    if (!this.accent) return;
    if (kind === 'baobab') {
      this.col.setHSL(0.09, 0.16, 0.60 + rand(i * 1.1) * 0.10);
      this.accent.meshes[0].setColorAt(i, this.col);
      this.accent.meshes[1].setColorAt(i, this.col);
      this.col.setHSL(0.18 + rand(i * 2.1) * 0.06, 0.50, 0.36 + rand(i * 3.1) * 0.08);
      for (let m = 2; m < this.accent.meshes.length; m++) {
        this.accent.meshes[m].setColorAt(i, this.col);
      }
      return;
    }
    this.tintAccent(kind, i);
    for (const mesh of this.accent.meshes) mesh.setColorAt(i, this.col);
  }

  private tintAccent(kind: AccentKind, i: number): void {
    if (kind === 'cactus') {
      this.col.setHSL(0.30 + rand(i * 1.1) * 0.06, 0.42, 0.32 + rand(i * 2.1) * 0.12);
    } else if (kind === 'palm') {
      this.col.setHSL(0.32 + rand(i * 1.1) * 0.05, 0.62, 0.34 + rand(i * 2.1) * 0.08);
    } else if (kind === 'bamboo') {
      this.col.setHSL(0.28 + rand(i * 1.1) * 0.06, 0.55, 0.38 + rand(i * 2.1) * 0.10);
    } else if (kind === 'cypress') {
      this.col.setHSL(0.34 + rand(i * 1.1) * 0.04, 0.45, 0.24 + rand(i * 2.1) * 0.08);
    } else if (kind === 'maple') {
      this.col.setHSL(0.04 + rand(i * 1.1) * 0.08, 0.72, 0.42 + rand(i * 2.1) * 0.10);
    } else {
      this.col.setHSL(0.92 + rand(i * 1.1) * 0.05, 0.42, 0.78 + rand(i * 2.1) * 0.08);
    }
  }

  private tintBush(pack: string, i: number): void {
    if (pack === 'france') {
      this.col.setHSL(0.74 + rand(i * 4.1) * 0.06, 0.42, 0.52 + rand(i * 5.2) * 0.10);
    } else if (pack === 'uk') {
      this.col.setHSL(0.32 + rand(i * 4.1) * 0.04, 0.38, 0.26 + rand(i * 5.2) * 0.08);
    } else if (pack === 'egypt' || pack === 'saudi' || pack === 'mexico') {
      this.col.setHSL(0.28 + rand(i * 4.1) * 0.05, 0.38, 0.34 + rand(i * 5.2) * 0.10);
    } else if (pack === 'italy' || pack === 'turkey') {
      this.col.setHSL(0.34 + rand(i * 4.1) * 0.04, 0.42, 0.26 + rand(i * 5.2) * 0.08);
    } else if (pack === 'russia' || pack === 'canada') {
      this.col.setHSL(0.30 + rand(i * 4.1) * 0.06, 0.28, 0.34 + rand(i * 5.2) * 0.1);
    } else {
      this.col.setHSL(0.27 + rand(i * 4.1) * 0.08, 0.5, 0.32 + rand(i * 5.2) * 0.1);
    }
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

  private hideTreeSlot(i: number): void {
    this.hide(this.treeSlots, i);
    this.hide(this.pineSlots, i);
    this.hide(this.leafSlots, i);
    if (this.pineSnow) this.hide(this.pineSnow, i);
    if (this.leafSnow) this.hide(this.leafSnow, i);
    if (this.accent) this.hide(this.accent, i);
  }

  private writeDefaultTree(
    i: number, x: number, y: number, z: number, ry: number, sc: number, usePine: boolean,
  ): void {
    this.write(this.treeSlots, i, x, y, z, ry, sc, sc, sc);
    if (usePine) {
      this.write(this.pineSlots, i, x, y, z, ry, sc, sc, sc);
      this.hide(this.leafSlots, i);
      if (this.pineSnow) this.write(this.pineSnow, i, x, y, z, ry, sc * 0.92, sc * 0.7, sc * 0.92);
      if (this.leafSnow) this.hide(this.leafSnow, i);
    } else {
      this.write(this.leafSlots, i, x, y, z, ry, sc, sc, sc);
      this.hide(this.pineSlots, i);
      if (this.pineSnow) this.hide(this.pineSnow, i);
      if (this.leafSnow) this.write(this.leafSnow, i, x, y, z, ry, sc * 0.72, sc * 0.5, sc * 0.72);
    }
    if (this.accent) this.hide(this.accent, i);
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
      if (w.coastLeft && lat < w.coastEdge(k) + 2.2) return null;
      return { x, y: w.groundY(k, lat), z };
    };

    // ---- 树 / 特有植物 ----
    const desert = w.packId === 'egypt' || w.packId === 'saudi';
    const arid = desert || w.packId === 'mexico' || w.packId === 'south_africa';
    const treeChance = nearMeadow ? 0.25 : (desert ? 0.34 : w.packId === 'mexico' ? 0.42 : w.packId === 'south_africa' ? 0.40 : 0.52);
    const kind = this.accentKind;
    for (let s = 0; s < TREES_PER_SEG; s++) {
      const seed = k * 31.7 + s * 7.3;
      const spot = rand(seed) < treeChance
        ? place((rand(seed + 0.11) < 0.5 ? -1 : 1) * (10 + rand(seed + 0.23) * (nearMeadow ? 30 : 58)))
        : null;
      if (!spot) {
        this.hideTreeSlot(treeI);
        treeI++;
        continue;
      }
      const sc = 0.75 + rand(seed + 0.37) * 0.85;
      const ry = rand(seed + 0.41) * Math.PI * 2;
      const y = spot.y - 0.1;
      const pineChance = this.world.packId === 'russia' ? 0.84
        : this.world.packId === 'canada' ? 0.62
        : this.world.packId === 'egypt' || this.world.packId === 'saudi' ? 0.06
        : this.world.packId === 'india' || this.world.packId === 'brazil' ? 0.10
        : this.world.packId === 'mexico' || this.world.packId === 'south_africa' ? 0.16
        : this.world.packId === 'turkey' ? 0.28
        : this.world.packId === 'france' || this.world.packId === 'uk'
          || this.world.packId === 'italy' || this.world.packId === 'korea' ? 0.38
        : 0.55;
      const usePine = rand(seed + 0.53) < pineChance;
      const accent = this.accent;
      let usedAccent = false;

      if (accent && kind === 'cactus' && !usePine) {
        const take = cactusMixChance(w.packId) >= 1 || rand(seed + 0.71) < cactusMixChance(w.packId);
        if (take) {
          this.hide(this.treeSlots, treeI);
          this.hide(this.pineSlots, treeI);
          this.hide(this.leafSlots, treeI);
          if (this.pineSnow) this.hide(this.pineSnow, treeI);
          if (this.leafSnow) this.hide(this.leafSnow, treeI);
          this.write(accent, treeI, spot.x, y, spot.z, ry, sc, sc, sc);
          usedAccent = true;
        }
      } else if (accent && kind === 'baobab' && !usePine && rand(seed + 0.71) < 0.52) {
        this.hide(this.treeSlots, treeI);
        this.hide(this.pineSlots, treeI);
        this.hide(this.leafSlots, treeI);
        if (this.pineSnow) this.hide(this.pineSnow, treeI);
        if (this.leafSnow) this.hide(this.leafSnow, treeI);
        const bsc = sc * 1.28;
        this.write(accent, treeI, spot.x, y, spot.z, ry, bsc, bsc, bsc);
        usedAccent = true;
      } else if (accent && (kind === 'palm' || kind === 'maple') && !usePine) {
        this.write(this.treeSlots, treeI, spot.x, y, spot.z, ry, sc, sc, sc);
        this.hide(this.pineSlots, treeI);
        this.hide(this.leafSlots, treeI);
        if (this.pineSnow) this.hide(this.pineSnow, treeI);
        if (this.leafSnow) this.hide(this.leafSnow, treeI);
        this.write(accent, treeI, spot.x, y, spot.z, ry, sc, sc, sc);
        usedAccent = true;
      } else if (accent && kind === 'sakura' && !usePine && rand(seed + 0.71) < 0.58) {
        this.write(this.treeSlots, treeI, spot.x, y, spot.z, ry, sc, sc, sc);
        this.hide(this.pineSlots, treeI);
        this.hide(this.leafSlots, treeI);
        if (this.pineSnow) this.hide(this.pineSnow, treeI);
        if (this.leafSnow) this.hide(this.leafSnow, treeI);
        this.write(accent, treeI, spot.x, y, spot.z, ry, sc, sc, sc);
        usedAccent = true;
      } else if (accent && kind === 'bamboo' && rand(seed + 0.71) < 0.44) {
        this.hide(this.treeSlots, treeI);
        this.hide(this.pineSlots, treeI);
        this.hide(this.leafSlots, treeI);
        if (this.pineSnow) this.hide(this.pineSnow, treeI);
        if (this.leafSnow) this.hide(this.leafSnow, treeI);
        this.write(accent, treeI, spot.x, y, spot.z, ry, sc, sc, sc);
        usedAccent = true;
      } else if (accent && kind === 'cypress' && usePine) {
        this.hide(this.treeSlots, treeI);
        this.hide(this.pineSlots, treeI);
        this.hide(this.leafSlots, treeI);
        if (this.pineSnow) this.hide(this.pineSnow, treeI);
        if (this.leafSnow) this.hide(this.leafSnow, treeI);
        this.write(accent, treeI, spot.x, y, spot.z, ry, sc, sc, sc);
        usedAccent = true;
      }

      if (!usedAccent) {
        this.writeDefaultTree(treeI, spot.x, y, spot.z, ry, sc, usePine);
      }
      treeI++;
    }

    // ---- 灌木 ----
    const bushChance = w.packId === 'france' ? 0.62 : w.packId === 'uk' ? 0.55 : 0.45;
    for (let s = 0; s < BUSH_PER_SEG; s++) {
      const seed = k * 17.9 + s * 5.1;
      const spot = rand(seed) < bushChance
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
      const spot = rand(seed) < (desert ? 0.38 : arid ? 0.28 : 0.18)
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
      flowerI++;
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
const VERMILION = new THREE.MeshStandardMaterial({ color: 0xc4452d, roughness: 0.75, flatShading: true });
const CASTLEGREEN = new THREE.MeshStandardMaterial({ color: 0x3a6b48, roughness: 0.75, flatShading: true });
const GATE_RED = new THREE.MeshStandardMaterial({ color: 0xb44a32, roughness: 0.7, flatShading: true });
const LIBERTY_GREEN = new THREE.MeshStandardMaterial({ color: 0x5a9a7a, roughness: 0.65, flatShading: true });
const USA_BLUE = new THREE.MeshStandardMaterial({ color: 0x2c4a8c, roughness: 0.7, flatShading: true });
const CANYONRED = new THREE.MeshStandardMaterial({ color: 0xb86a3a, roughness: 0.95, flatShading: true });
const VEGASYELLOW = new THREE.MeshStandardMaterial({ color: 0xe8c44a, roughness: 0.55, flatShading: true });
const OCHRE = new THREE.MeshStandardMaterial({ color: 0xc47a3a, roughness: 0.95, flatShading: true });
const REEFTEAL = new THREE.MeshStandardMaterial({ color: 0x2a9aaa, roughness: 0.45, flatShading: true });
const CORALPINK = new THREE.MeshStandardMaterial({ color: 0xe0897a, roughness: 0.7, flatShading: true });
const AUSSTEEL = new THREE.MeshStandardMaterial({ color: 0x6a7380, roughness: 0.55, metalness: 0.25, flatShading: true });
const LIMESTONE = new THREE.MeshStandardMaterial({ color: 0xd4c4a0, roughness: 0.92, flatShading: true });
const NILEBLUE = new THREE.MeshStandardMaterial({ color: 0x2a7a8c, roughness: 0.45, flatShading: true });
const EGYPTTURQ = new THREE.MeshStandardMaterial({ color: 0x3a8a7a, roughness: 0.7, flatShading: true });
const MARBLE = new THREE.MeshStandardMaterial({ color: 0xf4f1ea, roughness: 0.45, flatShading: true });
const INDIA_PINK = new THREE.MeshStandardMaterial({ color: 0xe8a8a0, roughness: 0.8, flatShading: true });
const SAFFRON = new THREE.MeshStandardMaterial({ color: 0xe07a28, roughness: 0.7, flatShading: true });
const GANGES = new THREE.MeshStandardMaterial({ color: 0x3a8a7a, roughness: 0.4, flatShading: true });
const GOPURAM = new THREE.MeshStandardMaterial({ color: 0xc45a3a, roughness: 0.75, flatShading: true });
const COPPER = new THREE.MeshStandardMaterial({ color: 0x6a8a62, roughness: 0.55, metalness: 0.25, flatShading: true });
const LAVENDER = new THREE.MeshStandardMaterial({ color: 0x9b7ec8, roughness: 0.75, flatShading: true });
const SOAPSTONE = new THREE.MeshStandardMaterial({ color: 0xe8e4d8, roughness: 0.7, flatShading: true });
const BR_PINK = new THREE.MeshStandardMaterial({ color: 0xd46a7a, roughness: 0.75, flatShading: true });
const DUNE = new THREE.MeshStandardMaterial({ color: 0xf0ead2, roughness: 0.92, flatShading: true });
const MAYA = new THREE.MeshStandardMaterial({ color: 0xc4a06a, roughness: 0.92, flatShading: true });
const MX_PINK = new THREE.MeshStandardMaterial({ color: 0xd45a8c, roughness: 0.7, flatShading: true });
const BRICK = new THREE.MeshStandardMaterial({ color: 0x8a4a3a, roughness: 0.88, flatShading: true });
const CHALK = new THREE.MeshStandardMaterial({ color: 0xf2eee4, roughness: 0.9, flatShading: true });
const TILE_BLUE = new THREE.MeshStandardMaterial({ color: 0x3a6ea8, roughness: 0.7, flatShading: true });
const KAABA = new THREE.MeshStandardMaterial({ color: 0x1c1c22, roughness: 0.85, flatShading: true });
const MUD = new THREE.MeshStandardMaterial({ color: 0xb8895a, roughness: 0.95, flatShading: true });
const HANOK = new THREE.MeshStandardMaterial({ color: 0xc45a3a, roughness: 0.8, flatShading: true });

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

/** 函馆五棱郭 */
function lmGoryokaku(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(5.5, 5.8, 0.6, 5), STONE, 0, 0.3, 0));
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
    g.add(mesh(
      new THREE.BoxGeometry(6.5, 2.2, 1.4), GRAYSTONE,
      Math.cos(a) * 3.8, 1.2, Math.sin(a) * 3.8,
      1, 1, 1, 0, -a, 0,
    ));
  }
  g.add(mesh(new THREE.BoxGeometry(3.2, 3.5, 3.2), WHITE, 0, 2.2, 0));
  g.add(mesh(new THREE.ConeGeometry(2.6, 1.4, 4), BLACKTILE, 0, 4.5, 0, 1, 1, 1, 0, Math.PI / 4, 0));
  return g;
}

/** 东京塔 */
function lmTokyoTower(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(2.4, 3.2, 2.2, 4), GRAYSTONE, 0, 1.1, 0));
  for (let i = 0; i < 8; i++) {
    const t = i / 7;
    const y = 2.4 + i * 2.4;
    const r = 2.0 - t * 1.45;
    g.add(mesh(new THREE.CylinderGeometry(r * 0.85, r, 2.3, 4), i % 2 === 0 ? VERMILION : WHITE, 0, y, 0));
  }
  g.add(mesh(new THREE.CylinderGeometry(0.28, 0.4, 7, 6), VERMILION, 0, 26.5, 0));
  g.add(mesh(new THREE.SphereGeometry(0.45, 6, 5), WHITE, 0, 30.4, 0));
  return g;
}

/** 浅草雷门 */
function lmSensoji(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(8, 5.5, 2.2), VERMILION, 0, 2.75, 0));
  g.add(mesh(new THREE.BoxGeometry(2.8, 4.2, 0.4), DARKWOOD, 0, 2.2, 1.2));
  g.add(mesh(new THREE.BoxGeometry(10, 1.2, 4.2), BLACKTILE, 0, 5.9, 0));
  g.add(mesh(new THREE.ConeGeometry(6.2, 1.8, 4), BLACKTILE, 0, 7.4, 0, 1, 1, 1, 0, Math.PI / 4, 0));
  g.add(mesh(new THREE.CylinderGeometry(0.85, 0.85, 1.8, 8), VERMILION, 0, 3.2, 1.4));
  g.add(mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.25, 8), GOLDROOF, 0, 4.2, 1.4));
  g.add(mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.25, 8), GOLDROOF, 0, 2.2, 1.4));
  return g;
}

/** 富士山 */
function lmFuji(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.ConeGeometry(16, 3.2, 8), GREENLEAF, 0, 1.4, 0));
  g.add(mesh(new THREE.ConeGeometry(14, 22, 8), GRAYSTONE, 0, 11, 0));
  g.add(mesh(new THREE.ConeGeometry(5.2, 6.5, 8), SNOWWHITE, 0, 19.2, 0));
  return g;
}

/** 金阁寺 */
function lmKinkaku(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(7, 2.8, 5.5), DARKWOOD, 0, 1.4, 0));
  g.add(mesh(new THREE.BoxGeometry(8.2, 0.35, 6.5), BLACKTILE, 0, 2.9, 0));
  g.add(mesh(new THREE.BoxGeometry(6.2, 2.4, 4.8), GOLDROOF, 0, 4.2, 0));
  g.add(mesh(new THREE.BoxGeometry(7.2, 0.3, 5.6), BLACKTILE, 0, 5.45, 0));
  g.add(mesh(new THREE.BoxGeometry(5.0, 2.2, 4.0), GOLDROOF, 0, 6.6, 0));
  g.add(mesh(new THREE.ConeGeometry(4.2, 1.8, 4), BLACKTILE, 0, 8.4, 0, 1, 1, 1, 0, Math.PI / 4, 0));
  g.add(mesh(new THREE.SphereGeometry(0.28, 6, 5), GOLDROOF, 0, 9.4, 0));
  return g;
}

/** 伏见稻荷千本鸟居 */
function lmFushimi(): THREE.Group {
  const g = new THREE.Group();
  for (let i = 0; i < 7; i++) {
    const z = -i * 2.2;
    const s = 1 - i * 0.06;
    g.add(mesh(new THREE.BoxGeometry(0.35 * s, 4.2 * s, 0.35 * s), VERMILION, -1.6 * s, 2.1 * s, z));
    g.add(mesh(new THREE.BoxGeometry(0.35 * s, 4.2 * s, 0.35 * s), VERMILION, 1.6 * s, 2.1 * s, z));
    g.add(mesh(new THREE.BoxGeometry(4.0 * s, 0.35 * s, 0.45 * s), VERMILION, 0, 4.3 * s, z));
    g.add(mesh(new THREE.BoxGeometry(3.4 * s, 0.22 * s, 0.28 * s), VERMILION, 0, 3.85 * s, z));
  }
  return g;
}

/** 奈良东大寺大佛殿 */
function lmNaraDaibutsu(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(12, 7, 8), WOOD, 0, 3.5, 0));
  g.add(mesh(new THREE.BoxGeometry(14, 0.6, 10), BLACKTILE, 0, 7.2, 0));
  g.add(mesh(new THREE.BoxGeometry(10, 0.5, 7.5), BLACKTILE, 0, 8.4, 0));
  g.add(mesh(new THREE.ConeGeometry(8, 2.4, 4), BLACKTILE, 0, 9.8, 0, 1, 1, 1, 0, Math.PI / 4, 0));
  g.add(mesh(new THREE.BoxGeometry(2.4, 4.5, 0.5), DARKWOOD, 0, 2.3, 4.1));
  g.add(mesh(new THREE.SphereGeometry(1.3, 8, 6), GOLDROOF, 0, 3.2, 1.2));
  g.add(mesh(new THREE.CylinderGeometry(1.6, 1.8, 2.4, 8), GOLDROOF, 0, 1.4, 1.2));
  return g;
}

/** 大阪城 */
function lmOsakaCastle(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(12, 3.2, 12), GRAYSTONE, 0, 1.6, 0));
  g.add(mesh(new THREE.BoxGeometry(10, 1.2, 10), GRAYSTONE, 0, 3.8, 0));
  const floors = [
    { y: 5.4, w: 7.2, h: 2.2 },
    { y: 7.8, w: 5.8, h: 2.0 },
    { y: 10.0, w: 4.5, h: 1.8 },
    { y: 12.0, w: 3.4, h: 1.6 },
  ];
  for (const f of floors) {
    g.add(mesh(new THREE.BoxGeometry(f.w, f.h, f.w), WHITE, 0, f.y, 0));
    g.add(mesh(new THREE.BoxGeometry(f.w + 1.2, 0.35, f.w + 1.2), CASTLEGREEN, 0, f.y + f.h * 0.5, 0));
  }
  g.add(mesh(new THREE.ConeGeometry(2.6, 1.6, 4), CASTLEGREEN, 0, 13.6, 0, 1, 1, 1, 0, Math.PI / 4, 0));
  g.add(mesh(new THREE.SphereGeometry(0.28, 6, 4), GOLDROOF, 0, 14.5, 0));
  return g;
}

/** 姬路城 */
function lmHimeji(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(9, 2.4, 9), GRAYSTONE, 0, 1.2, 0));
  const floors = [
    { y: 3.6, w: 7.5, h: 2.4 },
    { y: 6.2, w: 6.0, h: 2.2 },
    { y: 8.6, w: 4.6, h: 2.0 },
    { y: 10.8, w: 3.4, h: 1.8 },
    { y: 12.8, w: 2.4, h: 1.6 },
  ];
  for (const f of floors) {
    g.add(mesh(new THREE.BoxGeometry(f.w, f.h, f.w), WHITE, 0, f.y, 0));
    g.add(mesh(new THREE.BoxGeometry(f.w + 1.1, 0.3, f.w + 1.1), BLACKTILE, 0, f.y + f.h * 0.5, 0));
  }
  g.add(mesh(new THREE.ConeGeometry(2.0, 1.5, 4), BLACKTILE, 0, 14.4, 0, 1, 1, 1, 0, Math.PI / 4, 0));
  g.add(mesh(new THREE.BoxGeometry(3.2, 4.5, 3.2), WHITE, 5.2, 4.5, 2.2));
  g.add(mesh(new THREE.ConeGeometry(2.4, 1.2, 4), BLACKTILE, 5.2, 7.2, 2.2, 1, 1, 1, 0, Math.PI / 4, 0));
  return g;
}

/** 严岛神社大鸟居 */
function lmItsukushima(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(0.7, 11, 0.7), VERMILION, -3.2, 5.5, 0));
  g.add(mesh(new THREE.BoxGeometry(0.7, 11, 0.7), VERMILION, 3.2, 5.5, 0));
  g.add(mesh(new THREE.BoxGeometry(0.45, 8, 0.45), VERMILION, -4.4, 4.0, 0));
  g.add(mesh(new THREE.BoxGeometry(0.45, 8, 0.45), VERMILION, 4.4, 4.0, 0));
  g.add(mesh(new THREE.BoxGeometry(11.5, 0.55, 0.7), VERMILION, 0, 10.6, 0));
  g.add(mesh(new THREE.BoxGeometry(9.5, 0.35, 0.45), VERMILION, 0, 9.7, 0));
  g.add(mesh(new THREE.BoxGeometry(0.5, 1.2, 0.5), GOLDROOF, 0, 11.3, 0));
  return g;
}

/** 道后温泉本馆 */
function lmDogo(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(8, 4.5, 6), WOOD, 0, 2.25, 0));
  g.add(mesh(new THREE.BoxGeometry(6, 3.2, 5), WOOD, 0, 6.0, 0));
  g.add(mesh(new THREE.BoxGeometry(9.2, 0.45, 7.2), BLACKTILE, 0, 4.7, 0));
  g.add(mesh(new THREE.BoxGeometry(7.2, 0.4, 6), BLACKTILE, 0, 7.7, 0));
  g.add(mesh(new THREE.BoxGeometry(3.2, 2.6, 3.2), WOOD, 0, 9.4, 0));
  g.add(mesh(new THREE.ConeGeometry(2.8, 1.6, 4), BLACKTILE, 0, 11.1, 0, 1, 1, 1, 0, Math.PI / 4, 0));
  g.add(mesh(new THREE.BoxGeometry(1.6, 2.8, 0.3), DARKWOOD, 0, 1.5, 3.15));
  return g;
}

/** 冲绳守礼门 */
function lmShureimon(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(0.55, 5.2, 0.55), VERMILION, -2.4, 2.6, 0));
  g.add(mesh(new THREE.BoxGeometry(0.55, 5.2, 0.55), VERMILION, 2.4, 2.6, 0));
  g.add(mesh(new THREE.BoxGeometry(1.8, 3.6, 0.4), DARKWOOD, 0, 1.8, 0.1));
  g.add(mesh(new THREE.BoxGeometry(8.5, 0.7, 4.2), REDWALL, 0, 5.5, 0));
  g.add(mesh(new THREE.BoxGeometry(9.2, 0.45, 5.0), BLACKTILE, 0, 6.1, 0));
  g.add(mesh(new THREE.ConeGeometry(5.6, 1.6, 4), BLACKTILE, 0, 7.2, 0, 1, 1, 1, 0, Math.PI / 4, 0));
  return g;
}

/** 西雅图太空针塔 */
function lmSpaceNeedle(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(2.4, 3.0, 1.4, 8), GRAYSTONE, 0, 0.7, 0));
  g.add(mesh(new THREE.CylinderGeometry(0.55, 1.1, 16, 8), WHITE, 0, 9.2, 0));
  g.add(mesh(new THREE.CylinderGeometry(3.4, 2.6, 1.6, 10), WHITE, 0, 17.6, 0));
  g.add(mesh(new THREE.CylinderGeometry(2.2, 3.2, 1.1, 10), ORANGEACCENT, 0, 18.9, 0));
  g.add(mesh(new THREE.CylinderGeometry(0.22, 0.28, 5.5, 6), WHITE, 0, 22.4, 0));
  g.add(mesh(new THREE.SphereGeometry(0.35, 6, 5), ORANGEACCENT, 0, 25.3, 0));
  return g;
}

/** 金门大桥 */
function lmGoldenGate(): THREE.Group {
  const g = new THREE.Group();
  for (const x of [-6.5, 6.5]) {
    g.add(mesh(new THREE.BoxGeometry(1.4, 16, 1.4), GATE_RED, x, 8, 0));
    g.add(mesh(new THREE.BoxGeometry(3.2, 0.45, 1.6), GATE_RED, x, 16.2, 0));
    g.add(mesh(new THREE.BoxGeometry(3.2, 0.35, 1.6), GATE_RED, x, 11.5, 0));
  }
  g.add(mesh(new THREE.BoxGeometry(22, 0.4, 3.2), GATE_RED, 0, 6.2, 0));
  for (const z of [-1.2, 1.2]) {
    g.add(mesh(new THREE.BoxGeometry(20, 0.12, 0.12), GATE_RED, 0, 14.5, z, 1, 1, 1, 0.22, 0, 0));
    g.add(mesh(new THREE.BoxGeometry(20, 0.12, 0.12), GATE_RED, 0, 14.5, z, 1, 1, 1, -0.22, 0, 0));
  }
  return g;
}

/** 好莱坞山丘白字 */
function lmHollywood(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.ConeGeometry(10, 4.5, 6), SANDSTONE, 0, 1.8, -1.2));
  const letters = [-7.2, -4.8, -2.4, 0, 2.4, 4.8, 7.2];
  for (const x of letters) {
    g.add(mesh(new THREE.BoxGeometry(1.6, 2.8, 0.45), WHITE, x, 4.6, 0.4));
  }
  return g;
}

/** 大峡谷岩层 */
function lmGrandCanyon(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(22, 4, 10), CANYONRED, 0, 2, -4));
  g.add(mesh(new THREE.BoxGeometry(18, 3.2, 8), SANDSTONE, 2, 5.4, -3));
  g.add(mesh(new THREE.BoxGeometry(14, 2.6, 6), CANYONRED, -1, 8.1, -2.2));
  g.add(mesh(new THREE.BoxGeometry(9, 2.0, 5), SANDSTONE, 1.5, 10.2, -1.4));
  g.add(mesh(new THREE.BoxGeometry(16, 1.2, 6), CANYONRED, -6, 1.4, 3));
  return g;
}

/** 纪念碑谷方山 */
function lmMonumentValley(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(5.5, 12, 5.5), CANYONRED, -4.5, 6, 0));
  g.add(mesh(new THREE.BoxGeometry(6.4, 1.4, 6.4), SANDSTONE, -4.5, 12.6, 0));
  g.add(mesh(new THREE.BoxGeometry(4.2, 9, 4.2), CANYONRED, 5, 4.5, 1.5));
  g.add(mesh(new THREE.BoxGeometry(5.0, 1.1, 5.0), SANDSTONE, 5, 9.6, 1.5));
  g.add(mesh(new THREE.CylinderGeometry(1.1, 1.4, 7, 6), CANYONRED, 0.5, 3.5, -3));
  return g;
}

/** 拉斯维加斯欢迎牌 */
function lmVegasSign(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(0.22, 0.28, 8, 6), GRAYSTONE, -1.4, 4, 0));
  g.add(mesh(new THREE.CylinderGeometry(0.22, 0.28, 8, 6), GRAYSTONE, 1.4, 4, 0));
  g.add(mesh(new THREE.CylinderGeometry(3.6, 3.6, 0.35, 16), VEGASYELLOW, 0, 8.4, 0, 1, 1, 1, Math.PI / 2, 0, 0));
  g.add(mesh(new THREE.BoxGeometry(5.2, 1.6, 0.4), USA_BLUE, 0, 6.6, 0.15));
  g.add(mesh(new THREE.SphereGeometry(0.28, 6, 4), VEGASYELLOW, 0, 10.4, 0));
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    g.add(mesh(new THREE.SphereGeometry(0.16, 5, 4), WHITE, Math.cos(a) * 3.2, 8.4, Math.sin(a) * 0.2 + 0.2));
  }
  return g;
}

/** 黄石间歇泉 */
function lmYellowstone(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(4.5, 5.2, 1.2, 8), SANDSTONE, 0, 0.6, 0));
  g.add(mesh(new THREE.CylinderGeometry(2.2, 3.4, 1.6, 8), WHITE, 0, 1.8, 0));
  g.add(mesh(new THREE.CylinderGeometry(0.35, 0.8, 6, 6), WHITE, 0, 5.4, 0));
  g.add(mesh(new THREE.SphereGeometry(1.1, 6, 5), WHITE, 0, 8.6, 0, 1.1, 0.7, 1.1));
  g.add(mesh(new THREE.SphereGeometry(0.7, 6, 5), WHITE, 0.4, 10.2, 0.2, 1, 0.65, 1));
  return g;
}

/** 总统山 */
function lmRushmore(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(16, 10, 8), GRAYSTONE, 0, 5, -1.5));
  for (const x of [-5.4, -1.8, 1.8, 5.4]) {
    g.add(mesh(new THREE.SphereGeometry(1.7, 7, 6), SANDSTONE, x, 9.2, 2.2, 0.85, 1.15, 0.9));
    g.add(mesh(new THREE.BoxGeometry(1.5, 1.8, 1.2), SANDSTONE, x, 7.2, 2.4));
  }
  return g;
}

/** 圣路易斯拱门 */
function lmGatewayArch(): THREE.Group {
  const g = new THREE.Group();
  const arch = mesh(new THREE.TorusGeometry(8.5, 0.7, 8, 20, Math.PI), WHITE, 0, 0.2, 0);
  g.add(arch);
  g.add(mesh(new THREE.BoxGeometry(3, 0.5, 3), GRAYSTONE, -8.5, 0.25, 0));
  g.add(mesh(new THREE.BoxGeometry(3, 0.5, 3), GRAYSTONE, 8.5, 0.25, 0));
  return g;
}

/** 尼亚加拉瀑布 */
function lmNiagara(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(16, 2.4, 6), GRAYSTONE, 0, 7.2, -2));
  g.add(mesh(new THREE.BoxGeometry(14, 6.5, 1.6), ICE, 0, 3.6, 0.6));
  g.add(mesh(new THREE.BoxGeometry(12, 1.2, 8), GRAYSTONE, 0, 0.4, 3));
  g.add(mesh(new THREE.SphereGeometry(2.4, 6, 5), WHITE, 0, 1.6, 2.2, 1.6, 0.45, 1.2));
  return g;
}

/** 白宫 */
function lmWhiteHouse(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(14, 5.2, 7), WHITE, 0, 2.6, 0));
  g.add(mesh(new THREE.BoxGeometry(15, 0.4, 8), WHITE, 0, 5.4, 0));
  for (const x of [-5, -3, -1, 1, 3, 5]) {
    g.add(mesh(new THREE.CylinderGeometry(0.22, 0.22, 4.6, 6), WHITE, x, 2.4, 3.7));
  }
  g.add(mesh(new THREE.BoxGeometry(8, 0.35, 2.4), WHITE, 0, 4.8, 3.7));
  g.add(mesh(new THREE.CylinderGeometry(1.8, 1.8, 1.2, 10), WHITE, 0, 6.2, 0));
  g.add(mesh(new THREE.SphereGeometry(1.9, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.5), WHITE, 0, 6.8, 0));
  g.add(mesh(new THREE.BoxGeometry(1.6, 2.8, 0.3), USA_BLUE, 0, 1.5, 3.65));
  return g;
}

/** 自由女神 */
function lmStatueLiberty(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(5.5, 3.2, 5.5), STONE, 0, 1.6, 0));
  g.add(mesh(new THREE.BoxGeometry(4.2, 2.4, 4.2), STONE, 0, 4.4, 0));
  g.add(mesh(new THREE.CylinderGeometry(0.9, 1.3, 6.5, 8), LIBERTY_GREEN, 0, 8.6, 0));
  g.add(mesh(new THREE.SphereGeometry(1.15, 8, 6), LIBERTY_GREEN, 0, 12.4, 0));
  g.add(mesh(new THREE.BoxGeometry(0.35, 3.6, 0.35), LIBERTY_GREEN, 1.4, 13.2, 0, 1, 1, 1, 0, 0, -0.5));
  g.add(mesh(new THREE.CylinderGeometry(0.45, 0.15, 1.1, 6), VEGASYELLOW, 2.4, 14.8, 0));
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    g.add(mesh(new THREE.BoxGeometry(0.18, 1.1, 0.18), LIBERTY_GREEN, Math.cos(a) * 1.1, 13.5, Math.sin(a) * 1.1));
  }
  return g;
}

/** 悉尼歌剧院 */
function lmOperaHouse(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(10, 0.5, 7), STONE, 0, 0.25, 0));
  const shells: [number, number, number, number][] = [
    [-1.6, 3.2, 0.4, 1.15], [1.4, 2.6, -0.6, 0.95], [-0.2, 4.0, 0.2, 1.25], [2.6, 2.2, 1.0, 0.8],
  ];
  for (const [x, y, z, s] of shells) {
    g.add(mesh(new THREE.SphereGeometry(2.4, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.55), WHITE, x, y, z, s, s * 1.15, s * 0.85));
  }
  return g;
}

/** 悉尼海港大桥 */
function lmHarbourBridge(): THREE.Group {
  const g = new THREE.Group();
  const arch = mesh(new THREE.TorusGeometry(8, 0.55, 6, 18, Math.PI), AUSSTEEL, 0, 0.3, 0);
  g.add(arch);
  g.add(mesh(new THREE.BoxGeometry(18, 0.4, 3.2), AUSSTEEL, 0, 4.6, 0));
  g.add(mesh(new THREE.BoxGeometry(1.2, 8, 1.2), AUSSTEEL, -7.2, 4, 0));
  g.add(mesh(new THREE.BoxGeometry(1.2, 8, 1.2), AUSSTEEL, 7.2, 4, 0));
  g.add(mesh(new THREE.BoxGeometry(3, 0.5, 3), GRAYSTONE, -8.8, 0.25, 0));
  g.add(mesh(new THREE.BoxGeometry(3, 0.5, 3), GRAYSTONE, 8.8, 0.25, 0));
  return g;
}

/** 蓝山三姐妹峰 */
function lmThreeSisters(): THREE.Group {
  const g = new THREE.Group();
  const cols: [number, number, number][] = [[-2.6, 12, 0], [0.2, 14.5, 0.6], [2.8, 11, -0.4]];
  for (const [x, h, z] of cols) {
    g.add(mesh(new THREE.CylinderGeometry(1.1, 1.6, h, 6), SANDSTONE, x, h / 2, z));
    g.add(mesh(new THREE.ConeGeometry(1.15, 1.8, 5), GREENLEAF, x, h + 0.6, z));
  }
  return g;
}

/** 大堡礁珊瑚 */
function lmBarrierReef(): THREE.Group {
  const g = new THREE.Group();
  const bits: [number, number, number, number][] = [
    [-3, 0.8, 1.2, 1.4], [2.2, 1.1, -1, 1.1], [0.4, 0.6, 2.4, 0.9], [-1.5, 1.3, -2, 1.2], [3.4, 0.7, 1.6, 0.8],
  ];
  bits.forEach(([x, y, z, s], i) => {
    g.add(mesh(new THREE.IcosahedronGeometry(1.1, 0), i % 2 === 0 ? CORALPINK : REEFTEAL, x, y, z, s, s * 0.7, s));
  });
  g.add(mesh(new THREE.CylinderGeometry(0.12, 0.18, 2.4, 5), CORALPINK, 1.2, 1.4, 0.4));
  g.add(mesh(new THREE.CylinderGeometry(0.1, 0.16, 1.8, 5), REEFTEAL, -2, 1.1, 0.8));
  return g;
}

/** 黄金海岸 */
function lmGoldCoast(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(16, 0.4, 6), SANDSTONE, 0, 0.2, 2.4));
  const towers: [number, number, number][] = [[-3.2, 14, 1.6], [0, 18, 1.4], [3.4, 12, 1.5]];
  for (const [x, h, w] of towers) {
    g.add(mesh(new THREE.BoxGeometry(w, h, w), WHITE, x, h / 2, 0));
    g.add(mesh(new THREE.BoxGeometry(w + 0.2, 0.3, w + 0.2), USA_BLUE, x, h, 0));
  }
  return g;
}

/** 十二门徒海蚀柱 */
function lmTwelveApostles(): THREE.Group {
  const g = new THREE.Group();
  const stacks: [number, number, number][] = [
    [-6, 7, 0], [-3.2, 9.5, 1.2], [-0.4, 6.2, -0.8], [2.6, 8.4, 0.6], [5.4, 5.5, -0.4], [7.6, 4.2, 1],
  ];
  for (const [x, h, z] of stacks) {
    g.add(mesh(new THREE.CylinderGeometry(0.7 + h * 0.04, 1.1, h, 6), SANDSTONE, x, h / 2, z));
  }
  return g;
}

/** 堪培拉国会大厦 */
function lmParliamentHouse(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(16, 1.6, 10), STONE, 0, 0.8, 0));
  g.add(mesh(new THREE.BoxGeometry(10, 2.8, 7), WHITE, 0, 3.0, 0));
  g.add(mesh(new THREE.BoxGeometry(4, 2.2, 4), WHITE, 0, 5.4, 0));
  g.add(mesh(new THREE.CylinderGeometry(0.12, 0.16, 8, 6), GRAYSTONE, 0, 10.4, 0));
  g.add(mesh(new THREE.BoxGeometry(1.6, 0.9, 0.08), VERMILION, 0.7, 14.2, 0));
  g.add(mesh(new THREE.BoxGeometry(1.6, 0.9, 0.08), USA_BLUE, -0.7, 14.2, 0));
  return g;
}

/** 乌鲁鲁 */
function lmUluru(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.SphereGeometry(8, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.55), OCHRE, 0, 2.2, 0, 1.35, 0.85, 1.05));
  g.add(mesh(new THREE.BoxGeometry(18, 1.2, 14), OCHRE, 0, 0.6, 0));
  return g;
}

/** 波浪岩 */
function lmWaveRock(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(16, 6, 3.5), OCHRE, 0, 3, -0.4));
  g.add(mesh(new THREE.CylinderGeometry(4.5, 4.5, 16, 8, 1, false, 0, Math.PI), SANDSTONE, 0, 4.2, 1.2, 1, 1, 1, 0, 0, Math.PI / 2));
  return g;
}

/** 尖峰石阵 */
function lmPinnacles(): THREE.Group {
  const g = new THREE.Group();
  const pts: [number, number, number][] = [
    [-4, 5.5, 1], [-1.5, 7.2, -1.2], [0.8, 4.8, 1.6], [3.2, 6.4, 0.2], [5, 3.8, -1.4],
    [-2.8, 3.2, 2.2], [1.8, 8, 2], [-5.2, 4.4, -1.6], [4.4, 5.0, 2.4],
  ];
  for (const [x, h, z] of pts) {
    g.add(mesh(new THREE.CylinderGeometry(0.28, 0.45, h, 5), SANDSTONE, x, h / 2, z));
  }
  return g;
}

/** 袋鼠岛 */
function lmKangaroo(): THREE.Group {
  const g = new THREE.Group();
  const addRoo = (x: number, z: number, s: number) => {
    g.add(mesh(new THREE.SphereGeometry(0.7, 6, 5), DEERBROWN, x, 1.5 * s, z, s, s * 1.1, s));
    g.add(mesh(new THREE.BoxGeometry(0.35, 1.6, 0.35), DEERBROWN, x, 2.4 * s, z, s, s, s, 0.4, 0, 0));
    g.add(mesh(new THREE.BoxGeometry(0.25, 1.3, 0.25), DEERBROWN, x - 0.35 * s, 0.7 * s, z, s, s, s, 0.35, 0, 0));
    g.add(mesh(new THREE.BoxGeometry(0.25, 1.3, 0.25), DEERBROWN, x + 0.35 * s, 0.7 * s, z, s, s, s, -0.15, 0, 0));
    g.add(mesh(new THREE.BoxGeometry(0.18, 1.1, 0.18), DEERBROWN, x - 0.15 * s, 1.2 * s, z + 0.7 * s, s, s, s, 0.9, 0, 0));
  };
  addRoo(-1.6, 0.4, 1);
  addRoo(1.8, -0.6, 0.78);
  addRoo(0.2, 1.6, 0.55);
  g.add(mesh(new THREE.ConeGeometry(1.8, 3.4, 5), GREENLEAF, -4.2, 2.2, -1.2));
  g.add(mesh(new THREE.CylinderGeometry(0.18, 0.25, 2.2, 5), WOOD, -4.2, 0.9, -1.2));
  return g;
}

/** 摇篮山 */
function lmCradleMountain(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.ConeGeometry(5.5, 14, 6), GRAYSTONE, -2, 7, 0));
  g.add(mesh(new THREE.ConeGeometry(4.2, 11, 6), GRAYSTONE, 3.2, 5.5, 1.2));
  g.add(mesh(new THREE.ConeGeometry(3.4, 8, 5), GRAYSTONE, 0.6, 4, -2.2));
  g.add(mesh(new THREE.ConeGeometry(1.6, 2.4, 5), SNOWWHITE, -2, 14.4, 0));
  g.add(mesh(new THREE.ConeGeometry(1.2, 1.8, 5), SNOWWHITE, 3.2, 11.6, 1.2));
  return g;
}

/** 亚历山大灯塔 / 凯特巴城堡 */
function lmAlexandria(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(8, 3.2, 8), LIMESTONE, 0, 1.6, 0));
  g.add(mesh(new THREE.BoxGeometry(5.5, 6, 5.5), LIMESTONE, 0, 6.2, 0));
  g.add(mesh(new THREE.CylinderGeometry(1.4, 1.8, 5, 8), WHITE, 0, 11.6, 0));
  g.add(mesh(new THREE.CylinderGeometry(1.1, 1.1, 1.4, 8), GOLDROOF, 0, 14.7, 0));
  g.add(mesh(new THREE.ConeGeometry(1.6, 1.8, 8), GOLDROOF, 0, 16.3, 0));
  return g;
}

/** 吉萨金字塔群 */
function lmGiza(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.ConeGeometry(8, 16, 4), LIMESTONE, -4, 8, 0, 1, 1, 1, 0, Math.PI / 4, 0));
  g.add(mesh(new THREE.ConeGeometry(6, 12, 4), SANDSTONE, 6, 6, 1.5, 1, 1, 1, 0, Math.PI / 4, 0));
  g.add(mesh(new THREE.ConeGeometry(4.2, 8, 4), LIMESTONE, 2.5, 4, -5, 1, 1, 1, 0, Math.PI / 4, 0));
  const sphinx = lmSphinx();
  sphinx.position.set(11.5, 0, 7.5);
  sphinx.scale.setScalar(0.72);
  g.add(sphinx);
  return g;
}

/** 狮身人面像 */
function lmSphinx(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(10, 3.2, 4.2), SANDSTONE, 0, 1.6, 0));
  g.add(mesh(new THREE.BoxGeometry(3.4, 2.4, 3.6), SANDSTONE, 4.2, 3.4, 0));
  g.add(mesh(new THREE.SphereGeometry(1.7, 7, 6), SANDSTONE, 4.2, 5.4, 0, 0.9, 1.05, 0.95));
  g.add(mesh(new THREE.BoxGeometry(1.6, 0.7, 0.5), SANDSTONE, 5.4, 4.0, 0));
  g.add(mesh(new THREE.BoxGeometry(1.2, 1.6, 1.2), SANDSTONE, -4.6, 2.4, 1.4));
  g.add(mesh(new THREE.BoxGeometry(1.2, 1.6, 1.2), SANDSTONE, -4.6, 2.4, -1.4));
  return g;
}

/** 穆罕默德阿里清真寺 */
function lmCitadel(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(10, 4, 8), LIMESTONE, 0, 2, 0));
  g.add(mesh(new THREE.SphereGeometry(3.4, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), WHITE, 0, 5.2, 0));
  for (const x of [-5.4, 5.4]) {
    g.add(mesh(new THREE.CylinderGeometry(0.45, 0.55, 12, 8), WHITE, x, 6, 2.4));
    g.add(mesh(new THREE.ConeGeometry(0.7, 1.2, 8), GOLDROOF, x, 12.4, 2.4));
  }
  g.add(mesh(new THREE.SphereGeometry(0.45, 6, 5), GOLDROOF, 0, 8.2, 0));
  return g;
}

/** 萨卡拉阶梯金字塔 */
function lmSaqqara(): THREE.Group {
  const g = new THREE.Group();
  const tiers = [10, 8.2, 6.5, 5, 3.6, 2.4];
  let y = 0;
  for (const w of tiers) {
    const h = 1.7;
    g.add(mesh(new THREE.BoxGeometry(w, h, w), LIMESTONE, 0, y + h / 2, 0));
    y += h;
  }
  return g;
}

/** 卡纳克石柱林 */
function lmKarnak(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(14, 0.6, 10), SANDSTONE, 0, 0.3, 0));
  for (let ix = -2; ix <= 2; ix++) {
    for (let iz = -1; iz <= 1; iz++) {
      g.add(mesh(new THREE.CylinderGeometry(0.55, 0.7, 8, 8), SANDSTONE, ix * 2.4, 4.3, iz * 2.6));
      g.add(mesh(new THREE.CylinderGeometry(0.95, 0.95, 0.7, 8), EGYPTTURQ, ix * 2.4, 8.5, iz * 2.6));
    }
  }
  g.add(mesh(new THREE.BoxGeometry(0.5, 10, 0.5), LIMESTONE, 0, 9, -4.4));
  g.add(mesh(new THREE.ConeGeometry(0.7, 1.4, 4), GOLDROOF, 0, 14.5, -4.4, 1, 1, 1, 0, Math.PI / 4, 0));
  return g;
}

/** 卢克索神庙 */
function lmLuxor(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(4.5, 8, 1.6), SANDSTONE, -3.4, 4, 0));
  g.add(mesh(new THREE.BoxGeometry(4.5, 8, 1.6), SANDSTONE, 3.4, 4, 0));
  g.add(mesh(new THREE.BoxGeometry(3.2, 5.5, 0.5), DARKWOOD, 0, 2.8, 0.2));
  g.add(mesh(new THREE.BoxGeometry(0.55, 11, 0.55), LIMESTONE, 0, 5.5, -2.2));
  g.add(mesh(new THREE.ConeGeometry(0.8, 1.6, 4), GOLDROOF, 0, 11.6, -2.2, 1, 1, 1, 0, Math.PI / 4, 0));
  for (const x of [-1.6, 1.6]) {
    g.add(mesh(new THREE.CylinderGeometry(0.4, 0.5, 6, 8), SANDSTONE, x, 3.2, 2.6));
  }
  return g;
}

/** 哈特谢普苏特神庙 */
function lmHatshepsut(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(16, 8, 4), SANDSTONE, 0, 4, -3.2));
  g.add(mesh(new THREE.BoxGeometry(14, 2.2, 5), LIMESTONE, 0, 1.1, 0));
  g.add(mesh(new THREE.BoxGeometry(12, 2.0, 4), LIMESTONE, 0, 3.2, -0.6));
  g.add(mesh(new THREE.BoxGeometry(10, 1.8, 3.2), LIMESTONE, 0, 5.1, -1.2));
  for (const x of [-4, -1.3, 1.3, 4]) {
    g.add(mesh(new THREE.CylinderGeometry(0.22, 0.22, 2.2, 6), WHITE, x, 2.2, 2.2));
  }
  return g;
}

/** 国王谷墓道 */
function lmValleyKings(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(18, 7, 8), SANDSTONE, 0, 3.5, -1.5));
  for (const x of [-4.5, 0, 4.5]) {
    g.add(mesh(new THREE.BoxGeometry(2.2, 2.8, 1.2), DARKWOOD, x, 1.5, 2.6));
    g.add(mesh(new THREE.BoxGeometry(2.6, 0.35, 1.4), LIMESTONE, x, 3.0, 2.6));
  }
  return g;
}

/** 菲莱神庙 */
function lmPhilae(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(8, 5.5, 1.4), SANDSTONE, -2.8, 2.75, 0));
  g.add(mesh(new THREE.BoxGeometry(8, 5.5, 1.4), SANDSTONE, 2.8, 2.75, 0));
  g.add(mesh(new THREE.BoxGeometry(3, 4, 0.4), DARKWOOD, 0, 2.1, 0.2));
  for (const x of [-1.4, 1.4]) {
    g.add(mesh(new THREE.CylinderGeometry(0.32, 0.4, 4.5, 8), SANDSTONE, x, 2.4, 2.4));
  }
  g.add(mesh(new THREE.BoxGeometry(6, 0.4, 4), LIMESTONE, 0, 4.8, 1.2));
  return g;
}

/** 阿布辛贝巨像 */
function lmAbuSimbel(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(16, 12, 6), SANDSTONE, 0, 6, -2));
  for (const x of [-5.4, -1.8, 1.8, 5.4]) {
    g.add(mesh(new THREE.BoxGeometry(2.4, 7.5, 2.2), SANDSTONE, x, 3.8, 1.6));
    g.add(mesh(new THREE.SphereGeometry(1.15, 6, 5), SANDSTONE, x, 8.2, 1.6));
    g.add(mesh(new THREE.BoxGeometry(2.0, 1.4, 1.6), SANDSTONE, x, 1.2, 2.4));
  }
  g.add(mesh(new THREE.BoxGeometry(2.4, 3.6, 0.5), DARKWOOD, 0, 2.0, 1.4));
  return g;
}

/** 尼罗河帆船 */
function lmFelucca(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(8, 0.7, 2.2), WOOD, 0, 0.6, 0));
  g.add(mesh(new THREE.BoxGeometry(7.4, 0.12, 3.6), NILEBLUE, 0, 0.22, 0));
  g.add(mesh(new THREE.BoxGeometry(6.5, 0.5, 1.8), DARKWOOD, 0, 1.05, 0));
  g.add(mesh(new THREE.CylinderGeometry(0.12, 0.14, 7, 5), WOOD, 0.6, 4.4, 0));
  g.add(mesh(new THREE.BoxGeometry(0.12, 5.5, 2.8), WHITE, 0.6, 4.2, 0.2, 1, 1, 1, 0, 0.35, 0.2));
  g.add(mesh(new THREE.CylinderGeometry(0.35, 0.55, 2.8, 6), GREENLEAF, -4.2, 1.6, 1.8));
  g.add(mesh(new THREE.SphereGeometry(1.4, 6, 5), GREENLEAF, -4.2, 3.4, 1.8, 1.1, 0.55, 1.1));
  return g;
}

/** 阿姆利则金庙 */
function lmGoldenTemple(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(16, 0.25, 16), GANGES, 0, 0.12, 0));
  g.add(mesh(new THREE.BoxGeometry(8, 0.4, 8), WHITE, 0, 0.45, 0));
  g.add(mesh(new THREE.BoxGeometry(6.2, 3.4, 6.2), GOLDROOF, 0, 2.3, 0));
  g.add(mesh(new THREE.BoxGeometry(7.2, 0.35, 7.2), GOLDROOF, 0, 4.15, 0));
  g.add(mesh(new THREE.SphereGeometry(2.2, 10, 8), GOLDROOF, 0, 5.6, 0, 1, 1.15, 1));
  g.add(mesh(new THREE.ConeGeometry(0.45, 1.4, 6), GOLDROOF, 0, 7.4, 0));
  for (const [x, z] of [[-3.6, -3.6], [3.6, -3.6], [-3.6, 3.6], [3.6, 3.6]] as const) {
    g.add(mesh(new THREE.CylinderGeometry(0.45, 0.5, 3.2, 6), WHITE, x, 2.0, z));
    g.add(mesh(new THREE.SphereGeometry(0.7, 6, 5), GOLDROOF, x, 4.0, z, 1, 1.2, 1));
  }
  g.add(mesh(new THREE.BoxGeometry(10, 0.2, 2.2), WHITE, 0, 0.55, 6.5));
  return g;
}

/** 德里印度门 */
function lmIndiaGate(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(8.5, 11, 2.4), SANDSTONE, 0, 5.5, 0));
  g.add(mesh(new THREE.BoxGeometry(3.2, 6.5, 2.6), DARKWOOD, 0, 3.4, 0));
  g.add(mesh(new THREE.BoxGeometry(9.4, 1.6, 3.0), SANDSTONE, 0, 11.6, 0));
  g.add(mesh(new THREE.BoxGeometry(4.2, 1.8, 2.2), SANDSTONE, 0, 13.2, 0));
  g.add(mesh(new THREE.SphereGeometry(0.7, 6, 5), SANDSTONE, 0, 14.5, 0));
  for (const x of [-4.8, 4.8]) {
    g.add(mesh(new THREE.BoxGeometry(1.6, 8, 2.0), SANDSTONE, x, 4, 0));
  }
  return g;
}

/** 德里红堡 */
function lmRedFort(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(16, 5.5, 6), REDWALL, 0, 2.75, 0));
  g.add(mesh(new THREE.BoxGeometry(3.6, 4.2, 0.5), DARKWOOD, 0, 2.2, 3.1));
  g.add(mesh(new THREE.BoxGeometry(5.2, 2.2, 3.2), REDWALL, 0, 6.6, 0));
  g.add(mesh(new THREE.SphereGeometry(1.4, 8, 6), WHITE, 0, 8.4, 0, 1, 1.15, 1));
  g.add(mesh(new THREE.ConeGeometry(0.3, 1.0, 6), GOLDROOF, 0, 10.0, 0));
  for (const x of [-7.2, 7.2]) {
    g.add(mesh(new THREE.BoxGeometry(2.6, 7.2, 2.6), REDWALL, x, 3.6, 0.4));
    g.add(mesh(new THREE.SphereGeometry(1.0, 6, 5), WHITE, x, 7.8, 0.4, 1, 1.1, 1));
  }
  for (let i = -3; i <= 3; i++) {
    g.add(mesh(new THREE.BoxGeometry(0.7, 0.9, 0.7), REDWALL, i * 2.0, 5.9, 2.6));
  }
  return g;
}

/** 泰姬陵 */
function lmTajMahal(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(6, 0.18, 14), GANGES, 0, 0.12, 6));
  g.add(mesh(new THREE.BoxGeometry(12, 1.2, 12), MARBLE, 0, 0.6, -2));
  g.add(mesh(new THREE.BoxGeometry(8, 5.5, 8), MARBLE, 0, 4.0, -2));
  g.add(mesh(new THREE.BoxGeometry(2.4, 3.6, 0.4), DARKWOOD, 0, 2.0, 2.1));
  g.add(mesh(new THREE.SphereGeometry(3.4, 10, 8), MARBLE, 0, 9.0, -2, 1, 1.2, 1));
  g.add(mesh(new THREE.ConeGeometry(0.45, 1.6, 6), GOLDROOF, 0, 11.6, -2));
  for (const [x, z] of [[-3.2, -5.2], [3.2, -5.2], [-3.2, 1.2], [3.2, 1.2]] as const) {
    g.add(mesh(new THREE.CylinderGeometry(0.55, 0.7, 2.0, 6), MARBLE, x, 7.4, z));
    g.add(mesh(new THREE.SphereGeometry(0.9, 6, 5), MARBLE, x, 8.8, z, 1, 1.15, 1));
  }
  for (const [x, z] of [[-6.2, -7.4], [6.2, -7.4], [-6.2, 3.4], [6.2, 3.4]] as const) {
    g.add(mesh(new THREE.CylinderGeometry(0.38, 0.45, 11, 8), MARBLE, x, 5.5, z));
    g.add(mesh(new THREE.SphereGeometry(0.7, 6, 5), MARBLE, x, 11.4, z, 1, 1.2, 1));
    g.add(mesh(new THREE.ConeGeometry(0.22, 0.8, 6), GOLDROOF, x, 12.5, z));
  }
  return g;
}

/** 斋浦尔风之宫 */
function lmHawaMahal(): THREE.Group {
  const g = new THREE.Group();
  const tiers = [
    { w: 10, h: 2.4, y: 1.2 },
    { w: 8.4, h: 2.2, y: 3.5 },
    { w: 6.6, h: 2.0, y: 5.6 },
    { w: 4.8, h: 1.8, y: 7.5 },
    { w: 3.0, h: 1.6, y: 9.2 },
  ];
  for (const t of tiers) {
    g.add(mesh(new THREE.BoxGeometry(t.w, t.h, 2.6), INDIA_PINK, 0, t.y, 0));
    const n = Math.max(3, Math.round(t.w / 1.3));
    for (let i = 0; i < n; i++) {
      const x = -t.w * 0.4 + (i / Math.max(1, n - 1)) * t.w * 0.8;
      g.add(mesh(new THREE.BoxGeometry(0.45, 0.7, 0.2), DARKWOOD, x, t.y, 1.35));
    }
  }
  g.add(mesh(new THREE.SphereGeometry(0.55, 6, 5), GOLDROOF, 0, 10.6, 0, 1, 1.15, 1));
  return g;
}

/** 瓦拉纳西恒河码头 */
function lmVaranasi(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(14, 0.2, 10), GANGES, 0, 0.1, 2.5));
  for (let i = 0; i < 5; i++) {
    const w = 12 - i * 1.4;
    g.add(mesh(new THREE.BoxGeometry(w, 0.45, 1.6), SANDSTONE, 0, 0.35 + i * 0.45, -1.2 - i * 1.15));
  }
  g.add(mesh(new THREE.BoxGeometry(5, 3.2, 3.2), SANDSTONE, -3.2, 3.4, -6.2));
  g.add(mesh(new THREE.SphereGeometry(1.1, 8, 6), GOLDROOF, -3.2, 5.6, -6.2, 1, 1.15, 1));
  const umbrellas: [number, number, THREE.Material][] = [
    [-4.5, 1.2, SAFFRON],
    [-1.2, 2.0, WHITE],
    [2.2, 1.0, INDIA_PINK],
    [4.6, 2.2, GOLDROOF],
  ];
  for (const [x, z, mat] of umbrellas) {
    g.add(mesh(new THREE.CylinderGeometry(0.08, 0.1, 2.4, 5), WOOD, x, 1.6, z));
    g.add(mesh(new THREE.ConeGeometry(1.1, 0.45, 8), mat, x, 2.85, z));
  }
  return g;
}

/** 孟买印度门 */
function lmGatewayIndia(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(10, 8.5, 3.2), SANDSTONE, 0, 4.25, 0));
  g.add(mesh(new THREE.BoxGeometry(4.0, 5.8, 3.4), DARKWOOD, 0, 3.0, 0));
  g.add(mesh(new THREE.BoxGeometry(11.2, 1.4, 4.0), SANDSTONE, 0, 9.0, 0));
  g.add(mesh(new THREE.BoxGeometry(5.5, 2.2, 3.0), SANDSTONE, 0, 10.8, 0));
  g.add(mesh(new THREE.SphereGeometry(1.3, 8, 6), SANDSTONE, 0, 12.6, 0, 1, 1.1, 1));
  for (const x of [-5.6, 5.6]) {
    g.add(mesh(new THREE.BoxGeometry(2.4, 9.5, 2.8), SANDSTONE, x, 4.75, 0));
    g.add(mesh(new THREE.SphereGeometry(1.0, 6, 5), SANDSTONE, x, 10.2, 0, 1, 1.1, 1));
  }
  g.add(mesh(new THREE.BoxGeometry(12, 0.18, 6), GANGES, 0, 0.1, 4.2));
  return g;
}

/** 海德拉巴查尔米纳 */
function lmCharminar(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(6.5, 6, 6.5), SANDSTONE, 0, 3, 0));
  g.add(mesh(new THREE.BoxGeometry(2.4, 3.8, 2.6), DARKWOOD, 0, 2.0, 3.3));
  g.add(mesh(new THREE.BoxGeometry(2.4, 3.8, 2.6), DARKWOOD, 3.3, 2.0, 0));
  g.add(mesh(new THREE.BoxGeometry(7.2, 1.2, 7.2), SANDSTONE, 0, 6.5, 0));
  for (const [x, z] of [[-3.4, -3.4], [3.4, -3.4], [-3.4, 3.4], [3.4, 3.4]] as const) {
    g.add(mesh(new THREE.CylinderGeometry(0.55, 0.7, 14, 8), SANDSTONE, x, 7, z));
    g.add(mesh(new THREE.SphereGeometry(0.85, 6, 5), GOLDROOF, x, 14.4, z, 1, 1.2, 1));
    g.add(mesh(new THREE.ConeGeometry(0.22, 0.9, 6), GOLDROOF, x, 15.5, z));
  }
  g.add(mesh(new THREE.SphereGeometry(1.1, 8, 6), GOLDROOF, 0, 8.2, 0, 1, 1.1, 1));
  return g;
}

/** 迈索尔王宫 */
function lmMysore(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(14, 4.2, 8), GRAYSTONE, 0, 2.1, 0));
  g.add(mesh(new THREE.BoxGeometry(10, 3.2, 6.2), GRAYSTONE, 0, 5.8, 0));
  g.add(mesh(new THREE.BoxGeometry(2.8, 3.2, 0.4), DARKWOOD, 0, 1.8, 4.1));
  for (const x of [-4.5, 0, 4.5]) {
    g.add(mesh(new THREE.BoxGeometry(1.4, 1.6, 0.2), GLASS, x, 3.4, 4.05));
  }
  g.add(mesh(new THREE.SphereGeometry(2.0, 10, 8), GOLDROOF, 0, 8.8, 0, 1, 1.15, 1));
  g.add(mesh(new THREE.ConeGeometry(0.4, 1.3, 6), GOLDROOF, 0, 10.6, 0));
  for (const x of [-6.2, 6.2]) {
    g.add(mesh(new THREE.BoxGeometry(2.4, 6.5, 2.4), GRAYSTONE, x, 3.25, 1.2));
    g.add(mesh(new THREE.SphereGeometry(0.9, 6, 5), GOLDROOF, x, 7.0, 1.2, 1, 1.15, 1));
  }
  return g;
}

/** 喀拉拉船屋 */
function lmKerala(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(12, 0.7, 3.2), WOOD, 0, 0.55, 0));
  g.add(mesh(new THREE.BoxGeometry(11, 0.14, 5.5), GANGES, 0, 0.18, 0));
  g.add(mesh(new THREE.BoxGeometry(9.5, 1.6, 2.6), WHITE, 0, 1.7, 0));
  g.add(mesh(new THREE.BoxGeometry(10.2, 0.35, 3.4), SAFFRON, 0, 2.6, 0));
  g.add(mesh(new THREE.BoxGeometry(8.4, 0.9, 2.2), WHITE, 0, 3.15, 0));
  for (const [x, z] of [[-6.5, 2.8], [5.8, -2.4]] as const) {
    g.add(mesh(new THREE.CylinderGeometry(0.18, 0.32, 8, 5), WOOD, x, 4.2, z, 1, 1, 1, 0.12, 0, 0));
    g.add(mesh(new THREE.SphereGeometry(1.5, 6, 5), GREENLEAF, x, 8.4, z, 1.15, 0.5, 1.15));
  }
  return g;
}

/** 马杜赖米纳克希神庙 */
function lmMeenakshi(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(10, 2.4, 10), SANDSTONE, 0, 1.2, 0));
  const colors = [GOPURAM, GOLDROOF, SAFFRON, INDIA_PINK, ONION_TEAL, VERMILION];
  for (let i = 0; i < 6; i++) {
    const w = 7.2 - i * 0.95;
    const h = 1.7;
    g.add(mesh(new THREE.BoxGeometry(w, h, w * 0.72), colors[i], 0, 2.6 + i * h, 0));
    g.add(mesh(new THREE.BoxGeometry(0.35, 0.7, 0.35), GOLDROOF, w * 0.35, 3.1 + i * h, w * 0.22));
    g.add(mesh(new THREE.BoxGeometry(0.35, 0.7, 0.35), WHITE, -w * 0.35, 3.1 + i * h, w * 0.22));
  }
  g.add(mesh(new THREE.ConeGeometry(1.6, 2.2, 4), GOLDROOF, 0, 13.6, 0, 1, 1, 1, 0, Math.PI / 4, 0));
  return g;
}

/** 埃洛拉石窟 */
function lmEllora(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(18, 10, 5), SANDSTONE, 0, 5, -4.5));
  g.add(mesh(new THREE.BoxGeometry(8, 6.5, 7), SANDSTONE, 0, 3.25, 0.5));
  g.add(mesh(new THREE.BoxGeometry(6.2, 2.4, 5.5), SANDSTONE, 0, 7.4, 0.5));
  g.add(mesh(new THREE.BoxGeometry(2.2, 3.6, 0.5), DARKWOOD, 0, 1.9, 4.0));
  for (const x of [-2.2, 2.2]) {
    g.add(mesh(new THREE.CylinderGeometry(0.35, 0.45, 5.5, 6), SANDSTONE, x, 2.9, 3.4));
  }
  g.add(mesh(new THREE.ConeGeometry(2.4, 1.8, 4), SANDSTONE, 0, 9.6, 0.5, 1, 1, 1, 0, Math.PI / 4, 0));
  return g;
}

/** 温哥华图腾柱 */
function lmVancouverTotem(): THREE.Group {
  const g = new THREE.Group();
  const bands: [number, THREE.Material][] = [
    [0.9, REDWALL], [2.4, ONION_TEAL], [3.9, GOLDROOF], [5.4, WHITE], [6.9, REDWALL],
  ];
  g.add(mesh(new THREE.CylinderGeometry(0.55, 0.7, 8.4, 8), WOOD, 0, 4.2, 0));
  for (const [y, mat] of bands) {
    g.add(mesh(new THREE.CylinderGeometry(0.72, 0.72, 0.9, 8), mat, 0, y, 0));
  }
  g.add(mesh(new THREE.BoxGeometry(2.4, 0.35, 0.35), REDWALL, 0, 8.4, 0));
  g.add(mesh(new THREE.SphereGeometry(0.45, 6, 5), GOLDROOF, 0, 9.0, 0));
  g.add(mesh(new THREE.CylinderGeometry(0.22, 0.32, 6, 5), WOOD, -3.2, 3.2, 1.4));
  g.add(mesh(new THREE.SphereGeometry(1.3, 6, 5), GREENLEAF, -3.2, 6.6, 1.4, 1.1, 0.7, 1.1));
  return g;
}

/** 狮门桥 */
function lmLionsGate(): THREE.Group {
  const g = new THREE.Group();
  for (const x of [-6.2, 6.2]) {
    g.add(mesh(new THREE.BoxGeometry(1.2, 14, 1.2), GRAYSTONE, x, 7, 0));
    g.add(mesh(new THREE.BoxGeometry(2.6, 0.4, 1.4), GRAYSTONE, x, 14.2, 0));
  }
  g.add(mesh(new THREE.BoxGeometry(20, 0.35, 3.0), GRAYSTONE, 0, 5.6, 0));
  for (const z of [-1.1, 1.1]) {
    g.add(mesh(new THREE.BoxGeometry(18, 0.1, 0.1), AUSSTEEL, 0, 13.2, z, 1, 1, 1, 0.28, 0, 0));
    g.add(mesh(new THREE.BoxGeometry(18, 0.1, 0.1), AUSSTEEL, 0, 13.2, z, 1, 1, 1, -0.28, 0, 0));
  }
  return g;
}

/** 班夫落基山 */
function lmBanff(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.ConeGeometry(7, 16, 6), GRAYSTONE, -3.2, 8, -2));
  g.add(mesh(new THREE.ConeGeometry(5.2, 12, 6), GRAYSTONE, 4.5, 6, -1));
  g.add(mesh(new THREE.ConeGeometry(2.4, 4.5, 6), SNOWWHITE, -3.2, 14.8, -2));
  g.add(mesh(new THREE.ConeGeometry(1.8, 3.2, 6), SNOWWHITE, 4.5, 11.2, -1));
  g.add(mesh(new THREE.CylinderGeometry(4.5, 4.5, 0.2, 12), REEFTEAL, 0.6, 0.2, 3.2));
  return g;
}

/** 卡尔加里塔 */
function lmCalgaryTower(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(0.7, 1.3, 16, 8), WHITE, 0, 8, 0));
  g.add(mesh(new THREE.CylinderGeometry(2.6, 2.2, 1.4, 10), REDWALL, 0, 16.4, 0));
  g.add(mesh(new THREE.CylinderGeometry(0.22, 0.28, 4, 6), WHITE, 0, 19.2, 0));
  g.add(mesh(new THREE.SphereGeometry(0.28, 6, 4), GOLDROOF, 0, 21.4, 0));
  return g;
}

/** 多伦多 CN 塔 */
function lmCnTower(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(0.85, 1.8, 22, 8), WHITE, 0, 11, 0));
  g.add(mesh(new THREE.CylinderGeometry(2.8, 2.2, 1.6, 10), GRAYSTONE, 0, 22.4, 0));
  g.add(mesh(new THREE.CylinderGeometry(0.22, 0.32, 8, 6), WHITE, 0, 27.2, 0));
  g.add(mesh(new THREE.SphereGeometry(0.32, 6, 4), REDWALL, 0, 31.4, 0));
  return g;
}

/** 马蹄瀑布 */
function lmHorseshoe(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(16, 6, 4), GRAYSTONE, 0, 3, -2.2));
  g.add(mesh(new THREE.BoxGeometry(14, 5.2, 1.4), WHITE, 0, 2.8, 0.4));
  g.add(mesh(new THREE.BoxGeometry(5, 4.6, 1.2), WHITE, -6.2, 2.4, 1.6, 1, 1, 1, 0, 0.4, 0));
  g.add(mesh(new THREE.BoxGeometry(5, 4.6, 1.2), WHITE, 6.2, 2.4, 1.6, 1, 1, 1, 0, -0.4, 0));
  g.add(mesh(new THREE.BoxGeometry(12, 0.2, 6), REEFTEAL, 0, 0.15, 3.2));
  return g;
}

/** 渥太华国会山 */
function lmParliamentHill(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(14, 4.2, 6), GRAYSTONE, 0, 2.1, 0));
  g.add(mesh(new THREE.BoxGeometry(4.2, 8, 4.2), GRAYSTONE, 0, 6.2, 0));
  g.add(mesh(new THREE.ConeGeometry(2.6, 4.5, 4), COPPER, 0, 12.4, 0, 1, 1, 1, 0, Math.PI / 4, 0));
  g.add(mesh(new THREE.CylinderGeometry(0.18, 0.22, 2.4, 6), GOLDROOF, 0, 15.2, 0));
  for (const x of [-6.2, 6.2]) {
    g.add(mesh(new THREE.BoxGeometry(3.2, 5.2, 3.2), GRAYSTONE, x, 4.8, 0));
    g.add(mesh(new THREE.ConeGeometry(2.0, 2.2, 4), COPPER, x, 8.4, 0, 1, 1, 1, 0, Math.PI / 4, 0));
  }
  return g;
}

/** 蒙特利尔圣母院 */
function lmNotreDameMtl(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(10, 6, 5), GRAYSTONE, 0, 3, 0));
  g.add(mesh(new THREE.BoxGeometry(2.4, 4.2, 0.4), DARKWOOD, 0, 2.2, 2.55));
  for (const x of [-3.4, 3.4]) {
    g.add(mesh(new THREE.BoxGeometry(2.6, 10, 2.6), GRAYSTONE, x, 5, 0.4));
    g.add(mesh(new THREE.ConeGeometry(1.6, 2.4, 4), COPPER, x, 11.2, 0.4, 1, 1, 1, 0, Math.PI / 4, 0));
  }
  g.add(mesh(new THREE.CylinderGeometry(1.1, 1.1, 0.25, 12), GOLDROOF, 0, 5.4, 2.5, 1, 1, 1, Math.PI / 2, 0, 0));
  return g;
}

/** 芳堤娜城堡酒店 */
function lmFrontenac(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(12, 5.5, 7), GRAYSTONE, 0, 2.75, 0));
  g.add(mesh(new THREE.BoxGeometry(6, 4.5, 5), GRAYSTONE, -2, 7.2, 0));
  g.add(mesh(new THREE.ConeGeometry(3.4, 4.2, 4), COPPER, -2, 11.4, 0, 1, 1, 1, 0, Math.PI / 4, 0));
  g.add(mesh(new THREE.BoxGeometry(3.2, 7, 3.2), GRAYSTONE, 4.6, 5.5, 1.2));
  g.add(mesh(new THREE.ConeGeometry(2.0, 2.8, 4), COPPER, 4.6, 10.4, 1.2, 1, 1, 1, 0, Math.PI / 4, 0));
  g.add(mesh(new THREE.BoxGeometry(1.6, 2.8, 0.35), DARKWOOD, 0, 1.5, 3.55));
  return g;
}

/** 佩吉湾灯塔 */
function lmPeggyCove(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.DodecahedronGeometry(2.8, 0), GRAYSTONE, -2.2, 1.2, 1.4));
  g.add(mesh(new THREE.DodecahedronGeometry(2.0, 0), GRAYSTONE, 2.4, 0.9, 0.8));
  g.add(mesh(new THREE.CylinderGeometry(1.3, 1.6, 7, 8), WHITE, 0, 3.6, 0));
  g.add(mesh(new THREE.CylinderGeometry(1.5, 1.5, 1.1, 8), REDWALL, 0, 7.6, 0));
  g.add(mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.8, 8), GOLDROOF, 0, 8.5, 0));
  return g;
}

/** 因努克苏克石人 */
function lmInuksuk(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(1.6, 3.2, 1.2), GRAYSTONE, 0, 1.6, 0));
  g.add(mesh(new THREE.BoxGeometry(4.6, 0.9, 1.0), GRAYSTONE, 0, 3.6, 0));
  g.add(mesh(new THREE.BoxGeometry(1.4, 2.2, 1.1), GRAYSTONE, 0, 5.1, 0));
  g.add(mesh(new THREE.BoxGeometry(1.8, 0.7, 1.3), GRAYSTONE, 0, 6.5, 0));
  return g;
}

/** 丘吉尔北极熊 */
function lmPolarBear(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(4.2, 2.2, 2.0), SNOWWHITE, 0, 1.6, 0));
  g.add(mesh(new THREE.SphereGeometry(1.05, 7, 6), SNOWWHITE, 2.4, 2.4, 0, 0.95, 1, 0.9));
  g.add(mesh(new THREE.BoxGeometry(1.1, 0.45, 0.7), SNOWWHITE, 3.3, 1.9, 0));
  for (const [x, z] of [[-1.3, 0.7], [0.8, 0.7], [-1.3, -0.7], [0.8, -0.7]] as const) {
    g.add(mesh(new THREE.BoxGeometry(0.7, 1.2, 0.7), SNOWWHITE, x, 0.6, z));
  }
  return g;
}

/** 埃菲尔铁塔 */
function lmEiffel(): THREE.Group {
  const g = new THREE.Group();
  for (const [x, z] of [[-3.4, -3.4], [3.4, -3.4], [-3.4, 3.4], [3.4, 3.4]] as const) {
    g.add(mesh(new THREE.BoxGeometry(0.7, 10, 0.7), SANDSTONE, x * 0.55, 5, z * 0.55, 1, 1, 1, 0.18 * Math.sign(-x), 0, 0.18 * Math.sign(-z)));
  }
  g.add(mesh(new THREE.BoxGeometry(7.5, 0.45, 7.5), SANDSTONE, 0, 4.2, 0));
  g.add(mesh(new THREE.BoxGeometry(4.2, 0.4, 4.2), SANDSTONE, 0, 9.2, 0));
  g.add(mesh(new THREE.BoxGeometry(1.6, 8, 1.6), SANDSTONE, 0, 13.4, 0));
  g.add(mesh(new THREE.BoxGeometry(2.4, 1.2, 2.4), SANDSTONE, 0, 18.0, 0));
  g.add(mesh(new THREE.CylinderGeometry(0.12, 0.2, 4.5, 6), SANDSTONE, 0, 20.8, 0));
  return g;
}

/** 凯旋门 */
function lmArcTriomphe(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(8.5, 10, 3.2), SANDSTONE, 0, 5, 0));
  g.add(mesh(new THREE.BoxGeometry(3.4, 6.2, 3.4), DARKWOOD, 0, 3.2, 0));
  g.add(mesh(new THREE.BoxGeometry(9.2, 1.6, 3.6), SANDSTONE, 0, 10.6, 0));
  g.add(mesh(new THREE.BoxGeometry(4.0, 1.2, 2.4), SANDSTONE, 0, 12.0, 0));
  return g;
}

/** 巴黎圣母院 */
function lmNotreDame(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(10, 6.5, 6), GRAYSTONE, 0, 3.25, 0));
  g.add(mesh(new THREE.BoxGeometry(2.6, 4.4, 0.4), DARKWOOD, 0, 2.4, 3.05));
  for (const x of [-3.6, 3.6]) {
    g.add(mesh(new THREE.BoxGeometry(2.8, 11, 2.8), GRAYSTONE, x, 5.5, 0.6));
  }
  g.add(mesh(new THREE.CylinderGeometry(1.2, 1.2, 0.22, 12), GOLDROOF, 0, 5.8, 3.05, 1, 1, 1, Math.PI / 2, 0, 0));
  g.add(mesh(new THREE.ConeGeometry(1.4, 4.5, 4), GRAYSTONE, 0, 11.2, -0.8, 1, 1, 1, 0, Math.PI / 4, 0));
  return g;
}

/** 卢浮宫玻璃金字塔 */
function lmLouvre(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(16, 2.4, 10), SANDSTONE, 0, 1.2, -1.5));
  g.add(mesh(new THREE.ConeGeometry(5.2, 6.5, 4), COLDGLASS, 0, 5.5, 1.2, 1, 1, 1, 0, Math.PI / 4, 0));
  g.add(mesh(new THREE.BoxGeometry(1.6, 2.2, 0.3), DARKWOOD, 0, 1.2, 4.8));
  return g;
}

/** 圣心堂 */
function lmSacreCoeur(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(10, 4, 7), WHITE, 0, 2, 0));
  g.add(mesh(new THREE.SphereGeometry(2.8, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), WHITE, 0, 5.4, 0));
  g.add(mesh(new THREE.ConeGeometry(0.4, 1.4, 6), GOLDROOF, 0, 8.0, 0));
  for (const x of [-3.8, 3.8]) {
    g.add(mesh(new THREE.SphereGeometry(1.6, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.55), WHITE, x, 4.6, 0.6));
  }
  return g;
}

/** 凡尔赛宫 */
function lmVersailles(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(18, 4.2, 5.5), SANDSTONE, 0, 2.1, 0));
  g.add(mesh(new THREE.BoxGeometry(19, 0.45, 6.4), GOLDROOF, 0, 4.4, 0));
  g.add(mesh(new THREE.BoxGeometry(6, 2.6, 4.2), SANDSTONE, 0, 5.8, 0));
  g.add(mesh(new THREE.BoxGeometry(1.8, 2.8, 0.3), DARKWOOD, 0, 1.5, 2.8));
  for (const x of [-6, -2, 2, 6]) {
    g.add(mesh(new THREE.BoxGeometry(1.2, 1.4, 0.2), GLASS, x, 2.6, 2.75));
  }
  g.add(mesh(new THREE.CylinderGeometry(1.6, 1.6, 0.2, 12), REEFTEAL, 0, 0.12, 5.2));
  return g;
}

/** 圣米歇尔山 */
function lmMontSaintMichel(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.ConeGeometry(7, 5, 6), GRAYSTONE, 0, 2.4, 0));
  g.add(mesh(new THREE.BoxGeometry(8, 3.5, 6), GRAYSTONE, 0, 5.6, 0));
  g.add(mesh(new THREE.BoxGeometry(4, 4.2, 4), GRAYSTONE, 0, 9.4, 0));
  g.add(mesh(new THREE.ConeGeometry(2.2, 4.8, 4), GRAYSTONE, 0, 13.8, 0, 1, 1, 1, 0, Math.PI / 4, 0));
  g.add(mesh(new THREE.CylinderGeometry(0.12, 0.16, 2.2, 5), GOLDROOF, 0, 16.6, 0));
  g.add(mesh(new THREE.BoxGeometry(12, 0.18, 10), REEFTEAL, 0, 0.1, 2));
  return g;
}

/** 舍农索城堡 */
function lmChenonceau(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(12, 0.2, 8), REEFTEAL, 0, 0.12, 0));
  g.add(mesh(new THREE.BoxGeometry(8, 4.5, 4.5), WHITE, 0, 2.4, 0));
  g.add(mesh(new THREE.BoxGeometry(10, 1.5, 3.2), WHITE, 0, 2.4, 4.2));
  for (const x of [-3.2, 0, 3.2]) {
    g.add(mesh(new THREE.BoxGeometry(1.6, 2.2, 0.3), DARKWOOD, x, 1.2, 5.7));
  }
  g.add(mesh(new THREE.BoxGeometry(9, 0.4, 5.4), DARKROOF, 0, 4.85, 0));
  for (const x of [-4.2, 4.2]) {
    g.add(mesh(new THREE.CylinderGeometry(0.7, 0.8, 6, 8), WHITE, x, 3.2, -1.4));
    g.add(mesh(new THREE.ConeGeometry(1.0, 1.6, 8), DARKROOF, x, 7.0, -1.4));
  }
  return g;
}

/** 普罗旺斯拉薰衣草田 */
function lmLavender(): THREE.Group {
  const g = new THREE.Group();
  for (let i = 0; i < 6; i++) {
    g.add(mesh(new THREE.BoxGeometry(12, 0.7, 1.1), LAVENDER, 0, 0.4, -4 + i * 1.6));
  }
  g.add(mesh(new THREE.BoxGeometry(3.2, 2.4, 3.2), WHITE, 5.5, 1.3, -1));
  g.add(mesh(new THREE.ConeGeometry(2.4, 1.6, 4), DARKROOF, 5.5, 3.2, -1, 1, 1, 1, 0, Math.PI / 4, 0));
  return g;
}

/** 加尔桥 */
function lmPontDuGard(): THREE.Group {
  const g = new THREE.Group();
  const tiers = [
    { y: 1.4, n: 3, h: 2.6, w: 16 },
    { y: 4.2, n: 5, h: 2.4, w: 16 },
    { y: 6.8, n: 7, h: 2.0, w: 16 },
  ];
  for (const t of tiers) {
    g.add(mesh(new THREE.BoxGeometry(t.w, 0.5, 2.2), SANDSTONE, 0, t.y + t.h * 0.5, 0));
    for (let i = 0; i < t.n; i++) {
      const x = -t.w * 0.4 + (i / Math.max(1, t.n - 1)) * t.w * 0.8;
      g.add(mesh(new THREE.BoxGeometry(0.7, t.h, 1.8), SANDSTONE, x, t.y, 0));
    }
  }
  return g;
}

/** 勃朗峰 */
function lmMontBlanc(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.ConeGeometry(10, 18, 7), GRAYSTONE, 0, 9, -1));
  g.add(mesh(new THREE.ConeGeometry(4.2, 6.5, 7), SNOWWHITE, 0, 16.4, -1));
  g.add(mesh(new THREE.ConeGeometry(6, 10, 6), GRAYSTONE, 6.5, 5, 2));
  g.add(mesh(new THREE.ConeGeometry(2.0, 3.2, 6), SNOWWHITE, 6.5, 10.4, 2));
  return g;
}

/** 蔚蓝海岸 */
function lmCoteAzur(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(16, 0.2, 8), REEFTEAL, 0, 0.12, 2.5));
  const houses: [number, number, THREE.Material][] = [
    [-5.2, 2.4, CORALPINK], [ -1.6, 3.2, WHITE], [2.0, 2.6, ONION_TEAL], [5.4, 3.6, SANDSTONE],
  ];
  for (const [x, h, mat] of houses) {
    g.add(mesh(new THREE.BoxGeometry(2.8, h, 2.4), mat, x, h / 2, -1.6));
    g.add(mesh(new THREE.BoxGeometry(3.1, 0.3, 2.7), DARKROOF, x, h + 0.2, -1.6));
  }
  return g;
}

/** 里约基督像 */
function lmChristRedeemer(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.ConeGeometry(5, 4, 6), GRAYSTONE, 0, 2, 0));
  g.add(mesh(new THREE.BoxGeometry(1.4, 7.5, 1.2), SOAPSTONE, 0, 7.6, 0));
  g.add(mesh(new THREE.BoxGeometry(9.5, 0.9, 0.9), SOAPSTONE, 0, 10.2, 0));
  g.add(mesh(new THREE.SphereGeometry(0.85, 7, 6), SOAPSTONE, 0, 12.0, 0));
  g.add(mesh(new THREE.BoxGeometry(1.5, 3.2, 0.9), SOAPSTONE, 0, 4.8, 0.2));
  return g;
}

/** 面包山 */
function lmSugarloaf(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.SphereGeometry(5.5, 8, 6), GRAYSTONE, 0, 4.2, 0, 1, 1.35, 0.9));
  g.add(mesh(new THREE.SphereGeometry(3.2, 7, 5), GRAYSTONE, 7.2, 2.4, 1.2, 1, 1.2, 0.9));
  g.add(mesh(new THREE.BoxGeometry(8, 0.12, 0.12), AUSSTEEL, 3.4, 6.8, 0.4, 1, 1, 1, 0, 0, 0.35));
  g.add(mesh(new THREE.BoxGeometry(0.7, 0.45, 1.1), REDWALL, 3.4, 6.8, 0.4));
  return g;
}

/** 科帕卡巴纳海滩 */
function lmCopacabana(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(16, 0.2, 6), DUNE, 0, 0.12, 1.5));
  g.add(mesh(new THREE.BoxGeometry(16, 0.16, 5), REEFTEAL, 0, 0.1, 5.2));
  for (let i = 0; i < 8; i++) {
    const x = -7 + i * 2;
    g.add(mesh(new THREE.BoxGeometry(1.6, 0.12, 1.4), i % 2 === 0 ? WHITE : GRAYSTONE, x, 0.28, 0.2));
  }
  for (const x of [-5, 0, 5]) {
    g.add(mesh(new THREE.CylinderGeometry(0.12, 0.18, 4.5, 5), WOOD, x, 2.4, -1.2));
    g.add(mesh(new THREE.SphereGeometry(1.2, 6, 4), GREENLEAF, x, 4.8, -1.2, 1.2, 0.45, 1.2));
  }
  return g;
}

/** 马拉卡纳球场 */
function lmMaracana(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(7.5, 8.2, 4.2, 16), WHITE, 0, 2.1, 0, 1, 1, 1));
  g.add(mesh(new THREE.CylinderGeometry(5.4, 5.4, 0.2, 16), GREENLEAF, 0, 0.35, 0));
  g.add(mesh(new THREE.CylinderGeometry(7.8, 7.8, 0.35, 16), GRAYSTONE, 0, 4.3, 0));
  return g;
}

/** 伊瓜苏瀑布 */
function lmIguazu(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(18, 7, 5), GREENLEAF, 0, 3.5, -2.5));
  g.add(mesh(new THREE.BoxGeometry(16, 6, 1.6), WHITE, 0, 3.2, 0.6));
  g.add(mesh(new THREE.BoxGeometry(5, 5.2, 1.2), WHITE, -6, 2.8, 2.0));
  g.add(mesh(new THREE.BoxGeometry(14, 0.2, 7), REEFTEAL, 0, 0.12, 3.4));
  return g;
}

/** 巴西利亚国会 */
function lmBrasilia(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(16, 0.4, 8), WHITE, 0, 0.2, 0));
  g.add(mesh(new THREE.BoxGeometry(1.6, 12, 1.6), WHITE, -1.1, 6.2, 0));
  g.add(mesh(new THREE.BoxGeometry(1.6, 12, 1.6), WHITE, 1.1, 6.2, 0));
  g.add(mesh(new THREE.SphereGeometry(2.4, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.5), WHITE, -5.2, 0.4, 0));
  g.add(mesh(new THREE.SphereGeometry(2.4, 10, 8, 0, Math.PI * 2, Math.PI * 0.5, Math.PI * 0.5), WHITE, 5.2, 2.6, 0));
  return g;
}

/** 佩洛里尼奥彩楼 */
function lmPelourinho(): THREE.Group {
  const g = new THREE.Group();
  const cols: [number, THREE.Material][] = [
    [-4.2, SAFFRON], [-1.4, BR_PINK], [1.4, ONION_TEAL], [4.2, WHITE],
  ];
  for (const [x, mat] of cols) {
    g.add(mesh(new THREE.BoxGeometry(2.6, 4.8, 3.2), mat, x, 2.4, 0));
    g.add(mesh(new THREE.BoxGeometry(2.9, 0.35, 3.5), DARKROOF, x, 4.95, 0));
    g.add(mesh(new THREE.BoxGeometry(0.9, 1.1, 0.15), GLASS, x, 3.0, 1.65));
  }
  return g;
}

/** 奥林达教堂 */
function lmOlinda(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(7, 4.2, 5), WHITE, 0, 2.1, 0));
  g.add(mesh(new THREE.BoxGeometry(2.4, 7.5, 2.4), WHITE, -2.4, 5.2, 0.4));
  g.add(mesh(new THREE.SphereGeometry(1.3, 8, 6), WHITE, 1.6, 5.4, 0));
  g.add(mesh(new THREE.BoxGeometry(1.6, 2.8, 0.3), DARKWOOD, 0, 1.5, 2.55));
  g.add(mesh(new THREE.CylinderGeometry(0.18, 0.28, 7, 5), WOOD, 5.2, 3.6, 1.8, 1, 1, 1, 0.12, 0, 0));
  g.add(mesh(new THREE.SphereGeometry(1.4, 6, 4), GREENLEAF, 5.2, 7.4, 1.8, 1.15, 0.5, 1.15));
  return g;
}

/** 潘塔纳尔湿地 */
function lmPantanal(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(14, 0.18, 10), REEFTEAL, 0, 0.1, 0));
  g.add(mesh(new THREE.BoxGeometry(4, 0.4, 3), GREENLEAF, -3.5, 0.4, -2));
  g.add(mesh(new THREE.SphereGeometry(1.1, 6, 4), GREENLEAF, 3.2, 1.2, 1.4, 1.3, 0.55, 1.3));
  g.add(mesh(new THREE.BoxGeometry(2.2, 0.7, 1.1), OCHRE, 1.4, 0.55, 2.2));
  g.add(mesh(new THREE.BoxGeometry(0.7, 0.35, 0.7), OCHRE, 2.4, 0.55, 2.2));
  return g;
}

/** 伦索伊斯沙丘 */
function lmLencois(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.SphereGeometry(5.5, 7, 5), DUNE, -3, 1.8, 0, 1.4, 0.55, 1.1));
  g.add(mesh(new THREE.SphereGeometry(4.2, 7, 5), DUNE, 4, 1.4, 1.2, 1.3, 0.5, 1.1));
  g.add(mesh(new THREE.CylinderGeometry(1.6, 1.6, 0.16, 10), REEFTEAL, -1.2, 0.2, 2.4));
  g.add(mesh(new THREE.CylinderGeometry(1.1, 1.1, 0.16, 10), REEFTEAL, 3.4, 0.2, -1.2));
  return g;
}

/** 亚马孙剧场 */
function lmTeatroAmazonas(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(9, 5, 7), BR_PINK, 0, 2.5, 0));
  g.add(mesh(new THREE.BoxGeometry(2.4, 3.4, 0.4), DARKWOOD, 0, 1.8, 3.55));
  g.add(mesh(new THREE.SphereGeometry(2.8, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), GOLDROOF, 0, 6.2, 0));
  g.add(mesh(new THREE.CylinderGeometry(0.2, 0.25, 1.6, 6), GOLDROOF, 0, 8.4, 0));
  g.add(mesh(new THREE.CylinderGeometry(0.22, 0.32, 8, 5), WOOD, 5.6, 4.2, 2.2, 1, 1, 1, 0.1, 0, 0));
  g.add(mesh(new THREE.SphereGeometry(1.6, 6, 4), GREENLEAF, 5.6, 8.4, 2.2, 1.2, 0.5, 1.2));
  return g;
}

/** 亚马孙河 */
function lmAmazon(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(16, 0.2, 8), GANGES, 0, 0.12, 0));
  for (const [x, z] of [[-5.5, -3.2], [-2, -3.6], [2.4, -3], [6, -3.4], [-4, 3.2], [3.5, 3.4]] as const) {
    g.add(mesh(new THREE.CylinderGeometry(0.2, 0.32, 6, 5), WOOD, x, 3.2, z));
    g.add(mesh(new THREE.SphereGeometry(1.8, 6, 4), GREENLEAF, x, 6.4, z, 1.2, 0.7, 1.2));
  }
  return g;
}

/** 洛斯卡沃斯石拱 */
function lmCaboArch(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(14, 0.2, 8), REEFTEAL, 0, 0.12, 1.5));
  g.add(mesh(new THREE.BoxGeometry(3.2, 7, 2.4), SANDSTONE, -3.4, 3.5, 0));
  g.add(mesh(new THREE.BoxGeometry(3.2, 7, 2.4), SANDSTONE, 3.4, 3.5, 0));
  g.add(mesh(new THREE.BoxGeometry(7.2, 2.2, 2.2), SANDSTONE, 0, 7.2, 0));
  g.add(mesh(new THREE.DodecahedronGeometry(2.0, 0), SANDSTONE, -5.6, 1.2, 1.4));
  return g;
}

/** 铜峡谷 */
function lmCopperCanyon(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(20, 4, 8), CANYONRED, 0, 2, -3));
  g.add(mesh(new THREE.BoxGeometry(16, 3.2, 6), OCHRE, 1.5, 5.4, -2.2));
  g.add(mesh(new THREE.BoxGeometry(12, 2.6, 5), CANYONRED, -1, 8.1, -1.4));
  g.add(mesh(new THREE.BoxGeometry(14, 1.4, 5), OCHRE, -5, 1.2, 2.4));
  return g;
}

/** 瓜达拉哈拉主教堂 */
function lmGuadalajara(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(9, 5, 6), SANDSTONE, 0, 2.5, 0));
  g.add(mesh(new THREE.BoxGeometry(2.2, 3.6, 0.4), DARKWOOD, 0, 1.9, 3.05));
  for (const x of [-3.2, 3.2]) {
    g.add(mesh(new THREE.BoxGeometry(2.4, 9, 2.4), SANDSTONE, x, 4.5, 0.4));
    g.add(mesh(new THREE.ConeGeometry(1.5, 3.2, 4), GOLDROOF, x, 10.6, 0.4, 1, 1, 1, 0, Math.PI / 4, 0));
  }
  g.add(mesh(new THREE.SphereGeometry(1.6, 8, 6), GOLDROOF, 0, 6.4, 0, 1, 1.1, 1));
  return g;
}

/** 特奥蒂瓦坎 */
function lmTeotihuacan(): THREE.Group {
  const g = new THREE.Group();
  const steps = [10, 8, 6.2, 4.5, 3];
  let y = 0;
  for (const w of steps) {
    g.add(mesh(new THREE.BoxGeometry(w, 1.6, w), MAYA, -4.5, y + 0.8, 0));
    y += 1.6;
  }
  let y2 = 0;
  for (const w of [6.5, 5, 3.6, 2.4]) {
    g.add(mesh(new THREE.BoxGeometry(w, 1.3, w), SANDSTONE, 6.2, y2 + 0.65, 1.2));
    y2 += 1.3;
  }
  g.add(mesh(new THREE.BoxGeometry(14, 0.25, 2.4), MAYA, 1, 0.15, 6.2));
  return g;
}

/** 墨西哥城大教堂 */
function lmCatedralMex(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(11, 5.5, 6.5), GRAYSTONE, 0, 2.75, 0));
  g.add(mesh(new THREE.BoxGeometry(2.6, 4.2, 0.4), DARKWOOD, 0, 2.2, 3.3));
  for (const x of [-3.8, 3.8]) {
    g.add(mesh(new THREE.BoxGeometry(2.8, 10, 2.8), GRAYSTONE, x, 5, 0.5));
    g.add(mesh(new THREE.ConeGeometry(1.8, 2.6, 4), GRAYSTONE, x, 11.2, 0.5, 1, 1, 1, 0, Math.PI / 4, 0));
  }
  g.add(mesh(new THREE.SphereGeometry(1.8, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.55), GOLDROOF, 0, 6.4, 0));
  return g;
}

/** 独立天使 */
function lmAngelIndependencia(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(2.4, 2.8, 1.4, 8), GRAYSTONE, 0, 0.7, 0));
  g.add(mesh(new THREE.CylinderGeometry(0.7, 0.95, 14, 8), WHITE, 0, 8.2, 0));
  g.add(mesh(new THREE.CylinderGeometry(1.5, 1.5, 0.5, 8), GOLDROOF, 0, 15.4, 0));
  g.add(mesh(new THREE.SphereGeometry(0.7, 6, 5), GOLDROOF, 0, 16.4, 0));
  g.add(mesh(new THREE.BoxGeometry(3.6, 0.35, 0.35), GOLDROOF, 0, 16.8, 0));
  g.add(mesh(new THREE.ConeGeometry(0.25, 1.4, 5), GOLDROOF, 0, 17.8, 0));
  return g;
}

/** 美术宫 */
function lmBellasArtes(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(12, 4.5, 7), WHITE, 0, 2.25, 0));
  g.add(mesh(new THREE.BoxGeometry(13, 0.5, 8), WHITE, 0, 4.7, 0));
  g.add(mesh(new THREE.SphereGeometry(2.6, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), SAFFRON, 0, 6.2, 0));
  g.add(mesh(new THREE.BoxGeometry(2.2, 3.2, 0.35), COLDGLASS, 0, 1.8, 3.55));
  for (const x of [-4.6, 4.6]) {
    g.add(mesh(new THREE.CylinderGeometry(0.4, 0.45, 4.5, 8), WHITE, x, 2.4, 3.2));
  }
  return g;
}

/** 霍奇米尔科彩船 */
function lmXochimilco(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(14, 0.2, 8), REEFTEAL, 0, 0.12, 0));
  const boats: [number, number, THREE.Material][] = [
    [-3.2, 1.2, MX_PINK], [2.4, -1.0, SAFFRON], [0.4, 2.2, GOLDROOF],
  ];
  for (const [x, z, mat] of boats) {
    g.add(mesh(new THREE.BoxGeometry(3.6, 0.55, 1.4), WOOD, x, 0.55, z));
    g.add(mesh(new THREE.BoxGeometry(2.4, 1.1, 1.1), mat, x, 1.3, z));
    g.add(mesh(new THREE.BoxGeometry(2.6, 0.2, 1.3), WHITE, x, 1.9, z));
  }
  g.add(mesh(new THREE.SphereGeometry(1.3, 6, 4), GREENLEAF, -5.6, 1.4, -2.6, 1.2, 0.5, 1.2));
  return g;
}

/** 波波卡特佩特火山 */
function lmPopocatepetl(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.ConeGeometry(9, 16, 7), GRAYSTONE, 0, 8, 0));
  g.add(mesh(new THREE.ConeGeometry(3.2, 4.2, 7), SNOWWHITE, 0, 14.8, 0));
  g.add(mesh(new THREE.CylinderGeometry(1.1, 1.6, 1.4, 8), GRAYSTONE, 0, 16.6, 0));
  g.add(mesh(new THREE.ConeGeometry(6, 8, 6), GRAYSTONE, 7.5, 4, 2.2));
  return g;
}

/** 帕伦克神庙 */
function lmPalenque(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(10, 3.2, 8), MAYA, 0, 1.6, 0));
  g.add(mesh(new THREE.BoxGeometry(7.2, 2.6, 5.5), MAYA, 0, 4.5, 0));
  g.add(mesh(new THREE.BoxGeometry(4.5, 2.8, 3.6), MAYA, 0, 7.2, 0));
  g.add(mesh(new THREE.BoxGeometry(5.2, 1.2, 1.4), MAYA, 0, 8.8, 0));
  g.add(mesh(new THREE.BoxGeometry(1.6, 2.4, 0.4), DARKWOOD, 0, 2.4, 4.1));
  g.add(mesh(new THREE.CylinderGeometry(0.2, 0.32, 7, 5), WOOD, 5.8, 3.6, 2.4));
  g.add(mesh(new THREE.SphereGeometry(1.6, 6, 4), GREENLEAF, 5.8, 7.4, 2.4, 1.2, 0.55, 1.2));
  return g;
}

/** 奇琴伊察 */
function lmChichenItza(): THREE.Group {
  const g = new THREE.Group();
  const tiers = [12, 10.2, 8.5, 6.8, 5.2, 3.8, 2.6];
  let y = 0;
  for (const w of tiers) {
    g.add(mesh(new THREE.BoxGeometry(w, 1.35, w), MAYA, 0, y + 0.67, 0));
    y += 1.35;
  }
  g.add(mesh(new THREE.BoxGeometry(3.2, 2.2, 3.2), MAYA, 0, y + 1.1, 0));
  g.add(mesh(new THREE.BoxGeometry(1.4, 1.8, 0.3), DARKWOOD, 0, 1.2, 6.1));
  return g;
}

/** 图卢姆海边城堡 */
function lmTulum(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(14, 0.2, 8), REEFTEAL, 0, 0.12, 2.8));
  g.add(mesh(new THREE.BoxGeometry(8, 4.5, 5), MAYA, 0, 4.2, -1.2));
  g.add(mesh(new THREE.BoxGeometry(5, 2.4, 3.4), MAYA, 0, 7.6, -1.2));
  g.add(mesh(new THREE.BoxGeometry(1.5, 2.2, 0.35), DARKWOOD, 0, 3.2, 1.35));
  g.add(mesh(new THREE.BoxGeometry(10, 2.2, 2.4), MAYA, 0, 2.2, -3.4));
  return g;
}

/** 巨人堤道 */
function lmGiantCauseway(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(14, 0.2, 8), REEFTEAL, 0, 0.12, 2));
  const cols = [
    [0, 1.6, 0], [-1.4, 2.2, -0.4], [1.3, 1.9, 0.3], [-2.6, 1.4, 0.6],
    [2.5, 2.4, -0.2], [0.6, 2.8, -1.4], [-0.8, 1.2, 1.2], [3.6, 1.5, 0.8],
  ] as const;
  for (const [x, h, z] of cols) {
    g.add(mesh(new THREE.CylinderGeometry(0.55, 0.6, h, 6), GRAYSTONE, x, h / 2, z));
  }
  return g;
}

/** 爱丁堡城堡 */
function lmEdinburghCastle(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.ConeGeometry(7, 4.5, 6), GRAYSTONE, 0, 2.2, 0));
  g.add(mesh(new THREE.BoxGeometry(9, 4.2, 6), GRAYSTONE, 0, 5.6, 0));
  g.add(mesh(new THREE.BoxGeometry(3.2, 5.5, 3.2), GRAYSTONE, -2.2, 8.4, 0.4));
  g.add(mesh(new THREE.BoxGeometry(2.6, 4.2, 2.6), GRAYSTONE, 3.0, 7.6, -0.6));
  g.add(mesh(new THREE.BoxGeometry(1.4, 2.4, 0.35), DARKWOOD, 0, 4.4, 3.1));
  g.add(mesh(new THREE.BoxGeometry(0.3, 2.2, 0.3), REDWALL, 3.0, 10.8, -0.6));
  return g;
}

/** 尼斯湖 */
function lmLochNess(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(16, 0.2, 8), NILEBLUE, 0, 0.12, 0));
  g.add(mesh(new THREE.ConeGeometry(5, 7, 6), GREENLEAF, -5.5, 3.4, -2.4));
  g.add(mesh(new THREE.ConeGeometry(4, 5.5, 6), GRAYSTONE, 5.8, 2.6, -1.8));
  g.add(mesh(new THREE.SphereGeometry(1.1, 6, 4), NILEBLUE, -1.2, 0.7, 1.4, 1.4, 0.55, 1.1));
  g.add(mesh(new THREE.SphereGeometry(0.85, 6, 4), NILEBLUE, 1.4, 0.55, 1.2, 1.3, 0.5, 1.1));
  g.add(mesh(new THREE.BoxGeometry(2.4, 2.2, 2.0), GRAYSTONE, 4.6, 1.2, 2.2));
  return g;
}

/** 哈德良长城 */
function lmHadriansWall(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(18, 2.4, 1.4), GRAYSTONE, 0, 1.2, 0));
  for (const x of [-7, -2.4, 2.4, 7]) {
    g.add(mesh(new THREE.BoxGeometry(1.6, 3.4, 1.8), GRAYSTONE, x, 1.7, 0));
  }
  g.add(mesh(new THREE.BoxGeometry(3.2, 2.6, 3.0), GRAYSTONE, 0, 2.4, 1.4));
  return g;
}

/** 湖区 */
function lmLakeDistrict(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(4.5, 4.5, 0.18, 12), REEFTEAL, 0, 0.12, 1.6));
  g.add(mesh(new THREE.ConeGeometry(6, 8, 6), GREENLEAF, -4.5, 4, -2));
  g.add(mesh(new THREE.ConeGeometry(5, 6.5, 6), GRAYSTONE, 4.8, 3.2, -1.4));
  g.add(mesh(new THREE.ConeGeometry(3.2, 4.2, 5), GREENLEAF, 1.2, 2.2, -3.2));
  return g;
}

/** 约克大教堂 */
function lmYorkMinster(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(10, 6, 6), GRAYSTONE, 0, 3, 0));
  g.add(mesh(new THREE.BoxGeometry(2.4, 4.5, 0.4), DARKWOOD, 0, 2.4, 3.05));
  for (const x of [-3.4, 3.4]) {
    g.add(mesh(new THREE.BoxGeometry(2.6, 11, 2.6), GRAYSTONE, x, 5.5, 0.4));
    g.add(mesh(new THREE.ConeGeometry(1.5, 2.8, 4), GRAYSTONE, x, 12.4, 0.4, 1, 1, 1, 0, Math.PI / 4, 0));
  }
  g.add(mesh(new THREE.BoxGeometry(3.2, 8, 3.2), GRAYSTONE, 0, 8.2, -1.2));
  return g;
}

/** 巨石阵 */
function lmStonehenge(): THREE.Group {
  const g = new THREE.Group();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const x = Math.cos(a) * 4.6;
    const z = Math.sin(a) * 4.6;
    g.add(mesh(new THREE.BoxGeometry(0.9, 3.6, 0.7), SANDSTONE, x, 1.8, z, 1, 1, 1, 0, -a, 0));
    if (i % 2 === 0) {
      const x2 = Math.cos(a + Math.PI / 8) * 4.6;
      const z2 = Math.sin(a + Math.PI / 8) * 4.6;
      g.add(mesh(new THREE.BoxGeometry(2.4, 0.45, 0.7), SANDSTONE, (x + x2) / 2, 3.85, (z + z2) / 2, 1, 1, 1, 0, -a, 0));
    }
  }
  return g;
}

/** 伦敦塔桥 */
function lmTowerBridge(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(16, 0.2, 6), REEFTEAL, 0, 0.12, 0));
  for (const x of [-5.2, 5.2]) {
    g.add(mesh(new THREE.BoxGeometry(2.6, 10, 2.6), BRICK, x, 5, 0));
    g.add(mesh(new THREE.BoxGeometry(3.2, 1.2, 3.2), BRICK, x, 10.6, 0));
    g.add(mesh(new THREE.ConeGeometry(1.6, 2.2, 4), BRICK, x, 12.3, 0, 1, 1, 1, 0, Math.PI / 4, 0));
  }
  g.add(mesh(new THREE.BoxGeometry(8.2, 0.45, 2.8), BRICK, 0, 6.4, 0));
  g.add(mesh(new THREE.BoxGeometry(8.2, 0.2, 0.25), AUSSTEEL, 0, 10.2, 0));
  return g;
}

/** 大本钟 */
function lmBigBen(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(10, 4.2, 5.5), BRICK, -2.4, 2.1, 0));
  g.add(mesh(new THREE.BoxGeometry(3.2, 14, 3.2), BRICK, 3.4, 7, 0));
  g.add(mesh(new THREE.BoxGeometry(3.8, 2.2, 3.8), BRICK, 3.4, 14.4, 0));
  g.add(mesh(new THREE.BoxGeometry(2.2, 2.0, 0.15), GOLDROOF, 3.4, 14.4, 1.95));
  g.add(mesh(new THREE.ConeGeometry(2.0, 3.4, 4), BRICK, 3.4, 17.2, 0, 1, 1, 1, 0, Math.PI / 4, 0));
  g.add(mesh(new THREE.BoxGeometry(1.6, 2.8, 0.3), DARKWOOD, -2.4, 1.5, 2.8));
  return g;
}

/** 圣保罗大教堂 */
function lmStPauls(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(10, 5, 8), GRAYSTONE, 0, 2.5, 0));
  g.add(mesh(new THREE.CylinderGeometry(3.2, 3.6, 3.2, 10), GRAYSTONE, 0, 6.6, 0));
  g.add(mesh(new THREE.SphereGeometry(3.4, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), GRAYSTONE, 0, 9.2, 0));
  g.add(mesh(new THREE.CylinderGeometry(0.35, 0.45, 2.2, 6), GOLDROOF, 0, 11.6, 0));
  g.add(mesh(new THREE.BoxGeometry(2.2, 3.6, 0.4), DARKWOOD, 0, 1.9, 4.05));
  return g;
}

/** 温莎城堡 */
function lmWindsor(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(12, 4.5, 7), GRAYSTONE, 0, 2.25, 0));
  g.add(mesh(new THREE.CylinderGeometry(2.6, 2.8, 8, 10), GRAYSTONE, 0, 6.2, 0));
  g.add(mesh(new THREE.ConeGeometry(2.8, 2.4, 8), DARKROOF, 0, 11.4, 0));
  for (const x of [-5.2, 5.2]) {
    g.add(mesh(new THREE.BoxGeometry(2.4, 6.5, 2.4), GRAYSTONE, x, 3.25, 1.2));
    g.add(mesh(new THREE.ConeGeometry(1.6, 1.6, 4), DARKROOF, x, 7.3, 1.2, 1, 1, 1, 0, Math.PI / 4, 0));
  }
  g.add(mesh(new THREE.BoxGeometry(1.5, 2.6, 0.35), DARKWOOD, 0, 1.4, 3.55));
  return g;
}

/** 多佛白崖 */
function lmWhiteCliffs(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(16, 0.2, 8), REEFTEAL, 0, 0.12, 2.5));
  g.add(mesh(new THREE.BoxGeometry(16, 8, 5), CHALK, 0, 4, -2.2));
  g.add(mesh(new THREE.BoxGeometry(12, 5.5, 4), CHALK, 2, 2.75, 0.4));
  g.add(mesh(new THREE.CylinderGeometry(0.7, 0.9, 6, 8), WHITE, -5.4, 7.2, 1.2));
  g.add(mesh(new THREE.CylinderGeometry(0.95, 0.95, 1.0, 8), REDWALL, -5.4, 10.6, 1.2));
  g.add(mesh(new THREE.ConeGeometry(1.1, 1.4, 8), GOLDROOF, -5.4, 11.8, 1.2));
  return g;
}

/** 首尔塔 */
function lmNSeoulTower(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(0.7, 1.4, 16, 8), WHITE, 0, 8, 0));
  g.add(mesh(new THREE.CylinderGeometry(2.4, 2.0, 1.6, 10), REDWALL, 0, 16.4, 0));
  g.add(mesh(new THREE.CylinderGeometry(0.2, 0.28, 5, 6), WHITE, 0, 19.6, 0));
  g.add(mesh(new THREE.SphereGeometry(0.3, 6, 4), GOLDROOF, 0, 22.3, 0));
  return g;
}

/** 景福宫 */
function lmGyeongbokgung(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(12, 3.6, 6), HANOK, 0, 1.8, 0));
  g.add(mesh(new THREE.BoxGeometry(14, 0.7, 8), DARKROOF, 0, 3.9, 0));
  g.add(mesh(new THREE.BoxGeometry(9, 2.4, 4.5), HANOK, 0, 5.4, 0));
  g.add(mesh(new THREE.ConeGeometry(7, 1.8, 4), DARKROOF, 0, 7.2, 0, 1, 1, 1, 0, Math.PI / 4, 0));
  g.add(mesh(new THREE.BoxGeometry(2.2, 2.8, 0.35), DARKWOOD, 0, 1.5, 3.1));
  return g;
}

/** 北村韩屋 */
function lmBukchon(): THREE.Group {
  const g = new THREE.Group();
  for (const [x, h] of [[-3.6, 2.6], [0, 3.2], [3.4, 2.8]] as const) {
    g.add(mesh(new THREE.BoxGeometry(3.0, h, 3.2), WHITE, x, h / 2, 0));
    g.add(mesh(new THREE.BoxGeometry(3.4, 0.4, 3.6), DARKROOF, x, h + 0.2, 0));
  }
  return g;
}

/** 乐天世界塔 */
function lmLotteTower(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(3.2, 22, 3.2), COLDGLASS, 0, 11, 0));
  g.add(mesh(new THREE.BoxGeometry(2.2, 4, 2.2), WHITE, 0, 24, 0));
  g.add(mesh(new THREE.CylinderGeometry(0.18, 0.22, 4, 6), WHITE, 0, 28, 0));
  return g;
}

/** 水原华城 */
function lmHwaseong(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(14, 3.4, 2.2), GRAYSTONE, 0, 1.7, 0));
  g.add(mesh(new THREE.CylinderGeometry(2.0, 2.2, 6, 8), GRAYSTONE, -5.4, 3.2, 0.6));
  g.add(mesh(new THREE.ConeGeometry(2.4, 1.6, 8), DARKROOF, -5.4, 7.0, 0.6));
  g.add(mesh(new THREE.BoxGeometry(2.8, 5.2, 2.8), GRAYSTONE, 5.2, 2.6, 0.4));
  return g;
}

/** 庆州瞻星台 */
function lmCheomseongdae(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(1.1, 2.0, 7, 10), SANDSTONE, 0, 3.5, 0));
  g.add(mesh(new THREE.BoxGeometry(1.2, 1.0, 0.3), DARKWOOD, 0, 4.2, 1.15));
  g.add(mesh(new THREE.CylinderGeometry(1.3, 1.3, 0.4, 10), SANDSTONE, 0, 7.2, 0));
  return g;
}

/** 佛国寺 */
function lmBulguksa(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(10, 3.2, 6), HANOK, 0, 1.6, 0));
  g.add(mesh(new THREE.BoxGeometry(12, 0.6, 8), DARKROOF, 0, 3.4, 0));
  g.add(mesh(new THREE.BoxGeometry(1.6, 6, 1.6), GRAYSTONE, -4.2, 3.2, 3.4));
  g.add(mesh(new THREE.BoxGeometry(1.2, 4.5, 1.2), GRAYSTONE, 4.0, 2.4, 3.2));
  return g;
}

/** 甘川文化村 */
function lmGamcheon(): THREE.Group {
  const g = new THREE.Group();
  const cols: [number, number, number, THREE.Material][] = [
    [-4, 2.2, -1, SAFFRON], [-1.2, 3.0, 0.4, ONION_TEAL], [1.6, 2.6, -0.6, MX_PINK], [4.2, 3.4, 0.2, WHITE],
  ];
  for (const [x, h, z, mat] of cols) {
    g.add(mesh(new THREE.BoxGeometry(2.4, h, 2.4), mat, x, h / 2, z));
    g.add(mesh(new THREE.BoxGeometry(2.6, 0.25, 2.6), DARKROOF, x, h + 0.15, z));
  }
  return g;
}

/** 海云台 */
function lmHaeundae(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(16, 0.2, 6), DUNE, 0, 0.12, 1.2));
  g.add(mesh(new THREE.BoxGeometry(16, 0.16, 5), REEFTEAL, 0, 0.1, 5));
  for (const x of [-5, -1.6, 1.6, 5]) {
    g.add(mesh(new THREE.BoxGeometry(1.6, 6 + Math.abs(x) * 0.2, 1.6), COLDGLASS, x, 3.4, -2.2));
  }
  return g;
}

/** 汉拿山 */
function lmHallasan(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.ConeGeometry(9, 12, 7), GRAYSTONE, 0, 6, 0));
  g.add(mesh(new THREE.CylinderGeometry(2.2, 3.0, 1.4, 8), GRAYSTONE, 0, 12.4, 0));
  g.add(mesh(new THREE.ConeGeometry(4, 3.2, 6), GREENLEAF, 6.5, 1.6, 2));
  return g;
}

/** 济州石爷爷 */
function lmHareubang(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(1.3, 1.6, 3.4, 8), GRAYSTONE, 0, 1.7, 0));
  g.add(mesh(new THREE.SphereGeometry(1.15, 7, 6), GRAYSTONE, 0, 4.0, 0));
  g.add(mesh(new THREE.CylinderGeometry(0.9, 1.1, 0.7, 8), GRAYSTONE, 0, 4.9, 0));
  g.add(mesh(new THREE.BoxGeometry(1.8, 0.9, 0.6), GRAYSTONE, 0, 2.4, 0.9));
  return g;
}

/** 城山日出峰 */
function lmSeongsan(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(5.5, 7, 6, 8), GREENLEAF, 0, 3, 0));
  g.add(mesh(new THREE.CylinderGeometry(2.4, 3.2, 1.6, 8), GRAYSTONE, 0, 6.8, 0));
  g.add(mesh(new THREE.BoxGeometry(12, 0.2, 6), REEFTEAL, 0, 0.12, 4));
  return g;
}

/** 罗马斗兽场 */
function lmColosseum(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(6.2, 6.6, 7, 16), SANDSTONE, 0, 3.5, 0));
  g.add(mesh(new THREE.CylinderGeometry(4.2, 4.2, 7.2, 16), DARKWOOD, 0, 3.5, 0));
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    g.add(mesh(new THREE.BoxGeometry(0.9, 1.6, 0.4), DARKWOOD, Math.cos(a) * 6.3, 2.2, Math.sin(a) * 6.3));
  }
  return g;
}

/** 万神殿 */
function lmPantheon(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(4.4, 4.4, 5, 12), SANDSTONE, 0, 2.5, 0));
  g.add(mesh(new THREE.SphereGeometry(4.4, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.5), SANDSTONE, 0, 5.0, 0));
  g.add(mesh(new THREE.BoxGeometry(5, 4.2, 2.2), SANDSTONE, 0, 2.1, 4.4));
  g.add(mesh(new THREE.BoxGeometry(2.0, 3.2, 0.3), DARKWOOD, 0, 1.7, 5.55));
  return g;
}

/** 梵蒂冈圣彼得 */
function lmVatican(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(10, 4.5, 8), WHITE, 0, 2.25, 0));
  g.add(mesh(new THREE.SphereGeometry(3.6, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), WHITE, 0, 6.4, 0));
  g.add(mesh(new THREE.CylinderGeometry(0.3, 0.4, 2.0, 6), GOLDROOF, 0, 9.0, 0));
  for (const x of [-6.2, 6.2]) {
    g.add(mesh(new THREE.CylinderGeometry(0.45, 0.55, 7, 8), WHITE, x, 3.6, 2.4));
  }
  return g;
}

/** 罗马广场 */
function lmRomanForum(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(14, 0.4, 6), SANDSTONE, 0, 0.2, 0));
  for (const x of [-5, -2.5, 0, 2.5, 5]) {
    g.add(mesh(new THREE.CylinderGeometry(0.35, 0.45, 5.5, 8), SANDSTONE, x, 3.0, 0));
  }
  g.add(mesh(new THREE.BoxGeometry(4, 2.4, 3), SANDSTONE, 0, 1.3, -2.4));
  return g;
}

/** 比萨斜塔 */
function lmPisa(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(1.7, 2.0, 12, 10), WHITE, 0.8, 6, 0, 1, 1, 1, 0, 0, 0.14));
  g.add(mesh(new THREE.CylinderGeometry(1.9, 1.9, 0.5, 10), WHITE, 1.5, 12.2, 0));
  return g;
}

/** 佛罗伦萨百花大教堂 */
function lmFlorenceDuomo(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(8, 5, 8), WHITE, 0, 2.5, 0));
  g.add(mesh(new THREE.SphereGeometry(3.2, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), BRICK, 0, 6.4, 0));
  g.add(mesh(new THREE.BoxGeometry(2.4, 10, 2.4), WHITE, 5.2, 5, 0));
  g.add(mesh(new THREE.ConeGeometry(1.5, 2.2, 4), WHITE, 5.2, 11.2, 0, 1, 1, 1, 0, Math.PI / 4, 0));
  return g;
}

/** 威尼斯 */
function lmVenice(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(14, 0.2, 8), REEFTEAL, 0, 0.12, 0));
  g.add(mesh(new THREE.BoxGeometry(6, 4.2, 4), SANDSTONE, -2, 2.2, -1.4));
  g.add(mesh(new THREE.BoxGeometry(1.4, 8, 1.4), BRICK, 3.4, 4.2, -1));
  g.add(mesh(new THREE.BoxGeometry(3.2, 0.5, 1.0), WOOD, 1.2, 0.55, 2.2));
  g.add(mesh(new THREE.BoxGeometry(0.9, 0.8, 0.8), BLACKTILE, 0.2, 1.0, 2.2));
  return g;
}

/** 米兰大教堂 */
function lmMilanDuomo(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(10, 5.5, 6), WHITE, 0, 2.75, 0));
  for (const x of [-4, -2, 0, 2, 4]) {
    g.add(mesh(new THREE.ConeGeometry(0.55, 3.2, 4), WHITE, x, 7.2, 1.4, 1, 1, 1, 0, Math.PI / 4, 0));
  }
  g.add(mesh(new THREE.ConeGeometry(1.4, 4.5, 4), GOLDROOF, 0, 8.4, 0, 1, 1, 1, 0, Math.PI / 4, 0));
  return g;
}

/** 庞贝 */
function lmPompeii(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(12, 2.2, 8), SANDSTONE, 0, 1.1, 0));
  for (const x of [-3.6, 0, 3.6]) {
    g.add(mesh(new THREE.BoxGeometry(2.4, 2.6, 0.4), DARKWOOD, x, 2.4, 3.8));
  }
  g.add(mesh(new THREE.ConeGeometry(5, 8, 6), GRAYSTONE, 6.5, 4.2, -3));
  return g;
}

/** 阿马尔菲 */
function lmAmalfi(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(12, 0.2, 6), REEFTEAL, 0, 0.12, 2.4));
  const hs: [number, number, THREE.Material][] = [[-4, 3.2, WHITE], [-1, 4.4, CORALPINK], [2.2, 3.6, ONION_TEAL], [5, 5.0, SANDSTONE]];
  for (const [x, h, mat] of hs) {
    g.add(mesh(new THREE.BoxGeometry(2.4, h, 2.6), mat, x, h / 2, -1.2));
  }
  return g;
}

/** 五渔村 */
function lmCinqueTerre(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(14, 6, 4), GRAYSTONE, 0, 3, -2.2));
  const cs: [number, THREE.Material][] = [[-5, SAFFRON], [-2.4, MX_PINK], [0.2, WHITE], [2.8, ONION_TEAL], [5.4, BRICK]];
  for (const [x, mat] of cs) {
    g.add(mesh(new THREE.BoxGeometry(2.0, 3.4, 2.0), mat, x, 5.4, 0.4));
  }
  return g;
}

/** 埃特纳火山 */
function lmEtna(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.ConeGeometry(9, 14, 7), GRAYSTONE, 0, 7, 0));
  g.add(mesh(new THREE.CylinderGeometry(1.4, 2.2, 1.6, 8), GRAYSTONE, 0, 14.4, 0));
  g.add(mesh(new THREE.ConeGeometry(2.4, 2.0, 6), REDWALL, 0, 15.8, 0));
  return g;
}

/** 圣索菲亚 */
function lmHagiaSophia(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(10, 5, 8), SANDSTONE, 0, 2.5, 0));
  g.add(mesh(new THREE.SphereGeometry(3.6, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), GOLDROOF, 0, 6.4, 0));
  for (const [x, z] of [[-5.6, -3.4], [5.6, -3.4], [-5.6, 3.4], [5.6, 3.4]] as const) {
    g.add(mesh(new THREE.CylinderGeometry(0.4, 0.5, 12, 8), WHITE, x, 6, z));
    g.add(mesh(new THREE.ConeGeometry(0.65, 1.2, 8), GOLDROOF, x, 12.6, z));
  }
  return g;
}

/** 蓝色清真寺 */
function lmBlueMosque(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(10, 4.2, 10), WHITE, 0, 2.1, 0));
  g.add(mesh(new THREE.SphereGeometry(3.2, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), TILE_BLUE, 0, 5.8, 0));
  for (const [x, z] of [[-5.8, -5.8], [5.8, -5.8], [-5.8, 5.8], [5.8, 5.8], [-5.8, 0], [5.8, 0]] as const) {
    g.add(mesh(new THREE.CylinderGeometry(0.35, 0.45, 11, 8), WHITE, x, 5.5, z));
    g.add(mesh(new THREE.ConeGeometry(0.55, 1.0, 8), GOLDROOF, x, 11.5, z));
  }
  return g;
}

/** 加拉塔塔 */
function lmGalata(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(1.6, 2.0, 12, 10), GRAYSTONE, 0, 6, 0));
  g.add(mesh(new THREE.ConeGeometry(2.2, 2.6, 8), REDWALL, 0, 13.4, 0));
  g.add(mesh(new THREE.CylinderGeometry(0.2, 0.25, 2.2, 6), GOLDROOF, 0, 15.4, 0));
  return g;
}

/** 博斯普鲁斯大桥 */
function lmBosphorus(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(16, 0.2, 6), REEFTEAL, 0, 0.12, 0));
  for (const x of [-6, 6]) {
    g.add(mesh(new THREE.BoxGeometry(1.2, 12, 1.2), AUSSTEEL, x, 6, 0));
  }
  g.add(mesh(new THREE.BoxGeometry(18, 0.4, 2.6), AUSSTEEL, 0, 5.4, 0));
  return g;
}

/** 卡帕多奇亚 */
function lmCappadocia(): THREE.Group {
  const g = new THREE.Group();
  for (const [x, h, z] of [[-4, 8, 0], [0, 11, -1.2], [4.2, 7, 0.8], [-1.5, 5.5, 2.4]] as const) {
    g.add(mesh(new THREE.ConeGeometry(1.8, h, 6), SANDSTONE, x, h / 2, z));
  }
  g.add(mesh(new THREE.SphereGeometry(0.7, 6, 4), WHITE, 0.6, 8.4, 2.2));
  g.add(mesh(new THREE.ConeGeometry(0.9, 1.2, 6), MX_PINK, 0.6, 7.4, 2.2));
  return g;
}

/** 棉花堡 */
function lmPamukkale(): THREE.Group {
  const g = new THREE.Group();
  for (let i = 0; i < 5; i++) {
    g.add(mesh(new THREE.BoxGeometry(12 - i * 1.4, 0.7, 3.2), WHITE, 0, 0.4 + i * 0.85, -i * 1.1));
    g.add(mesh(new THREE.CylinderGeometry(1.4, 1.4, 0.12, 10), REEFTEAL, 0, 0.55 + i * 0.85, -i * 1.1 + 0.6));
  }
  return g;
}

/** 以弗所 */
function lmEphesus(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(10, 5.5, 3.2), SANDSTONE, 0, 2.75, 0));
  for (const x of [-3.6, -1.2, 1.2, 3.6]) {
    g.add(mesh(new THREE.CylinderGeometry(0.4, 0.5, 6, 8), SANDSTONE, x, 3.2, 2.4));
  }
  return g;
}

/** 特洛伊木马 */
function lmTroy(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(3.2, 3.6, 2.2), WOOD, 0, 3.4, 0));
  g.add(mesh(new THREE.BoxGeometry(2.4, 1.6, 1.6), WOOD, 2.2, 3.8, 0));
  for (const x of [-1.1, 1.1]) {
    g.add(mesh(new THREE.CylinderGeometry(0.25, 0.3, 2.4, 6), WOOD, x, 1.2, 0.7));
    g.add(mesh(new THREE.CylinderGeometry(0.25, 0.3, 2.4, 6), WOOD, x, 1.2, -0.7));
  }
  g.add(mesh(new THREE.BoxGeometry(8, 2.4, 6), SANDSTONE, 0, 1.2, -3.2));
  return g;
}

/** 内姆鲁特巨像 */
function lmNemrut(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.ConeGeometry(8, 5, 6), SANDSTONE, 0, 2.4, -1));
  for (const x of [-3.4, 0, 3.4]) {
    g.add(mesh(new THREE.BoxGeometry(2.0, 2.6, 1.8), SANDSTONE, x, 5.4, 0.6));
    g.add(mesh(new THREE.SphereGeometry(0.95, 6, 5), SANDSTONE, x, 7.2, 0.6));
  }
  return g;
}

/** 安塔利亚港 */
function lmAntalya(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(14, 0.2, 8), REEFTEAL, 0, 0.12, 1.5));
  g.add(mesh(new THREE.BoxGeometry(6, 4, 4), WHITE, -3, 2, -1.5));
  g.add(mesh(new THREE.CylinderGeometry(0.7, 0.9, 8, 8), WHITE, 4.2, 4.2, -1));
  g.add(mesh(new THREE.ConeGeometry(1.1, 1.4, 8), REDWALL, 4.2, 8.8, -1));
  return g;
}

/** 苏美拉修道院 */
function lmSumela(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(16, 10, 5), GRAYSTONE, 0, 5, -3.2));
  g.add(mesh(new THREE.BoxGeometry(8, 4.5, 4), WHITE, 0, 4.2, 0.8));
  g.add(mesh(new THREE.BoxGeometry(1.5, 3.0, 0.3), DARKWOOD, 0, 2.0, 2.85));
  return g;
}

/** 阿拉拉特山 */
function lmArarat(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.ConeGeometry(9, 16, 7), GRAYSTONE, -1.5, 8, 0));
  g.add(mesh(new THREE.ConeGeometry(3.4, 5, 7), SNOWWHITE, -1.5, 14.6, 0));
  g.add(mesh(new THREE.ConeGeometry(5, 8, 6), GRAYSTONE, 6, 4, 2));
  return g;
}

/** 麦加禁寺 */
function lmHaram(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(14, 0.4, 14), WHITE, 0, 0.2, 0));
  g.add(mesh(new THREE.BoxGeometry(4.2, 4.4, 4.2), KAABA, 0, 2.4, 0));
  g.add(mesh(new THREE.BoxGeometry(4.4, 0.25, 4.4), GOLDROOF, 0, 4.7, 0));
  for (const [x, z] of [[-6.4, -6.4], [6.4, -6.4], [-6.4, 6.4], [6.4, 6.4]] as const) {
    g.add(mesh(new THREE.CylinderGeometry(0.4, 0.5, 10, 8), WHITE, x, 5, z));
    g.add(mesh(new THREE.ConeGeometry(0.65, 1.2, 8), GOLDROOF, x, 10.6, z));
  }
  return g;
}

/** 麦地那先知寺 */
function lmNabawi(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(12, 4, 10), WHITE, 0, 2, 0));
  g.add(mesh(new THREE.SphereGeometry(2.8, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), GREENLEAF, 0, 5.4, 0));
  for (const x of [-5.6, 5.6]) {
    g.add(mesh(new THREE.CylinderGeometry(0.4, 0.5, 11, 8), WHITE, x, 5.5, 3.4));
    g.add(mesh(new THREE.ConeGeometry(0.6, 1.1, 8), GOLDROOF, x, 11.5, 3.4));
  }
  return g;
}

/** 王国中心 */
function lmKingdomCentre(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(4.5, 18, 2.4), COLDGLASS, 0, 9, 0));
  g.add(mesh(new THREE.BoxGeometry(5.2, 1.4, 1.2), WHITE, 0, 17.4, 0));
  g.add(mesh(new THREE.BoxGeometry(2.0, 2.6, 0.4), DARKWOOD, 0, 16.2, 0));
  return g;
}

/** 麦斯马克堡 */
function lmMasmak(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(10, 4.5, 8), MUD, 0, 2.25, 0));
  for (const [x, z] of [[-4.6, -3.6], [4.6, -3.6], [-4.6, 3.6], [4.6, 3.6]] as const) {
    g.add(mesh(new THREE.BoxGeometry(2.2, 6, 2.2), MUD, x, 3, z));
  }
  g.add(mesh(new THREE.BoxGeometry(2.0, 2.8, 0.4), DARKWOOD, 0, 1.5, 4.1));
  return g;
}

/** 迪里耶 */
function lmDiriyah(): THREE.Group {
  const g = new THREE.Group();
  for (const [x, w] of [[-3.4, 4.2], [2.8, 5.0]] as const) {
    g.add(mesh(new THREE.BoxGeometry(4.5, w, 4), MUD, x, w / 2, 0));
  }
  g.add(mesh(new THREE.CylinderGeometry(0.35, 0.5, 6, 6), GREENLEAF, 5.6, 3.2, 1.6));
  g.add(mesh(new THREE.SphereGeometry(1.4, 6, 4), GREENLEAF, 5.6, 6.4, 1.6, 1.1, 0.5, 1.1));
  return g;
}

/** 希格拉石墓 */
function lmHegra(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(16, 8, 6), SANDSTONE, 0, 4, -2));
  g.add(mesh(new THREE.BoxGeometry(4.5, 5, 2.2), SANDSTONE, 0, 2.5, 1.6));
  g.add(mesh(new THREE.BoxGeometry(1.8, 3.2, 0.4), DARKWOOD, 0, 1.7, 2.75));
  return g;
}

/** 象岩 */
function lmElephantRock(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(8, 5, 4), SANDSTONE, 0, 2.5, 0));
  g.add(mesh(new THREE.BoxGeometry(2.4, 1.4, 1.6), SANDSTONE, 4.6, 4.4, 0));
  g.add(mesh(new THREE.BoxGeometry(1.2, 3.2, 1.2), SANDSTONE, 5.6, 1.6, 0));
  return g;
}

/** 吉达喷泉 */
function lmJeddahFountain(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(12, 0.2, 8), REEFTEAL, 0, 0.12, 0));
  g.add(mesh(new THREE.CylinderGeometry(0.35, 0.7, 16, 8), WHITE, 0, 8, 0));
  g.add(mesh(new THREE.ConeGeometry(1.6, 3.2, 8), COLDGLASS, 0, 17.2, 0));
  return g;
}

/** 红海礁岸 */
function lmRedSea(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(16, 0.2, 10), REEFTEAL, 0, 0.12, 0));
  g.add(mesh(new THREE.DodecahedronGeometry(1.4, 0), CORALPINK, -3, 0.6, 1.2));
  g.add(mesh(new THREE.DodecahedronGeometry(1.1, 0), ONION_TEAL, 2.4, 0.5, -1));
  g.add(mesh(new THREE.CylinderGeometry(0.2, 0.3, 6, 5), WOOD, 5.5, 3.2, 2.2));
  g.add(mesh(new THREE.SphereGeometry(1.4, 6, 4), GREENLEAF, 5.5, 6.4, 2.2, 1.15, 0.5, 1.15));
  return g;
}

/** 世界边缘 */
function lmEdgeWorld(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(16, 8, 6), LIMESTONE, 0, 4, -2));
  g.add(mesh(new THREE.BoxGeometry(12, 4, 5), SANDSTONE, 2, 2, 2.2));
  return g;
}

/** 空旷四分地 */
function lmEmptyQuarter(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.SphereGeometry(6, 7, 5), DUNE, -3, 2.0, 0, 1.5, 0.5, 1.1));
  g.add(mesh(new THREE.SphereGeometry(5, 7, 5), DUNE, 4, 1.6, 1.4, 1.4, 0.45, 1.1));
  return g;
}

/** 阿卜哈山地 */
function lmAbha(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.ConeGeometry(7, 10, 6), GRAYSTONE, 0, 5, -1));
  g.add(mesh(new THREE.BoxGeometry(8, 1.2, 3), GREENLEAF, 0, 1.4, 2));
  g.add(mesh(new THREE.BoxGeometry(6, 1.0, 2.4), GREENLEAF, 0, 2.6, 1.4));
  return g;
}

/** 桌山 */
function lmTableMountain(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(14, 8, 6), GRAYSTONE, 0, 4, 0));
  g.add(mesh(new THREE.BoxGeometry(15, 1.2, 7), GRAYSTONE, 0, 8.6, 0));
  g.add(mesh(new THREE.BoxGeometry(5, 6, 4), GRAYSTONE, -8, 3, 1));
  return g;
}

/** 好望角 */
function lmCapePoint(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(12, 5, 8), GRAYSTONE, 0, 2.5, -1));
  g.add(mesh(new THREE.BoxGeometry(14, 0.2, 8), REEFTEAL, 0, 0.12, 3));
  g.add(mesh(new THREE.CylinderGeometry(0.7, 0.9, 7, 8), WHITE, 0, 7.2, 0));
  g.add(mesh(new THREE.ConeGeometry(1.1, 1.6, 8), REDWALL, 0, 11.4, 0));
  return g;
}

/** 罗本岛 */
function lmRobbenIsland(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(14, 0.2, 10), REEFTEAL, 0, 0.12, 0));
  g.add(mesh(new THREE.BoxGeometry(8, 3.2, 5), WHITE, 0, 1.7, 0));
  g.add(mesh(new THREE.BoxGeometry(1.6, 2.2, 0.3), DARKWOOD, 0, 1.2, 2.55));
  g.add(mesh(new THREE.CylinderGeometry(0.5, 0.6, 6, 8), WHITE, 4.6, 3.2, -1.4));
  return g;
}

/** 企鹅滩 */
function lmBoulders(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(12, 0.2, 8), REEFTEAL, 0, 0.12, 1.5));
  for (const [x, z] of [[-3, 0], [0, 1.2], [2.6, -0.6], [-1.4, -1.6]] as const) {
    g.add(mesh(new THREE.DodecahedronGeometry(0.9, 0), GRAYSTONE, x, 0.5, z));
    g.add(mesh(new THREE.SphereGeometry(0.45, 6, 5), WHITE, x + 0.8, 0.55, z + 0.4));
    g.add(mesh(new THREE.SphereGeometry(0.28, 5, 4), WHITE, x + 0.8, 0.95, z + 0.4));
  }
  return g;
}

/** 联合大厦 */
function lmUnionBuildings(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(14, 3.6, 5), SANDSTONE, 0, 1.8, 0));
  g.add(mesh(new THREE.BoxGeometry(4, 6, 4), SANDSTONE, 0, 5.2, 0));
  g.add(mesh(new THREE.SphereGeometry(1.6, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.55), SANDSTONE, 0, 8.4, 0));
  for (const x of [-6.2, 6.2]) {
    g.add(mesh(new THREE.BoxGeometry(3.2, 5.2, 3.2), SANDSTONE, x, 4.0, 0));
  }
  return g;
}

/** 约翰内斯堡 */
function lmJoburg(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.ConeGeometry(6, 4, 6), OCHRE, -5, 2, 1));
  for (const [x, h] of [[-1.2, 8], [1.6, 11], [4.2, 7]] as const) {
    g.add(mesh(new THREE.BoxGeometry(1.8, h, 1.8), COLDGLASS, x, h / 2, 0));
  }
  return g;
}

/** 克鲁格 */
function lmKruger(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(0.25, 0.4, 5, 6), WOOD, -3, 2.6, 0));
  g.add(mesh(new THREE.SphereGeometry(2.2, 6, 4), GREENLEAF, -3, 5.4, 0, 1.4, 0.45, 1.4));
  g.add(mesh(new THREE.BoxGeometry(2.8, 1.4, 1.2), OCHRE, 2.2, 1.0, 0.6));
  g.add(mesh(new THREE.BoxGeometry(0.9, 1.1, 0.7), OCHRE, 3.6, 1.4, 0.6));
  return g;
}

/** 德拉肯斯堡 */
function lmDrakensberg(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(16, 10, 5), GRAYSTONE, 0, 5, -1.5));
  g.add(mesh(new THREE.BoxGeometry(8, 6, 4), GRAYSTONE, -4, 8, 0.4));
  g.add(mesh(new THREE.BoxGeometry(5, 4, 3), GRAYSTONE, 5, 7, 0.2));
  return g;
}

/** 布莱德河峡谷 */
function lmBlyde(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(14, 7, 6), GREENLEAF, 0, 3.5, -1.5));
  g.add(mesh(new THREE.BoxGeometry(8, 4, 4), SANDSTONE, 0, 2, 1.5));
  g.add(mesh(new THREE.BoxGeometry(1.2, 4.5, 0.6), WHITE, -1.6, 3.2, 2.4));
  g.add(mesh(new THREE.BoxGeometry(1.2, 4.5, 0.6), WHITE, 1.6, 3.2, 2.4));
  return g;
}

/** 德班海滨 */
function lmDurban(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(16, 0.2, 6), DUNE, 0, 0.12, 1));
  g.add(mesh(new THREE.BoxGeometry(16, 0.16, 6), REEFTEAL, 0, 0.1, 5));
  g.add(mesh(new THREE.CylinderGeometry(0.2, 0.32, 7, 5), WOOD, -4, 3.6, -1.4, 1, 1, 1, 0.1, 0, 0));
  g.add(mesh(new THREE.SphereGeometry(1.5, 6, 4), GREENLEAF, -4, 7.2, -1.4, 1.2, 0.5, 1.2));
  g.add(mesh(new THREE.BoxGeometry(2.0, 7, 2.0), WHITE, 3.6, 3.5, -1.6));
  return g;
}

/** 花园大道 */
function lmGardenRoute(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(14, 0.2, 6), REEFTEAL, 0, 0.12, 2.5));
  g.add(mesh(new THREE.ConeGeometry(5, 7, 6), GREENLEAF, -4, 3.5, -1.6));
  g.add(mesh(new THREE.ConeGeometry(4, 5.5, 6), GRAYSTONE, 4.2, 2.8, -1.2));
  return g;
}

/** 厄加勒斯角 */
function lmAgulhas(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(12, 3.2, 8), SANDSTONE, 0, 1.6, -1));
  g.add(mesh(new THREE.BoxGeometry(14, 0.2, 8), REEFTEAL, 0, 0.12, 3));
  g.add(mesh(new THREE.CylinderGeometry(0.85, 1.1, 8, 8), WHITE, 0, 5.6, 0));
  g.add(mesh(new THREE.ConeGeometry(1.2, 1.8, 8), REDWALL, 0, 10.4, 0));
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
  goryokaku: lmGoryokaku,
  tokyo_tower: lmTokyoTower,
  sensoji: lmSensoji,
  fuji: lmFuji,
  kinkaku: lmKinkaku,
  fushimi: lmFushimi,
  nara_daibutsu: lmNaraDaibutsu,
  osaka_castle: lmOsakaCastle,
  himeji: lmHimeji,
  itsukushima: lmItsukushima,
  dogo: lmDogo,
  shureimon: lmShureimon,
  space_needle: lmSpaceNeedle,
  golden_gate: lmGoldenGate,
  hollywood: lmHollywood,
  grand_canyon: lmGrandCanyon,
  monument_valley: lmMonumentValley,
  vegas_sign: lmVegasSign,
  yellowstone: lmYellowstone,
  rushmore: lmRushmore,
  gateway_arch: lmGatewayArch,
  niagara: lmNiagara,
  white_house: lmWhiteHouse,
  statue_liberty: lmStatueLiberty,
  opera_house: lmOperaHouse,
  harbour_bridge: lmHarbourBridge,
  three_sisters: lmThreeSisters,
  barrier_reef: lmBarrierReef,
  gold_coast: lmGoldCoast,
  twelve_apostles: lmTwelveApostles,
  parliament_house: lmParliamentHouse,
  uluru: lmUluru,
  wave_rock: lmWaveRock,
  pinnacles: lmPinnacles,
  kangaroo: lmKangaroo,
  cradle_mountain: lmCradleMountain,
  alexandria: lmAlexandria,
  giza: lmGiza,
  sphinx: lmSphinx,
  citadel: lmCitadel,
  saqqara: lmSaqqara,
  karnak: lmKarnak,
  luxor: lmLuxor,
  hatshepsut: lmHatshepsut,
  valley_kings: lmValleyKings,
  philae: lmPhilae,
  abu_simbel: lmAbuSimbel,
  felucca: lmFelucca,
  golden_temple: lmGoldenTemple,
  india_gate: lmIndiaGate,
  red_fort: lmRedFort,
  taj_mahal: lmTajMahal,
  hawa_mahal: lmHawaMahal,
  varanasi: lmVaranasi,
  gateway_india: lmGatewayIndia,
  charminar: lmCharminar,
  mysore: lmMysore,
  kerala: lmKerala,
  meenakshi: lmMeenakshi,
  ellora: lmEllora,
  vancouver_totem: lmVancouverTotem,
  lions_gate: lmLionsGate,
  banff: lmBanff,
  calgary_tower: lmCalgaryTower,
  cn_tower: lmCnTower,
  horseshoe: lmHorseshoe,
  parliament_hill: lmParliamentHill,
  notre_dame_mtl: lmNotreDameMtl,
  frontenac: lmFrontenac,
  peggy_cove: lmPeggyCove,
  inuksuk: lmInuksuk,
  polar_bear: lmPolarBear,
  eiffel: lmEiffel,
  arc_triomphe: lmArcTriomphe,
  notre_dame: lmNotreDame,
  louvre: lmLouvre,
  sacre_coeur: lmSacreCoeur,
  versailles: lmVersailles,
  mont_saint_michel: lmMontSaintMichel,
  chenonceau: lmChenonceau,
  lavender: lmLavender,
  pont_du_gard: lmPontDuGard,
  mont_blanc: lmMontBlanc,
  cote_azur: lmCoteAzur,
  christ_redeemer: lmChristRedeemer,
  sugarloaf: lmSugarloaf,
  copacabana: lmCopacabana,
  maracana: lmMaracana,
  iguazu: lmIguazu,
  brasilia: lmBrasilia,
  pelourinho: lmPelourinho,
  olinda: lmOlinda,
  pantanal: lmPantanal,
  lencois: lmLencois,
  teatro_amazonas: lmTeatroAmazonas,
  amazon: lmAmazon,
  cabo_arch: lmCaboArch,
  copper_canyon: lmCopperCanyon,
  guadalajara: lmGuadalajara,
  teotihuacan: lmTeotihuacan,
  catedral_mex: lmCatedralMex,
  angel_independencia: lmAngelIndependencia,
  bellas_artes: lmBellasArtes,
  xochimilco: lmXochimilco,
  popocatepetl: lmPopocatepetl,
  palenque: lmPalenque,
  chichen_itza: lmChichenItza,
  tulum: lmTulum,
  giant_causeway: lmGiantCauseway,
  edinburgh_castle: lmEdinburghCastle,
  loch_ness: lmLochNess,
  hadrians_wall: lmHadriansWall,
  lake_district: lmLakeDistrict,
  york_minster: lmYorkMinster,
  stonehenge: lmStonehenge,
  tower_bridge: lmTowerBridge,
  big_ben: lmBigBen,
  st_pauls: lmStPauls,
  windsor: lmWindsor,
  white_cliffs: lmWhiteCliffs,
  n_seoul_tower: lmNSeoulTower,
  gyeongbokgung: lmGyeongbokgung,
  bukchon: lmBukchon,
  lotte_tower: lmLotteTower,
  hwaseong: lmHwaseong,
  cheomseongdae: lmCheomseongdae,
  bulguksa: lmBulguksa,
  gamcheon: lmGamcheon,
  haeundae: lmHaeundae,
  hallasan: lmHallasan,
  hareubang: lmHareubang,
  seongsan: lmSeongsan,
  colosseum: lmColosseum,
  pantheon: lmPantheon,
  vatican: lmVatican,
  roman_forum: lmRomanForum,
  pisa: lmPisa,
  florence_duomo: lmFlorenceDuomo,
  venice: lmVenice,
  milan_duomo: lmMilanDuomo,
  pompeii: lmPompeii,
  amalfi: lmAmalfi,
  cinque_terre: lmCinqueTerre,
  etna: lmEtna,
  hagia_sophia: lmHagiaSophia,
  blue_mosque: lmBlueMosque,
  galata: lmGalata,
  bosphorus: lmBosphorus,
  cappadocia: lmCappadocia,
  pamukkale: lmPamukkale,
  ephesus: lmEphesus,
  troy: lmTroy,
  nemrut: lmNemrut,
  antalya: lmAntalya,
  sumela: lmSumela,
  ararat: lmArarat,
  haram: lmHaram,
  nabawi: lmNabawi,
  kingdom_centre: lmKingdomCentre,
  masmak: lmMasmak,
  diriyah: lmDiriyah,
  hegra: lmHegra,
  elephant_rock: lmElephantRock,
  jeddah_fountain: lmJeddahFountain,
  red_sea: lmRedSea,
  edge_world: lmEdgeWorld,
  empty_quarter: lmEmptyQuarter,
  abha: lmAbha,
  table_mountain: lmTableMountain,
  cape_point: lmCapePoint,
  robben_island: lmRobbenIsland,
  boulders: lmBoulders,
  union_buildings: lmUnionBuildings,
  joburg: lmJoburg,
  kruger: lmKruger,
  drakensberg: lmDrakensberg,
  blyde: lmBlyde,
  durban: lmDurban,
  garden_route: lmGardenRoute,
  agulhas: lmAgulhas,
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
  goryokaku: 10,
  tokyo_tower: 34,
  sensoji: 12,
  fuji: 26,
  kinkaku: 12,
  fushimi: 10,
  nara_daibutsu: 14,
  osaka_castle: 18,
  himeji: 18,
  itsukushima: 14,
  dogo: 14,
  shureimon: 12,
  space_needle: 28,
  golden_gate: 20,
  hollywood: 12,
  grand_canyon: 16,
  monument_valley: 16,
  vegas_sign: 14,
  yellowstone: 12,
  rushmore: 16,
  gateway_arch: 20,
  niagara: 12,
  white_house: 12,
  statue_liberty: 18,
  opera_house: 12,
  harbour_bridge: 18,
  three_sisters: 18,
  barrier_reef: 8,
  gold_coast: 22,
  twelve_apostles: 14,
  parliament_house: 16,
  uluru: 16,
  wave_rock: 12,
  pinnacles: 12,
  kangaroo: 10,
  cradle_mountain: 18,
  alexandria: 18,
  giza: 20,
  sphinx: 12,
  citadel: 16,
  saqqara: 14,
  karnak: 16,
  luxor: 14,
  hatshepsut: 12,
  valley_kings: 12,
  philae: 10,
  abu_simbel: 16,
  felucca: 10,
  golden_temple: 14,
  india_gate: 16,
  red_fort: 14,
  taj_mahal: 18,
  hawa_mahal: 14,
  varanasi: 10,
  gateway_india: 16,
  charminar: 18,
  mysore: 16,
  kerala: 10,
  meenakshi: 18,
  ellora: 14,
  vancouver_totem: 14,
  lions_gate: 18,
  banff: 20,
  calgary_tower: 24,
  cn_tower: 34,
  horseshoe: 12,
  parliament_hill: 18,
  notre_dame_mtl: 16,
  frontenac: 16,
  peggy_cove: 14,
  inuksuk: 10,
  polar_bear: 10,
  eiffel: 24,
  arc_triomphe: 14,
  notre_dame: 16,
  louvre: 12,
  sacre_coeur: 14,
  versailles: 12,
  mont_saint_michel: 18,
  chenonceau: 12,
  lavender: 8,
  pont_du_gard: 12,
  mont_blanc: 22,
  cote_azur: 10,
  christ_redeemer: 18,
  sugarloaf: 16,
  copacabana: 10,
  maracana: 12,
  iguazu: 12,
  brasilia: 16,
  pelourinho: 12,
  olinda: 14,
  pantanal: 8,
  lencois: 10,
  teatro_amazonas: 14,
  amazon: 12,
  cabo_arch: 12,
  copper_canyon: 16,
  guadalajara: 16,
  teotihuacan: 16,
  catedral_mex: 16,
  angel_independencia: 22,
  bellas_artes: 14,
  xochimilco: 10,
  popocatepetl: 22,
  palenque: 14,
  chichen_itza: 18,
  tulum: 12,
  giant_causeway: 10,
  edinburgh_castle: 16,
  loch_ness: 12,
  hadrians_wall: 10,
  lake_district: 14,
  york_minster: 18,
  stonehenge: 10,
  tower_bridge: 18,
  big_ben: 22,
  st_pauls: 16,
  windsor: 16,
  white_cliffs: 16,
  n_seoul_tower: 24,
  gyeongbokgung: 12,
  bukchon: 10,
  lotte_tower: 32,
  hwaseong: 12,
  cheomseongdae: 12,
  bulguksa: 12,
  gamcheon: 10,
  haeundae: 12,
  hallasan: 18,
  hareubang: 10,
  seongsan: 12,
  colosseum: 14,
  pantheon: 14,
  vatican: 16,
  roman_forum: 12,
  pisa: 16,
  florence_duomo: 16,
  venice: 14,
  milan_duomo: 16,
  pompeii: 14,
  amalfi: 12,
  cinque_terre: 14,
  etna: 20,
  hagia_sophia: 16,
  blue_mosque: 16,
  galata: 18,
  bosphorus: 16,
  cappadocia: 16,
  pamukkale: 10,
  ephesus: 12,
  troy: 12,
  nemrut: 14,
  antalya: 14,
  sumela: 14,
  ararat: 22,
  haram: 16,
  nabawi: 16,
  kingdom_centre: 24,
  masmak: 12,
  diriyah: 12,
  hegra: 14,
  elephant_rock: 12,
  jeddah_fountain: 22,
  red_sea: 10,
  edge_world: 14,
  empty_quarter: 10,
  abha: 14,
  table_mountain: 16,
  cape_point: 16,
  robben_island: 12,
  boulders: 8,
  union_buildings: 14,
  joburg: 16,
  kruger: 12,
  drakensberg: 18,
  blyde: 14,
  durban: 12,
  garden_route: 12,
  agulhas: 16,
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
      const coldLake = world.packId === 'russia' || world.packId === 'canada';
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
      const palette = PACK_FLOWERS[world.packId] ?? DEFAULT_FLOWERS;
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