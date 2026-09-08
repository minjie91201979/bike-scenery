import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLOBE_HOTSPOTS, type CountryId } from '../engine/scenes';

interface Props {
  onSelect: (countryId: CountryId) => void;
  onLocked: (name: string) => void;
}

function latLonToVec3(lat: number, lon: number, radius: number): THREE.Vector3 {
  const phi = THREE.MathUtils.degToRad(90 - lat);
  const theta = THREE.MathUtils.degToRad(lon + 180);
  return new THREE.Vector3().setFromSphericalCoords(radius, phi, theta);
}

function makeLabelTexture(text: string, open: boolean): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, 256, 64);
  ctx.fillStyle = open ? 'rgba(14, 40, 60, 0.82)' : 'rgba(20, 24, 36, 0.78)';
  ctx.strokeStyle = open ? 'rgba(126, 240, 208, 0.85)' : 'rgba(255, 255, 255, 0.28)';
  ctx.lineWidth = 2;
  roundRect(ctx, 8, 10, 240, 44, 12);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = open ? '#7ef0d0' : '#e2eafa';
  ctx.font = 'bold 22px "Microsoft YaHei UI", "PingFang SC", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 128, 32);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function GlobeSelect({ onSelect, onLocked }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const cbRef = useRef({ onSelect, onLocked });
  cbRef.current = { onSelect, onLocked };

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const width = mount.clientWidth || window.innerWidth;
    const height = mount.clientHeight || window.innerHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050b16);

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
    camera.position.set(0, 0.35, 3.35);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);

    const earthGroup = new THREE.Group();
    scene.add(earthGroup);

    const R = 1.0;
    const earthGeo = new THREE.SphereGeometry(R, 64, 48);
    const earthMat = new THREE.MeshStandardMaterial({
      color: 0x1a6bb5,
      roughness: 0.72,
      metalness: 0.08,
      emissive: 0x0a2540,
      emissiveIntensity: 0.25,
    });
    const earth = new THREE.Mesh(earthGeo, earthMat);
    earthGroup.add(earth);

    // 简易大陆色带（程序纹理，避免外部贴图依赖）
    const landCanvas = document.createElement('canvas');
    landCanvas.width = 1024;
    landCanvas.height = 512;
    const lctx = landCanvas.getContext('2d')!;
    const grad = lctx.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0, '#d8e8f8');
    grad.addColorStop(0.18, '#2f8fd4');
    grad.addColorStop(0.5, '#1a6bb5');
    grad.addColorStop(0.82, '#2f8fd4');
    grad.addColorStop(1, '#e8f2fa');
    lctx.fillStyle = grad;
    lctx.fillRect(0, 0, 1024, 512);
    // 粗略大陆斑块
    const blobs: [number, number, number, number, string][] = [
      [620, 200, 160, 90, '#3d9a55'],   // 欧亚
      [720, 240, 120, 70, '#4aaa5e'],   // 中国一带
      [780, 160, 200, 80, '#3a8f6a'],   // 俄罗斯
      [220, 200, 140, 80, '#3d9a55'],   // 北美
      [280, 320, 70, 110, '#4aaa5e'],   // 南美
      [540, 280, 70, 90, '#3d9a55'],    // 非洲
      [820, 380, 90, 50, '#5ab86a'],    // 澳洲
    ];
    for (const [x, y, w, h, c] of blobs) {
      lctx.fillStyle = c;
      lctx.beginPath();
      lctx.ellipse(x, y, w, h, 0, 0, Math.PI * 2);
      lctx.fill();
    }
    const landTex = new THREE.CanvasTexture(landCanvas);
    landTex.colorSpace = THREE.SRGBColorSpace;
    earthMat.map = landTex;
    earthMat.needsUpdate = true;

    // 大气层
    const atm = new THREE.Mesh(
      new THREE.SphereGeometry(R * 1.045, 48, 32),
      new THREE.MeshBasicMaterial({
        color: 0x6ec8ff,
        transparent: true,
        opacity: 0.14,
        side: THREE.BackSide,
      }),
    );
    earthGroup.add(atm);

    const starsGeo = new THREE.BufferGeometry();
    const starCount = 600;
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const r = 12 + Math.random() * 18;
      const th = Math.random() * Math.PI * 2;
      const ph = Math.acos(2 * Math.random() - 1);
      starPos[i * 3] = r * Math.sin(ph) * Math.cos(th);
      starPos[i * 3 + 1] = r * Math.cos(ph);
      starPos[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th);
    }
    starsGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    scene.add(new THREE.Points(
      starsGeo,
      new THREE.PointsMaterial({ color: 0xaaccff, size: 0.035, sizeAttenuation: true }),
    ));

    scene.add(new THREE.AmbientLight(0x88aacc, 0.55));
    const sun = new THREE.DirectionalLight(0xfff2dd, 1.35);
    sun.position.set(4, 2.2, 3);
    scene.add(sun);

    type HotspotMeta = {
      mesh: THREE.Object3D;
      open: boolean;
      name: string;
      countryId?: CountryId;
    };
    const hotspots: HotspotMeta[] = [];
    const pickables: THREE.Object3D[] = [];

    for (const h of GLOBE_HOTSPOTS) {
      const group = new THREE.Group();
      const pos = latLonToVec3(h.lat, h.lon, R * 1.02);
      group.position.copy(pos);
      group.lookAt(0, 0, 0);
      group.rotateX(Math.PI);

      const pinColor = h.open ? 0x7ef0d0 : 0xf0c070;
      const pin = new THREE.Mesh(
        new THREE.SphereGeometry(h.open ? 0.038 : 0.028, 16, 12),
        new THREE.MeshStandardMaterial({
          color: pinColor,
          emissive: pinColor,
          emissiveIntensity: h.open ? 0.55 : 0.25,
          roughness: 0.35,
        }),
      );
      pin.userData.hotspot = true;
      group.add(pin);

      const stem = new THREE.Mesh(
        new THREE.CylinderGeometry(0.006, 0.006, 0.08, 8),
        new THREE.MeshBasicMaterial({ color: pinColor }),
      );
      stem.position.z = -0.04;
      stem.rotation.x = Math.PI / 2;
      group.add(stem);

      const label = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: makeLabelTexture(h.name, h.open),
          transparent: true,
          depthTest: false,
        }),
      );
      label.scale.set(0.42, 0.105, 1);
      label.position.set(0, 0.09, 0.02);
      label.userData.hotspot = true;
      group.add(label);

      earthGroup.add(group);
      const meta: HotspotMeta = {
        mesh: group,
        open: h.open,
        name: h.name,
        countryId: h.countryId,
      };
      pin.userData.meta = meta;
      label.userData.meta = meta;
      stem.userData.meta = meta;
      hotspots.push(meta);
      pickables.push(pin, label);
    }

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let dragging = false;
    let moved = false;
    let lastX = 0;
    let lastY = 0;
    let rotY = 0.85; // 初始朝向大致亚洲
    let rotX = 0.18;
    let autoSpin = true;
    let raf = 0;
    let disposed = false;

    const onPointerDown = (e: PointerEvent) => {
      dragging = true;
      moved = false;
      autoSpin = false;
      lastX = e.clientX;
      lastY = e.clientY;
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!dragging) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      if (Math.abs(dx) + Math.abs(dy) > 3) moved = true;
      rotY += dx * 0.005;
      rotX += dy * 0.004;
      rotX = Math.max(-0.9, Math.min(0.9, rotX));
      lastX = e.clientX;
      lastY = e.clientY;
    };

    const onPointerUp = (e: PointerEvent) => {
      if (!dragging) return;
      dragging = false;
      if (moved) {
        // 拖动后稍后恢复慢转
        window.setTimeout(() => { if (!disposed) autoSpin = true; }, 2200);
        return;
      }
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(pickables, false);
      if (hits.length > 0) {
        const meta = hits[0].object.userData.meta as HotspotMeta | undefined;
        if (meta) {
          if (meta.open && meta.countryId) {
            cbRef.current.onSelect(meta.countryId);
          } else {
            cbRef.current.onLocked(meta.name);
          }
        }
      }
      window.setTimeout(() => { if (!disposed) autoSpin = true; }, 1800);
    };

    const onResize = () => {
      const w = mount.clientWidth || window.innerWidth;
      const h = mount.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('resize', onResize);

    const clock = new THREE.Clock();
    const tick = () => {
      if (disposed) return;
      raf = requestAnimationFrame(tick);
      const dt = Math.min(clock.getDelta(), 0.05);
      if (autoSpin && !dragging) rotY += dt * 0.12;
      earthGroup.rotation.y = rotY;
      earthGroup.rotation.x = rotX;
      // 标签始终朝向相机（sprite 自带），针脚组已沿法线
      renderer.render(scene, camera);
    };
    tick();

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      earthGeo.dispose();
      earthMat.dispose();
      landTex.dispose();
      starsGeo.dispose();
      for (const h of hotspots) {
        h.mesh.traverse((obj) => {
          if (obj instanceof THREE.Mesh || obj instanceof THREE.Sprite) {
            const mat = obj.material as THREE.Material & { map?: THREE.Texture };
            mat.map?.dispose();
            mat.dispose();
            if (obj instanceof THREE.Mesh) obj.geometry.dispose();
          }
        });
      }
      if (renderer.domElement.parentElement === mount) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div id="globe-stage">
      <div id="globe-chrome">
        <div className="tag">Scenery Ride · Globe</div>
        <h1>选择国家</h1>
        <p className="sub">点击地球上的国家，开启一段风景骑行。拖动可旋转地球。</p>
        <p className="globe-hint">点击地球上的国家 · 青绿标记已开放</p>
      </div>
      <div id="globe-canvas" ref={mountRef} />
    </div>
  );
}
