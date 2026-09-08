import type { PoiDef } from './types';

/** 已开放骑行的国家 */
export type CountryId = 'china' | 'russia';
/** 场景 ID 即国家 ID（兼容旧 RideConfig.sceneId 字段名） */
export type SceneId = CountryId;
export type CharacterId = 'male' | 'female';

export interface CurveParams {
  baseRadius: number;
  ctrlCount: number;
  /** 主半径噪声采样尺度 */
  radiusNoiseScale: number;
  /** 次级半径噪声采样尺度 */
  radiusNoiseScale2: number;
  /** 半径噪声种子偏移 */
  seedOffset1: number;
  seedOffset2: number;
  /** 道路高度起伏幅度 */
  heightScale: number;
  /** 道路高度采样频率 */
  heightFreq: number;
  heightSeedX: number;
  heightSeedZ: number;
  heightBias: number;
}

export interface PaletteHints {
  /** 草地基色 RGB 0~1 */
  grass?: [number, number, number];
  /** 远景裙边草地偏色 */
  skirt?: [number, number, number];
}

export interface ScenePack {
  id: SceneId;
  name: string;
  blurb: string;
  curve: CurveParams;
  poiDefs: PoiDef[];
  palette?: PaletteHints;
}

/** 中国：一路经过省市的长途环线（各地标简模） */
const CHINA_POIS: PoiDef[] = [
  { type: 'observatory', name: '北京·天安门',   desc: '朱红城楼与汉白玉栏杆，京城起点一眼可辨。', t: 0.02,  side: -1, dist: 26, radius: 8,  landmark: 'tiananmen' },
  { type: 'meadow',      name: '河北·长城',     desc: '燕山脊上垛口连绵，像一条石龙盘过麦浪。', t: 0.07,  side: 1,  dist: 24, radius: 24, landmark: 'greatwall' },
  { type: 'windmill',    name: '山西·应县木塔', desc: '多层木塔拔地而起，檐角在黄土高原上剪影分明。', t: 0.12,  side: -1, dist: 28, radius: 7,  landmark: 'pagoda' },
  { type: 'forest',      name: '陕西·大雁塔',   desc: '四方密檐砖塔耸立关中，松涛伴着古道风。', t: 0.17,  side: 1,  dist: 18, radius: 14, landmark: 'dayan' },
  { type: 'lake',        name: '四川·熊猫家园', desc: '竹林深处黑白身影，盆地雾气还没散尽。', t: 0.23,  side: -1, dist: 34, radius: 30, landmark: 'panda' },
  { type: 'meadow',      name: '云南·傣塔',     desc: '白塔尖顶刺向高原蓝天，花海与红土相映。', t: 0.28,  side: 1,  dist: 22, radius: 26, landmark: 'stupa' },
  { type: 'forest',      name: '贵州·侗族鼓楼', desc: '飞檐层层的鼓楼立于山谷，云雾在脚底爬。', t: 0.33,  side: -1, dist: 16, radius: 15, landmark: 'drumtower' },
  { type: 'meadow',      name: '湖南·张家界',   desc: '石英砂岩峰林拔地而起，像一排沉默的石柱。', t: 0.38,  side: 1,  dist: 20, radius: 22, landmark: 'pillars' },
  { type: 'lake',        name: '湖北·黄鹤楼',   desc: '飞檐层楼临江而立，苇絮在湖风里轻飞。', t: 0.43,  side: -1, dist: 32, radius: 28, landmark: 'crane_tower' },
  { type: 'windmill',    name: '安徽·徽派民居', desc: '马头墙错落如墨线，粉墙黛瓦映着田畴。', t: 0.48,  side: 1,  dist: 26, radius: 7,  landmark: 'huizhou' },
  { type: 'lighthouse',  name: '江苏·园林亭台', desc: '水乡亭角翘起，曲廊尽头有晚归的灯影。', t: 0.53,  side: -1, dist: 30, radius: 9,  landmark: 'pavilion' },
  { type: 'lake',        name: '浙江·断桥残雪', desc: '西湖断桥边一亭临水，湖面温润如玉。', t: 0.58,  side: 1,  dist: 36, radius: 32, landmark: 'westlake' },
  { type: 'forest',      name: '福建·土楼',     desc: '圆形土楼合围成环，茶园与松林夹道相送。', t: 0.63,  side: -1, dist: 17, radius: 14, landmark: 'tulou' },
  { type: 'lighthouse',  name: '广东·广州塔',   desc: '细高塔身刺破南国暮色，海岸线渐近。', t: 0.68,  side: 1,  dist: 28, radius: 9,  landmark: 'canton_tower' },
  { type: 'meadow',      name: '广西·象鼻山',   desc: '喀斯特拱门如象鼻汲水，峰林之间开阔地。', t: 0.73,  side: -1, dist: 22, radius: 24, landmark: 'karst_arch' },
  { type: 'lake',        name: '海南·椰风木屋', desc: '椰树与木屋立在蓝湖边，海峡风扑面而来。', t: 0.77,  side: 1,  dist: 34, radius: 30, landmark: 'coconut' },
  { type: 'observatory', name: '河南·少林山门', desc: '寺院山门朱红飞檐，中原腹地一望苍茫。', t: 0.82,  side: -1, dist: 24, radius: 7,  landmark: 'shaolin' },
  { type: 'windmill',    name: '山东·泰山牌坊', desc: '石阶与牌坊指向云端，海风翻过齐鲁大地。', t: 0.86,  side: 1,  dist: 28, radius: 7,  landmark: 'taishan' },
  { type: 'forest',      name: '辽宁·故宫城楼', desc: '黄琉璃屋顶与朱红城楼，辽东丘陵松林密。', t: 0.90,  side: -1, dist: 16, radius: 14, landmark: 'palace_roof' },
  { type: 'meadow',      name: '吉林·天池观景', desc: '天池观景台临崖而立，花甸与白桦交界。', t: 0.94,  side: 1,  dist: 20, radius: 22, landmark: 'changbai' },
  { type: 'lake',        name: '黑龙江·冰雕塔', desc: '晶莹冰塔立在北国湖畔，针叶林影倒映镜面。', t: 0.98,  side: -1, dist: 32, radius: 28, landmark: 'ice_tower' },
];

