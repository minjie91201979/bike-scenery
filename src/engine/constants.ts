import { getScene } from './scenes';
import type { PoiDef } from './types';

/** @deprecated 兼容旧引用：中国路线景点 */
export const POI_DEFS: PoiDef[] = getScene('china').poiDefs;

export const CRUISE = 6.4;    // 巡航速度 m/s（缓行中松开油门时的轻巡航）
export const SPRINT = 16.8;   // 冲刺速度 m/s
export const BRAKE_MIN = 0;   // 刹停可到 0，真正停住看风景
/** 静止判定：低于此值视为停稳，不再被轻巡航拉走 */
export const REST_EPS = 0.12;
/** HUD 速度条上限（km/h），对齐 SPRINT * 3.6 ≈ 60.5 */
export const SPEED_BAR_MAX_KMH = Math.round(SPRINT * 3.6);
export const MAX_LAT = 2.6;   // 最大横向偏移 m
