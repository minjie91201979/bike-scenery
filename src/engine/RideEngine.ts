import * as THREE from 'three';
import { World } from './World';
import { Sky } from './Sky';
import { Bike } from './Bike';
import { Scatter, buildPois, type Animatable } from './Props';
import { CRUISE, SPRINT, BRAKE_MIN, MAX_LAT } from './constants';
import { getScene, type CharacterId, type RideConfig } from './scenes';
import type { CamMode, Stats, TimeOfDay } from './types';

export interface EngineCallbacks {
  onStats: (s: Stats) => void;
  onCamChange: (m: CamMode) => void;
  onTimeChange: (t: TimeOfDay) => void;
  onToast: (msg: string) => void;
}

export type EngineOptions = RideConfig;

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
  private poiAnims: Animatable[] = [];
  private bike: Bike;
  private cb: EngineCallbacks;

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
    const characterId: CharacterId = options.characterId ?? 'male';

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
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
    this.poiAnims = buildPois(this.scene, this.world);

    this.bike = new Bike(characterId);
    this.bike.root.rotation.order = 'YZX';
    this.scene.add(this.bike.root);

    // 初始相机直接落在车后，避免开局从原点飞入
    const p0 = this.world.poseAt(this.s);
    this.camPos.set(p0.pos.x - p0.tan.x * 8.4, p0.pos.y + 3.3, p0.pos.z - p0.tan.z * 8.4);
    this.camLook.copy(p0.pos);

    this.world.update(this.s);
    this.scatter.update(this.world.lastRow);
    this.world.updateSkirt(p0.pos.x, p0.pos.z);

    this.bindEvents();
    this.loop();
  }

  /* ---------------- 对外 API ---------------- */
  setStarted(v: boolean): void { this.started = v; }

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
    this.canvas.toBlob((blob) => {
      if (!blob) return;
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `scenery-ride-${Date.now()}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      this.cb.onToast('照片已保存到下载目录');
    }, 'image/png');
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
    this.keys.add(e.code);
    if (e.code === 'KeyC') this.cycleCam();
    if (e.code === 'KeyF') this.screenshot();
    if (e.code === 'KeyH') window.dispatchEvent(new CustomEvent('ride:toggle-help'));
    if (e.code === 'Digit1') this.setTimeOfDay('day');
    if (e.code === 'Digit2') this.setTimeOfDay('sunset');
    if (e.code === 'Digit3') this.setTimeOfDay('night');
  };

  private onKeyUp = (e: KeyboardEvent): void => { this.keys.delete(e.code); };
  private onBlur = (): void => { this.keys.clear(); };

  private onResize = (): void => {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  };

  private onPointerDown = (e: PointerEvent): void => {
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

    if (this.camMode === 'follow') {
      if (!this.dragging) {
        this.orbitYaw *= Math.pow(0.12, dt);
        this.orbitPitch *= Math.pow(0.2, dt);
      }
      const yaw = this.orbitYaw;
      const cs = Math.cos(yaw), sn = Math.sin(yaw);
      const bx = -this.fwd.x * 8.4, bz = -this.fwd.z * 8.4;
      targetPos = this.tmpA.set(
        bikePos.x + (bx * cs - bz * sn),
        bikePos.y + 3.3 + this.orbitPitch * 9,
        bikePos.z + (bx * sn + bz * cs)
      );
      targetLook = this.tmpB.set(bikePos.x + this.fwd.x * 7, bikePos.y + 1.35, bikePos.z + this.fwd.z * 7);
      stiff = 0.004;

    } else if (this.camMode === 'cinema') {
      const t = performance.now() * 0.001;
      const a = t * 0.22;
      const r = 7.2;
      targetPos = this.tmpA.set(
        bikePos.x + Math.cos(a) * r,
        bikePos.y + 1.75 + Math.sin(t * 0.4) * 0.7,
        bikePos.z + Math.sin(a) * r
      );
      targetLook = this.tmpB.set(bikePos.x, bikePos.y + 1.15, bikePos.z);
      stiff = 0.05;

    } else { // fpv — 越过骑手头顶的第一人称（硬跟随）
      targetPos = this.tmpA.set(bikePos.x + this.fwd.x * 1.15, bikePos.y + 1.60, bikePos.z + this.fwd.z * 1.15);
      targetLook = this.tmpB.set(bikePos.x + this.fwd.x * 16, bikePos.y + 1.72, bikePos.z + this.fwd.z * 16);
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

    const minY = bikePos.y + 0.9;
    if (this.camPos.y < minY) this.camPos.y = minY;

    this.camera.position.copy(this.camPos);
    this.camera.lookAt(this.camLook);

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

    // ---- 速度 ----
    if (this.started) {
      const up = this.keys.has('KeyW') || this.keys.has('ArrowUp');
      const down = this.keys.has('KeyS') || this.keys.has('ArrowDown') || this.keys.has('Space');
      let target = CRUISE;
      if (up) target = SPRINT;
      if (down) target = Math.min(target, BRAKE_MIN);
      const rate = target > this.speed ? 3.6 : 7.5;
      const diff = target - this.speed;
      this.speed += Math.sign(diff) * Math.min(Math.abs(diff), rate * dt);

      if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) this.latTarget = Math.max(-MAX_LAT, this.latTarget - 5.5 * dt);
      if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) this.latTarget = Math.min(MAX_LAT, this.latTarget + 5.5 * dt);
      this.latTarget *= Math.pow(0.55, dt);
      this.time += dt;
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
      pose.pos.y + 0.055,
      pose.pos.z + pose.right.z * this.lateral
    );

    const steerVis = Math.max(-1, Math.min(1, (this.latTarget - this.lateral) * 0.9));
    this.bike.root.rotation.y = Math.atan2(pose.tan.x, pose.tan.z) + steerVis * -0.06;
    this.bike.root.rotation.x = -Math.asin(Math.max(-0.5, Math.min(0.5, pose.tan.y)));
    this.bike.root.rotation.z += (-steerVis * 0.17 - this.bike.root.rotation.z) * Math.min(1, 8 * dt);
    this.bike.update(dt, this.speed, steerVis, this.sky.night);

    // ---- 世界 ----
    if (this.world.update(this.s)) this.scatter.update(this.world.lastRow);
    this.world.updateSkirt(bikePos.x, bikePos.z);
    this.sky.update(dt, bikePos);
    for (const a of this.poiAnims) a.tick(dt, { night: this.sky.night }, t);

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
        this.cb.onToast(`发现新景点 · ${poi.name}`);
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
      });
    }

    this.renderer.render(this.scene, this.camera);
  };
}
