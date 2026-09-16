import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { rand } from './World';
import type { World } from './World';

/* ============================================================
 *  路边本地小店：各国 GLB 摊位，确定性投放在路肩
 *  模型来自 public/assets/models/<stem>_shop.glb；加载失败才回退手工低模
 * ============================================================ */

type ShopKind = 'awning' | 'kiosk' | 'tent' | 'cart';

interface ShopStyle {
  kind: ShopKind;
  wall: number;
  roof: number;
  accent: number;
}

const PACK_SHOP: Record<string, ShopStyle> = {
  china: { kind: 'kiosk', wall: 0xc43c3c, roof: 0xd4a017, accent: 0x1a1a1c },
  japan: { kind: 'kiosk', wall: 0xf2eee4, roof: 0x2a2a2c, accent: 0xc43c3c },
  korea: { kind: 'kiosk', wall: 0xf7f1e1, roof: 0xc45a3a, accent: 0x1a1a1c },
  russia: { kind: 'kiosk', wall: 0x8a4a32, roof: 0x5c3d2e, accent: 0xc9a227 },
  france: { kind: 'awning', wall: 0xf2eee4, roof: 0xc43c3c, accent: 0xf4efe4 },
  italy: { kind: 'awning', wall: 0xf7f1e1, roof: 0x2f6b4f, accent: 0xc43c3c },
  uk: { kind: 'awning', wall: 0x8a4a3a, roof: 0x3a322c, accent: 0xc43c3c },
  usa: { kind: 'awning', wall: 0xf2f0ea, roof: 0x3a6ec9, accent: 0xc43c3c },
  turkey: { kind: 'tent', wall: 0xc9a227, roof: 0xc23b2e, accent: 0x1f7a8c },
  egypt: { kind: 'tent', wall: 0xe8d5a3, roof: 0xc43c3c, accent: 0x2f6b4f },
  saudi: { kind: 'tent', wall: 0xf0ead2, roof: 0x2a6e5a, accent: 0xc9a227 },
  india: { kind: 'tent', wall: 0xe07a28, roof: 0x6b2d5c, accent: 0xffd166 },
  mexico: { kind: 'tent', wall: 0xd45a8c, roof: 0xe8c44a, accent: 0x1f7a8c },
  brazil: { kind: 'cart', wall: 0xd46a7a, roof: 0x2f6b4f, accent: 0xffd166 },
  australia: { kind: 'cart', wall: 0xc4a070, roof: 0x3a6ec9, accent: 0xf4efe4 },
  canada: { kind: 'cart', wall: 0x8a4a32, roof: 0xc43c3c, accent: 0xf2eee4 },
  south_africa: { kind: 'cart', wall: 0xc9a227, roof: 0x2f6b4f, accent: 0xc43c3c },
};

/* packId -> public/assets/models/<stem>_shop.glb
 * 有专模用专模；没有的国家就近借用同区资产，避免再掉回方块摊。 */
const GLB_MAP: Record<string, string> = {
  china: 'cn',
  japan: 'jp',
  korea: 'jp',
  france: 'fr',
  italy: 'it',
  uk: 'gb',
  russia: 'gb',
  usa: 'us',
  canada: 'us',
  australia: 'us',
  mexico: 'mx',
  brazil: 'mx',
  india: 'in',
  south_africa: 'in',
  turkey: 'gr',
  egypt: 'ma',
  saudi: 'ma',
};

/* 个别模型正面朝向 +Z，需翻转 180° 才正对路心；如需微调在此按 packId 加偏移。 */
const GLB_ROT: Record<string, number> = {};

/** 水平目标宽度（米）。相对初版手工摊约放大一倍。 */
const SHOP_WIDTH = 6.8;

const WOOD = new THREE.MeshStandardMaterial({ color: 0x6a4a32, roughness: 0.9, flatShading: true });
const DARK = new THREE.MeshStandardMaterial({ color: 0x2a2420, roughness: 0.85, flatShading: true });
const GOODS_A = new THREE.MeshStandardMaterial({ color: 0xc45a3a, roughness: 0.8, flatShading: true });
const GOODS_B = new THREE.MeshStandardMaterial({ color: 0xe8c44a, roughness: 0.75, flatShading: true });
const HIDE2 = 210 * 210;

// ---- GLB 加载（每个 stem 只加载一次，之后 clone 复用）----
let _gltf: GLTFLoader | null = null;
const _glbCache = new Map<string, Promise<THREE.Object3D | null>>();

