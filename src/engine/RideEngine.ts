import * as THREE from 'three';
import { World } from './World';
import { Sky } from './Sky';
import { Bike } from './Bike';
import { Scatter, buildPois, type Animatable } from './Props';
import { Wildlife } from './Wildlife';
import { SkyBirds } from './Birds';
import { CoastBoats } from './CoastBoats';
import { SkyBalloons } from './Balloons';
import { WindRings } from './WindRings';
import { RoadShops } from './RoadShops';
import { BRAKE_MIN, GRADE_ACCEL, REST_EPS, vehicleProfile, type VehicleProfile } from './constants';
import { getScene, type CharacterId, type RideConfig } from './scenes';
import type { CamMode, Stats, TimeOfDay } from './types';
import { greeterWelcomeMessage } from './ethnic';
import { rideAudio } from '../utils/rideAudio';
import { saveRidePhoto, triggerShutterFlash } from '../utils/photoSave';

/** 首次发现景点（足迹 / 印章） */
export interface DiscoverEvent {
  poiId: number;
  poiName: string;
  countryName: string;
  welcome: string | null;
  stampIndex: number;
}

export interface EngineCallbacks {
  onStats: (s: Stats) => void;
  onCamChange: (m: CamMode) => void;
  onTimeChange: (t: TimeOfDay) => void;
  /** 发现地标 / 迎客 — 独立车道，约 3s */
  onDiscover: (ev: DiscoverEvent) => void;
  /** 野生动物提醒 */
  onWarn: (msg: string) => void;
  /** 拍照、杂项系统提示 */
  onSystem: (msg: string) => void;
}

export type EngineOptions = RideConfig;

/** Parallel touch state merged with keyboard in the update loop. */
export interface TouchInput {
  left: boolean;
  right: boolean;
  accel: boolean;
  brake: boolean;
}

/**
 * 骑行引擎：持有 Three.js 场景、游戏状态与渲染循环。
 * React 只负责 UI，所有 3D 状态都在这里，避免高频重渲染。
 */
export class RideEngine {
  readonly world: World;
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;

  private canvas: HTMLCanvasElement;
  private renderer: THREE.WebGLRenderer;
  private loader = new THREE.TextureLoader();
  private sky: Sky;
  private scatter: Scatter;
  private wildlife: Wildlife;
  private birds: SkyBirds;
  private boats: CoastBoats;
  private balloons: SkyBalloons;
  private rings: WindRings;
  private shops: RoadShops;
  private poiAnims: Animatable[] = [];
  private bike: Bike;
  private vehicle: VehicleProfile;
  private hitSlow = 0;
  private hitIframe = 0;
  private shake = 0;
  private photoHintCd = 0;
  private cb: EngineCallbacks;
  private countryName: string;
  private shotBusy = false;

  private started = false;
  private speed = 0;
  private s = 4;
  private lateral = 0;
  private latTarget = 0;
  private dist = 0;
  private time = 0;
  private seen = new Set<number>();
  private camMode: CamMode = 'follow';
  private orbitYaw = 0;
  private orbitPitch = 0;
  private dragging = false;
  private lastPX = 0;
  private lastPY = 0;

  private keys = new Set<string>();
  private touch: TouchInput = { left: false, right: false, accel: false, brake: false };
  private clock = new THREE.Clock();
  private raf = 0;
  private hudAcc = 0;
  private camPos = new THREE.Vector3();
  private camLook = new THREE.Vector3();
  private tmpA = new THREE.Vector3();
  private tmpB = new THREE.Vector3();
  private fwd = new THREE.Vector3();
  private disposed = false;

  constructor(canvas: HTMLCanvasElement, cb: EngineCallbacks, options: EngineOptions = { sceneId: 'china', characterId: 'male' }) {
    this.canvas = canvas;
    this.cb = cb;

    const scenePack = getScene(options.sceneId);
    this.countryName = scenePack.name;
    const characterId: CharacterId = options.characterId ?? 'male';
    this.vehicle = vehicleProfile(characterId);

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
    canvas.style.touchAction = 'none';
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = scenePack.id === 'russia' ? 0.92 : 1.05;

    this.camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 3200);

