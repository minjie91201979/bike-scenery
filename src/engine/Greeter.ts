import * as THREE from 'three';
import type { OutfitDef } from './ethnic';

/* ============================================================
 *  低多边形迎宾 NPC：传统服饰简模 + 挥手动画
 * ============================================================ */

const MAT_CACHE = new Map<string, THREE.MeshStandardMaterial>();

function mat(hex: number, key = ''): THREE.MeshStandardMaterial {
  const k = key + ':' + hex.toString(16);
  let m = MAT_CACHE.get(k);
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color: hex, roughness: 0.86, flatShading: true });
    MAT_CACHE.set(k, m);
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

export interface GreeterHandle {
  root: THREE.Group;
  label: string;
  tick: (dt: number, _ctx: { night: number }, t: number) => void;
}

/** 创建迎宾者：身体 + 服饰配色 + 可选头饰；右臂可挥手 */
export function createGreeter(outfit: OutfitDef): GreeterHandle {
  const skinHex = outfit.skin ?? 0xf0c9a4;
  const Mskin = mat(skinHex, 'skin');
  const Mpri = mat(outfit.primary, 'pri');
  const Msec = mat(outfit.secondary, 'sec');
  const Macc = mat(outfit.accent, 'acc');
  const Mhair = mat(0x1a1410, 'hair');
  const Mshoe = mat(0x2a2420, 'shoe');

  const root = new THREE.Group();
  root.frustumCulled = false;

  // 腿 / 鞋
  root.add(box(Msec, 0.16, 0.55, 0.18, -0.12, 0.28, 0.02));
  root.add(box(Msec, 0.16, 0.55, 0.18, 0.12, 0.28, 0.02));
  root.add(box(Mshoe, 0.18, 0.08, 0.28, -0.12, 0.04, 0.06));
  root.add(box(Mshoe, 0.18, 0.08, 0.28, 0.12, 0.04, 0.06));

  // 袍身（略宽的长袍轮廓）
  root.add(box(Mpri, 0.52, 0.72, 0.28, 0, 0.92, 0));
  // 腰带 / 襟边
  root.add(box(Macc, 0.54, 0.08, 0.30, 0, 0.70, 0));
  // 下摆层次
  root.add(box(Msec, 0.56, 0.28, 0.30, 0, 0.48, -0.01));

  // 头
  root.add(sph(Mskin, 0.18, 0, 1.48, 0.02));
  root.add(box(Mhair, 0.34, 0.08, 0.28, 0, 1.58, -0.02));

  // 左臂（静态，略外展）
  const leftArm = new THREE.Group();
  leftArm.position.set(-0.30, 1.18, 0);
  leftArm.add(box(Mpri, 0.12, 0.48, 0.12, 0, -0.22, 0));
  leftArm.add(sph(Mskin, 0.07, 0, -0.48, 0));
  leftArm.rotation.z = 0.25;
  root.add(leftArm);

  // 右臂（挥手枢轴）
  const rightArm = new THREE.Group();
  rightArm.position.set(0.30, 1.18, 0);
  rightArm.add(box(Mpri, 0.12, 0.48, 0.12, 0, -0.22, 0));
  rightArm.add(sph(Mskin, 0.07, 0, -0.48, 0));
  root.add(rightArm);

  // 头饰剪影
  switch (outfit.headwear) {
    case 'hat':
      root.add(box(Macc, 0.42, 0.10, 0.36, 0, 1.68, 0));
      root.add(box(Mpri, 0.28, 0.18, 0.28, 0, 1.78, 0));
      break;
    case 'scarf':
      root.add(box(Macc, 0.38, 0.08, 0.08, 0, 1.42, 0.16));
      root.add(box(Macc, 0.12, 0.35, 0.08, 0.22, 1.22, 0.08));
      break;
    case 'veil':
      root.add(box(Msec, 0.40, 0.06, 0.34, 0, 1.66, 0));
      root.add(box(Msec, 0.36, 0.45, 0.06, 0, 1.40, -0.16));
      break;
    case 'fur':
      root.add(sph(Msec, 0.22, 0, 1.62, 0, 1.15, 0.7, 1.1));
      root.add(box(Macc, 0.50, 0.14, 0.36, 0, 1.22, 0.02));
      break;
    case 'crown':
      root.add(box(Macc, 0.36, 0.12, 0.12, 0, 1.72, 0));
      root.add(box(Macc, 0.06, 0.16, 0.06, -0.12, 1.82, 0));
      root.add(box(Macc, 0.06, 0.20, 0.06, 0, 1.84, 0));
      root.add(box(Macc, 0.06, 0.16, 0.06, 0.12, 1.82, 0));
      break;
    default:
      break;
  }

  const phase = Math.random() * Math.PI * 2;
  const tick = (_dt: number, _ctx: { night: number }, t: number) => {
    // Keep lookAt facing; only add tiny idle yaw on top of baseYaw
    const base = (typeof root.userData.baseYaw === 'number' ? root.userData.baseYaw : 0);
    root.rotation.y = base + Math.sin(t * 0.7 + phase) * 0.04;
    rightArm.rotation.z = -0.15 + Math.sin(t * 3.2 + phase) * 0.55;
    rightArm.rotation.x = 0.2 + Math.sin(t * 3.2 + phase) * 0.15;
  };

  return { root, label: outfit.name, tick };
}