function getGLB(stem: string): Promise<THREE.Object3D | null> {
  const cached = _glbCache.get(stem);
  if (cached) return cached;
  if (!_gltf) {
    _gltf = new GLTFLoader();
  }
  const url = `/assets/models/${stem}_shop.glb`;
  const p = _gltf
    .loadAsync(url)
    .then((g) => g.scene)
    .catch(() => null);
  _glbCache.set(stem, p);
  return p;
}

function mat(hex: number): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color: hex, roughness: 0.82, flatShading: true });
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

function cyl(
  m: THREE.Material, rt: number, rb: number, h: number,
  x: number, y: number, z: number,
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, 6), m);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  return mesh;
}

function makeShop(style: ShopStyle, seed: number): THREE.Group {
  const g = new THREE.Group();
  const wall = mat(style.wall);
  const roof = mat(style.roof);
  const accent = mat(style.accent);
  const sc = (0.88 + rand(seed) * 0.22) * 2;
  g.scale.setScalar(sc);

  if (style.kind === 'kiosk') {
    g.add(box(wall, 2.4, 1.85, 2.1, 0, 0.92, 0.15));
    g.add(box(roof, 2.7, 0.22, 2.4, 0, 1.95, 0.1));
    g.add(box(DARK, 1.1, 1.15, 0.08, 0, 0.85, -0.92));
    g.add(box(WOOD, 2.2, 0.12, 0.7, 0, 1.02, -1.15));
    g.add(box(accent, 0.85, 0.55, 0.08, 0, 2.28, -0.2));
    g.add(cyl(GOODS_A, 0.12, 0.12, 0.22, -0.55, 1.18, -1.12));
    g.add(cyl(GOODS_B, 0.1, 0.1, 0.18, 0.42, 1.16, -1.1));
    const lampMat = mat(style.accent);
    lampMat.emissive = new THREE.Color(style.accent);
    lampMat.emissiveIntensity = 0.45;
    g.add(cyl(lampMat, 0.09, 0.09, 0.16, 0.95, 2.12, -0.85));
  } else if (style.kind === 'tent') {
    g.add(box(WOOD, 2.2, 0.18, 1.8, 0, 0.42, 0));
    g.add(box(wall, 2.05, 1.15, 0.08, 0, 1.05, 0.82));
    const cloth = new THREE.Mesh(new THREE.ConeGeometry(1.65, 1.7, 4), roof);
    cloth.position.set(0, 2.05, 0.1);
    cloth.rotation.y = Math.PI / 4;
    cloth.castShadow = true;
    g.add(cloth);
    g.add(box(accent, 0.7, 0.45, 0.45, -0.55, 0.72, -0.55));
    g.add(box(GOODS_B, 0.5, 0.35, 0.5, 0.5, 0.66, -0.5));
    g.add(cyl(WOOD, 0.05, 0.05, 1.7, -0.95, 1.15, -0.7));
    g.add(cyl(WOOD, 0.05, 0.05, 1.7, 0.95, 1.15, -0.7));
  } else if (style.kind === 'cart') {
    g.add(box(wall, 1.9, 0.85, 1.15, 0, 0.85, 0));
    g.add(box(roof, 2.15, 0.1, 1.45, 0, 1.55, 0));
    g.add(box(accent, 2.05, 0.08, 0.55, 0, 1.42, -0.55));
    g.add(cyl(WOOD, 0.04, 0.04, 1.05, -0.85, 1.15, -0.55));
    g.add(cyl(WOOD, 0.04, 0.04, 1.05, 0.85, 1.15, -0.55));
    const wheel = (wx: number, wz: number) => {
      const m = cyl(DARK, 0.22, 0.22, 0.12, wx, 0.22, wz);
      m.rotation.z = Math.PI / 2;
      g.add(m);
    };
    wheel(-0.7, 0.42); wheel(0.7, 0.42); wheel(-0.7, -0.42); wheel(0.7, -0.42);
    g.add(box(GOODS_A, 0.35, 0.28, 0.35, -0.4, 1.12, -0.15));
    g.add(box(GOODS_B, 0.3, 0.22, 0.3, 0.35, 1.08, -0.1));
  } else {
    g.add(box(wall, 2.5, 1.35, 1.7, 0, 0.72, 0.15));
    g.add(box(DARK, 1.2, 1.05, 0.06, 0, 0.78, -0.72));
    g.add(box(WOOD, 2.55, 0.1, 0.85, 0, 1.12, -0.95));
    g.add(box(roof, 2.7, 0.08, 1.55, 0, 1.55, -0.15));
    g.add(box(accent, 2.7, 0.08, 0.42, 0, 1.55, -0.72));
    g.add(box(GOODS_A, 0.38, 0.32, 0.38, -0.55, 1.28, -0.95));
    g.add(box(GOODS_B, 0.32, 0.26, 0.32, 0.5, 1.24, -0.92));
  }
  return g;
}

