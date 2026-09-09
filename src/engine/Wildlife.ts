import * as THREE from 'three';
import { rand } from './World';
import type { World } from './World';

/* ============================================================
 *  各国路旁野生动物：数据表驱动、确定性投放、自行走动
 *  攻击性物种在视野内近距离会追骑手；撞击只减速不结束骑行
 * ============================================================ */

export interface AnimalHit {
  kind: AnimalKind;
  knock: number;
  msg: string;
}

type AnimalKind =
  | 'elephant' | 'elephant_calf' | 'lion' | 'cheetah' | 'jackal' | 'zebra' | 'giraffe'
  | 'camel' | 'kangaroo' | 'dingo'
  | 'panda' | 'deer' | 'monkey' | 'fox'
  | 'wolf' | 'bear' | 'moose'
  | 'bison' | 'coyote'
  | 'tiger' | 'capybara' | 'jaguar'
  | 'sheep' | 'goat';

type Temper = 'aggro' | 'flee' | 'graze';

interface Species {
  label: string;
  temper: Temper;
  speed: number;
  chase: number;
  sight: number;
  hitR: number;
  scale: number;
  homeR: number;
}

interface FaunaEntry {
  kind: AnimalKind;
  w: number;
  herd?: [number, number];
  withCalf?: boolean;
}

interface PackFauna {
  perKm: number;
  entries: FaunaEntry[];
}

const SPECIES: Record<AnimalKind, Species> = {
  elephant:      { label: '大象',   temper: 'aggro', speed: 2.4, chase: 7.2,  sight: 11, hitR: 2.6, scale: 1.35, homeR: 22 },
  elephant_calf: { label: '小象',   temper: 'flee',  speed: 2.8, chase: 5.5,  sight: 10, hitR: 1.2, scale: 0.55, homeR: 16 },
  lion:          { label: '狮子',   temper: 'aggro', speed: 3.2, chase: 9.5,  sight: 18, hitR: 1.6, scale: 1.05, homeR: 20 },
  cheetah:       { label: '猎豹',   temper: 'aggro', speed: 4.0, chase: 13.5, sight: 20, hitR: 1.35, scale: 0.95, homeR: 24 },
  jackal:        { label: '豺狼',   temper: 'aggro', speed: 3.6, chase: 8.8,  sight: 16, hitR: 1.15, scale: 0.78, homeR: 18 },
  zebra:         { label: '斑马',   temper: 'flee',  speed: 4.2, chase: 8.0,  sight: 14, hitR: 1.2, scale: 1.0,  homeR: 22 },
  giraffe:       { label: '长颈鹿', temper: 'flee',  speed: 3.4, chase: 7.0,  sight: 16, hitR: 1.8, scale: 1.55, homeR: 20 },
  camel:         { label: '骆驼',   temper: 'graze', speed: 2.2, chase: 4.5,  sight: 10, hitR: 1.6, scale: 1.2,  homeR: 18 },
  kangaroo:      { label: '袋鼠',   temper: 'flee',  speed: 4.6, chase: 9.0,  sight: 15, hitR: 1.2, scale: 1.0,  homeR: 22 },
  dingo:         { label: '野狗',   temper: 'aggro', speed: 3.8, chase: 9.2,  sight: 16, hitR: 1.15, scale: 0.82, homeR: 18 },
  panda:         { label: '熊猫',   temper: 'graze', speed: 1.6, chase: 3.2,  sight: 8,  hitR: 1.4, scale: 0.95, homeR: 14 },
  deer:          { label: '鹿',     temper: 'flee',  speed: 4.0, chase: 8.5,  sight: 14, hitR: 1.1, scale: 0.9,  homeR: 20 },
  monkey:        { label: '猴子',   temper: 'flee',  speed: 3.5, chase: 7.0,  sight: 12, hitR: 0.8, scale: 0.55, homeR: 14 },
  fox:           { label: '狐狸',   temper: 'flee',  speed: 3.8, chase: 8.0,  sight: 13, hitR: 0.95, scale: 0.7,  homeR: 16 },
  wolf:          { label: '狼',     temper: 'aggro', speed: 3.8, chase: 10.0, sight: 18, hitR: 1.55, scale: 1.32, homeR: 20 },
  bear:          { label: '熊',     temper: 'aggro', speed: 2.8, chase: 8.0,  sight: 14, hitR: 1.8, scale: 1.15, homeR: 16 },
  moose:         { label: '麋鹿',   temper: 'flee',  speed: 3.6, chase: 7.5,  sight: 14, hitR: 1.7, scale: 1.25, homeR: 20 },
  bison:         { label: '野牛',   temper: 'aggro', speed: 2.6, chase: 8.2,  sight: 12, hitR: 1.9, scale: 1.2,  homeR: 18 },
  coyote:        { label: '郊狼',   temper: 'aggro', speed: 3.7, chase: 9.0,  sight: 16, hitR: 1.1, scale: 0.8,  homeR: 18 },
  tiger:         { label: '老虎',   temper: 'aggro', speed: 3.4, chase: 10.5, sight: 18, hitR: 1.55, scale: 1.08, homeR: 20 },
  capybara:      { label: '水豚',   temper: 'graze', speed: 1.8, chase: 3.5,  sight: 9,  hitR: 1.1, scale: 0.72, homeR: 14 },
  jaguar:        { label: '美洲豹', temper: 'aggro', speed: 3.5, chase: 10.2, sight: 17, hitR: 1.4, scale: 1.0,  homeR: 18 },
  sheep:         { label: '绵羊',   temper: 'flee',  speed: 2.4, chase: 5.0,  sight: 11, hitR: 0.9, scale: 0.7,  homeR: 16 },
  goat:          { label: '山羊',   temper: 'flee',  speed: 3.0, chase: 6.5,  sight: 12, hitR: 0.95, scale: 0.72, homeR: 16 },
};

