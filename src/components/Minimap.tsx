import { useEffect, useRef } from 'react';
import type { World } from '../engine/World';
import type { Stats } from '../engine/types';

const SIZE = 264;
const MM_RANGE = 680;
const SCALE = (SIZE / 2) / MM_RANGE;

interface Props {
  world: World | null;
  stats: Stats;
}

/** 小地图：底图（环线 + 景点）只画一次，玩家位置每帧数据更新时重绘 */
export function Minimap({ world, stats }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const baseRef = useRef<HTMLCanvasElement | null>(null);

  // 底图：环线 + 景点
  useEffect(() => {
    if (!world) return;
    const base = document.createElement('canvas');
    base.width = base.height = SIZE;
    const c = base.getContext('2d')!;
    c.clearRect(0, 0, SIZE, SIZE);
    c.save();
    c.translate(SIZE / 2, SIZE / 2);
    c.strokeStyle = 'rgba(240, 246, 255, 0.85)';
    c.lineWidth = 3.4;
    c.lineJoin = 'round';
    c.beginPath();
    world.samples.forEach((p, i) => {
      const x = p.x * SCALE, y = p.z * SCALE;
      if (i === 0) c.moveTo(x, y); else c.lineTo(x, y);
    });
    c.closePath();
    c.stroke();
    c.strokeStyle = 'rgba(126, 240, 208, 0.35)';
    c.lineWidth = 1.2;
    c.stroke();
    for (const poi of world.pois) {
      c.fillStyle = '#7ef0d0';
      c.beginPath();
      c.arc(poi.pos.x * SCALE, poi.pos.z * SCALE, 3.4, 0, Math.PI * 2);
      c.fill();
    }
    c.restore();
    baseRef.current = base;
  }, [world]);

  // 玩家位置
  useEffect(() => {
    const canvas = canvasRef.current;
    const base = baseRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, SIZE, SIZE);
    if (base) ctx.drawImage(base, 0, 0);

    const x = SIZE / 2 + stats.x * SCALE;
    const y = SIZE / 2 + stats.z * SCALE;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-stats.yaw);
    ctx.fillStyle = '#4ea8ff';
    ctx.beginPath();
    ctx.moveTo(0, -6.5);
    ctx.lineTo(4.4, 4.6);
    ctx.lineTo(0, 2.4);
    ctx.lineTo(-4.4, 4.6);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }, [stats.x, stats.z, stats.yaw, world]);

  return (
    <div className="panel" id="minimap-wrap">
      <canvas ref={canvasRef} width={SIZE} height={SIZE} id="minimap" />
      <div className="mm-label">路线全景</div>
    </div>
  );
}
