from pathlib import Path
p = Path(r"C:\Users\musou\Desktop\object\bike-scenery\src\engine\World.ts")
t = p.read_text(encoding="utf-8")

old_fields = """  private dash!: THREE.Mesh;
  private dashPos!: Float32Array;
  private dashUV!: Float32Array;
  private edges: { mesh: THREE.Mesh; pos: Float32Array; side: number }[] = [];"""

new_fields = """  private dashMarks!: THREE.InstancedMesh;
  private dashDummy = new THREE.Object3D();
  private edges: { mesh: THREE.Mesh; pos: Float32Array; side: number }[] = [];"""

assert old_fields in t, "fields missing"
t = t.replace(old_fields, new_fields, 1)

# Replace dash construction block inside buildRoad
old_dash_build = """    // 中心白色虚线（骑行时清晰可见）
    const gd = new THREE.BufferGeometry();
    this.dashPos = new Float32Array(segs * 2 * 3);
    this.dashUV = new Float32Array(segs * 2 * 2);
    gd.setAttribute('position', new THREE.BufferAttribute(this.dashPos, 3));
    gd.setAttribute('uv', new THREE.BufferAttribute(this.dashUV, 2));
    gd.setIndex(idx.slice());
    // 实心白带：虚线间隔在 update 里用几何显隐，不依赖透明贴图
    this.dash = new THREE.Mesh(gd, new THREE.MeshBasicMaterial({
      color: 0xffffff,
      depthWrite: false,
      depthTest: false,
      toneMapped: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    }));
    this.dash.frustumCulled = false;
    this.dash.renderOrder = 1;
    this.scene.add(this.dash);"""

new_dash_build = """    // 中心白虚线：实例化色块（沿切线摆放），避免条带网格被盖住
    const dashGeo = new THREE.BoxGeometry(0.7, 0.08, 3.4);
    const dashMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      toneMapped: false,
      depthTest: false,
      depthWrite: false,
    });
    this.dashMarks = new THREE.InstancedMesh(dashGeo, dashMat, segs);
    this.dashMarks.frustumCulled = false;
    this.dashMarks.renderOrder = 5;
    this.dashMarks.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.scene.add(this.dashMarks);
    // 初始全部隐藏
    this.dashDummy.scale.set(0, 0, 0);
    this.dashDummy.updateMatrix();
    for (let i = 0; i < segs; i++) this.dashMarks.setMatrixAt(i, this.dashDummy.matrix);
    this.dashMarks.instanceMatrix.needsUpdate = true;"""

assert old_dash_build in t, "dash build missing"
t = t.replace(old_dash_build, new_dash_build, 1)

old_update = """    const rp = this.roadPos, ru = this.roadUV;
    const dp = this.dashPos, du = this.dashUV;
    const DASH_HALF = 0.38;
    let ri = 0, ui = 0, di = 0, d2 = 0;
    for (let r = 0; r < ROWS; r++) {
      const k = baseRow + r;
      const n = this.sampleCount;
      const idx = ((k % n) + n) % n;
      const p = this.samples[idx];
      const rt = this.rights[idx];
      // 略抬高路面，减少与地形 z-fight
      const y = p.y + 0.11;
      // 路面 UV：横向铺满，纵向按弧长重复沥青颗粒
      const roadV = k * this.segLen * 0.35;
      // 虚线：约 4m 实线 + 4m 空隙，空隙段宽度收成 0
      const dashOn = (Math.floor((Math.abs(k) * this.segLen) / 4) % 2) === 0;
      const half = dashOn ? DASH_HALF : 0;

      rp[ri++] = p.x - rt.x * ROAD_HALF; rp[ri++] = y; rp[ri++] = p.z - rt.z * ROAD_HALF;
      rp[ri++] = p.x + rt.x * ROAD_HALF; rp[ri++] = y; rp[ri++] = p.z + rt.z * ROAD_HALF;
      ru[ui++] = 0; ru[ui++] = roadV;
      ru[ui++] = 1; ru[ui++] = roadV;

      dp[di++] = p.x - rt.x * half; dp[di++] = y + 0.04; dp[di++] = p.z - rt.z * half;
      dp[di++] = p.x + rt.x * half; dp[di++] = y + 0.04; dp[di++] = p.z + rt.z * half;
      du[d2++] = 0; du[d2++] = 0;
      du[d2++] = 1; du[d2++] = 0;

      for (const e of this.edges) {
        const off = e.side * (ROAD_HALF - 0.32);
        const o = r * 6;
        e.pos[o] = p.x + rt.x * off - rt.x * 0.09; e.pos[o + 1] = y + 0.018; e.pos[o + 2] = p.z + rt.z * off - rt.z * 0.09;
        e.pos[o + 3] = p.x + rt.x * off + rt.x * 0.09; e.pos[o + 4] = y + 0.018; e.pos[o + 5] = p.z + rt.z * off + rt.z * 0.09;
      }
    }
    const rg = this.road.geometry;
    rg.attributes.position.needsUpdate = true;
    rg.attributes.uv.needsUpdate = true;
    rg.computeVertexNormals();
    rg.computeBoundingSphere();

    const dg = this.dash.geometry;
    dg.attributes.position.needsUpdate = true;
    dg.attributes.uv.needsUpdate = true;
    dg.computeBoundingSphere();

    for (const e of this.edges) {
      e.mesh.geometry.attributes.position.needsUpdate = true;
      e.mesh.geometry.computeBoundingSphere();
    }"""