const PACK_FAUNA: Record<string, PackFauna> = {
  south_africa: {
    perKm: 9,
    entries: [
      { kind: 'elephant', w: 3, herd: [3, 5], withCalf: true },
      { kind: 'lion', w: 2, herd: [2, 4] },
      { kind: 'cheetah', w: 2 },
      { kind: 'jackal', w: 2, herd: [2, 3] },
      { kind: 'zebra', w: 3, herd: [4, 6] },
      { kind: 'giraffe', w: 1 },
    ],
  },
  egypt: {
    perKm: 5,
    entries: [
      { kind: 'camel', w: 3, herd: [2, 4] },
      { kind: 'jackal', w: 2, herd: [2, 3] },
    ],
  },
  saudi: {
    perKm: 4,
    entries: [
      { kind: 'camel', w: 4, herd: [2, 5] },
      { kind: 'wolf', w: 1 },
      { kind: 'goat', w: 2, herd: [3, 5] },
    ],
  },
  india: {
    perKm: 6,
    entries: [
      { kind: 'elephant', w: 2, herd: [2, 4], withCalf: true },
      { kind: 'tiger', w: 2 },
      { kind: 'monkey', w: 3, herd: [3, 6] },
      { kind: 'deer', w: 2, herd: [2, 4] },
    ],
  },
  china: {
    perKm: 5,
    entries: [
      { kind: 'panda', w: 2 },
      { kind: 'deer', w: 3, herd: [2, 4] },
      { kind: 'monkey', w: 2, herd: [2, 5] },
    ],
  },
  japan: {
    perKm: 5,
    entries: [
      { kind: 'deer', w: 4, herd: [3, 6] },
      { kind: 'fox', w: 2 },
    ],
  },
  korea: {
    perKm: 4,
    entries: [
      { kind: 'deer', w: 3, herd: [2, 4] },
      { kind: 'fox', w: 2 },
    ],
  },
  russia: {
    perKm: 5,
    entries: [
      { kind: 'wolf', w: 3, herd: [3, 5] },
      { kind: 'bear', w: 2 },
      { kind: 'moose', w: 2 },
    ],
  },
  canada: {
    perKm: 5,
    entries: [
      { kind: 'moose', w: 3 },
      { kind: 'wolf', w: 2, herd: [2, 4] },
      { kind: 'bear', w: 2 },
    ],
  },
  usa: {
    perKm: 5,
    entries: [
      { kind: 'bison', w: 3, herd: [3, 6] },
      { kind: 'coyote', w: 2 },
      { kind: 'deer', w: 2, herd: [2, 4] },
    ],
  },
  australia: {
    perKm: 6,
    entries: [
      { kind: 'kangaroo', w: 4, herd: [3, 5] },
      { kind: 'dingo', w: 2 },
    ],
  },
  brazil: {
    perKm: 6,
    entries: [
      { kind: 'capybara', w: 3, herd: [3, 6] },
      { kind: 'jaguar', w: 2 },
      { kind: 'monkey', w: 3, herd: [3, 6] },
    ],
  },
  mexico: {
    perKm: 5,
    entries: [
      { kind: 'jaguar', w: 2 },
      { kind: 'coyote', w: 2 },
      { kind: 'deer', w: 2, herd: [2, 4] },
    ],
  },
  france: {
    perKm: 5,
    entries: [
      { kind: 'sheep', w: 4, herd: [4, 7] },
      { kind: 'deer', w: 2, herd: [2, 3] },
    ],
  },
  uk: {
    perKm: 5,
    entries: [
      { kind: 'sheep', w: 4, herd: [4, 8] },
      { kind: 'deer', w: 2 },
    ],
  },
  italy: {
    perKm: 4,
    entries: [
      { kind: 'goat', w: 3, herd: [3, 6] },
      { kind: 'sheep', w: 2, herd: [3, 5] },
    ],
  },
  turkey: {
    perKm: 4,
    entries: [
      { kind: 'goat', w: 3, herd: [3, 6] },
      { kind: 'camel', w: 1 },
      { kind: 'wolf', w: 1 },
    ],
  },
};