/** 俄罗斯：寒带针叶林与雪意色调（各地标简模） */
const RUSSIA_POIS: PoiDef[] = [
  { type: 'observatory', name: '莫斯科·红场',     desc: '彩色洋葱穹顶簇拥矗立，冷空气里金顶闪着微光。', t: 0.08,  side: -1, dist: 26, radius: 8,  landmark: 'onion_cathedral' },
  { type: 'forest',      name: '西伯利亚·木屋',   desc: '原木木屋立在针叶林缘，屋顶还披着薄薄雪意。', t: 0.20,  side: 1,  dist: 18, radius: 16, landmark: 'izba' },
  { type: 'lake',        name: '贝加尔·湖栈桥',   desc: '澄澈近黑的湖水上架着木栈桥，岸边挂着薄冰。', t: 0.34,  side: -1, dist: 36, radius: 34, landmark: 'baikal_pier' },
  { type: 'meadow',      name: '苔原·驯鹿营地',   desc: '短暂夏日苔原开满碎花，圆锥帐篷与鹿影相伴。', t: 0.48,  side: 1,  dist: 22, radius: 24, landmark: 'tundra_tent' },
  { type: 'windmill',    name: '伏尔加·河岸磨坊', desc: '河岸旧木磨坊吱呀伫立，灰蓝水面映着磨翼。', t: 0.60,  side: -1, dist: 28, radius: 8,  landmark: 'volga_mill' },
  { type: 'lighthouse',  name: '波罗的海·灯塔',   desc: '北方海岬的冷白灯塔，夜里为破冰船留一盏灯。', t: 0.74,  side: 1,  dist: 30, radius: 9,  landmark: 'baltic_lighthouse' },
  { type: 'forest',      name: '乌拉尔·林海哨塔', desc: '山脉两侧无边林海，木制哨塔探出树梢远望。', t: 0.86,  side: -1, dist: 16, radius: 15, landmark: 'ural_watchtower' },
  { type: 'observatory', name: '极光·观测穹顶',   desc: '高纬玻璃穹顶观测台，冬夜绿纱常在天幕飘。', t: 0.94,  side: 1,  dist: 24, radius: 7,  landmark: 'aurora_dome' },
];

