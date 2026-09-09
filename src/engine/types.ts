import * as THREE from 'three';

export type TimeOfDay = 'day' | 'sunset' | 'night';
export type CamMode = 'follow' | 'cinema' | 'fpv';

export type PoiType = 'windmill' | 'lake' | 'meadow' | 'observatory' | 'lighthouse' | 'forest';

/** 地标种类（含韩国 / 意大利 / 土耳其 / 沙特 / 南非简模） */
export type LandmarkKind =
  | 'tiananmen'
  | 'greatwall'
  | 'pagoda'
  | 'dayan'
  | 'panda'
  | 'stupa'
  | 'drumtower'
  | 'pillars'
  | 'crane_tower'
  | 'huizhou'
  | 'pavilion'
  | 'westlake'
  | 'tulou'
  | 'canton_tower'
  | 'karst_arch'
  | 'coconut'
  | 'shaolin'
  | 'taishan'
  | 'palace_roof'
  | 'changbai'
  | 'ice_tower'
  | 'onion_cathedral'
  | 'izba'
  | 'baikal_pier'
  | 'tundra_tent'
  | 'volga_mill'
  | 'baltic_lighthouse'
  | 'ural_watchtower'
  | 'aurora_dome'
  | 'goryokaku'
  | 'tokyo_tower'
  | 'sensoji'
  | 'fuji'
  | 'kinkaku'
  | 'fushimi'
  | 'nara_daibutsu'
  | 'osaka_castle'
  | 'himeji'
  | 'itsukushima'
  | 'dogo'
  | 'shureimon'
  | 'space_needle'
  | 'golden_gate'
  | 'hollywood'
  | 'grand_canyon'
  | 'monument_valley'
  | 'vegas_sign'
  | 'yellowstone'
  | 'rushmore'
  | 'gateway_arch'
  | 'niagara'
  | 'white_house'
  | 'statue_liberty'
  | 'opera_house'
  | 'harbour_bridge'
  | 'three_sisters'
  | 'barrier_reef'
  | 'gold_coast'
  | 'twelve_apostles'
  | 'parliament_house'
  | 'uluru'
  | 'wave_rock'
  | 'pinnacles'
  | 'kangaroo'
  | 'cradle_mountain'
  | 'alexandria'
  | 'giza'
  | 'sphinx'
  | 'citadel'
  | 'saqqara'
  | 'karnak'
  | 'luxor'
  | 'hatshepsut'
  | 'valley_kings'
  | 'philae'
  | 'abu_simbel'
  | 'felucca'
  | 'golden_temple'
  | 'india_gate'
  | 'red_fort'
  | 'taj_mahal'
  | 'hawa_mahal'
  | 'varanasi'
  | 'gateway_india'
  | 'charminar'
  | 'mysore'
  | 'kerala'
  | 'meenakshi'
  | 'ellora'
  | 'vancouver_totem'
  | 'lions_gate'
  | 'banff'
  | 'calgary_tower'
  | 'cn_tower'
  | 'horseshoe'
  | 'parliament_hill'
  | 'notre_dame_mtl'
  | 'frontenac'
  | 'peggy_cove'
  | 'inuksuk'
  | 'polar_bear'
  | 'eiffel'
  | 'arc_triomphe'
  | 'notre_dame'
  | 'louvre'
  | 'sacre_coeur'
  | 'versailles'
  | 'mont_saint_michel'
  | 'chenonceau'
  | 'lavender'
  | 'pont_du_gard'
  | 'mont_blanc'
  | 'cote_azur'
  | 'christ_redeemer'
  | 'sugarloaf'
  | 'copacabana'
  | 'maracana'
  | 'iguazu'
  | 'brasilia'
  | 'pelourinho'
  | 'olinda'
  | 'pantanal'
  | 'lencois'
  | 'teatro_amazonas'
  | 'amazon'
  | 'cabo_arch'
  | 'copper_canyon'
  | 'guadalajara'
  | 'teotihuacan'
  | 'catedral_mex'
  | 'angel_independencia'
  | 'bellas_artes'
  | 'xochimilco'
  | 'popocatepetl'
  | 'palenque'
  | 'chichen_itza'
  | 'tulum'
  | 'giant_causeway'
  | 'edinburgh_castle'
  | 'loch_ness'
  | 'hadrians_wall'
  | 'lake_district'
  | 'york_minster'
  | 'stonehenge'
  | 'tower_bridge'
  | 'big_ben'
  | 'st_pauls'
  | 'windsor'
  | 'white_cliffs'
  | 'n_seoul_tower'
  | 'gyeongbokgung'
  | 'bukchon'
  | 'lotte_tower'
  | 'hwaseong'
  | 'cheomseongdae'
  | 'bulguksa'
  | 'gamcheon'
  | 'haeundae'
  | 'hallasan'
  | 'hareubang'
  | 'seongsan'
  | 'colosseum'
  | 'pantheon'
  | 'vatican'
  | 'roman_forum'
  | 'pisa'
  | 'florence_duomo'
  | 'venice'
  | 'milan_duomo'
  | 'pompeii'
  | 'amalfi'
  | 'cinque_terre'
  | 'etna'
  | 'hagia_sophia'
  | 'blue_mosque'
  | 'galata'
  | 'bosphorus'
  | 'cappadocia'
  | 'pamukkale'
  | 'ephesus'
  | 'troy'
  | 'nemrut'
  | 'antalya'
  | 'sumela'
  | 'ararat'
  | 'haram'
  | 'nabawi'
  | 'kingdom_centre'
  | 'masmak'
  | 'diriyah'
  | 'hegra'
  | 'elephant_rock'
  | 'jeddah_fountain'
  | 'red_sea'
  | 'edge_world'
  | 'empty_quarter'
  | 'abha'
  | 'table_mountain'
  | 'cape_point'
  | 'robben_island'
  | 'boulders'
  | 'union_buildings'
  | 'joburg'
  | 'kruger'
  | 'drakensberg'
  | 'blyde'
  | 'durban'
  | 'garden_route'
  | 'agulhas';

/** 景点定义（沿路线的参数位置） */
export interface PoiDef {
  type: PoiType;
  name: string;
  desc: string;
  t: number;          // 沿环线的归一化位置 0~1
  side: -1 | 1;       // 路的哪一侧
  dist: number;       // 离路中心距离（米）
  radius: number;     // 场地半径（米）
  /** 可选：省级地标简模，有则替代通用风车/观景台/灯塔主体 */
  landmark?: LandmarkKind;
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