const ACTIVE2 = 130 * 130;
const HIDE2 = 160 * 160;
const MAX_ANIMALS = 64;
const MAT_CACHE = new Map<number, THREE.MeshStandardMaterial>();

function mat(hex: number): THREE.MeshStandardMaterial {
  let m = MAT_CACHE.get(hex);
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color: hex, roughness: 0.86, flatShading: true });
    MAT_CACHE.set(hex, m);
  }
  return m;
}

function box(
  m: THREE.Material, w: number, h: number, d: number,
  x: number, y: number, z: number,
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  return mesh;
}

function sph(m: THREE.Material, r: number, x: number, y: number, z: number, sx = 1, sy = 1, sz = 1): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(r, 6, 5), m);
  mesh.position.set(x, y, z);
  mesh.scale.set(sx, sy, sz);
  mesh.castShadow = true;
  return mesh;
}

interface BeastMesh {
  root: THREE.Group;
  legs: THREE.Group[];
  trunk: THREE.Group | null;
  hop: boolean;
}

function addLegs(
  root: THREE.Group, m: THREE.Material,
  x: number, zf: number, zb: number, legH: number, thick: number,
): THREE.Group[] {
  const legs: THREE.Group[] = [];
  const slots: [number, number][] = [[-x, zf], [x, zf], [-x, zb], [x, zb]];
  for (const [lx, lz] of slots) {
    const g = new THREE.Group();
    g.position.set(lx, legH, lz);
    g.add(box(m, thick, legH, thick, 0, -legH * 0.5, 0));
    root.add(g);
    legs.push(g);
  }
  return legs;
}

function makeElephant(): BeastMesh {
  const M = mat(0xa8a090);
  const D = mat(0x5a5248);
  const root = new THREE.Group();
  const legH = 0.72;
  root.add(sph(M, 0.72, 0, legH + 0.85, 0, 1.15, 0.95, 1.35));
  root.add(sph(M, 0.42, 0, legH + 1.15, 0.85));
  const earL = box(D, 0.08, 0.7, 0.55, -0.48, legH + 1.2, 0.7);
  const earR = box(D, 0.08, 0.7, 0.55, 0.48, legH + 1.2, 0.7);
  root.add(earL, earR);
  const trunk = new THREE.Group();
  trunk.position.set(0, legH + 1.0, 1.12);
  trunk.add(box(M, 0.16, 0.9, 0.16, 0, -0.45, 0.12));
  root.add(trunk);
  const legs = addLegs(root, D, 0.38, 0.45, -0.5, legH, 0.22);
  return { root, legs, trunk, hop: false };
}