export const SCENES: ScenePack[] = [
  {
    id: 'china',
    name: '中国',
    blurb: '一路经过省市的长途环线，从华北平原骑向江南与北国。',
    curve: {
      baseRadius: 700,
      ctrlCount: 72,
      radiusNoiseScale: 1.85,
      radiusNoiseScale2: 3.6,
      seedOffset1: 14,
      seedOffset2: 63,
      heightScale: 34,
      heightFreq: 0.00105,
      heightSeedX: 4.2,
      heightSeedZ: 8.8,
      heightBias: 0.40,
    },
    poiDefs: CHINA_POIS,
    palette: {
      grass: [0.30, 0.55, 0.24],
      skirt: [0.28, 0.52, 0.22],
    },
  },
  {
    id: 'russia',
    name: '俄罗斯',
    blurb: '雪意针叶林与洋葱穹顶，一路向北的寒带公路。',
    curve: {
      baseRadius: 560,
      ctrlCount: 68,
      radiusNoiseScale: 2.2,
      radiusNoiseScale2: 4.2,
      seedOffset1: 41,
      seedOffset2: 107,
      heightScale: 38,
      heightFreq: 0.00135,
      heightSeedX: 15.6,
      heightSeedZ: 22.3,
      heightBias: 0.36,
    },
    poiDefs: RUSSIA_POIS,
    palette: {
      grass: [0.40, 0.48, 0.50],
      skirt: [0.48, 0.54, 0.58],
    },
  },
];

const SCENE_MAP = new Map(SCENES.map((s) => [s.id, s]));

export function getScene(id: SceneId): ScenePack {
  const pack = SCENE_MAP.get(id);
  if (!pack) throw new Error(`Unknown scene: ${id}`);
  return pack;
}

export interface RideConfig {
  sceneId: SceneId;
  characterId: CharacterId;
}

export const CHARACTERS: { id: CharacterId; name: string; blurb: string }[] = [
  { id: 'male', name: '男骑手', blurb: '经典蓝车架与红盔，稳健匀称的体型。' },
  { id: 'female', name: '女骑手', blurb: '紫红骑行服与长发，身形更轻盈。' },
];

/** 地球上可点击的国家热点（开放 + 未开放） */
export interface GlobeCountryHotspot {
  id: string;
  name: string;
  /** 纬度 */
  lat: number;
  /** 经度 */
  lon: number;
  /** 是否已开放骑行 */
  open: boolean;
  countryId?: CountryId;
}

export const GLOBE_HOTSPOTS: GlobeCountryHotspot[] = [
  { id: 'china', name: '中国', lat: 35.0, lon: 105.0, open: true, countryId: 'china' },
  { id: 'russia', name: '俄罗斯', lat: 61.0, lon: 100.0, open: true, countryId: 'russia' },
  { id: 'usa', name: '美国', lat: 39.0, lon: -98.0, open: false },
  { id: 'japan', name: '日本', lat: 36.0, lon: 138.0, open: false },
  { id: 'brazil', name: '巴西', lat: -10.0, lon: -55.0, open: false },
  { id: 'france', name: '法国', lat: 46.0, lon: 2.0, open: false },
  { id: 'australia', name: '澳大利亚', lat: -25.0, lon: 134.0, open: false },
  { id: 'india', name: '印度', lat: 22.0, lon: 78.0, open: false },
  { id: 'canada', name: '加拿大', lat: 56.0, lon: -106.0, open: false },
  { id: 'egypt', name: '埃及', lat: 26.0, lon: 30.0, open: false },
];
