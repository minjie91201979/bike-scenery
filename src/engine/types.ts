import * as THREE from 'three';

export type TimeOfDay = 'day' | 'sunset' | 'night';
export type CamMode = 'follow' | 'cinema' | 'fpv';

export type PoiType = 'windmill' | 'lake' | 'meadow' | 'observatory' | 'lighthouse' | 'forest';

/** 景点定义（沿路线的参数位置） */
export interface PoiDef {
  type: PoiType;
  name: string;
  desc: string;
  t: number;          // 沿环线的归一化位置 0~1
  side: -1 | 1;       // 路的哪一侧
  dist: number;       // 离路中心距离（米）
  radius: number;     // 场地半径（米）
}

/** 解析成世界坐标后的景点 */
export interface Poi extends PoiDef {
  id: number;
  pos: THREE.Vector3;
  roadPos: THREE.Vector3;
  waterLevel?: number;
}

export interface Pose {
  pos: THREE.Vector3;
  tan: THREE.Vector3;
  right: THREE.Vector3;
  index: number;
  frac: number;
}

/** 传给 HUD 的实时数据 */
export interface Stats {
  speed: number;      // m/s
  dist: number;       // m
  time: number;       // s
  seen: number;
  total: number;
  poi: Poi | null;
  poiDist: number;
  x: number;          // 玩家世界坐标（小地图用）
  z: number;
  yaw: number;
}