function makeCat(kind: 'lion' | 'cheetah' | 'tiger' | 'jaguar'): BeastMesh {
  const colors: Record<string, number> = {
    lion: 0xc4a05a, cheetah: 0xd4a04a, tiger: 0xd46a2c, jaguar: 0xc48a32,
  };
  const M = mat(colors[kind]);
  const D = mat(0x3a2a18);
  const root = new THREE.Group();
  const legH = 0.42;
  root.add(box(M, 0.55, 0.42, 1.15, 0, legH + 0.28, 0));
  root.add(sph(M, 0.26, 0, legH + 0.42, 0.62));
  if (kind === 'lion') root.add(sph(mat(0x8a6230), 0.38, 0, legH + 0.45, 0.58, 1.15, 1.05, 1.05));
  if (kind === 'cheetah' || kind === 'jaguar') {
    for (let i = 0; i < 5; i++) {
      root.add(box(D, 0.08, 0.08, 0.08, (i % 2 ? -0.16 : 0.16), legH + 0.42, -0.4 + i * 0.18));
    }
  }
  if (kind === 'tiger') {
    for (let i = 0; i < 4; i++) {
      root.add(box(D, 0.56, 0.06, 0.07, 0, legH + 0.38, -0.4 + i * 0.22));
    }
  }
  root.add(box(M, 0.08, 0.08, 0.55, 0, legH + 0.32, -0.72));
  const legs = addLegs(root, M, 0.2, 0.38, -0.38, legH, 0.11);
  return { root, legs, trunk: null, hop: false };
}

function makeCanid(kind: 'jackal' | 'wolf' | 'coyote' | 'dingo' | 'fox'): BeastMesh {
  const colors: Record<string, number> = {
    jackal: 0x8a6a48, wolf: 0xc5cdd4, coyote: 0xa08058, dingo: 0xc47a3a, fox: 0xd46a2c,
  };
  const M = mat(colors[kind]);
  const root = new THREE.Group();
  const wolf = kind === 'wolf';
  const legH = wolf ? 0.48 : 0.38;
  const bw = wolf ? 0.52 : 0.38;
  const bh = wolf ? 0.42 : 0.32;
  const bl = wolf ? 1.15 : 0.85;
  root.add(box(M, bw, bh, bl, 0, legH + bh * 0.5, 0));
  root.add(sph(M, wolf ? 0.28 : 0.2, 0, legH + (wolf ? 0.52 : 0.38), wolf ? 0.62 : 0.5));
  if (wolf) {
    const W = mat(0xeef2f6);
    root.add(box(W, 0.28, 0.18, 0.22, 0, legH + 0.38, 0.08));
    root.add(sph(W, 0.14, 0, legH + 0.48, 0.78));
  }
  root.add(box(M, 0.08, wolf ? 0.22 : 0.16, 0.06, -0.12, legH + (wolf ? 0.68 : 0.52), wolf ? 0.58 : 0.48));
  root.add(box(M, 0.08, wolf ? 0.22 : 0.16, 0.06, 0.12, legH + (wolf ? 0.68 : 0.52), wolf ? 0.58 : 0.48));
  root.add(box(M, 0.07, 0.07, wolf ? 0.55 : 0.42, 0, legH + 0.32, wolf ? -0.72 : -0.55));
  const legs = addLegs(root, M, wolf ? 0.18 : 0.14, wolf ? 0.38 : 0.28, wolf ? -0.38 : -0.28, legH, wolf ? 0.12 : 0.09);
  return { root, legs, trunk: null, hop: false };
}

function makeZebra(): BeastMesh {
  const M = mat(0xf0ece4);
  const D = mat(0x1a1a1c);
  const root = new THREE.Group();
  const legH = 0.55;
  root.add(box(M, 0.48, 0.5, 1.2, 0, legH + 0.32, 0));
  for (let i = 0; i < 5; i++) {
    root.add(box(D, 0.5, 0.08, 0.08, 0, legH + 0.32, -0.45 + i * 0.22));
  }
  root.add(box(M, 0.22, 0.42, 0.28, 0, legH + 0.62, 0.62));
  root.add(sph(M, 0.18, 0, legH + 0.78, 0.78));
  const legs = addLegs(root, D, 0.16, 0.4, -0.4, legH, 0.1);
  return { root, legs, trunk: null, hop: false };
}

