import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import type { CharacterId } from './scenes';

/* ============================================================
 *  低多边形座驾：自行车 / 摩托 / 房车 / 跑车
 *  全部由「带倒角的方块」与少量圆环拼成，避免锋利的硬角
 *  模型朝向：+Z 为前进方向，车轮轴沿 X
 * ============================================================ */

type KitMats = {
  frame: THREE.MeshStandardMaterial;
  frameDark: THREE.MeshStandardMaterial;
  tyre: THREE.MeshStandardMaterial;
  rim: THREE.MeshStandardMaterial;
  skin: THREE.MeshStandardMaterial;
  helmet: THREE.MeshStandardMaterial;
  shirt: THREE.MeshStandardMaterial;
  pants: THREE.MeshStandardMaterial;
  shoe: THREE.MeshStandardMaterial;
  hair: THREE.MeshStandardMaterial;
};

function makeKit(character: CharacterId): KitMats {
  const shared = {
    frameDark: new THREE.MeshStandardMaterial({ color: 0x1b2a3a, roughness: 0.5, metalness: 0.35, flatShading: true }),
    tyre: new THREE.MeshStandardMaterial({ color: 0x191c21, roughness: 0.9, flatShading: true }),
    rim: new THREE.MeshStandardMaterial({ color: 0xc9d4e0, roughness: 0.28, metalness: 0.65, flatShading: true }),
    skin: new THREE.MeshStandardMaterial({ color: 0xf0c9a4, roughness: 0.8, flatShading: true }),
    shoe: new THREE.MeshStandardMaterial({ color: 0x22262e, roughness: 0.7, flatShading: true }),
  };
  if (character === 'female') {
    return {
      ...shared,
      frame: new THREE.MeshStandardMaterial({ color: 0xc45dff, roughness: 0.32, metalness: 0.3, flatShading: true }),
      helmet: new THREE.MeshStandardMaterial({ color: 0xff4fa3, roughness: 0.35, flatShading: true }),
      shirt: new THREE.MeshStandardMaterial({ color: 0xe8d4ff, roughness: 0.85, flatShading: true }),
      pants: new THREE.MeshStandardMaterial({ color: 0x5a2d6e, roughness: 0.85, flatShading: true }),
      hair: new THREE.MeshStandardMaterial({ color: 0x2a1a14, roughness: 0.75, flatShading: true }),
    };
  }
  return {
    ...shared,
    frame: new THREE.MeshStandardMaterial({ color: 0x2f9dff, roughness: 0.32, metalness: 0.3, flatShading: true }),
    helmet: new THREE.MeshStandardMaterial({ color: 0xff6b5b, roughness: 0.35, flatShading: true }),
    shirt: new THREE.MeshStandardMaterial({ color: 0xfaf4e6, roughness: 0.85, flatShading: true }),
    pants: new THREE.MeshStandardMaterial({ color: 0x2b3550, roughness: 0.85, flatShading: true }),
    hair: new THREE.MeshStandardMaterial({ color: 0x1a1410, roughness: 0.8, flatShading: true }),
  };
}

type CarMats = {
  body: THREE.MeshStandardMaterial;
  bodyDark: THREE.MeshStandardMaterial;
  glass: THREE.MeshStandardMaterial;
  tyre: THREE.MeshStandardMaterial;
  rim: THREE.MeshStandardMaterial;
  chrome: THREE.MeshStandardMaterial;
  interior: THREE.MeshStandardMaterial;
  skin: THREE.MeshStandardMaterial;
  shirt: THREE.MeshStandardMaterial;
  helmet: THREE.MeshStandardMaterial;
};