new_update = """    const rp = this.roadPos, ru = this.roadUV;
    let ri = 0, ui = 0;
    for (let r = 0; r < ROWS; r++) {
      const k = baseRow + r;
      const n = this.sampleCount;
      const idx = ((k % n) + n) % n;
      const p = this.samples[idx];
      const rt = this.rights[idx];
      const tn = this.tangents[idx];
      // 略抬高路面，减少与地形 z-fight
      const y = p.y + 0.11;
      // 路面 UV：横向铺满，纵向按弧长重复沥青颗粒
      const roadV = k * this.segLen * 0.35;
      // 白虚线色块：约 4m 实 / 4m 空
      const dashOn = (Math.floor((Math.abs(k) * this.segLen) / 4) % 2) === 0;

      rp[ri++] = p.x - rt.x * ROAD_HALF; rp[ri++] = y; rp[ri++] = p.z - rt.z * ROAD_HALF;
      rp[ri++] = p.x + rt.x * ROAD_HALF; rp[ri++] = y; rp[ri++] = p.z + rt.z * ROAD_HALF;
      ru[ui++] = 0; ru[ui++] = roadV;
      ru[ui++] = 1; ru[ui++] = roadV;

      if (dashOn) {
        this.dashDummy.position.set(p.x, y + 0.06, p.z);
        this.dashDummy.scale.set(1, 1, 1);
        this.dashDummy.lookAt(p.x + tn.x, y + 0.06, p.z + tn.z);
        this.dashDummy.updateMatrix();
        this.dashMarks.setMatrixAt(r, this.dashDummy.matrix);
      } else {
        this.dashDummy.position.set(0, -100, 0);
        this.dashDummy.scale.set(0, 0, 0);
        this.dashDummy.updateMatrix();
        this.dashMarks.setMatrixAt(r, this.dashDummy.matrix);
      }

      for (const e of this.edges) {
        const off = e.side * (ROAD_HALF - 0.32);
        const o = r * 6;
        e.pos[o] = p.x + rt.x * off - rt.x * 0.09; e.pos[o + 1] = y + 0.03; e.pos[o + 2] = p.z + rt.z * off - rt.z * 0.09;
        e.pos[o + 3] = p.x + rt.x * off + rt.x * 0.09; e.pos[o + 4] = y + 0.03; e.pos[o + 5] = p.z + rt.z * off + rt.z * 0.09;
      }
    }
    const rg = this.road.geometry;
    rg.attributes.position.needsUpdate = true;
    rg.attributes.uv.needsUpdate = true;
    rg.computeVertexNormals();
    rg.computeBoundingSphere();

    this.dashMarks.instanceMatrix.needsUpdate = true;
    this.dashMarks.computeBoundingSphere();

    for (const e of this.edges) {
      e.mesh.geometry.attributes.position.needsUpdate = true;
      e.mesh.geometry.computeBoundingSphere();
    }"""

assert old_update in t, "update block missing"
t = t.replace(old_update, new_update, 1)

# remove unused makeDashTexture if still present - optional keep for no break
p.write_text(t, encoding="utf-8")
print("patched instanced dashes")