function makeGiraffe(): BeastMesh {
  const M = mat(0xd4a05a);
  const D = mat(0x8a5a28);
  const root = new THREE.Group();
  const legH = 0.95;
  root.add(box(M, 0.5, 0.48, 1.05, 0, legH + 0.32, 0));
  root.add(box(M, 0.18, 1.35, 0.2, 0, legH + 1.15, 0.42));
  root.add(sph(M, 0.2, 0, legH + 1.85, 0.55));
  for (let i = 0; i < 4; i++) {
    root.add(box(D, 0.12, 0.12, 0.12, (i % 2 ? -0.18 : 0.18), legH + 0.4, -0.3 + i * 0.2));
  }
  const legs = addLegs(root, M, 0.16, 0.35, -0.35, legH, 0.1);
  return { root, legs, trunk: null, hop: false };
}

function makeCamel(): BeastMesh {
  const M = mat(0xc4a070);
  const root = new THREE.Group();
  const legH = 0.7;
  root.add(box(M, 0.5, 0.48, 1.25, 0, legH + 0.32, 0));
  root.add(sph(M, 0.32, 0, legH + 0.72, 0.05, 1.1, 0.9, 0.9));
  root.add(box(M, 0.22, 0.45, 0.28, 0, legH + 0.55, 0.7));
  root.add(sph(M, 0.18, 0, legH + 0.72, 0.88));
  const legs = addLegs(root, M, 0.16, 0.42, -0.42, legH, 0.11);
  return { root, legs, trunk: null, hop: false };
}

function makeKangaroo(): BeastMesh {
  const M = mat(0x8a6238);
  const root = new THREE.Group();
  root.add(sph(M, 0.32, 0, 0.85, 0, 1, 1.15, 0.9));
  root.add(box(M, 0.22, 0.7, 0.22, 0, 1.35, 0.12));
  root.add(sph(M, 0.18, 0, 1.78, 0.18));
  const hind: THREE.Group[] = [];
  for (const s of [-1, 1]) {
    const g = new THREE.Group();
    g.position.set(s * 0.14, 0.55, -0.05);
    g.add(box(M, 0.12, 0.7, 0.14, 0, -0.35, 0.08));
    root.add(g);
    hind.push(g);
  }
  root.add(box(M, 0.1, 0.1, 0.7, 0, 0.55, -0.45));
  return { root, legs: hind, trunk: null, hop: true };
}

function makeBear(panda: boolean): BeastMesh {
  const M = mat(panda ? 0xf2f0ea : 0x5a3d28);
  const B = mat(0x1a1a1c);
  const root = new THREE.Group();
  const legH = 0.38;
  root.add(sph(M, 0.55, 0, legH + 0.5, 0, 1.15, 0.95, 1.25));
  root.add(sph(panda ? B : M, 0.32, 0, legH + 0.62, 0.55));
  if (panda) {
    root.add(sph(B, 0.14, -0.18, legH + 0.72, 0.58));
    root.add(sph(B, 0.14, 0.18, legH + 0.72, 0.58));
  }
  const legs = addLegs(root, panda ? B : M, 0.22, 0.28, -0.32, legH, 0.16);
  return { root, legs, trunk: null, hop: false };
}

function makeUngulate(kind: 'deer' | 'moose' | 'bison' | 'sheep' | 'goat'): BeastMesh {
  const colors: Record<string, number> = {
    deer: 0x8a6238, moose: 0x6a4a32, bison: 0x5a3d28, sheep: 0xf0ece4, goat: 0xc4b8a0,
  };
  const M = mat(colors[kind]);
  const D = mat(0x4a3220);
  const root = new THREE.Group();
  const legH = kind === 'moose' || kind === 'bison' ? 0.58 : 0.48;
  const bodyH = kind === 'bison' || kind === 'sheep' ? 0.55 : 0.42;
  root.add(box(kind === 'sheep' ? M : M, kind === 'bison' ? 0.62 : 0.42, bodyH, kind === 'bison' ? 1.25 : 1.0, 0, legH + bodyH * 0.5, 0));
  root.add(sph(M, kind === 'moose' ? 0.24 : 0.18, 0, legH + bodyH + 0.12, 0.55));
  if (kind === 'deer' || kind === 'moose' || kind === 'goat') {
    const ant = kind === 'moose' ? 0.45 : 0.22;
    root.add(box(D, 0.06, ant, 0.06, -0.1, legH + bodyH + 0.32, 0.52));
    root.add(box(D, 0.06, ant, 0.06, 0.1, legH + bodyH + 0.32, 0.52));
    if (kind === 'moose') {
      root.add(box(D, 0.35, 0.06, 0.12, -0.22, legH + bodyH + 0.48, 0.5));
      root.add(box(D, 0.35, 0.06, 0.12, 0.22, legH + bodyH + 0.48, 0.5));
    }
  }
  const legs = addLegs(root, D, 0.14, 0.32, -0.32, legH, 0.09);
  return { root, legs, trunk: null, hop: false };
}

