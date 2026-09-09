import * as THREE from 'three';
import { rand } from './World';
import type { World } from './World';

/* ============================================================
 *  各国特有鸟类：绕骑手盘旋的低多边形鸟群
 *  队形 / 颜色 / 翼展走数据表；主循环只改矩阵与翅膀角
 * ============================================================ */

type BirdKind =
  | 'crane' | 'stork' | 'ibis' | 'flamingo'
  | 'eagle' | 'vulture' | 'falcon'
  | 'swallow' | 'crow' | 'magpie' | 'seagull'
  | 'goose'
  | 'macaw' | 'parrot' | 'cockatoo' | 'quetzal';

type Form = 'vee' | 'cluster' | 'line';

interface BirdSpec {
  scale: number;
  flap: number;
  amp: number;
  body: number;
  wing: number;
  accent: number;
}

interface FlockDef {
  kind: BirdKind;
  n: number;
  form: Form;
  radius: number;
  alt: number;
  omega: number;
}

const SPEC: Record<BirdKind, BirdSpec> = {
  crane:    { scale: 1.35, flap: 3.2, amp: 0.38, body: 0xf2f0ea, wing: 0x1a1a1c, accent: 0xc43c3c },
  stork:    { scale: 1.28, flap: 3.0, amp: 0.36, body: 0xf4f1ea, wing: 0x2a2e33, accent: 0xc45a3a },
  ibis:     { scale: 1.05, flap: 3.6, amp: 0.42, body: 0x1a1a1c, wing: 0x2a2e33, accent: 0xc43c3c },
  flamingo: { scale: 1.22, flap: 3.4, amp: 0.40, body: 0xf0a0b8, wing: 0xe07090, accent: 0xc43c3c },
  eagle:    { scale: 1.45, flap: 2.4, amp: 0.28, body: 0x6a4a32, wing: 0x4a3220, accent: 0xf2f0ea },
  vulture:  { scale: 1.38, flap: 1.8, amp: 0.16, body: 0x5a5248, wing: 0x3a342e, accent: 0xa89070 },
  falcon:   { scale: 0.95, flap: 4.4, amp: 0.48, body: 0x7a6a58, wing: 0x4a4038, accent: 0xc4a070 },
  swallow:  { scale: 0.55, flap: 8.5, amp: 0.72, body: 0x3a5a7a, wing: 0x2a3e58, accent: 0xc45a3a },
  crow:     { scale: 0.78, flap: 5.2, amp: 0.55, body: 0x1c1c22, wing: 0x141418, accent: 0x2a2e33 },
  magpie:   { scale: 0.72, flap: 5.6, amp: 0.58, body: 0x1a1a1c, wing: 0xf2f0ea, accent: 0x3a6ec9 },
  seagull:  { scale: 0.88, flap: 4.6, amp: 0.50, body: 0xf4f1ea, wing: 0xe8e4d8, accent: 0xc9a227 },
  goose:    { scale: 1.05, flap: 3.8, amp: 0.42, body: 0x8a9aaa, wing: 0x6a7a88, accent: 0xf2f0ea },
  macaw:    { scale: 1.12, flap: 4.0, amp: 0.50, body: 0xc23b2e, wing: 0x3a6ec9, accent: 0xe8c44a },
  parrot:   { scale: 0.82, flap: 5.0, amp: 0.55, body: 0x2f8f5b, wing: 0x3a6ec9, accent: 0xe07a28 },
  cockatoo: { scale: 0.92, flap: 4.8, amp: 0.52, body: 0xf2f0ea, wing: 0xe8e4d8, accent: 0xe8c44a },
  quetzal:  { scale: 1.08, flap: 3.6, amp: 0.44, body: 0x2f8f5b, wing: 0x2a6a48, accent: 0xc23b2e },
};

