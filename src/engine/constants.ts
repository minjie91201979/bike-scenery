import { getScene, type CharacterId } from './scenes';
import type { PoiDef } from './types';

/** @deprecated 兼容旧引用：中国路线景点 */
export const POI_DEFS: PoiDef[] = getScene('china').poiDefs;

export const CRUISE = 6.4;    // 自行车巡航 m/s（缓行中松开油门时的轻巡航）
export const SPRINT = 16.8;   // 自行车冲刺 m/s
export const BRAKE_MIN = 0;   // 刹停可到 0，真正停住看风景
/** 静止判定：低于此值视为停稳，不再被轻巡航拉走 */
export const REST_EPS = 0.12;
/** HUD 速度条上限（km/h），对齐自行车 SPRINT * 3.6 ≈ 60.5；座驾以 Stats.speedCap 为准 */
export const SPEED_BAR_MAX_KMH = Math.round(SPRINT * 3.6);
export const MAX_LAT = 2.6;   // 自行车最大横向偏移 m
/** 坡度重力感：乘 tan.y 得到纵向加减速度，让上坡吃力、下坡溜出去 */
export const GRADE_ACCEL = 8.4;

/** 座驾手感与相机（数值外置，避免写进主循环） */
export interface VehicleProfile {
  cruise: number;
  sprint: number;
  accel: number;
  brakeRate: number;
  coastRate: number;
  maxLat: number;
  groundY: number;
  lean: number;
  followBack: number;
  followHeight: number;
  followLookY: number;
  cinemaR: number;
  cinemaY: number;
  fpvFwd: number;
  fpvY: number;
  fpvLookY: number;
  camMinY: number;
}

const BIKE_PROFILE: VehicleProfile = {
  cruise: CRUISE,
  sprint: SPRINT,
  accel: 3.6,
  brakeRate: 9.5,
  coastRate: 7.5,
  maxLat: MAX_LAT,
  groundY: 0.055,
  lean: 0.17,
  followBack: 8.4,
  followHeight: 3.3,
  followLookY: 1.35,
  cinemaR: 7.2,
  cinemaY: 1.75,
  fpvFwd: 1.15,
  fpvY: 1.60,
  fpvLookY: 1.72,
  camMinY: 0.9,
};

export const VEHICLE_PROFILES: Record<CharacterId, VehicleProfile> = {
  male: BIKE_PROFILE,
  female: BIKE_PROFILE,
  moto: {
    cruise: 8.0,
    sprint: 22.0,
    accel: 5.2,
    brakeRate: 11.0,
    coastRate: 6.4,
    maxLat: 2.5,
    groundY: 0.05,
    lean: 0.32,
    followBack: 7.8,
    followHeight: 2.95,
    followLookY: 1.22,
    cinemaR: 6.6,
    cinemaY: 1.55,
    fpvFwd: 1.05,
    fpvY: 1.42,
    fpvLookY: 1.48,
    camMinY: 0.85,
  },
  rv: {
    cruise: 5.0,
    sprint: 11.2,
    accel: 2.2,
    brakeRate: 7.2,
    coastRate: 5.5,
    maxLat: 2.05,
    groundY: 0.04,
    lean: 0.045,
    followBack: 12.4,
    followHeight: 5.1,
    followLookY: 1.85,
    cinemaR: 9.4,
    cinemaY: 2.55,
    fpvFwd: 1.35,
    fpvY: 1.92,
    fpvLookY: 1.88,
    camMinY: 1.35,
  },
  sport: {
    cruise: 9.2,
    sprint: 28.0,
    accel: 6.4,
    brakeRate: 13.5,
    coastRate: 8.0,
    maxLat: 2.35,
    groundY: 0.045,
    lean: 0.09,
    followBack: 9.2,
    followHeight: 2.7,
    followLookY: 1.05,
    cinemaR: 7.6,
    cinemaY: 1.45,
    fpvFwd: 0.55,
    fpvY: 1.12,
    fpvLookY: 1.18,
    camMinY: 0.7,
  },
};

export function vehicleProfile(id: CharacterId): VehicleProfile {
  return VEHICLE_PROFILES[id] ?? BIKE_PROFILE;
}