function makeCapybara(): BeastMesh {
  const M = mat(0x8a6a48);
  const root = new THREE.Group();
  const legH = 0.22;
  root.add(sph(M, 0.42, 0, legH + 0.32, 0, 1.2, 0.75, 1.45));
  root.add(sph(M, 0.22, 0, legH + 0.38, 0.48));
  const legs = addLegs(root, M, 0.2, 0.28, -0.28, legH, 0.1);
  return { root, legs, trunk: null, hop: false };
}

function makeMonkey(): BeastMesh {
  const M = mat(0x8a6238);
  const S = mat(0xe8c4a0);
  const root = new THREE.Group();
  const legH = 0.28;
  root.add(sph(M, 0.22, 0, legH + 0.32, 0));
  root.add(sph(S, 0.16, 0, legH + 0.52, 0.12));
  const legs = addLegs(root, M, 0.1, 0.12, -0.12, legH, 0.07);
  root.add(box(M, 0.06, 0.06, 0.4, 0, legH + 0.22, -0.28));
  return { root, legs, trunk: null, hop: false };
}

function buildBeast(kind: AnimalKind): BeastMesh {
  switch (kind) {
    case 'elephant':
    case 'elephant_calf':
      return makeElephant();
    case 'lion': case 'cheetah': case 'tiger': case 'jaguar':
      return makeCat(kind);
    case 'jackal': case 'wolf': case 'coyote': case 'dingo': case 'fox':
      return makeCanid(kind);
    case 'zebra': return makeZebra();
    case 'giraffe': return makeGiraffe();
    case 'camel': return makeCamel();
    case 'kangaroo': return makeKangaroo();
    case 'bear': return makeBear(false);
    case 'panda': return makeBear(true);
    case 'capybara': return makeCapybara();
    case 'monkey': return makeMonkey();
    default:
      return makeUngulate(kind);
  }
}

type AIState = 'wander' | 'chase' | 'flee' | 'idle';

interface Animal {
  kind: AnimalKind;
  spec: Species;
  root: THREE.Group;
  legs: THREE.Group[];
  trunk: THREE.Group | null;
  hop: boolean;
  x: number;
  z: number;
  yaw: number;
  phase: number;
  homeX: number;
  homeZ: number;
  state: AIState;
  idleT: number;
  seed: number;
  nearK: number;
  side: number;
  latOff: number;
  hitCD: number;
}

function lerpAngle(a: number, b: number, t: number): number {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}

function pickEntry(entries: FaunaEntry[], seed: number): FaunaEntry {
  let sum = 0;
  for (const e of entries) sum += e.w;
  let r = rand(seed) * sum;
  for (const e of entries) {
    r -= e.w;
    if (r <= 0) return e;
  }
  return entries[entries.length - 1];
}

function hitMsg(kind: AnimalKind): string {
  const s = SPECIES[kind];
  if (s.temper !== 'aggro') return `被${s.label}撞到了`;
  if (kind === 'elephant') return '象群开始冲锋！';
  return `${s.label}扑过来了！`;
}

export class Wildlife {
  private world: World;
  private animals: Animal[] = [];
  private tmpHit: AnimalHit | null = null;

  constructor(scene: THREE.Scene, world: World) {
    this.world = world;
    this.spawnAll(scene);
  }

  private inLake(x: number, z: number, pad = 1.5): boolean {
    for (const lake of this.world.lakes) {
      const dx = x - lake.x, dz = z - lake.z;
      if (dx * dx + dz * dz < (lake.r + pad) * (lake.r + pad)) return true;
    }
    return false;
  }

