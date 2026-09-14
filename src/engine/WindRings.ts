import * as THREE from 'three';
import { rand } from './World';
import type { World } from './World';

/* ============================================================
 *  路边风环：三连一组，换道穿过去。失败不惩罚，圈自行散掉。
 * ============================================================ */

const RING_GEO = new THREE.TorusGeometry(1.28, 0.07, 6, 14);
const RING_MAT = new THREE.MeshStandardMaterial({
  color: 0x7ef0d0, emissive: 0x2a8f7a, emissiveIntensity: 0.55,
  roughness: 0.35, metalness: 0.15, flatShading: true,
});
const HIDE2 = 220 * 220;

interface Ring {
  root: THREE.Mesh;
  x: number;
  y: number;
  z: number;
  lat: number;
  taken: boolean;
  chain: number;
}

export class WindRings {
  private rings: Ring[] = [];
  private streak = 0;
  private lastChain = -1;

  constructor(scene: THREE.Scene, world: World) {
    const chains = Math.max(5, Math.round(world.length / 520));
    let chain = 0;
    let guard = 0;
    while (chain < chains && guard < chains * 4) {
      const seed = chain * 23.1 + guard * 6.2 + 4.4;
      guard++;
      const t0 = rand(seed);
      const side = rand(seed + 0.2) < 0.5 ? -1 : 1;
      const s0 = t0 * world.length;
      let ok = true;
      const placed: { s: number; side: number }[] = [];
      for (let k = 0; k < 3; k++) {
        const sk = (s0 + k * 16) % world.length;
        const lat = side * (k === 1 && rand(seed + k) < 0.45 ? -1 : 1) * (1.35 + rand(seed + 0.3 + k) * 0.35);
        if (world.coastLeft && lat < -4) {
          ok = false;
          break;
        }
        placed.push({ s: sk, side: Math.sign(lat) || side });
      }
      if (!ok) continue;

      for (let k = 0; k < placed.length; k++) {
        const pose = world.poseAt(placed[k].s);
        const lat = placed[k].side * 1.5;
        const x = pose.pos.x + pose.right.x * lat;
        const z = pose.pos.z + pose.right.z * lat;
        const y = pose.pos.y + 1.32;
        const mesh = new THREE.Mesh(RING_GEO, RING_MAT);
        mesh.position.set(x, y, z);
        mesh.quaternion.setFromUnitVectors(
          new THREE.Vector3(0, 0, 1),
          new THREE.Vector3(pose.tan.x, 0, pose.tan.z).normalize(),
        );
        mesh.frustumCulled = false;
        scene.add(mesh);
        this.rings.push({ root: mesh, x, y, z, lat, taken: false, chain });
      }
      chain++;
    }
  }

  /**
   * 穿过未收集的环则返回当前连段（1～3）。主循环勿在此分配对象。
   */
  update(player: THREE.Vector3, lateral: number): number | null {
    const px = player.x, py = player.y, pz = player.z;
    let collected: Ring | null = null;
    for (let i = 0; i < this.rings.length; i++) {
      const r = this.rings[i];
      const dx = px - r.x, dz = pz - r.z;
      const d2 = dx * dx + dz * dz;
      if (d2 > HIDE2) {
        r.root.visible = false;
        continue;
      }
      r.root.visible = !r.taken;
      if (r.taken || collected) continue;
      if (d2 > 2.6 * 2.6) continue;
      if (Math.abs(py - r.y) > 1.8) continue;
      if (Math.abs(lateral - r.lat) > 1.15) continue;
      collected = r;
    }
    if (!collected) return null;
    collected.taken = true;
    collected.root.visible = false;
    if (this.lastChain === collected.chain) this.streak += 1;
    else this.streak = 1;
    this.lastChain = collected.chain;
    return this.streak;
  }
}
