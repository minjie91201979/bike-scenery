import * as THREE from 'three';
import type { TimeOfDay } from './types';

/* ============================================================
 *  天空球 / 远山 / 云 / 星星 / 太阳月亮 / 光照与雾
 *  三种时段之间平滑过渡
 * ============================================================ */

interface TimeConfig {
  skyTint: number;
  cloudTint: number;
  mountainTint: number;
  sunColor: number;
  sunIntensity: number;
  hemiSky: number;
  hemiGround: number;
  hemiIntensity: number;
  fog: number;
  fogNear: number;
  fogFar: number;
  sunDir: [number, number, number];
  discColor: number;
  discScale: number;
  starAlpha: number;
}

const CONFIGS: Record<TimeOfDay, TimeConfig> = {
  day: {
    skyTint: 0xffffff, cloudTint: 0xffffff, mountainTint: 0xffffff,
    sunColor: 0xfff2d8, sunIntensity: 2.4,
    hemiSky: 0xbfd9ff, hemiGround: 0x9aa877, hemiIntensity: 1.05,
    fog: 0xd6ecf8, fogNear: 70, fogFar: 330,
    sunDir: [0.45, 0.72, 0.32], discColor: 0xfff3c8, discScale: 1, starAlpha: 0,
  },
  sunset: {
    skyTint: 0xffc9a0, cloudTint: 0xffc4a0, mountainTint: 0xffd2b0,
    sunColor: 0xffa564, sunIntensity: 1.7,
    hemiSky: 0xffc9a8, hemiGround: 0x6a5a62, hemiIntensity: 0.85,
    fog: 0xe8b394, fogNear: 60, fogFar: 300,
    sunDir: [-0.85, 0.16, 0.42], discColor: 0xffb060, discScale: 1.5, starAlpha: 0.12,
  },
  night: {
    skyTint: 0x3a4a7a, cloudTint: 0x44557e, mountainTint: 0x7286b4,
    sunColor: 0x9ab4e8, sunIntensity: 0.55,
    hemiSky: 0x2c3c68, hemiGround: 0x232c3a, hemiIntensity: 0.5,
    fog: 0x1c2740, fogNear: 55, fogFar: 270,
    sunDir: [0.25, 0.62, -0.45], discColor: 0xe8eefc, discScale: 0.55, starAlpha: 1,
  },
};

interface Snapshot {
  skyTint: THREE.Color;
  cloudTint: THREE.Color;
  mountainTint: THREE.Color;
  sunColor: THREE.Color;
  sunIntensity: number;
  hemiSky: THREE.Color;
  hemiGround: THREE.Color;
  hemiIntensity: number;
  fog: THREE.Color;
  fogNear: number;
  fogFar: number;
  sunDir: THREE.Vector3;
  discColor: THREE.Color;
  discScale: number;
  starAlpha: number;
}

export class Sky {
  state: TimeOfDay = 'day';
  private scene: THREE.Scene;
  private cur: Snapshot;
  private skyMat!: THREE.MeshBasicMaterial;
  private sky!: THREE.Mesh;
  private mountainMat!: THREE.MeshBasicMaterial;
  private mountains!: THREE.Mesh;
  private cloudMat!: THREE.MeshBasicMaterial;
  private clouds: THREE.Group[] = [];
  private starMat!: THREE.PointsMaterial;
  private stars!: THREE.Points;
  private discMat!: THREE.MeshBasicMaterial;
  private disc!: THREE.Mesh;
  private hemi!: THREE.HemisphereLight;
  private sun!: THREE.DirectionalLight;

  constructor(scene: THREE.Scene, loader: THREE.TextureLoader) {
    this.scene = scene;
    this.cur = this.snapshot(CONFIGS.day);
    this.buildSky(loader);
    this.buildMountains(loader);
    this.buildClouds();
    this.buildStars();
    this.buildDisc();
    this.buildLights();
    scene.fog = new THREE.Fog(this.cur.fog.getHex(), this.cur.fogNear, this.cur.fogFar);
  }

