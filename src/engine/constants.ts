import { getScene } from './scenes';
import type { PoiDef } from './types';

/** @deprecated 兼容旧引用：中国路线景点 */
export const POI_DEFS: PoiDef[] = getScene('china').poiDefs;

export const CRUISE = 6.4;    // 巡航速度 m/s
export const SPRINT = 16.8;   // 冲刺速度 m/s
export const BRAKE_MIN = 2.0; // 最低速度 m/s
export const MAX_LAT = 2.6;   // 最大横向偏移 m