  private spawnOne(scene: THREE.Scene, kind: AnimalKind, x: number, z: number, seed: number, nearK: number): void {
    if (this.animals.length >= MAX_ANIMALS) return;
    if (this.inLake(x, z)) return;
    const spec = SPECIES[kind];
    const mesh = buildBeast(kind);
    mesh.root.scale.multiplyScalar(spec.scale);
    mesh.root.frustumCulled = false;
    scene.add(mesh.root);
    this.animals.push({
      kind, spec,
      root: mesh.root, legs: mesh.legs, trunk: mesh.trunk, hop: mesh.hop,
      x, z, yaw: rand(seed + 0.3) * Math.PI * 2,
      phase: rand(seed + 0.7) * Math.PI * 2,
      homeX: x, homeZ: z,
      state: 'wander', idleT: rand(seed + 1.1) * 3,
      seed,
      nearK,
      side: rand(seed + 0.19) < 0.5 ? -1 : 1,
      latOff: 3.8 + rand(seed + 0.51) * 2.8,
      hitCD: 0,
    });
  }

  private spawnAll(scene: THREE.Scene): void {
    const pack = PACK_FAUNA[this.world.packId];
    if (!pack) return;
    const n = Math.max(8, Math.round((this.world.length / 1000) * pack.perKm));
    let spawned = 0;
    let guard = 0;
    while (spawned < n && this.animals.length < MAX_ANIMALS && guard < n * 4) {
      const seed = spawned * 17.3 + guard * 4.1 + 2.7;
      guard++;
      const entry = pickEntry(pack.entries, seed);
      const s = rand(seed + 0.11) * this.world.length;
      const pose = this.world.poseAt(s);
      const side = this.world.coastLeft
        ? (rand(seed + 0.22) < 0.16 ? -1 : 1)
        : (rand(seed + 0.22) < 0.5 ? -1 : 1);
      const aggro = SPECIES[entry.kind].temper === 'aggro';
      const lat0 = this.world.coastLeft && side < 0
        ? -(7 + rand(seed + 0.33) * 5)
        : side * (aggro ? 8 + rand(seed + 0.33) * 12 : 12 + rand(seed + 0.33) * 30);
      const hx = pose.pos.x + pose.right.x * lat0;
      const hz = pose.pos.z + pose.right.z * lat0;
      const herdN = entry.herd
        ? entry.herd[0] + Math.floor(rand(seed + 0.44) * (entry.herd[1] - entry.herd[0] + 1))
        : 1;
      for (let j = 0; j < herdN && this.animals.length < MAX_ANIMALS; j++) {
        const js = seed + j * 2.17;
        const ox = (rand(js) - 0.5) * 7;
        const oz = (rand(js + 0.5) - 0.5) * 7;
        let kind = entry.kind;
        if (entry.withCalf && j === herdN - 1 && herdN > 1) kind = 'elephant_calf';
        this.spawnOne(scene, kind, hx + ox, hz + oz, js, pose.index);
      }
      spawned++;
    }
  }