const PACK_BIRDS: Record<string, FlockDef[]> = {
  china: [
    { kind: 'crane', n: 6, form: 'line', radius: 38, alt: 26, omega: 0.22 },
    { kind: 'swallow', n: 10, form: 'cluster', radius: 24, alt: 14, omega: 0.42 },
    { kind: 'magpie', n: 6, form: 'cluster', radius: 30, alt: 18, omega: 0.34 },
  ],
  japan: [
    { kind: 'crane', n: 7, form: 'line', radius: 36, alt: 24, omega: 0.20 },
    { kind: 'crow', n: 8, form: 'cluster', radius: 22, alt: 15, omega: 0.38 },
  ],
  korea: [
    { kind: 'magpie', n: 9, form: 'cluster', radius: 26, alt: 16, omega: 0.36 },
    { kind: 'crane', n: 4, form: 'line', radius: 40, alt: 28, omega: 0.18 },
  ],
  russia: [
    { kind: 'eagle', n: 4, form: 'line', radius: 42, alt: 32, omega: 0.16 },
    { kind: 'crow', n: 8, form: 'cluster', radius: 24, alt: 16, omega: 0.34 },
  ],
  canada: [
    { kind: 'goose', n: 9, form: 'vee', radius: 34, alt: 22, omega: 0.24 },
    { kind: 'eagle', n: 3, form: 'line', radius: 46, alt: 34, omega: 0.14 },
  ],
  usa: [
    { kind: 'eagle', n: 4, form: 'line', radius: 40, alt: 30, omega: 0.16 },
    { kind: 'seagull', n: 7, form: 'cluster', radius: 28, alt: 16, omega: 0.32 },
  ],
  australia: [
    { kind: 'cockatoo', n: 7, form: 'cluster', radius: 28, alt: 18, omega: 0.30 },
    { kind: 'swallow', n: 8, form: 'cluster', radius: 22, alt: 13, omega: 0.44 },
  ],
  egypt: [
    { kind: 'ibis', n: 6, form: 'line', radius: 32, alt: 22, omega: 0.22 },
    { kind: 'falcon', n: 3, form: 'cluster', radius: 26, alt: 28, omega: 0.40 },
    { kind: 'vulture', n: 4, form: 'line', radius: 44, alt: 36, omega: 0.12 },
  ],
  india: [
    { kind: 'parrot', n: 8, form: 'cluster', radius: 26, alt: 16, omega: 0.34 },
    { kind: 'eagle', n: 3, form: 'line', radius: 40, alt: 30, omega: 0.16 },
  ],
  brazil: [
    { kind: 'macaw', n: 6, form: 'cluster', radius: 28, alt: 18, omega: 0.30 },
    { kind: 'parrot', n: 8, form: 'cluster', radius: 22, alt: 14, omega: 0.38 },
  ],
  mexico: [
    { kind: 'quetzal', n: 5, form: 'line', radius: 32, alt: 22, omega: 0.24 },
    { kind: 'eagle', n: 3, form: 'line', radius: 42, alt: 32, omega: 0.15 },
  ],
  france: [
    { kind: 'swallow', n: 11, form: 'cluster', radius: 24, alt: 14, omega: 0.44 },
    { kind: 'seagull', n: 5, form: 'cluster', radius: 34, alt: 20, omega: 0.26 },
  ],
  uk: [
    { kind: 'seagull', n: 8, form: 'cluster', radius: 30, alt: 16, omega: 0.28 },
    { kind: 'swallow', n: 7, form: 'cluster', radius: 22, alt: 13, omega: 0.42 },
  ],
  italy: [
    { kind: 'swallow', n: 9, form: 'cluster', radius: 24, alt: 15, omega: 0.40 },
    { kind: 'seagull', n: 5, form: 'cluster', radius: 32, alt: 18, omega: 0.26 },
  ],
  turkey: [
    { kind: 'stork', n: 5, form: 'line', radius: 36, alt: 26, omega: 0.18 },
    { kind: 'swallow', n: 7, form: 'cluster', radius: 24, alt: 14, omega: 0.38 },
  ],
  saudi: [
    { kind: 'falcon', n: 4, form: 'cluster', radius: 28, alt: 26, omega: 0.36 },
    { kind: 'vulture', n: 5, form: 'line', radius: 44, alt: 34, omega: 0.12 },
  ],
  south_africa: [
    { kind: 'flamingo', n: 10, form: 'line', radius: 34, alt: 16, omega: 0.22 },
    { kind: 'vulture', n: 4, form: 'line', radius: 46, alt: 36, omega: 0.12 },
    { kind: 'eagle', n: 3, form: 'cluster', radius: 40, alt: 28, omega: 0.18 },
  ],
};