  private snapshot(c: TimeConfig): Snapshot {
    return {
      skyTint: new THREE.Color(c.skyTint),
      cloudTint: new THREE.Color(c.cloudTint),
      mountainTint: new THREE.Color(c.mountainTint),
      sunColor: new THREE.Color(c.sunColor),
      sunIntensity: c.sunIntensity,
      hemiSky: new THREE.Color(c.hemiSky),
      hemiGround: new THREE.Color(c.hemiGround),
      hemiIntensity: c.hemiIntensity,
      fog: new THREE.Color(c.fog),
      fogNear: c.fogNear,
      fogFar: c.fogFar,
      sunDir: new THREE.Vector3(...c.sunDir).normalize(),
      discColor: new THREE.Color(c.discColor),
      discScale: c.discScale,
      starAlpha: c.starAlpha,
    };
  }

  setTimeOfDay(name: TimeOfDay): void {
    this.state = name;
  }

  /** 夜晚程度 0~1（供车灯等使用） */
  get night(): number {
    return this.cur.starAlpha;
  }

  private buildSky(loader: THREE.TextureLoader): void {
    const tex = loader.load('/assets/sky_panorama.png', (t) => {
      t.colorSpace = THREE.SRGBColorSpace;
      t.wrapS = THREE.RepeatWrapping;
    });
    this.skyMat = new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide, fog: false, depthWrite: false });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(1400, 32, 20), this.skyMat);
    this.sky.renderOrder = -10;
    this.scene.add(this.sky);
  }

  private buildMountains(loader: THREE.TextureLoader): void {
    const tex = loader.load('/assets/mountains.png', (t) => {
      t.colorSpace = THREE.SRGBColorSpace;
      t.wrapS = THREE.MirroredRepeatWrapping;
      t.repeat.set(2, 1);
    });
    this.mountainMat = new THREE.MeshBasicMaterial({
      map: tex, transparent: true, fog: false, side: THREE.DoubleSide, depthWrite: false
    });
    this.mountains = new THREE.Mesh(new THREE.CylinderGeometry(640, 640, 250, 64, 1, true), this.mountainMat);
    this.mountains.renderOrder = -9;
    this.mountains.frustumCulled = false;
    this.scene.add(this.mountains);
  }

  private buildClouds(): void {
    this.cloudMat = new THREE.MeshBasicMaterial({
      color: 0xffffff, fog: false, transparent: true, opacity: 0.92
    });
    for (let i = 0; i < 11; i++) {
      const c = new THREE.Group();
      const n = 3 + Math.floor(Math.random() * 3);
      for (let j = 0; j < n; j++) {
        const s = 7 + Math.random() * 13;
        const m = new THREE.Mesh(new THREE.IcosahedronGeometry(s, 0), this.cloudMat);
        m.position.set((Math.random() - 0.5) * 34, (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 14);
        m.scale.y = 0.45 + Math.random() * 0.2;
        c.add(m);
      }
      c.position.set((Math.random() - 0.5) * 900, 110 + Math.random() * 90, (Math.random() - 0.5) * 900);
      c.userData.speed = 1.4 + Math.random() * 2.2;
      this.scene.add(c);
      this.clouds.push(c);
    }
  }

  private buildStars(): void {
    const N = 900;
    const pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      let x: number, y: number, z: number, l: number;
      do {
        x = Math.random() * 2 - 1;
        y = Math.random();
        z = Math.random() * 2 - 1;
        l = Math.sqrt(x * x + y * y + z * z);
      } while (l < 0.2 || y / l < 0.06);
      pos[i * 3] = (x / l) * 1200;
      pos[i * 3 + 1] = (y / l) * 1200;
      pos[i * 3 + 2] = (z / l) * 1200;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.starMat = new THREE.PointsMaterial({
      color: 0xdfe8ff, size: 2.6, sizeAttenuation: false,
      transparent: true, opacity: 0, fog: false, depthWrite: false
    });
    this.stars = new THREE.Points(g, this.starMat);
    this.stars.renderOrder = -8;
    this.stars.frustumCulled = false;
    this.scene.add(this.stars);
  }

  private buildDisc(): void {
    this.discMat = new THREE.MeshBasicMaterial({
      color: 0xfff3c8, fog: false, transparent: true, opacity: 0.95, depthWrite: false
    });
    this.disc = new THREE.Mesh(new THREE.CircleGeometry(55, 28), this.discMat);
    this.disc.renderOrder = -7;
    this.scene.add(this.disc);
  }

  private buildLights(): void {
    this.hemi = new THREE.HemisphereLight(0xbfd9ff, 0x9aa877, 1.05);
    this.scene.add(this.hemi);

    this.sun = new THREE.DirectionalLight(0xfff2d8, 2.4);
    this.sun.castShadow = true;
    const s = this.sun.shadow.camera;
    s.left = -70; s.right = 70; s.top = 70; s.bottom = -70;
    s.near = 10; s.far = 320;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.bias = -0.0004;
    this.scene.add(this.sun, this.sun.target);
  }

  /** 每帧：向目标时段插值 */
  update(dt: number, playerPos: THREE.Vector3): void {
    const target = this.snapshot(CONFIGS[this.state]);
    const k = 1 - Math.pow(0.14, dt);
    const c = this.cur;

    c.skyTint.lerp(target.skyTint, k);
    c.cloudTint.lerp(target.cloudTint, k);
    c.mountainTint.lerp(target.mountainTint, k);
    c.sunColor.lerp(target.sunColor, k);
    c.hemiSky.lerp(target.hemiSky, k);
    c.hemiGround.lerp(target.hemiGround, k);
    c.fog.lerp(target.fog, k);
    c.discColor.lerp(target.discColor, k);
    c.sunDir.lerp(target.sunDir, k).normalize();
    c.sunIntensity += (target.sunIntensity - c.sunIntensity) * k;
    c.hemiIntensity += (target.hemiIntensity - c.hemiIntensity) * k;
    c.fogNear += (target.fogNear - c.fogNear) * k;
    c.fogFar += (target.fogFar - c.fogFar) * k;
    c.discScale += (target.discScale - c.discScale) * k;
    c.starAlpha += (target.starAlpha - c.starAlpha) * k;

    this.skyMat.color.copy(c.skyTint);
    this.cloudMat.color.copy(c.cloudTint);
    this.mountainMat.color.copy(c.mountainTint);
    this.discMat.color.copy(c.discColor);
    this.starMat.opacity = c.starAlpha;

    this.hemi.color.copy(c.hemiSky);
    this.hemi.groundColor.copy(c.hemiGround);
    this.hemi.intensity = c.hemiIntensity;
    this.sun.color.copy(c.sunColor);
    this.sun.intensity = c.sunIntensity;

    const fog = this.scene.fog as THREE.Fog;
    fog.color.copy(c.fog);
    fog.near = c.fogNear;
    fog.far = c.fogFar;

    this.sun.position.copy(playerPos).addScaledVector(c.sunDir, 190);
    this.sun.target.position.copy(playerPos);

    this.disc.position.copy(playerPos).addScaledVector(c.sunDir, 1250);
    this.disc.scale.setScalar(c.discScale);
    this.disc.lookAt(playerPos);

    this.sky.position.copy(playerPos);
    this.stars.position.copy(playerPos);
    this.mountains.position.set(playerPos.x, -28, playerPos.z);

    for (const cl of this.clouds) {
      cl.position.x += (cl.userData.speed as number) * dt;
      if (cl.position.x - playerPos.x > 520) cl.position.x -= 1040;
      if (playerPos.x - cl.position.x > 520) cl.position.x += 1040;
      if (cl.position.z - playerPos.z > 520) cl.position.z -= 1040;
      if (playerPos.z - cl.position.z > 520) cl.position.z += 1040;
    }
  }
}
