import * as THREE from 'three';
import { rand } from './World';
import type { World } from './World';

/* ============================================================
 *  土耳其卡帕多奇亚热气球：确定性投放，远近分层
 *  结构 = 球囊 + 燃烧器 + 吊篮 + 绳索/沙袋/旗；花纹走顶点色
 * ============================================================ */

type Pattern = 'vstripe' | 'hband' | 'checker' | 'cap' | 'gore' | 'diamond';

const PATTERNS: Pattern[] = ['vstripe', 'hband', 'checker', 'cap', 'gore', 'diamond'];

interface Palette {
  a: number;
  b: number;
  c: number;
}

const PALETTES: Palette[] = [
  { a: 0xc23b2e, b: 0xf4efe4, c: 0x3a6ec9 },
  { a: 0xe07a28, b: 0xffd166, c: 0x2f6b4f },
  { a: 0x1f7a8c, b: 0xf2f0ea, c: 0xc9a227 },
  { a: 0x6b2d5c, b: 0xe8c44a, c: 0xf4efe4 },
  { a: 0xc43c3c, b: 0xffffff, c: 0x1a1a1c },
  { a: 0x3a6ec9, b: 0xff8a5b, c: 0xf7f1e1 },
  { a: 0x2a6e5a, b: 0xf0d78c, c: 0xc45a3a },
  { a: 0x4a90c8, b: 0xe8d5a3, c: 0x8b1e3f },
];

const ENVELOPE_MAT = new THREE.MeshStandardMaterial({
  roughness: 0.82, metalness: 0.04, flatShading: true, vertexColors: true,
});
const NECK_MAT = new THREE.MeshStandardMaterial({ color: 0x3a322c, roughness: 0.7, flatShading: true });
const RING_MAT = new THREE.MeshStandardMaterial({ color: 0xb8c4d0, roughness: 0.28, metalness: 0.62, flatShading: true });
const WICKER = new THREE.MeshStandardMaterial({ color: 0x8a6238, roughness: 0.9, flatShading: true });
const WICKER_D = new THREE.MeshStandardMaterial({ color: 0x5c3d2e, roughness: 0.88, flatShading: true });
const METAL = new THREE.MeshStandardMaterial({ color: 0x4a535e, roughness: 0.4, metalness: 0.55, flatShading: true });
const ROPE_MAT = new THREE.MeshStandardMaterial({ color: 0x6a5340, roughness: 0.85, flatShading: true });
const BAG_MAT = new THREE.MeshStandardMaterial({ color: 0x5a4030, roughness: 0.86, flatShading: true });

const SPHERE_GEO = new THREE.SphereGeometry(1, 12, 10);
const NECK_GEO = new THREE.ConeGeometry(0.22, 0.38, 8);
const RING_GEO = new THREE.TorusGeometry(0.24, 0.035, 5, 10);
const CROWN_GEO = new THREE.TorusGeometry(0.42, 0.04, 5, 10);
const ROPE_GEO = new THREE.CylinderGeometry(0.016, 0.016, 1, 4);
const BURNER_GEO = new THREE.BoxGeometry(0.22, 0.16, 0.22);
const FLAME_GEO = new THREE.ConeGeometry(0.09, 0.28, 6);
const BASKET_GEO = new THREE.BoxGeometry(0.52, 0.36, 0.52);
const RIM_GEO = new THREE.BoxGeometry(0.58, 0.05, 0.58);
const BAG_GEO = new THREE.BoxGeometry(0.12, 0.16, 0.1);
const FLAG_POLE_GEO = new THREE.CylinderGeometry(0.012, 0.012, 0.42, 4);
const FLAG_GEO = new THREE.BoxGeometry(0.22, 0.12, 0.02);
const UP = new THREE.Vector3(0, 1, 0);
const TMP_A = new THREE.Vector3();
const TMP_B = new THREE.Vector3();
const TMP_D = new THREE.Vector3();

const HIDE2 = 310 * 310;
const CAPPADOCIA_T = 0.36;

function hexRgb(hex: number, out: [number, number, number]): [number, number, number] {
  out[0] = ((hex >> 16) & 255) / 255;
  out[1] = ((hex >> 8) & 255) / 255;
  out[2] = (hex & 255) / 255;
  return out;
}

const RGB_A: [number, number, number] = [0, 0, 0];
const RGB_B: [number, number, number] = [0, 0, 0];
const RGB_C: [number, number, number] = [0, 0, 0];