const MATS = new Map<number, THREE.MeshStandardMaterial>();

function mat(hex: number): THREE.MeshStandardMaterial {
  let m = MATS.get(hex);
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color: hex, roughness: 0.78, flatShading: true });
    MATS.set(hex, m);
  }
  return m;
}

function box(
  m: THREE.Material, w: number, h: number, d: number,
  x: number, y: number, z: number,
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  mesh.position.set(x, y, z);
  mesh.castShadow = false;
  return mesh;
}

interface BirdMesh {
  root: THREE.Group;
  wingL: THREE.Group;
  wingR: THREE.Group;
}

function makeBird(kind: BirdKind): BirdMesh {
  const s = SPEC[kind];
  const B = mat(s.body);
  const W = mat(s.wing);
  const A = mat(s.accent);
  const root = new THREE.Group();
  const wader = kind === 'crane' || kind === 'stork' || kind === 'ibis' || kind === 'flamingo';
  const raptor = kind === 'eagle' || kind === 'vulture' || kind === 'falcon';
  const parrot = kind === 'macaw' || kind === 'parrot' || kind === 'cockatoo' || kind === 'quetzal';

  const bodyL = wader ? 0.55 : raptor ? 0.52 : parrot ? 0.42 : 0.36;
  root.add(box(B, 0.18, 0.16, bodyL, 0, 0, 0));
  root.add(box(B, 0.12, 0.12, 0.14, 0, 0.04, bodyL * 0.48));

  if (wader) {
    root.add(box(B, 0.06, 0.06, 0.42, 0, 0.08, bodyL * 0.55 + 0.18));
    root.add(box(A, 0.08, 0.08, 0.08, 0, 0.14, bodyL * 0.55 + 0.38));
    if (kind === 'ibis') {
      root.add(box(A, 0.04, 0.04, 0.22, 0, 0.02, bodyL * 0.55 + 0.52));
    }
    if (kind === 'flamingo' || kind === 'stork') {
      root.add(box(A, 0.04, 0.04, 0.5, 0, -0.22, -0.05));
    }
  }
  if (kind === 'eagle') {
    root.add(box(A, 0.14, 0.12, 0.16, 0, 0.06, 0.32));
  }
  if (kind === 'cockatoo') {
    root.add(box(A, 0.04, 0.22, 0.08, 0, 0.18, 0.18));
  }
  const tailL = kind === 'macaw' || kind === 'quetzal' ? 0.85 : parrot ? 0.32 : 0.22;
  root.add(box(kind === 'macaw' ? A : W, 0.08, 0.06, tailL, 0, 0, -bodyL * 0.45 - tailL * 0.4));

  const span = raptor ? 0.95 : wader ? 0.82 : parrot ? 0.7 : 0.55;
  const wingL = new THREE.Group();
  wingL.position.set(-0.08, 0.04, 0.02);
  wingL.add(box(W, span, 0.04, 0.28, -span * 0.5, 0, 0));
  const wingR = new THREE.Group();
  wingR.position.set(0.08, 0.04, 0.02);
  wingR.add(box(W, span, 0.04, 0.28, span * 0.5, 0, 0));
  if (kind === 'magpie' || kind === 'macaw') {
    wingL.add(box(A, span * 0.35, 0.03, 0.16, -span * 0.7, 0, 0.04));
    wingR.add(box(A, span * 0.35, 0.03, 0.16, span * 0.7, 0, 0.04));
  }
  root.add(wingL, wingR);
  root.scale.setScalar(s.scale);
  return { root, wingL, wingR };
}