function makeCarMats(kind: 'moto' | 'rv' | 'sport'): CarMats {
  const shared = {
    tyre: new THREE.MeshStandardMaterial({ color: 0x191c21, roughness: 0.9, flatShading: true }),
    rim: new THREE.MeshStandardMaterial({ color: 0xc9d4e0, roughness: 0.28, metalness: 0.65, flatShading: true }),
    chrome: new THREE.MeshStandardMaterial({ color: 0xb8c4d0, roughness: 0.22, metalness: 0.72, flatShading: true }),
    glass: new THREE.MeshStandardMaterial({
      color: 0x8ec8e8, roughness: 0.12, metalness: 0.35, transparent: true, opacity: 0.42, flatShading: true,
    }),
    interior: new THREE.MeshStandardMaterial({ color: 0x2a3038, roughness: 0.85, flatShading: true }),
    skin: new THREE.MeshStandardMaterial({ color: 0xf0c9a4, roughness: 0.8, flatShading: true }),
    shirt: new THREE.MeshStandardMaterial({ color: 0xf4eee4, roughness: 0.85, flatShading: true }),
    helmet: new THREE.MeshStandardMaterial({ color: 0x1a1e26, roughness: 0.35, flatShading: true }),
  };
  if (kind === 'moto') {
    return {
      ...shared,
      body: new THREE.MeshStandardMaterial({ color: 0xff5a3c, roughness: 0.28, metalness: 0.38, flatShading: true }),
      bodyDark: new THREE.MeshStandardMaterial({ color: 0x1a1f28, roughness: 0.45, metalness: 0.4, flatShading: true }),
      helmet: new THREE.MeshStandardMaterial({ color: 0xf2c44d, roughness: 0.32, flatShading: true }),
      shirt: new THREE.MeshStandardMaterial({ color: 0x1e2a38, roughness: 0.8, flatShading: true }),
    };
  }
  if (kind === 'rv') {
    return {
      ...shared,
      body: new THREE.MeshStandardMaterial({ color: 0xf3efe6, roughness: 0.62, metalness: 0.08, flatShading: true }),
      bodyDark: new THREE.MeshStandardMaterial({ color: 0x3d6b8a, roughness: 0.45, metalness: 0.18, flatShading: true }),
      shirt: new THREE.MeshStandardMaterial({ color: 0xc97848, roughness: 0.85, flatShading: true }),
    };
  }
  return {
    ...shared,
    body: new THREE.MeshStandardMaterial({ color: 0xdc2b2b, roughness: 0.22, metalness: 0.46, flatShading: true }),
    bodyDark: new THREE.MeshStandardMaterial({ color: 0x140e10, roughness: 0.38, metalness: 0.5, flatShading: true }),
    helmet: new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.3, flatShading: true }),
  };
}

const rbox = (w: number, h: number, d: number, r = 0.02): RoundedBoxGeometry =>
  new RoundedBoxGeometry(w, h, d, 1, Math.min(r, Math.min(w, h, d) * 0.45));

function part(geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number): THREE.Mesh {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  return m;
}

const UP_AXIS = new THREE.Vector3(0, 1, 0);

/** 连接两点的细长方块（车架管、手臂） */
function tube(
  mat: THREE.Material,
  ax: number, ay: number, az: number,
  bx: number, by: number, bz: number,
  thick: number
): THREE.Mesh {
  const a = new THREE.Vector3(ax, ay, az);
  const b = new THREE.Vector3(bx, by, bz);
  const dir = new THREE.Vector3().subVectors(b, a);
  const m = new THREE.Mesh(rbox(thick, dir.length(), thick, thick * 0.42), mat);
  m.position.copy(a).add(b).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(UP_AXIS, dir.normalize());
  m.castShadow = true;
  return m;
}

function addWheel(
  parent: THREE.Group,
  mats: { tyre: THREE.Material; rim: THREE.Material },
  x: number, y: number, z: number, radius: number, thick: number,
): THREE.Group {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  const tyre = new THREE.Mesh(new THREE.TorusGeometry(radius - thick * 0.55, thick, 5, 18), mats.tyre);
  tyre.rotation.y = Math.PI / 2;
  tyre.castShadow = true;
  g.add(tyre);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(radius - thick * 1.7, thick * 0.38, 4, 16), mats.rim);
  rim.rotation.y = Math.PI / 2;
  g.add(rim);
  g.add(part(rbox(thick * 1.4, thick * 1.4, thick * 1.4, thick * 0.5), mats.rim, 0, 0, 0));
  parent.add(g);
  return g;
}

const CRANK = 0.17;
const THIGH = 0.45;
const SHIN = 0.45;
const TORSO_TILT = 0.70;   // 躯干前倾角（正角 = 顶部向 +Z）