interface Placement {
  x: number;
  y: number;
  z: number;
  rot: number;
}

export class RoadShops {
  private roots: THREE.Group[] = [];
  private x: number[] = [];
  private z: number[] = [];

  constructor(scene: THREE.Scene, world: World) {
    const packId = world.packId;
    const style = PACK_SHOP[packId] ?? PACK_SHOP.usa;
    const want = Math.max(8, Math.round(world.length / 210));
    let placed = 0;
    let guard = 0;
    while (placed < want && guard < want * 8) {
      const seed = placed * 13.7 + guard * 4.4 + 2.8;
      guard++;
      const s = (0.06 + rand(seed) * 0.88) * world.length;
      const side = rand(seed + 0.2) < 0.5 ? -1 : 1;
      const lat = side * (8.8 + rand(seed + 0.31) * 1.4);
      if (world.coastLeft && lat < 0) continue;
      const pose = world.poseAt(s);
      const x = pose.pos.x + pose.right.x * lat;
      const z = pose.pos.z + pose.right.z * lat;
      let blocked = false;
      for (const lake of world.lakes) {
        const dx = x - lake.x, dz = z - lake.z;
        if (dx * dx + dz * dz < (lake.r + 4) * (lake.r + 4)) {
          blocked = true;
          break;
        }
      }
      if (blocked) continue;
      for (const poi of world.pois) {
        const dx = x - poi.pos.x, dz = z - poi.pos.z;
        if (dx * dx + dz * dz < (poi.radius + 8) * (poi.radius + 8)) {
          blocked = true;
          break;
        }
      }
      if (blocked) continue;
      for (let i = 0; i < this.x.length; i++) {
        const dx = x - this.x[i], dz = z - this.z[i];
        if (dx * dx + dz * dz < 44 * 44) {
          blocked = true;
          break;
        }
      }
      if (blocked) continue;

      const y = world.surfaceY(x, z, pose.index).y - 0.05;
      const dx = pose.pos.x - x;
      const dz = pose.pos.z - z;
      const rot = Math.atan2(-dx, -dz);
      this.spawn({ x, y, z, rot }, style, seed, packId, scene, world);
      placed++;
    }
  }

  /** 决定用 AI 模型还是手工低模；无论哪种都登记到 world.shops 供碰撞/交互使用 */
  private spawn(
    p: Placement, style: ShopStyle, seed: number,
    packId: string, scene: THREE.Scene, world: World,
  ): void {
    const stem = GLB_MAP[packId];
    if (stem) {
      // 异步加载；加载失败则回退手工低模。门脸朝向与手工低模一致（-Z 对路心）。
      getGLB(stem).then((model) => {
        if (model) this.addGLB(model, p, packId, scene);
        else this.addProcedural(style, seed, p, scene);
      });
    } else {
      this.addProcedural(style, seed, p, scene);
    }
    world.shops.push({ x: p.x, z: p.z, r: 7.4 });
  }

  private addProcedural(style: ShopStyle, seed: number, p: Placement, scene: THREE.Scene): void {
    const root = makeShop(style, seed + 0.7);
    root.position.set(p.x, p.y, p.z);
    root.rotation.set(0, p.rot, 0);
    root.frustumCulled = false;
    scene.add(root);
    this.roots.push(root);
    this.x.push(p.x);
    this.z.push(p.z);
  }

  private addGLB(src: THREE.Object3D, p: Placement, packId: string, scene: THREE.Scene): void {
    const m = src.clone(true);
    m.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
    // 归一化：底面贴地、水平居中，并缩放到目标宽度
    const box3 = new THREE.Box3().setFromObject(m);
    const size = box3.getSize(new THREE.Vector3());
    const center = box3.getCenter(new THREE.Vector3());
    m.position.set(-center.x, -box3.min.y, -center.z);
    const g = new THREE.Group();
    g.add(m);
    g.scale.setScalar(SHOP_WIDTH / Math.max(size.x, size.z, 0.001));

    g.position.set(p.x, p.y, p.z);
    g.rotation.set(0, p.rot + (GLB_ROT[packId] ?? 0), 0);
    g.frustumCulled = false;
    scene.add(g);
    this.roots.push(g);
    this.x.push(p.x);
    this.z.push(p.z);
  }

  update(player: THREE.Vector3): void {
    const px = player.x, pz = player.z;
    for (let i = 0; i < this.roots.length; i++) {
      const dx = px - this.x[i], dz = pz - this.z[i];
      this.roots[i].visible = dx * dx + dz * dz < HIDE2;
    }
  }
}
