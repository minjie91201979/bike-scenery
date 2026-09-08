import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import type { CharacterId } from './scenes';

/* ============================================================
 *  低多边形自行车 + 骑手
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
  private handlebar!: THREE.Group;
  private cranks: THREE.Group[] = [];
  private rider!: THREE.Group;
  private torso!: THREE.Group;
  private legs: { thigh: THREE.Group; shin: THREE.Group; side: number; phase0: number }[] = [];
  private lampMat!: THREE.MeshStandardMaterial;
  private light!: THREE.SpotLight;
  private bb = { x: 0, y: 0.30, z: 0.04 };

  constructor(character: CharacterId = 'male') {
    this.character = character;
    this.build(character);
  }

  private build(character: CharacterId): void {
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

    // ---------- 车轮 ----------
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

    // ---------- 车架 ----------
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

    // ---------- 车把 ----------
    this.handlebar = new THREE.Group();
    this.handlebar.position.set(0, headTop.y, headTop.z);
    this.handlebar.add(part(rbox(0.05, 0.05, 0.16, 0.022), MAT.frameDark, 0, 0.02, 0.06));
    this.handlebar.add(part(rbox(0.56, 0.045, 0.045, 0.022), MAT.frameDark, 0, 0.05, 0.14));
    for (const s of [-1, 1]) {
      this.handlebar.add(part(rbox(0.11, 0.055, 0.055, 0.024), MAT.tyre, s * 0.28, 0.05, 0.14));
    }
    this.root.add(this.handlebar);

    // ---------- 曲柄 + 脚踏 ----------
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

    // ---------- 骑手 ----------
    this.rider = new THREE.Group();
    this.rider.scale.setScalar(riderScale);
    this.root.add(this.rider);

    const hip = new THREE.Vector3(0, 1.0, -0.32);

    // 躯干（前倾）
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
      // 长发：后脑勺垂下的几段方块
      head.add(part(rbox(0.16, 0.28, 0.08, 0.035), MAT.hair, 0, -0.02, -0.12));
      head.add(part(rbox(0.12, 0.36, 0.07, 0.03), MAT.hair, 0, -0.12, -0.14));
      head.add(part(rbox(0.07, 0.22, 0.06, 0.025), MAT.hair, 0.09, -0.08, -0.10));
      head.add(part(rbox(0.07, 0.22, 0.06, 0.025), MAT.hair, -0.09, -0.08, -0.10));
    }
    this.rider.add(head);

    // 手臂（肩 → 肘 → 车把）
    for (const s of [-1, 1]) {
      const ex = s * armOut, ey = 1.16, ez = 0.27;
      this.rider.add(
        tube(MAT.shirt, s * (shoulderW * 0.5), shoulder.y, shoulder.z, ex, ey, ez, female ? 0.075 : 0.085),
        tube(MAT.skin, ex, ey, ez, s * 0.275, headTop.y + 0.05, headTop.z + 0.14, female ? 0.065 : 0.072)
      );
    }

    // 腿（两骨节 IK）
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

    // ---------- 车灯 ----------
    this.lampMat = new THREE.MeshStandardMaterial({
      color: 0xfff2c4, emissive: 0xffd98a, emissiveIntensity: 0, roughness: 0.3
    });
    const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.062, 0.062, 0.05, 10), this.lampMat);
    lamp.rotation.x = Math.PI / 2;
    lamp.position.set(0, headTop.y - 0.02, headTop.z + 0.10);
    this.root.add(lamp);

    this.light = new THREE.SpotLight(0xffdca8, 0, 30, 0.5, 0.65, 1.3);
    this.light.position.set(0, headTop.y, headTop.z + 0.1);
    const lightTarget = new THREE.Object3D();
    lightTarget.position.set(0, 0.1, 14);
    this.root.add(this.light, lightTarget);
    this.light.target = lightTarget;
  }

  /**
   * @param dt     帧间隔（秒）
   * @param speed  速度 m/s
   * @param steer  转向量 -1 ~ 1
   * @param night  夜晚程度 0 ~ 1
   */
  update(dt: number, speed: number, steer: number, night: number): void {
    const spin = (speed / this.wheelRadius) * dt;
    this.wheels[0].rotation.x += spin;
    this.wheels[1].rotation.x += spin;

    this.crankAngle += Math.max(0.6, speed * 1.15) * dt;
    const ca = this.crankAngle;
    this.cranks[0].rotation.x = ca;
    this.cranks[1].rotation.x = ca + Math.PI;

    this.handlebar.rotation.y = -steer * 0.34;

    const cadence = Math.min(1, speed / 7);
    this.rider.position.y = Math.sin(ca * 2) * 0.014 * cadence;
    this.torso.rotation.x = TORSO_TILT + Math.sin(ca * 2) * 0.02 * cadence;

    // 腿 IK：脚落在曲柄末端
    for (const leg of this.legs) {
      const a = ca + leg.phase0;
      solveTwoBone(
        leg.thigh, leg.shin, THIGH, SHIN,
        this.bb.y - CRANK * Math.cos(a),
        this.bb.z - CRANK * Math.sin(a),
        leg.side
      );
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
