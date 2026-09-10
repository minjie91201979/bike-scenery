from pathlib import Path
p = Path(r"C:\Users\minji\Desktop\object\bike-scenery\src\engine\Props.ts")
t = p.read_text(encoding="utf-8")
old = """    // ---- 迎宾 NPC（中国固定民族 / 俄罗斯传统服饰）----
    if (world.packId === 'china' || world.packId === 'russia') {
      const outfits = world.packId === 'china'
        ? greetersForChinaPoi(poi.name, poi.id)
        : russiaOutfitsForPoi(poi.id);
      for (let gi = 0; gi < outfits.length; gi++) {
        const handle = createGreeter(outfits[gi]);
        const sideOff = (gi === 0 ? -1 : 1) * (3.4 + (gi > 1 ? 0.6 : 0));
        // g 已 lookAt 道路（Three.js -Z 朝向目标），NPC 面向道路站在地标旁
        handle.root.position.set(sideOff, 0, 2.6);
        handle.root.rotation.y = Math.PI;
        g.add(handle.root);
        animatables.push({ tick: handle.tick });
      }
    }"""
new = """    // ---- 迎宾 NPC：站在路边路肩，面向公路（不跟地标站老远）----
    if (world.packId === 'china' || world.packId === 'russia') {
      const outfits = world.packId === 'china'
        ? greetersForChinaPoi(poi.name, poi.id)
        : russiaOutfitsForPoi(poi.id);
      const toward = new THREE.Vector3().subVectors(poi.pos, poi.roadPos);
      toward.y = 0;
      if (toward.lengthSq() < 1e-6) toward.set(poi.side || 1, 0, 0);
      toward.normalize();
      const along = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), toward).normalize();
      for (let gi = 0; gi < outfits.length; gi++) {
        const handle = createGreeter(outfits[gi]);
        // 紧贴路肩：约 ROAD_HALF(3.6) + 1.2~2.0m，沿路错开
        const lat = 4.6 + gi * 0.7;
        const alongOff = (gi - (outfits.length - 1) * 0.5) * 1.4;
        const x = poi.roadPos.x + toward.x * lat + along.x * alongOff;
        const z = poi.roadPos.z + toward.z * lat + along.z * alongOff;
        const y = world.heightAt(x, z);
        handle.root.position.set(x, y, z);
        handle.root.lookAt(poi.roadPos.x, y, poi.roadPos.z);
        scene.add(handle.root);
        animatables.push({ tick: handle.tick });
      }
    }"""
assert old in t, "greeter block not found"
p.write_text(t.replace(old, new, 1), encoding="utf-8")
print("ok")