interface Bird {
  kind: BirdKind;
  spec: BirdSpec;
  root: THREE.Group;
  wingL: THREE.Group;
  wingR: THREE.Group;
  lx: number;
  ly: number;
  lz: number;
  phase: number;
  flock: number;
}

interface Flock {
  def: FlockDef;
  ang: number;
}

export class SkyBirds {
  private flocks: Flock[] = [];
  private birds: Bird[] = [];

  constructor(scene: THREE.Scene, world: World) {
    const defs = PACK_BIRDS[world.packId] ?? PACK_BIRDS.china;
    for (let f = 0; f < defs.length; f++) {
      const def = defs[f];
      this.flocks.push({ def, ang: rand(f * 9.1 + 1.3) * Math.PI * 2 });
      const n = def.n;
      for (let i = 0; i < n; i++) {
        const seed = f * 20 + i * 3.7;
        const mesh = makeBird(def.kind);
        const slot = this.slot(def.form, i, n, seed);
        scene.add(mesh.root);
        this.birds.push({
          kind: def.kind,
          spec: SPEC[def.kind],
          root: mesh.root,
          wingL: mesh.wingL,
          wingR: mesh.wingR,
          lx: slot.x,
          ly: slot.y,
          lz: slot.z,
          phase: rand(seed + 2) * Math.PI * 2,
          flock: f,
        });
      }
    }
  }

  private slot(form: Form, i: number, n: number, seed: number): { x: number; y: number; z: number } {
    if (form === 'vee') {
      const rank = Math.ceil(i / 2);
      const side = i === 0 ? 0 : (i % 2 === 0 ? 1 : -1);
      return { x: side * rank * 1.85, y: (rand(seed) - 0.5) * 0.6, z: -rank * 1.7 };
    }
    if (form === 'line') {
      return { x: (i - (n - 1) * 0.5) * 2.35, y: (rand(seed) - 0.5) * 0.8, z: (rand(seed + 1) - 0.5) * 1.2 };
    }
    return {
      x: (rand(seed) - 0.5) * 9,
      y: (rand(seed + 1) - 0.5) * 3,
      z: (rand(seed + 2) - 0.5) * 9,
    };
  }

  /** 鸟群中心绕玩家盘旋，个体在队形槽位上振翅 */
  update(dt: number, player: THREE.Vector3): void {
    for (let f = 0; f < this.flocks.length; f++) {
      const fl = this.flocks[f];
      fl.ang += fl.def.omega * dt;
    }
    for (let i = 0; i < this.birds.length; i++) {
      const b = this.birds[i];
      const fl = this.flocks[b.flock];
      const def = fl.def;
      const ang = fl.ang;
      const cs = Math.cos(ang);
      const sn = Math.sin(ang);
      const cx = player.x + cs * def.radius;
      const cz = player.z + sn * def.radius;
      const cy = player.y + def.alt;
      const fx = -sn;
      const fz = cs;
      const rx = fz;
      const rz = -fx;
      b.root.position.set(
        cx + rx * b.lx + fx * b.lz,
        cy + b.ly + Math.sin(b.phase * 0.35) * 0.45,
        cz + rz * b.lx + fz * b.lz,
      );
      b.root.rotation.y = Math.atan2(fx, fz);
      b.phase += b.spec.flap * dt;
      const w = Math.sin(b.phase) * b.spec.amp;
      b.wingL.rotation.z = w;
      b.wingR.rotation.z = -w;
    }
  }
}
