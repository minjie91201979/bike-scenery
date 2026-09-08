import type { PoiDef } from './types';

export const POI_DEFS: PoiDef[] = [
  { type: 'windmill',    name: '老磨坊',   desc: '山坡上的白色风车，木叶片吱呀吱呀转了几十年。', t: 0.055, side: -1, dist: 30, radius: 7 },
  { type: 'lake',        name: '镜湖',     desc: '湖面把天空原样复印了一份，适合停下来发会儿呆。', t: 0.24,  side: 1,  dist: 36, radius: 34 },
  { type: 'meadow',      name: '蜜糖花田', desc: '风一吹，整片山坡都在轻轻晃。', t: 0.42,  side: -1, dist: 22, radius: 26 },
  { type: 'observatory', name: '观星台',   desc: '夜里躺在木平台上，银河就挂在头顶。', t: 0.60,  side: 1,  dist: 24, radius: 7 },
  { type: 'lighthouse',  name: '灯塔岬',   desc: '小湖角的白色灯塔，天黑后为晚归的船亮一盏灯。', t: 0.78,  side: -1, dist: 30, radius: 9 },
  { type: 'forest',      name: '松风林',   desc: '穿过松林时，风声都变成了沙沙声。', t: 0.90,  side: 1,  dist: 16, radius: 14 },
];

export const CRUISE = 6.4;    // 巡航速度 m/s
export const SPRINT = 16.8;   // 冲刺速度 m/s
export const BRAKE_MIN = 2.0; // 最低速度 m/s
export const MAX_LAT = 2.6;   // 最大横向偏移 m