function pickColor(
  kind: Pattern, u: number, v: number, pal: Palette,
): [number, number, number] {
  hexRgb(pal.a, RGB_A);
  hexRgb(pal.b, RGB_B);
  hexRgb(pal.c, RGB_C);
  if (kind === 'vstripe') {
    const n = Math.floor(u * 8) % 2;
    return n === 0 ? RGB_A : RGB_B;
  }
  if (kind === 'hband') {
    if (v > 0.78) return RGB_C;
    if (v > 0.55) return RGB_A;
    if (v > 0.32) return RGB_B;
    return RGB_C;
  }
  if (kind === 'checker') {
    const n = (Math.floor(u * 8) + Math.floor(v * 6)) % 2;
    return n === 0 ? RGB_A : RGB_B;
  }
  if (kind === 'cap') {
    if (v > 0.72) return RGB_C;
    const n = Math.floor(u * 10) % 2;
    return n === 0 ? RGB_A : RGB_B;
  }
  if (kind === 'gore') {
    const gore = Math.floor(u * 6);
    if (gore % 3 === 0) return RGB_A;
    if (gore % 3 === 1) return RGB_B;
    return RGB_C;
  }
  const n = (Math.floor(u * 6 + v * 4) + Math.floor(v * 6)) % 2;
  return n === 0 ? RGB_A : RGB_C;
}

function paintEnvelope(geo: THREE.BufferGeometry, kind: Pattern, pal: Palette): void {
  const pos = geo.getAttribute('position');
  const colors = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const u = (Math.atan2(x, z) / (Math.PI * 2) + 1) % 1;
    const v = y * 0.5 + 0.5;
    const rgb = pickColor(kind, u, v, pal);
    colors[i * 3] = rgb[0];
    colors[i * 3 + 1] = rgb[1];
    colors[i * 3 + 2] = rgb[2];
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
}

function addRope(parent: THREE.Group, ax: number, ay: number, az: number, bx: number, by: number, bz: number): void {
  TMP_A.set(ax, ay, az);
  TMP_B.set(bx, by, bz);
  TMP_D.subVectors(TMP_B, TMP_A);
  const len = TMP_D.length();
  const mesh = new THREE.Mesh(ROPE_GEO, ROPE_MAT);
  mesh.position.copy(TMP_A).add(TMP_B).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(UP, TMP_D.normalize());
  mesh.scale.set(1, len, 1);
  mesh.castShadow = true;
  parent.add(mesh);
}

function makeBalloon(seed: number): { root: THREE.Group; flame: THREE.MeshStandardMaterial } {
  const kind = PATTERNS[Math.floor(rand(seed) * PATTERNS.length) % PATTERNS.length];
  const pal = PALETTES[Math.floor(rand(seed + 0.17) * PALETTES.length) % PALETTES.length];
  const root = new THREE.Group();

  const envGeo = SPHERE_GEO.clone();
  paintEnvelope(envGeo, kind, pal);
  const envelope = new THREE.Mesh(envGeo, ENVELOPE_MAT);
  envelope.scale.set(1, 1.22, 1);
  envelope.castShadow = true;
  root.add(envelope);

  const neck = new THREE.Mesh(NECK_GEO, NECK_MAT);
  neck.position.y = -1.08;
  neck.castShadow = true;
  root.add(neck);

  const ring = new THREE.Mesh(RING_GEO, RING_MAT);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = -1.24;
  root.add(ring);

  const crown = new THREE.Mesh(CROWN_GEO, RING_MAT);
  crown.rotation.x = Math.PI / 2;
  crown.position.y = 0.92;
  crown.scale.set(1, 1, 0.85);
  root.add(crown);

  const burner = new THREE.Mesh(BURNER_GEO, METAL);
  burner.position.y = -1.48;
  burner.castShadow = true;
  root.add(burner);

  const flameMat = new THREE.MeshStandardMaterial({
    color: 0xffc070, emissive: 0xff8a2a, emissiveIntensity: 1.4,
    roughness: 0.4, flatShading: true,
  });
  const flame = new THREE.Mesh(FLAME_GEO, flameMat);
  flame.position.y = -1.32;
  root.add(flame);

  const basketY = -2.22;
  const basket = new THREE.Mesh(BASKET_GEO, WICKER);
  basket.position.y = basketY;
  basket.castShadow = true;
  root.add(basket);
  const rim = new THREE.Mesh(RIM_GEO, WICKER_D);
  rim.position.y = basketY + 0.18;
  root.add(rim);

  const corners: [number, number][] = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
  for (const [sx, sz] of corners) {
    addRope(root, sx * 0.16, -1.24, sz * 0.16, sx * 0.22, basketY + 0.18, sz * 0.22);
  }

  for (const s of [-1, 1]) {
    const bag = new THREE.Mesh(BAG_GEO, BAG_MAT);
    bag.position.set(s * 0.28, basketY - 0.08, 0.22);
    root.add(bag);
    addRope(root, s * 0.22, basketY + 0.12, 0.18, s * 0.28, basketY, 0.22);
  }

  const pole = new THREE.Mesh(FLAG_POLE_GEO, METAL);
  pole.position.set(0.22, basketY + 0.38, -0.18);
  root.add(pole);
  const flag = new THREE.Mesh(FLAG_GEO, new THREE.MeshStandardMaterial({
    color: pal.a, roughness: 0.75, flatShading: true,
  }));
  flag.position.set(0.34, basketY + 0.48, -0.18);
  root.add(flag);

  root.frustumCulled = false;
  return { root, flame: flameMat };
}

