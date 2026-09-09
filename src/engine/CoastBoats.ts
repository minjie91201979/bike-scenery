import * as THREE from 'three';
import { rand } from './World';
import type { World } from './World';

/* ============================================================
 *  岛国左岸海面：帆船 / 轮船，确定性投放，随浪轻晃
 * ============================================================ */

const WOOD = new THREE.MeshStandardMaterial({ color: 0x8a6238, roughness: 0.88, flatShading: true });
const HULL_D = new THREE.MeshStandardMaterial({ color: 0x2a323c, roughness: 0.75, flatShading: true });
const WHITE = new THREE.MeshStandardMaterial({ color: 0xf2f0ea, roughness: 0.7, flatShading: true });
const SAIL = new THREE.MeshStandardMaterial({ color: 0xf7f4ea, roughness: 0.85, flatShading: true });
const SAIL_R = new THREE.MeshStandardMaterial({ color: 0xc43c3c, roughness: 0.8, flatShading: true });
const FUNNEL = new THREE.MeshStandardMaterial({ color: 0xa8322a, roughness: 0.7, flatShading: true });
const DECK = new THREE.MeshStandardMaterial({ color: 0xc4a070, roughness: 0.82, flatShading: true });

function box(
  m: THREE.Material, w: number, h: number, d: number,
  x: number, y: number, z: number,
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  return mesh;
}

function cyl(
  m: THREE.Material, rt: number, rb: number, h: number,
  x: number, y: number, z: number,
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, 6), m);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  return mesh;
}

function makeSailboat(redSail: boolean): THREE.Group {
  const g = new THREE.Group();
  const sail = redSail ? SAIL_R : SAIL;
  g.add(box(WOOD, 2.6, 0.38, 0.85, 0, 0.22, 0));
  g.add(box(WOOD, 2.1, 0.16, 0.95, 0, 0.42, 0));
  g.add(cyl(WOOD, 0.05, 0.06, 3.2, 0.15, 2.0, 0));
  const cloth = box(sail, 0.08, 2.4, 1.6, 0.12, 1.85, 0.15);
  cloth.rotation.y = 0.18;
  g.add(cloth);
  g.add(box(WOOD, 0.9, 0.08, 0.08, -0.7, 0.55, 0));
  return g;
}

function makeSteamer(): THREE.Group {
  const g = new THREE.Group();
  g.add(box(HULL_D, 5.2, 0.7, 1.45, 0, 0.28, 0));
  g.add(box(DECK, 4.6, 0.12, 1.35, 0, 0.68, 0));
  g.add(box(WHITE, 2.4, 0.85, 1.1, -0.35, 1.15, 0));
  g.add(box(WHITE, 1.1, 0.45, 0.9, 1.35, 0.95, 0));
  g.add(cyl(FUNNEL, 0.22, 0.26, 1.15, -0.2, 2.0, 0));
  g.add(cyl(HULL_D, 0.18, 0.2, 0.35, -0.2, 2.62, 0));
  g.add(box(WHITE, 0.12, 0.35, 0.12, 2.35, 0.95, 0.35));
  g.add(box(WHITE, 0.12, 0.35, 0.12, 2.35, 0.95, -0.35));
  return g;
}

const HIDE2 = 210 * 210;
const MAX_BOATS = 22;

interface Boat {
  root: THREE.Group;
  x: number;
  z: number;
  baseY: number;
  yaw: number;
  phase: number;
  seed: number;
}

export class CoastBoats {
  private boats: Boat[] = [];

  constructor(scene: THREE.Scene, world: World) {
    if (!world.coastLeft) return;
    const n = Math.min(MAX_BOATS, Math.max(8, Math.round(world.length / 1000 * 3.4)));
    let placed = 0;
    let guard = 0;
    while (placed < n && guard < n * 5) {
      const seed = placed * 13.7 + guard * 4.4 + 0.9;
      guard++;
      const s = rand(seed) * world.length;
      const pose = world.poseAt(s);
      const edge = world.coastEdge(pose.index);
      const lat = edge - (22 + rand(seed + 0.2) * 72);
      if (lat > -18) continue;
      const x = pose.pos.x + pose.right.x * lat;
      const z = pose.pos.z + pose.right.z * lat;
      const baseY = pose.pos.y - 1.02;
      const steamer = rand(seed + 0.41) < 0.38;
      const root = steamer ? makeSteamer() : makeSailboat(rand(seed + 0.55) < 0.35);
      const sc = steamer
        ? 1.05 + rand(seed + 0.62) * 0.55
        : 0.85 + rand(seed + 0.62) * 0.45;
      root.scale.setScalar(sc);
      root.frustumCulled = false;
      const yaw = Math.atan2(pose.tan.x, pose.tan.z) + (rand(seed + 0.73) - 0.5) * 0.5;
      root.position.set(x, baseY, z);
      root.rotation.y = yaw;
      scene.add(root);
      this.boats.push({
        root, x, z, baseY, yaw, phase: rand(seed + 0.88) * Math.PI * 2, seed,
      });
      placed++;
    }
  }

  /** 远的藏起来；近的随浪轻晃，不分配对象 */
  update(dt: number, player: THREE.Vector3, t: number): void {
    const px = player.x, pz = player.z;
    for (let i = 0; i < this.boats.length; i++) {
      const b = this.boats[i];
      const dx = px - b.x, dz = pz - b.z;
      if (dx * dx + dz * dz > HIDE2) {
        b.root.visible = false;
        continue;
      }
      b.root.visible = true;
      b.phase += dt * 1.15;
      const bob = Math.sin(t * 1.2 + b.phase) * 0.11;
      const roll = Math.sin(t * 0.9 + b.phase * 0.7) * 0.045;
      b.root.position.set(b.x, b.baseY + bob, b.z);
      b.root.rotation.y = b.yaw;
      b.root.rotation.z = roll;
    }
  }
}
