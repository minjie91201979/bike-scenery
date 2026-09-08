import * as THREE from 'three';
import { rand, ROWS } from './World';
import type { World } from './World';

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

    // 逐实例配色
    for (let i = 0; i < treeCount; i++) {
      this.col.setHSL(0.29 + rand(i * 1.7) * 0.07, 0.52 + rand(i * 2.3) * 0.18, 0.30 + rand(i * 3.1) * 0.13);
      this.pineSlots.meshes[0].setColorAt(i, this.col);
      this.leafSlots.meshes[0].setColorAt(i, this.col);
    }
    const bushCount = POOL_SEGS * BUSH_PER_SEG;
    for (let i = 0; i < bushCount; i++) {
      this.col.setHSL(0.27 + rand(i * 4.1) * 0.08, 0.5, 0.32 + rand(i * 5.2) * 0.1);
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
    return [this.treeSlots, this.pineSlots, this.leafSlots, this.bush, this.rock, this.flower];
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
        if (rand(seed + 0.53) < 0.55) {
          this.write(this.pineSlots, treeI, spot.x, spot.y - 0.1, spot.z, ry, sc, sc, sc);
          this.hide(this.leafSlots, treeI);
        } else {
          this.write(this.leafSlots, treeI, spot.x, spot.y - 0.1, spot.z, ry, sc, sc, sc);
          this.hide(this.pineSlots, treeI);
        }
      } else {
        this.hide(this.treeSlots, treeI);
        this.hide(this.pineSlots, treeI);
        this.hide(this.leafSlots, treeI);
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
 *  POI 地标：风车 / 观星台 / 灯塔 / 湖面 / 花海
 * ============================================================ */

const WOOD = new THREE.MeshStandardMaterial({ color: 0x8a6a48, roughness: 0.9, flatShading: true });
const WHITE = new THREE.MeshStandardMaterial({ color: 0xf2f0ea, roughness: 0.8, flatShading: true });
const DARKROOF = new THREE.MeshStandardMaterial({ color: 0x43506b, roughness: 0.7, flatShading: true });
const GLASS = new THREE.MeshStandardMaterial({
  color: 0xffe9a8, emissive: 0xffcf70, emissiveIntensity: 0.2, roughness: 0.3, flatShading: true
});

export function buildPois(scene: THREE.Scene, world: World): Animatable[] {
  const animatables: Animatable[] = [];

  for (const poi of world.pois) {
    const g = new THREE.Group();
    g.position.copy(poi.pos);
    g.lookAt(poi.roadPos.x, poi.pos.y, poi.roadPos.z);
    scene.add(g);

    if (poi.type === 'windmill') {
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

    } else if (poi.type === 'observatory') {
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

    } else if (poi.type === 'lighthouse') {
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

    } else if (poi.type === 'lake') {
      const water = new THREE.Mesh(
        new THREE.CircleGeometry(poi.radius * 0.99, 40),
        new THREE.MeshStandardMaterial({
          color: 0x3f8fc9, roughness: 0.12, metalness: 0.35, transparent: true, opacity: 0.94
        })
      );
      water.rotation.x = -Math.PI / 2;
      water.position.y = (poi.waterLevel ?? 0) + 0.06;
      scene.add(water);
      const level = poi.waterLevel ?? 0;
      animatables.push({
        tick: (_dt, _ctx, t) => { water.position.y = level + 0.06 + Math.sin(t * 1.3) * 0.03; }
      });

    } else if (poi.type === 'meadow') {
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
    const poleH = poi.type === 'windmill' ? 15.5 : poi.type === 'lighthouse' ? 20 : poi.type === 'lake' ? 1.6 : 7.5;
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