  /**
   * 更新可见动物。掠食者只从侧后方跟随，不超车挡路。
   * 有撞击时返回一次命中（调用方负责无敌帧）。
   */
  update(
    dt: number,
    player: THREE.Vector3,
    playerRight: THREE.Vector3,
    playerFwd: THREE.Vector3,
    playerSpeed: number,
  ): AnimalHit | null {
    this.tmpHit = null;
    const px = player.x, pz = player.z;
    const fl = Math.hypot(playerFwd.x, playerFwd.z) || 1;
    const fx = playerFwd.x / fl;
    const fz = playerFwd.z / fl;
    const rx = playerRight.x;
    const rz = playerRight.z;
    for (let i = 0; i < this.animals.length; i++) {
      const a = this.animals[i];
      const dx = px - a.x;
      const dz = pz - a.z;
      const d2 = dx * dx + dz * dz;
      if (d2 > HIDE2) {
        a.root.visible = false;
        continue;
      }
      a.root.visible = true;
      if (d2 > ACTIVE2) continue;

      if (a.hitCD > 0) a.hitCD -= dt;

      const dist = Math.sqrt(Math.max(0.0001, d2));
      const along = fx * (a.x - px) + fz * (a.z - pz);
      const hx = Math.sin(a.yaw);
      const hz = Math.cos(a.yaw);
      const see = (hx * dx + hz * dz) / dist;
      const spec = a.spec;
      const inSight = dist < spec.sight && (see > 0.18 || dist < spec.sight * 0.42);

      if (spec.temper === 'aggro' && inSight && along < 2.5) {
        a.state = 'chase';
      } else if (spec.temper === 'flee' && dist < spec.sight) {
        a.state = 'flee';
      } else if (a.state === 'chase' && (dist > spec.sight * 1.45 || along > 4.5)) {
        a.state = 'wander';
      } else if (a.state === 'flee' && dist > spec.sight * 1.6) {
        a.state = 'wander';
      }

      a.idleT -= dt;
      let spd = spec.speed;
      let wantYaw = a.yaw;

      if (a.state === 'chase') {
        const back = 6.4;
        const tx = px - fx * back + rx * a.latOff * a.side;
        const tz = pz - fz * back + rz * a.latOff * a.side;
        wantYaw = Math.atan2(tx - a.x, tz - a.z);
        spd = Math.min(spec.chase, playerSpeed * 0.88 + 1.3);
        if (along > -2.2) {
          spd = Math.min(spd, Math.max(2.0, playerSpeed * 0.45));
        }
      } else if (a.state === 'flee') {
        wantYaw = Math.atan2(-dx, -dz);
        spd = spec.chase * 0.85;
      } else if (a.state === 'idle') {
        spd = 0;
        if (a.idleT <= 0) {
          a.state = 'wander';
          a.idleT = 2 + rand(a.seed + a.idleT + 3) * 4;
        }
      } else {
        const homx = a.homeX - a.x;
        const homz = a.homeZ - a.z;
        const hd2 = homx * homx + homz * homz;
        if (hd2 > spec.homeR * spec.homeR) {
          wantYaw = Math.atan2(homx, homz);
        } else if (a.idleT <= 0) {
          if (rand(a.seed + Math.floor(a.x * 0.2) + 9) < 0.28) {
            a.state = 'idle';
            a.idleT = 1.2 + rand(a.seed + 11) * 2.5;
            spd = 0;
          } else {
            wantYaw = a.yaw + (rand(a.seed + a.idleT * 13 + 1) - 0.5) * 1.8;
            a.idleT = 1.5 + rand(a.seed + 8) * 2.5;
          }
        }
      }

      const turn = a.state === 'chase' ? 2.6 : 1.8;
      a.yaw = lerpAngle(a.yaw, wantYaw, 1 - Math.pow(0.001, dt * turn));

      if (spd > 0.05) {
        a.x += Math.sin(a.yaw) * spd * dt;
        a.z += Math.cos(a.yaw) * spd * dt;
        a.phase += spd * (a.hop ? 5.2 : 6.4) * dt;
      }

      if (this.inLake(a.x, a.z, 0.8)) {
        a.x += Math.sin(a.yaw + Math.PI) * spd * dt * 2;
        a.z += Math.cos(a.yaw + Math.PI) * spd * dt * 2;
      }

      const surf = this.world.surfaceY(a.x, a.z, a.nearK);
      a.nearK = surf.index;
      const y = surf.y;
      a.root.position.set(a.x, y, a.z);
      a.root.rotation.y = a.yaw;

      const amp = spd < 0.2 ? 0.08 : 0.42;
      if (a.hop) {
        a.root.position.y = y + Math.abs(Math.sin(a.phase)) * 0.42 * spec.scale;
        const k = Math.sin(a.phase) * 0.55;
        for (const leg of a.legs) leg.rotation.x = k;
      } else {
        const s0 = Math.sin(a.phase) * amp;
        const s1 = Math.sin(a.phase + Math.PI) * amp;
        if (a.legs[0]) a.legs[0].rotation.x = s0;
        if (a.legs[1]) a.legs[1].rotation.x = s1;
        if (a.legs[2]) a.legs[2].rotation.x = s1;
        if (a.legs[3]) a.legs[3].rotation.x = s0;
      }
      if (a.trunk) a.trunk.rotation.x = 0.25 + Math.sin(a.phase * 0.7) * 0.18;

      if (
        a.state === 'chase' && a.hitCD <= 0 && along < -1.2
        && dist < spec.hitR * spec.scale + 1.0 && !this.tmpHit
      ) {
        this.tmpHit = { kind: a.kind, knock: 0, msg: hitMsg(a.kind) };
        a.hitCD = 7;
      }
    }
    return this.tmpHit;
  }
}