interface Balloon {
  root: THREE.Group;
  flame: THREE.MeshStandardMaterial;
  x: number;
  y: number;
  z: number;
  yaw: number;
  phase: number;
  drift: number;
  bob: number;
}

export class SkyBalloons {
  private balloons: Balloon[] = [];

  constructor(scene: THREE.Scene, world: World) {
    if (world.packId !== 'turkey') return;

    const n = Math.max(16, Math.round(world.length / 1000 * 3.2));
    this.placeRing(scene, world, n, 0);
    this.placeRing(scene, world, 8, 40); // 卡帕多奇亚附近加密
  }

  private placeRing(scene: THREE.Scene, world: World, n: number, salt: number): void {
    let placed = 0;
    let guard = 0;
    while (placed < n && guard < n * 6) {
      const seed = placed * 19.7 + guard * 5.1 + salt + 3.3;
      guard++;
      let t = rand(seed);
      if (salt > 0 || rand(seed + 0.08) < 0.28) {
        t = CAPPADOCIA_T + (rand(seed + 0.11) - 0.5) * (salt > 0 ? 0.1 : 0.16);
        t = (t + 1) % 1;
      }
      const s = t * world.length;
      const pose = world.poseAt(s);
      const far = rand(seed + 0.22) < (salt > 0 ? 0.35 : 0.58);
      const side = rand(seed + 0.31) < 0.5 ? -1 : 1;
      const lat = side * (far
        ? 72 + rand(seed + 0.4) * 130
        : 18 + rand(seed + 0.4) * 36);
      if (Math.abs(lat) < 14) continue;

      const x = pose.pos.x + pose.right.x * lat;
      const z = pose.pos.z + pose.right.z * lat;
      const y = pose.pos.y + (far
        ? 28 + rand(seed + 0.52) * 42
        : 11 + rand(seed + 0.52) * 18);

      const { root, flame } = makeBalloon(seed + 0.7);
      const sc = far
        ? 2.15 + rand(seed + 0.63) * 1.35
        : 1.35 + rand(seed + 0.63) * 0.85;
      root.scale.setScalar(sc);
      const yaw = rand(seed + 0.77) * Math.PI * 2;
      root.position.set(x, y, z);
      root.rotation.y = yaw;
      scene.add(root);
      this.balloons.push({
        root, flame, x, y, z, yaw,
        phase: rand(seed + 0.88) * Math.PI * 2,
        drift: 1.6 + rand(seed + 0.91) * 2.4,
        bob: 0.35 + rand(seed + 0.95) * 0.45,
      });
      placed++;
    }
  }

  /** 拍照课题：最近热气球水平距离，没有则 Infinity */
  nearestDist(player: THREE.Vector3): number {
    let best = Infinity;
    const px = player.x, pz = player.z;
    for (let i = 0; i < this.balloons.length; i++) {
      const b = this.balloons[i];
      const dx = px - b.x, dz = pz - b.z;
      const d = Math.sqrt(dx * dx + dz * dz);
      if (d < best) best = d;
    }
    return best;
  }

  /** 远的藏起来；近的缓慢漂浮 + 火焰闪动，不分配对象 */
  update(_dt: number, player: THREE.Vector3, t: number, night: number): void {
    const px = player.x, pz = player.z;
    for (let i = 0; i < this.balloons.length; i++) {
      const b = this.balloons[i];
      const dx = px - b.x, dz = pz - b.z;
      if (dx * dx + dz * dz > HIDE2) {
        b.root.visible = false;
        continue;
      }
      b.root.visible = true;
      const bob = Math.sin(t * 0.42 + b.phase) * b.bob;
      const driftX = Math.sin(t * 0.11 + b.phase) * b.drift;
      const driftZ = Math.cos(t * 0.09 + b.phase * 0.8) * b.drift * 0.7;
      b.root.position.set(b.x + driftX, b.y + bob, b.z + driftZ);
      b.root.rotation.y = b.yaw + t * 0.04;
      b.root.rotation.z = Math.sin(t * 0.23 + b.phase) * 0.035;
      b.flame.emissiveIntensity = 1.15 + Math.sin(t * 9.5 + b.phase) * 0.5 + night * 0.7;
    }
  }
}