export class Bike {
  root = new THREE.Group();
  wheelRadius = 0.345;
  readonly character: CharacterId;
  private crankAngle = 0;
  private wheels: THREE.Group[] = [];
  private handlebar: THREE.Group | null = null;
  private cranks: THREE.Group[] = [];
  private rider: THREE.Group | null = null;
  private torso: THREE.Group | null = null;
  private legs: { thigh: THREE.Group; shin: THREE.Group; side: number; phase0: number }[] = [];
  private lampMat!: THREE.MeshStandardMaterial;
  private light!: THREE.SpotLight;
  private bb = { x: 0, y: 0.30, z: 0.04 };

  constructor(character: CharacterId = 'male') {
    this.character = character;
    this.build(character);
  }

  private build(character: CharacterId): void {
    if (character === 'moto') this.buildMoto();
    else if (character === 'rv') this.buildRv();
    else if (character === 'sport') this.buildSport();
    else this.buildBicycle(character);
  }

  private attachHeadlight(x: number, y: number, z: number, radius: number, lookZ: number): void {
    this.lampMat = new THREE.MeshStandardMaterial({
      color: 0xfff2c4, emissive: 0xffd98a, emissiveIntensity: 0, roughness: 0.3,
    });
    const lamp = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, 0.05, 10), this.lampMat);
    lamp.rotation.x = Math.PI / 2;
    lamp.position.set(x, y, z);
    this.root.add(lamp);

    this.light = new THREE.SpotLight(0xffdca8, 0, 34, 0.5, 0.65, 1.3);
    this.light.position.set(x, y, z);
    const lightTarget = new THREE.Object3D();
    lightTarget.position.set(0, 0.1, lookZ);
    this.root.add(this.light, lightTarget);
    this.light.target = lightTarget;
  }

  private addCabinDriver(mats: CarMats, x: number, y: number, z: number, scale: number): void {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    g.scale.setScalar(scale);
    g.add(part(rbox(0.28, 0.32, 0.18, 0.07), mats.shirt, 0, 0.18, 0));
    g.add(part(rbox(0.16, 0.16, 0.16, 0.06), mats.skin, 0, 0.42, 0.02));
    g.add(part(rbox(0.18, 0.08, 0.18, 0.04), mats.helmet, 0, 0.52, 0.01));
    this.root.add(g);
    this.rider = g;
  }

  private buildBicycle(character: CharacterId): void {
    const MAT = makeKit(character);
    const female = character === 'female';
    const shoulderW = female ? 0.28 : 0.34;
    const torsoD = female ? 0.22 : 0.25;
    const hipSpread = female ? 0.09 : 0.10;
    const armOut = female ? 0.20 : 0.24;
    const riderScale = female ? 0.95 : 1;

    const R = this.wheelRadius;
    const WB = 0.52;
    const BB = { x: 0, y: 0.30, z: 0.04 };
    const seatTop = { x: 0, y: 0.92, z: -0.40 };
    const headTop = { x: 0, y: 1.00, z: 0.40 };
    const headBot = { x: 0, y: 0.44, z: 0.50 };
    const rearHub = { x: 0, y: R, z: -WB };
    this.bb = BB;

    for (const side of [-1, 1]) {
      const g = new THREE.Group();
      g.position.set(0, R, side * WB);
      const tyre = new THREE.Mesh(new THREE.TorusGeometry(R - 0.045, 0.05, 5, 20), MAT.tyre);
      tyre.rotation.y = Math.PI / 2;
      tyre.castShadow = true;
      g.add(tyre);
      const rim = new THREE.Mesh(new THREE.TorusGeometry(R - 0.115, 0.021, 4, 18), MAT.rim);
      rim.rotation.y = Math.PI / 2;
      g.add(rim);
      g.add(part(rbox(0.08, 0.08, 0.08, 0.032), MAT.rim, 0, 0, 0));
      for (let i = 0; i < 4; i++) {
        const sp = new THREE.Mesh(rbox(0.016, (R - 0.11) * 2, 0.016, 0.008), MAT.rim);
        sp.rotation.x = (i / 4) * Math.PI;
        g.add(sp);
      }
      this.root.add(g);
      this.wheels.push(g);
    }

    this.root.add(
      tube(MAT.frame, seatTop.x, seatTop.y, seatTop.z, BB.x, BB.y, BB.z, 0.055),
      tube(MAT.frame, headTop.x, headTop.y, headTop.z, BB.x, BB.y, BB.z, 0.055),
      tube(MAT.frame, headTop.x, headTop.y, headTop.z, seatTop.x, seatTop.y, seatTop.z, 0.05),
      tube(MAT.frame, BB.x, BB.y, BB.z, rearHub.x, rearHub.y, rearHub.z, 0.045),
      tube(MAT.frame, seatTop.x, seatTop.y - 0.06, seatTop.z, rearHub.x, rearHub.y, rearHub.z, 0.038),
      tube(MAT.frameDark, headTop.x, headTop.y, headTop.z, headBot.x, headBot.y - 0.03, headBot.z - 0.03, 0.045)
    );

    const saddle = part(rbox(0.13, 0.055, 0.32, 0.026), MAT.frameDark, 0, seatTop.y + 0.045, seatTop.z - 0.02);
    saddle.rotation.x = -0.06;
    this.root.add(saddle);

    this.handlebar = new THREE.Group();
    this.handlebar.position.set(0, headTop.y, headTop.z);
    this.handlebar.add(part(rbox(0.05, 0.05, 0.16, 0.022), MAT.frameDark, 0, 0.02, 0.06));
    this.handlebar.add(part(rbox(0.56, 0.045, 0.045, 0.022), MAT.frameDark, 0, 0.05, 0.14));
    for (const s of [-1, 1]) {
      this.handlebar.add(part(rbox(0.11, 0.055, 0.055, 0.024), MAT.tyre, s * 0.28, 0.05, 0.14));
    }
    this.root.add(this.handlebar);

    for (const [key, phase0] of [['R', 0], ['L', Math.PI]] as const) {
      const grp = new THREE.Group();
      grp.position.set(key === 'R' ? 0.09 : -0.09, BB.y, BB.z);
      grp.add(part(rbox(0.035, CRANK, 0.045, 0.016), MAT.frameDark, 0, -CRANK / 2, 0));
      grp.add(part(rbox(0.13, 0.03, 0.09, 0.014), MAT.tyre, 0, -CRANK, 0.02));
      grp.userData.phase0 = phase0;
      this.root.add(grp);
      this.cranks.push(grp);
    }
    const chainring = new THREE.Mesh(new THREE.CylinderGeometry(0.105, 0.105, 0.018, 12), MAT.rim);
    chainring.rotation.z = Math.PI / 2;
    chainring.position.set(-0.085, BB.y, BB.z);
    this.root.add(chainring);

    this.rider = new THREE.Group();
    this.rider.scale.setScalar(riderScale);
    this.root.add(this.rider);

    const hip = new THREE.Vector3(0, 1.0, -0.32);

    this.torso = new THREE.Group();
    this.torso.position.copy(hip);
    this.torso.add(part(rbox(shoulderW, 0.48, torsoD, 0.095), MAT.shirt, 0, 0.24, 0));
    this.torso.rotation.x = TORSO_TILT;
    this.rider.add(this.torso);

    const shoulder = new THREE.Vector3(0, 1.36, 0.02);

    const head = new THREE.Group();
    head.position.set(shoulder.x, shoulder.y + 0.11, shoulder.z + 0.07);
    head.add(part(rbox(0.09, 0.09, 0.09, 0.04), MAT.skin, 0, -0.10, -0.02));
    head.add(part(rbox(female ? 0.18 : 0.20, female ? 0.20 : 0.21, female ? 0.20 : 0.22, 0.075), MAT.skin, 0, 0.04, 0));
    head.add(part(rbox(female ? 0.21 : 0.225, 0.13, female ? 0.23 : 0.245, 0.07), MAT.helmet, 0, 0.11, 0.005));
    const visor = part(rbox(0.20, 0.035, 0.06, 0.016), MAT.helmet, 0, 0.085, 0.14);
    visor.rotation.x = 0.35;
    head.add(visor);
    if (female) {
      head.add(part(rbox(0.16, 0.28, 0.08, 0.035), MAT.hair, 0, -0.02, -0.12));
      head.add(part(rbox(0.12, 0.36, 0.07, 0.03), MAT.hair, 0, -0.12, -0.14));
      head.add(part(rbox(0.07, 0.22, 0.06, 0.025), MAT.hair, 0.09, -0.08, -0.10));
      head.add(part(rbox(0.07, 0.22, 0.06, 0.025), MAT.hair, -0.09, -0.08, -0.10));
    }
    this.rider.add(head);

    for (const s of [-1, 1]) {
      const ex = s * armOut, ey = 1.16, ez = 0.27;
      this.rider.add(
        tube(MAT.shirt, s * (shoulderW * 0.5), shoulder.y, shoulder.z, ex, ey, ez, female ? 0.075 : 0.085),
        tube(MAT.skin, ex, ey, ez, s * 0.275, headTop.y + 0.05, headTop.z + 0.14, female ? 0.065 : 0.072)
      );
    }

    for (const s of [-1, 1]) {
      const thigh = new THREE.Group();
      thigh.position.set(hip.x + s * hipSpread, hip.y, hip.z);
      thigh.add(part(rbox(female ? 0.105 : 0.115, THIGH, female ? 0.105 : 0.115, 0.05), MAT.pants, 0, -THIGH / 2, 0));

      const shin = new THREE.Group();
      shin.position.set(0, -THIGH, 0);
      shin.add(part(rbox(female ? 0.088 : 0.095, SHIN, female ? 0.088 : 0.095, 0.045), MAT.pants, 0, -SHIN / 2, 0));
      shin.add(part(rbox(0.10, 0.055, 0.24, 0.03), MAT.shoe, 0, -SHIN - 0.01, 0.07));

      thigh.add(shin);
      this.rider.add(thigh);
      this.legs.push({ thigh, shin, side: s, phase0: s > 0 ? 0 : Math.PI });
    }

    this.attachHeadlight(0, headTop.y - 0.02, headTop.z + 0.10, 0.062, 14);
  }

  private buildMoto(): void {
    const MAT = makeCarMats('moto');
    const R = 0.32;
    this.wheelRadius = R;
    const WB = 0.62;

    this.wheels.push(
      addWheel(this.root, MAT, 0, R, WB, R, 0.055),
      addWheel(this.root, MAT, 0, R, -WB, R, 0.058),
    );

    this.root.add(part(rbox(0.22, 0.16, 0.62, 0.06), MAT.body, 0, 0.62, 0.06));
    this.root.add(part(rbox(0.18, 0.12, 0.38, 0.05), MAT.bodyDark, 0, 0.78, -0.22));
    this.root.add(part(rbox(0.16, 0.08, 0.28, 0.035), MAT.bodyDark, 0, 0.70, -0.48));
    this.root.add(tube(MAT.chrome, 0, 0.78, 0.28, 0, R + 0.02, WB, 0.045));
    this.root.add(tube(MAT.chrome, 0, 0.52, -0.18, 0, R + 0.02, -WB, 0.042));
    this.root.add(part(rbox(0.09, 0.07, 0.55, 0.03), MAT.chrome, 0.16, 0.38, -0.12));

    this.handlebar = new THREE.Group();
    this.handlebar.position.set(0, 0.98, 0.30);
    this.handlebar.add(part(rbox(0.52, 0.04, 0.04, 0.018), MAT.chrome, 0, 0, 0.08));
    for (const s of [-1, 1]) {
      this.handlebar.add(part(rbox(0.09, 0.05, 0.05, 0.02), MAT.bodyDark, s * 0.26, 0, 0.08));
    }
    this.root.add(this.handlebar);

    this.rider = new THREE.Group();
    this.root.add(this.rider);
    this.torso = new THREE.Group();
    this.torso.position.set(0, 0.92, -0.18);
    this.torso.rotation.x = 0.38;
    this.torso.add(part(rbox(0.30, 0.42, 0.20, 0.08), MAT.shirt, 0, 0.22, 0));
    this.rider.add(this.torso);
    this.rider.add(part(rbox(0.18, 0.18, 0.18, 0.07), MAT.skin, 0, 1.42, 0.02));
    this.rider.add(part(rbox(0.22, 0.12, 0.24, 0.06), MAT.helmet, 0, 1.54, 0.04));
    const visor = part(rbox(0.18, 0.04, 0.08, 0.016), MAT.glass, 0, 1.50, 0.16);
    visor.rotation.x = 0.25;
    this.rider.add(visor);
    for (const s of [-1, 1]) {
      this.rider.add(
        tube(MAT.shirt, s * 0.16, 1.28, -0.08, s * 0.24, 1.02, 0.30, 0.07),
        part(rbox(0.12, 0.28, 0.14, 0.05), MAT.bodyDark, s * 0.12, 0.78, -0.22),
      );
    }

    this.attachHeadlight(0, 0.72, 0.42, 0.055, 16);
  }

  private buildRv(): void {
    const MAT = makeCarMats('rv');
    const R = 0.36;
    this.wheelRadius = R;
    const track = 0.72;
    const zb = 1.05;
    const zf = -1.15;

    for (const x of [-track, track]) {
      this.wheels.push(addWheel(this.root, MAT, x, R, zb, R, 0.08));
      this.wheels.push(addWheel(this.root, MAT, x, R, zf, R, 0.08));
    }

    this.root.add(part(rbox(1.58, 0.22, 3.55, 0.08), MAT.bodyDark, 0, 0.52, -0.08));
    this.root.add(part(rbox(1.62, 1.55, 2.35, 0.08), MAT.body, 0, 1.38, -0.55));
    this.root.add(part(rbox(1.48, 1.18, 1.15, 0.07), MAT.body, 0, 1.22, 1.18));
    this.root.add(part(rbox(1.22, 0.72, 0.08, 0.03), MAT.glass, 0, 1.38, 1.74));
    this.root.add(part(rbox(0.06, 0.55, 0.72, 0.02), MAT.glass, 0.80, 1.42, -0.35));
    this.root.add(part(rbox(0.06, 0.55, 0.72, 0.02), MAT.glass, -0.80, 1.42, -0.35));
    this.root.add(part(rbox(0.06, 0.42, 0.48, 0.02), MAT.glass, 0.74, 1.28, 1.12));
    this.root.add(part(rbox(0.42, 0.72, 0.08, 0.03), MAT.bodyDark, 0.42, 1.12, -1.70));
    this.root.add(part(rbox(0.55, 0.16, 0.85, 0.05), MAT.bodyDark, 0, 2.22, -0.55));
    this.root.add(part(rbox(1.58, 0.08, 0.18, 0.03), MAT.bodyDark, 0, 0.92, 1.68));

    for (const s of [-1, 1]) {
      this.root.add(part(rbox(0.16, 0.10, 0.08, 0.03), MAT.chrome, s * 0.42, 0.72, 1.72));
    }
    this.root.add(part(rbox(0.22, 0.08, 0.06, 0.02), MAT.body, 0.52, 0.78, -1.84));
    this.root.add(part(rbox(0.22, 0.08, 0.06, 0.02), MAT.body, -0.52, 0.78, -1.84));

    this.addCabinDriver(MAT, -0.28, 1.05, 1.22, 0.92);
    this.attachHeadlight(-0.42, 0.72, 1.76, 0.07, 16);
    const lampR = part(rbox(0.16, 0.10, 0.06, 0.02), this.lampMat, 0.42, 0.72, 1.76);
    this.root.add(lampR);
  }

  private buildSport(): void {
    const MAT = makeCarMats('sport');
    const R = 0.27;
    this.wheelRadius = R;
    const track = 0.62;
    const zb = 0.78;
    const zf = -0.82;

    for (const x of [-track, track]) {
      this.wheels.push(addWheel(this.root, MAT, x, R, zb, R, 0.055));
      this.wheels.push(addWheel(this.root, MAT, x, R, zf, R, 0.055));
    }

    this.root.add(part(rbox(1.18, 0.28, 2.35, 0.08), MAT.body, 0, 0.42, -0.04));
    this.root.add(part(rbox(1.05, 0.22, 1.55, 0.07), MAT.body, 0, 0.58, 0.12));
    this.root.add(part(rbox(0.92, 0.28, 0.85, 0.08), MAT.glass, 0, 0.82, 0.08));
    this.root.add(part(rbox(1.02, 0.12, 0.55, 0.04), MAT.bodyDark, 0, 0.50, 0.92));
    this.root.add(part(rbox(0.82, 0.06, 0.22, 0.03), MAT.bodyDark, 0, 0.72, -1.12));
    this.root.add(part(rbox(1.12, 0.08, 0.16, 0.04), MAT.bodyDark, 0, 0.38, 1.14));
    this.root.add(part(rbox(0.55, 0.04, 0.28, 0.02), MAT.chrome, 0, 0.34, 1.18));

    for (const s of [-1, 1]) {
      this.root.add(part(rbox(0.18, 0.08, 0.08, 0.03), MAT.chrome, s * 0.38, 0.40, 1.16));
      this.root.add(part(rbox(0.14, 0.05, 0.06, 0.02), MAT.body, s * 0.36, 0.42, -1.16));
    }

    this.addCabinDriver(MAT, -0.18, 0.52, 0.12, 0.72);
    this.attachHeadlight(-0.38, 0.40, 1.18, 0.045, 18);
    this.root.add(part(rbox(0.18, 0.08, 0.06, 0.02), this.lampMat, 0.38, 0.40, 1.18));
  }

  /**
   * @param dt     帧间隔（秒）
   * @param speed  速度 m/s
   * @param steer  转向量 -1 ~ 1
   * @param night  夜晚程度 0 ~ 1
   */
  update(dt: number, speed: number, steer: number, night: number): void {
    const spin = (speed / this.wheelRadius) * dt;
    for (let i = 0; i < this.wheels.length; i++) {
      this.wheels[i].rotation.x += spin;
    }

    if (this.handlebar) this.handlebar.rotation.y = -steer * 0.34;

    if (this.cranks.length === 2 && this.torso && this.rider && this.legs.length) {
      this.crankAngle += Math.max(0.6, speed * 1.15) * dt;
      const ca = this.crankAngle;
      this.cranks[0].rotation.x = ca;
      this.cranks[1].rotation.x = ca + Math.PI;

      const cadence = Math.min(1, speed / 7);
      this.rider.position.y = Math.sin(ca * 2) * 0.014 * cadence;
      this.torso.rotation.x = TORSO_TILT + Math.sin(ca * 2) * 0.02 * cadence;

      for (const leg of this.legs) {
        const a = ca + leg.phase0;
        solveTwoBone(
          leg.thigh, leg.shin, THIGH, SHIN,
          this.bb.y - CRANK * Math.cos(a),
          this.bb.z - CRANK * Math.sin(a),
          leg.side
        );
      }
    } else if (this.rider && this.character === 'moto') {
      this.rider.rotation.z = -steer * 0.12;
    }

    this.lampMat.emissiveIntensity = night * 2.4;
    this.light.intensity = night * 30;
  }
}

/**
 * 两骨节 IK（在 YZ 平面求解）
 * 绕 X 轴旋转 θ 时，局部 (0,-1,0) 变为 (0,-cosθ,-sinθ)
 * θ 减小 → 骨节向 +Z（前方）摆；膝盖向前凸
 */
function solveTwoBone(
  thigh: THREE.Group, shin: THREE.Group,
  l1: number, l2: number,
  fy: number, fz: number, side: number
): void {
  const dy = fy - thigh.position.y;
  const dz = fz - thigh.position.z;

  let d = Math.sqrt(dy * dy + dz * dz);
  d = Math.min(d, l1 + l2 - 0.005);
  d = Math.max(d, Math.abs(l1 - l2) + 0.005);

  const a1 = Math.atan2(-dz, -dy);
  const cosA = (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d);
  const A = Math.acos(Math.min(1, Math.max(-1, cosA)));
  const cosB = (l1 * l1 + l2 * l2 - d * d) / (2 * l1 * l2);
  const B = Math.acos(Math.min(1, Math.max(-1, cosB)));

  thigh.rotation.x = a1 - A;
  shin.rotation.x = Math.PI - B;
  thigh.rotation.z = -side * 0.055;
}