    this.world = new World(this.scene, scenePack);
    this.sky = new Sky(this.scene, this.loader, scenePack.id);
    this.scatter = new Scatter(this.scene, this.world);
    this.wildlife = new Wildlife(this.scene, this.world);
    this.birds = new SkyBirds(this.scene, this.world);
    this.boats = new CoastBoats(this.scene, this.world);
    this.balloons = new SkyBalloons(this.scene, this.world);
    this.rings = new WindRings(this.scene, this.world);
    this.shops = new RoadShops(this.scene, this.world);
    this.poiAnims = buildPois(this.scene, this.world);

    this.bike = new Bike(characterId);
    this.bike.root.rotation.order = 'YZX';
    this.scene.add(this.bike.root);

    // 初始相机直接落在车后，避免开局从原点飞入
    const p0 = this.world.poseAt(this.s);
    const cam = this.vehicle;
    this.camPos.set(
      p0.pos.x - p0.tan.x * cam.followBack,
      p0.pos.y + cam.followHeight,
      p0.pos.z - p0.tan.z * cam.followBack,
    );
    this.camLook.copy(p0.pos);

    this.world.update(this.s);
    this.scatter.update(this.world.lastRow);
    this.world.updateSkirt(p0.pos.x, p0.pos.z);

    this.bindEvents();
    this.loop();
  }

  /* ---------------- 对外 API ---------------- */
  setStarted(v: boolean): void {
    this.started = v;
    // 刚进入场景即缓缓上路；之后仍可用刹车真正停住看风景
    if (v && this.speed < REST_EPS) this.speed = this.vehicle.cruise;
  }

  setTouchInput(input: Partial<TouchInput>): void {
    if (input.left !== undefined) this.touch.left = input.left;
    if (input.right !== undefined) this.touch.right = input.right;
    if (input.accel !== undefined) this.touch.accel = input.accel;
    if (input.brake !== undefined) this.touch.brake = input.brake;
  }

  setTimeOfDay(name: TimeOfDay): void {
    this.sky.setTimeOfDay(name);
    this.cb.onTimeChange(name);
  }

  setCamMode(mode: CamMode): void {
    if (this.camMode === mode) return;
    this.camMode = mode;
    this.cb.onCamChange(mode);
  }

  cycleCam(): void {
    const order: CamMode[] = ['follow', 'cinema', 'fpv'];
    this.setCamMode(order[(order.indexOf(this.camMode) + 1) % order.length]);
  }

  screenshot(): void {
    if (this.shotBusy || this.disposed) return;
    this.shotBusy = true;
    rideAudio.unlock();
    rideAudio.play('shutter');
    triggerShutterFlash();
    const quest = this.photoQuestHint(this.bike.root.position) !== null;

    const finish = (_ok: boolean, msg: string) => {
      this.shotBusy = false;
      this.cb.onSystem(msg);
    };

    try {
      const dataUrl = this.canvas.toDataURL('image/png');
      const name = `scenery-ride-${Date.now()}.png`;
      void saveRidePhoto(dataUrl, name).then((res) => {
        if (!res.ok) {
          finish(false, '未保存到相册');
          return;
        }
        const saved = quest
          ? '咔嚓 —— 这一刻被你留下了。'
          : res.dest === 'album'
            ? '已保存到相册'
            : res.dest === 'share'
              ? '已交给系统，可选存到相册'
              : '照片已保存';
        finish(true, saved);
      });
    } catch {
      finish(false, '拍照失败，请再试一次');
    }
  }

  /** 气球 > 动物 > 景点；有课题目标才给提示句 */
  private photoQuestHint(player: THREE.Vector3): string | null {
    const balloon = this.balloons.nearestDist(player);
    if (balloon < 55) return '热气球近了。按 F 留下这一刻。';
    const animal = this.wildlife.nearest(player);
    if (animal && animal.dist < 16) return `${animal.label}就在旁边。按 F。`;
    let nd = Infinity;
    let name = '';
    for (const poi of this.world.pois) {
      const dx = player.x - poi.roadPos.x, dz = player.z - poi.roadPos.z;
      const d = Math.sqrt(dx * dx + dz * dz);
      if (d < nd) {
        nd = d;
        name = poi.name;
      }
    }
    if (nd < 50) return `${name}近了。按 F。`;
    return null;
  }

  dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onBlur);
    window.removeEventListener('resize', this.onResize);
    this.canvas.removeEventListener('pointerdown', this.onPointerDown);
    this.canvas.removeEventListener('pointermove', this.onPointerMove);
    this.canvas.removeEventListener('pointerup', this.onPointerUp);
    this.canvas.removeEventListener('pointercancel', this.onPointerUp);
    this.renderer.dispose();
    this.scene.clear();
  }

  /* ---------------- 事件 ---------------- */
  private bindEvents(): void {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onBlur);
    window.addEventListener('resize', this.onResize);
    this.canvas.addEventListener('pointerdown', this.onPointerDown);
    this.canvas.addEventListener('pointermove', this.onPointerMove);
    this.canvas.addEventListener('pointerup', this.onPointerUp);
    this.canvas.addEventListener('pointercancel', this.onPointerUp);
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    if (e.repeat) return;
    rideAudio.unlock();
    this.keys.add(e.code);
    if (e.code === 'KeyC') this.cycleCam();
    if (e.code === 'KeyF') this.screenshot();
    if (e.code === 'KeyH') window.dispatchEvent(new CustomEvent('ride:toggle-help'));
    if (e.code === 'Escape' && this.started) {
      e.preventDefault();
      window.dispatchEvent(new CustomEvent('ride:change-scene'));
    }
    if (e.code === 'Digit1') this.setTimeOfDay('day');
    if (e.code === 'Digit2') this.setTimeOfDay('sunset');
    if (e.code === 'Digit3') this.setTimeOfDay('night');
  };

  private onKeyUp = (e: KeyboardEvent): void => { this.keys.delete(e.code); };
  private onBlur = (): void => {
    this.keys.clear();
    this.touch = { left: false, right: false, accel: false, brake: false };
  };

  private onResize = (): void => {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  };

  private onPointerDown = (e: PointerEvent): void => {
    rideAudio.unlock();
    this.dragging = true;
    this.lastPX = e.clientX;
    this.lastPY = e.clientY;
    this.canvas.setPointerCapture(e.pointerId);
  };

  private onPointerMove = (e: PointerEvent): void => {
    if (!this.dragging) return;
    this.orbitYaw -= (e.clientX - this.lastPX) * 0.006;
    this.orbitPitch = Math.min(0.55, Math.max(-0.25, this.orbitPitch + (e.clientY - this.lastPY) * 0.004));
    this.lastPX = e.clientX;
    this.lastPY = e.clientY;
  };

  private onPointerUp = (): void => { this.dragging = false; };

  /* ---------------- 相机 ---------------- */
  private updateCamera(dt: number, bikePos: THREE.Vector3): void {
    const pose = this.world.poseAt(this.s);
    this.fwd.set(pose.tan.x, 0, pose.tan.z).normalize();

    let targetPos: THREE.Vector3;
    let targetLook: THREE.Vector3;
    let stiff = 0.0028;

    const vcam = this.vehicle;
    if (this.camMode === 'follow') {
      if (!this.dragging) {
        this.orbitYaw *= Math.pow(0.12, dt);
        this.orbitPitch *= Math.pow(0.2, dt);
      }
      const yaw = this.orbitYaw;
      const cs = Math.cos(yaw), sn = Math.sin(yaw);
      const bx = -this.fwd.x * vcam.followBack, bz = -this.fwd.z * vcam.followBack;
      targetPos = this.tmpA.set(
        bikePos.x + (bx * cs - bz * sn),
        bikePos.y + vcam.followHeight + this.orbitPitch * 9,
        bikePos.z + (bx * sn + bz * cs)
      );
      targetLook = this.tmpB.set(
        bikePos.x + this.fwd.x * 7,
        bikePos.y + vcam.followLookY,
        bikePos.z + this.fwd.z * 7,
      );
      stiff = 0.004;

    } else if (this.camMode === 'cinema') {
      const t = performance.now() * 0.001;
      const a = t * 0.22;
      const r = vcam.cinemaR;
      targetPos = this.tmpA.set(
        bikePos.x + Math.cos(a) * r,
        bikePos.y + vcam.cinemaY + Math.sin(t * 0.4) * 0.7,
        bikePos.z + Math.sin(a) * r
      );
      targetLook = this.tmpB.set(bikePos.x, bikePos.y + vcam.followLookY * 0.85, bikePos.z);
      stiff = 0.05;

    } else { // fpv — 越过骑手头顶的第一人称（硬跟随）
      targetPos = this.tmpA.set(
        bikePos.x + this.fwd.x * vcam.fpvFwd,
        bikePos.y + vcam.fpvY,
        bikePos.z + this.fwd.z * vcam.fpvFwd,
      );
      targetLook = this.tmpB.set(
        bikePos.x + this.fwd.x * 16,
        bikePos.y + vcam.fpvLookY,
        bikePos.z + this.fwd.z * 16,
      );
      this.camPos.copy(targetPos);
      this.camLook.copy(targetLook);
      stiff = 1;
    }

    // 帧率过低导致收敛过慢时直接吸附
    if (this.camPos.distanceTo(targetPos) > 25) this.camPos.copy(targetPos);
    if (this.camLook.distanceTo(targetLook) > 40) this.camLook.copy(targetLook);

    const k = 1 - Math.pow(stiff, dt);
    this.camPos.lerp(targetPos, k);
    this.camLook.lerp(targetLook, Math.min(1, k * 1.6));

    const minY = bikePos.y + this.vehicle.camMinY;
    if (this.camPos.y < minY) this.camPos.y = minY;

    this.camera.position.copy(this.camPos);
    this.camera.lookAt(this.camLook);

    if (this.shake > 0) {
      this.shake = Math.max(0, this.shake - dt * 2.4);
      const amp = this.shake * this.shake;
      const st = this.clock.elapsedTime;
      this.camera.position.x += Math.sin(st * 41) * amp * 0.28;
      this.camera.position.y += Math.cos(st * 33) * amp * 0.16;
    }

    if (this.camMode === 'follow' && !this.dragging) {
      this.camera.rotation.z += this.bike.root.rotation.z * 0.22;
    }
  }

  /* ---------------- 主循环 ---------------- */
  private loop = (): void => {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(this.loop);

    const dt = Math.min(0.05, this.clock.getDelta());
    const t = this.clock.elapsedTime;

    // ---- 速度：可真正停稳；缓行中松开油门保留轻巡航；刹车到 0 ----
    if (this.started) {
      const up = this.keys.has('KeyW') || this.keys.has('ArrowUp') || this.touch.accel;
      const down = this.keys.has('KeyS') || this.keys.has('ArrowDown') || this.keys.has('Space') || this.touch.brake;
      let target: number;
      const veh = this.vehicle;
      if (down) {
        target = BRAKE_MIN; // 0
      } else if (up) {
        target = veh.sprint;
      } else if (this.speed > REST_EPS) {
        // 已在路上：轻巡航，不必一直踩油门
        target = veh.cruise;
      } else {
        // 停稳后不再被拉回巡航 —— 慢慢看风景
        target = 0;
        this.speed = 0;
      }
      if (!(target === 0 && this.speed === 0)) {
        const rate = target > this.speed ? veh.accel : (down ? veh.brakeRate : veh.coastRate);
        const diff = target - this.speed;
        this.speed += Math.sign(diff) * Math.min(Math.abs(diff), rate * dt);
        if (down && this.speed < REST_EPS) this.speed = 0;
      }
      if (!down && this.speed > REST_EPS) {
        const grade = this.world.gradeAt(this.s);
        this.speed += -grade * GRADE_ACCEL * dt;
        const floor = up ? veh.cruise * 0.45 : 2.05;
        this.speed = Math.max(floor, Math.min(veh.sprint * 1.16, this.speed));
      }

      if (this.keys.has('KeyA') || this.keys.has('ArrowLeft') || this.touch.left) this.latTarget = Math.max(-veh.maxLat, this.latTarget - 5.5 * dt);
      if (this.keys.has('KeyD') || this.keys.has('ArrowRight') || this.touch.right) this.latTarget = Math.min(veh.maxLat, this.latTarget + 5.5 * dt);
      this.latTarget *= Math.pow(0.55, dt);
      this.time += dt;
      if (this.hitSlow > 0) {
        this.hitSlow -= dt;
        this.speed = Math.min(this.speed, Math.max(BRAKE_MIN, 1.1));
      }
      if (this.hitIframe > 0) this.hitIframe -= dt;
      this.photoHintCd -= dt;
    }
    this.lateral += (this.latTarget - this.lateral) * (1 - Math.pow(0.002, dt));

    // ---- 前进 ----
    const move = this.speed * dt;
    this.s = (this.s + move) % this.world.length;
    this.dist += move;

    const pose = this.world.poseAt(this.s);
    const bikePos = this.bike.root.position;
    bikePos.set(
      pose.pos.x + pose.right.x * this.lateral,
      pose.pos.y + this.vehicle.groundY,
      pose.pos.z + pose.right.z * this.lateral
    );

    const steerVis = Math.max(-1, Math.min(1, (this.latTarget - this.lateral) * 0.9));
    this.bike.root.rotation.y = Math.atan2(pose.tan.x, pose.tan.z) + steerVis * -0.06;
    this.bike.root.rotation.x = -Math.asin(Math.max(-0.5, Math.min(0.5, pose.tan.y)));
    this.bike.root.rotation.z += (-steerVis * this.vehicle.lean - this.bike.root.rotation.z) * Math.min(1, 8 * dt);
    this.bike.update(dt, this.speed, steerVis, this.sky.night);

    // ---- 世界 ----
    if (this.world.update(this.s)) this.scatter.update(this.world.lastRow);
    this.world.updateSkirt(bikePos.x, bikePos.z);
    this.sky.update(dt, bikePos);
    for (const a of this.poiAnims) a.tick(dt, { night: this.sky.night }, t);

    this.birds.update(dt, bikePos);
    this.boats.update(dt, bikePos, t);
    this.balloons.update(dt, bikePos, t, this.sky.night);
    this.shops.update(bikePos);

    const ev = this.wildlife.update(dt, bikePos, pose.right, pose.tan, this.speed, this.lateral);
    if (ev && this.started) {
      if (ev.event === 'hit' && this.hitIframe <= 0) {
        this.hitIframe = 2.4;
        this.hitSlow = Math.max(1.6, ev.knock);
        this.shake = 0.48;
        rideAudio.play('warn');
        this.cb.onWarn(ev.msg);
      } else if (ev.event === 'dodge' || ev.event === 'escort-ok') {
        rideAudio.play('chime');
        this.cb.onSystem(ev.msg);
      } else if (ev.event === 'escort-hint') {
        this.cb.onSystem(ev.msg);
      }
    }

    const streak = this.rings.update(bikePos, this.lateral);
    if (streak && this.started) {
      rideAudio.play('chime');
      this.cb.onSystem(streak >= 3 ? '三连。风从圈里穿过去了。' : '穿过去了。');
    }

    this.updateCamera(dt, bikePos);

    // ---- HUD（限频 10Hz） ----
    this.hudAcc += dt;
    if (this.hudAcc >= 0.1) {
      this.hudAcc = 0;
      let nearest: Stats['poi'] = null;
      let nd = Infinity;
      for (const poi of this.world.pois) {
        const dx = bikePos.x - poi.roadPos.x, dz = bikePos.z - poi.roadPos.z;
        const d = Math.sqrt(dx * dx + dz * dz);
        if (d < nd) { nd = d; nearest = poi; }
      }
      const poi = nd < 85 ? nearest : null;
      if (poi && nd < 42 && !this.seen.has(poi.id)) {
        this.seen.add(poi.id);
        const welcome = greeterWelcomeMessage(this.world.packId, poi);
        rideAudio.play('discover');
        this.cb.onDiscover({
          poiId: poi.id,
          poiName: poi.name,
          countryName: this.countryName,
          welcome,
          stampIndex: this.seen.size,
        });
      }
      if (this.started && this.photoHintCd <= 0) {
        const hint = this.photoQuestHint(bikePos);
        if (hint) {
          this.cb.onSystem(hint);
          this.photoHintCd = 22;
        }
      }
      this.cb.onStats({
        speed: this.speed,
        dist: this.dist,
        time: this.time,
        seen: this.seen.size,
        total: this.world.pois.length,
        poi,
        poiDist: nd,
        x: bikePos.x,
        z: bikePos.z,
        yaw: Math.atan2(pose.tan.x, pose.tan.z),
        speedCap: this.vehicle.sprint,
      });
    }

    this.renderer.render(this.scene, this.camera);
  };
}
