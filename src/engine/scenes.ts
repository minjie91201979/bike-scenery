import type { PoiDef } from './types';

/** 已开放骑行的国家 */
export type CountryId = 'china' | 'russia' | 'japan' | 'usa' | 'australia' | 'egypt' | 'india' | 'canada' | 'france' | 'brazil' | 'mexico' | 'uk' | 'korea' | 'italy' | 'turkey' | 'saudi' | 'south_africa';
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
  /** 椭圆拉伸 X，默认 1（正圆环线） */
  scaleX?: number;
  /** 椭圆拉伸 Z，默认 1 */
  scaleZ?: number;
  /** 平面旋转（弧度），狭长轴可贴近真实走向 */
  rotateY?: number;
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
  /** 路左侧做成海岸（岛国） */
  coastLeft?: boolean;
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

/** 日本：狭长列岛环线（北海道→冲绳意象，各地标简模） */
const JAPAN_POIS: PoiDef[] = [
  { type: 'observatory', name: '北海道·五棱郭',   desc: '星形堡垒嵌在函馆平原，棱角在春光里切得很利。', t: 0.04,  side: -1, dist: 26, radius: 8,  landmark: 'goryokaku' },
  { type: 'observatory', name: '东京·东京塔',     desc: '红白相间的细塔刺向天空，都市骑行的第一眼地标。', t: 0.12,  side: 1,  dist: 24, radius: 8,  landmark: 'tokyo_tower' },
  { type: 'forest',      name: '东京·浅草雷门',   desc: '朱红大门垂着巨大灯笼，香火与车铃一前一后。', t: 0.20,  side: -1, dist: 22, radius: 10, landmark: 'sensoji' },
  { type: 'meadow',      name: '山梨·富士山',     desc: '雪顶圆锥从花田间升起，一路都能看见那道肩线。', t: 0.28,  side: 1,  dist: 32, radius: 24, landmark: 'fuji' },
  { type: 'lake',        name: '京都·金阁寺',     desc: '金箔楼阁临水而立，倒影把阳光折成一层薄金。', t: 0.36,  side: -1, dist: 28, radius: 22, landmark: 'kinkaku' },
  { type: 'forest',      name: '京都·伏见稻荷',   desc: '千本鸟居连成朱红隧道，山道在脚下轻轻抬升。', t: 0.44,  side: 1,  dist: 20, radius: 14, landmark: 'fushimi' },
  { type: 'forest',      name: '奈良·东大寺',     desc: '大佛殿屋脊压得很低，殿前香炉还在冒着细烟。', t: 0.52,  side: -1, dist: 22, radius: 14, landmark: 'nara_daibutsu' },
  { type: 'observatory', name: '大阪·大阪城',     desc: '白墙绿瓦立在石垣上，城下町的风带着潮气。', t: 0.60,  side: 1,  dist: 26, radius: 10, landmark: 'osaka_castle' },
  { type: 'observatory', name: '兵库·姬路城',     desc: '白鹭城层层收分，墙面亮得像刚梳过的羽毛。', t: 0.68,  side: -1, dist: 24, radius: 10, landmark: 'himeji' },
  { type: 'lake',        name: '广岛·严岛鸟居',   desc: '朱红大鸟居立在浅海里，潮水来时像从浪里长出。', t: 0.76,  side: 1,  dist: 30, radius: 26, landmark: 'itsukushima' },
  { type: 'windmill',    name: '爱媛·道后温泉',   desc: '木造本馆飞檐叠起，温泉蒸汽从窗格里渗出来。', t: 0.84,  side: -1, dist: 22, radius: 8,  landmark: 'dogo' },
  { type: 'observatory', name: '冲绳·守礼门',     desc: '琉球朱门向海敞开，骑到这里列岛已经收成细线。', t: 0.93,  side: 1,  dist: 24, radius: 8,  landmark: 'shureimon' },
];

/** 美国：东西向宽幅环线（西岸到东岸意象，各地标简模） */
const USA_POIS: PoiDef[] = [
  { type: 'observatory', name: '西雅图·太空针塔', desc: '细塔托着飞碟观景台，海湾风把云层吹得很薄。', t: 0.04,  side: -1, dist: 24, radius: 8,  landmark: 'space_needle' },
  { type: 'observatory', name: '旧金山·金门大桥', desc: '朱红桥塔夹着海峡，雾还没散就先看见钢索。', t: 0.12,  side: 1,  dist: 28, radius: 12, landmark: 'golden_gate' },
  { type: 'meadow',      name: '洛杉矶·好莱坞',   desc: '白字钉在山坡上，棕榈与干草一路铺到镜头前。', t: 0.20,  side: -1, dist: 26, radius: 22, landmark: 'hollywood' },
  { type: 'meadow',      name: '亚利桑那·大峡谷', desc: '红岩一层层切开，骑到崖沿才觉得风来自地心。', t: 0.28,  side: 1,  dist: 30, radius: 24, landmark: 'grand_canyon' },
  { type: 'forest',      name: '犹他·纪念碑谷',   desc: '砂岩方塔立在荒原上，影子比山还要长。', t: 0.36,  side: -1, dist: 28, radius: 16, landmark: 'monument_valley' },
  { type: 'observatory', name: '拉斯维加斯·欢迎牌', desc: '圆牌在沙漠里发亮，夜晚会比白天更吵一点。', t: 0.44,  side: 1,  dist: 22, radius: 8,  landmark: 'vegas_sign' },
  { type: 'meadow',      name: '怀俄明·黄石喷泉', desc: '白烟从泉眼里一截一截冒出，草地被矿物染成浅黄。', t: 0.52,  side: -1, dist: 24, radius: 20, landmark: 'yellowstone' },
  { type: 'observatory', name: '南达科他·总统山', desc: '四张石脸从岩壁里探出，远处雷暴还在积云。', t: 0.60,  side: 1,  dist: 26, radius: 12, landmark: 'rushmore' },
  { type: 'observatory', name: '圣路易斯·拱门',   desc: '一道银弧跨过河岸，像把地平线轻轻折了一下。', t: 0.68,  side: -1, dist: 24, radius: 10, landmark: 'gateway_arch' },
  { type: 'lake',        name: '尼亚加拉瀑布',     desc: '白练砸进深潭，水雾把桥栏杆都打湿了。', t: 0.76,  side: 1,  dist: 30, radius: 26, landmark: 'niagara' },
  { type: 'observatory', name: '华盛顿·白宫',     desc: '白柱门廊对着草坪，国旗在风里拍得很整齐。', t: 0.84,  side: -1, dist: 22, radius: 10, landmark: 'white_house' },
  { type: 'lighthouse',  name: '纽约·自由女神',   desc: '铜绿女神举着火炬，港口把城市的轮廓托起来。', t: 0.93,  side: 1,  dist: 26, radius: 10, landmark: 'statue_liberty' },
];

/** 澳大利亚：大陆轮廓环线（东岸到内陆红土，各地标简模） */
const AUSTRALIA_POIS: PoiDef[] = [
  { type: 'lighthouse',  name: '悉尼·歌剧院',     desc: '白帆壳层层叠起，港湾把整座房子托在水面上。', t: 0.04,  side: -1, dist: 26, radius: 10, landmark: 'opera_house' },
  { type: 'observatory', name: '悉尼·海港大桥',   desc: '钢拱跨过海峡，火车和骑行者在同一条风里。', t: 0.12,  side: 1,  dist: 26, radius: 10, landmark: 'harbour_bridge' },
  { type: 'forest',      name: '蓝山·三姐妹峰',   desc: '三根砂岩柱立在桉树海里，雾从谷底往上爬。', t: 0.20,  side: -1, dist: 24, radius: 14, landmark: 'three_sisters' },
  { type: 'lake',        name: '昆士兰·大堡礁',   desc: '珊瑚在浅海里铺成一块调色盘，水比对岸还亮。', t: 0.28,  side: 1,  dist: 32, radius: 28, landmark: 'barrier_reef' },
  { type: 'observatory', name: '黄金海岸',         desc: '细高楼贴着沙滩排开，浪线比公路还要直。', t: 0.36,  side: -1, dist: 24, radius: 10, landmark: 'gold_coast' },
  { type: 'lake',        name: '维多利亚·十二门徒', desc: '石灰岩柱站在拍岸浪里，一个一个被风数着。', t: 0.44,  side: 1,  dist: 28, radius: 22, landmark: 'twelve_apostles' },
  { type: 'observatory', name: '堪培拉·国会大厦', desc: '旗杆从山坡上伸出来，草坪把整座城摊得很开。', t: 0.52,  side: -1, dist: 24, radius: 10, landmark: 'parliament_house' },
  { type: 'meadow',      name: '北领地·乌鲁鲁',   desc: '整块红岩卧在荒原中央，黄昏时会自己亮起来。', t: 0.60,  side: 1,  dist: 32, radius: 24, landmark: 'uluru' },
  { type: 'meadow',      name: '西澳·波浪岩',     desc: '岩壁像一排冻住的浪，影子在脚下折成弧。', t: 0.68,  side: -1, dist: 24, radius: 16, landmark: 'wave_rock' },
  { type: 'forest',      name: '西澳·尖峰石阵',   desc: '石灰岩细柱从沙地里冒出来，像一片沉默的树林。', t: 0.76,  side: 1,  dist: 22, radius: 16, landmark: 'pinnacles' },
  { type: 'forest',      name: '袋鼠岛',           desc: '矮树和草甸之间有袋鼠出没，海风带着盐味。', t: 0.84,  side: -1, dist: 22, radius: 14, landmark: 'kangaroo' },
  { type: 'meadow',      name: '塔斯马尼亚·摇篮山', desc: '锯齿山脊插进湖面，云比山走得还慢。', t: 0.93,  side: 1,  dist: 26, radius: 20, landmark: 'cradle_mountain' },
];

/** 埃及：尼罗河谷狭长环线（地中海到努比亚，各地标简模） */
const EGYPT_POIS: PoiDef[] = [
  { type: 'lighthouse',  name: '亚历山大·灯塔',   desc: '海港石堡立在地中海风里，浪把基座打得很白。', t: 0.04,  side: -1, dist: 26, radius: 9,  landmark: 'alexandria' },
  { type: 'observatory', name: '吉萨·金字塔与狮身人面', desc: '三座石锥与狮身人面并立，沙漠把影子拉得很长。', t: 0.12,  side: 1,  dist: 30, radius: 18, landmark: 'giza' },
  { type: 'observatory', name: '开罗·城堡清真寺', desc: '圆顶与细尖塔叠在山岗上，唤礼声比风先到。', t: 0.22,  side: -1, dist: 24, radius: 10, landmark: 'citadel' },
  { type: 'observatory', name: '萨卡拉·阶梯金字塔', desc: '一层层石台叠成最早的塔，荒原安静得能听见沙子。', t: 0.36,  side: -1, dist: 26, radius: 12, landmark: 'saqqara' },
  { type: 'forest',      name: '卢克索·卡纳克神庙', desc: '石柱林把天空切成格子，柱头还托着残存的彩。', t: 0.44,  side: 1,  dist: 22, radius: 14, landmark: 'karnak' },
  { type: 'observatory', name: '卢克索神庙',       desc: '方尖碑对着尼罗河，柱廊在黄昏里变成暖黄色。', t: 0.52,  side: -1, dist: 24, radius: 10, landmark: 'luxor' },
  { type: 'observatory', name: '哈特谢普苏特神庙', desc: '三层台地嵌进崖壁，像从山里长出来的台阶。', t: 0.60,  side: 1,  dist: 26, radius: 12, landmark: 'hatshepsut' },
  { type: 'forest',      name: '国王谷',           desc: '岩壁上开着墓道口，热浪把空气压得很薄。', t: 0.68,  side: -1, dist: 22, radius: 14, landmark: 'valley_kings' },
  { type: 'lake',        name: '阿斯旺·菲莱神庙', desc: '神庙岛浮在库水上，柱影在湖面里轻轻晃。', t: 0.76,  side: 1,  dist: 30, radius: 24, landmark: 'philae' },
  { type: 'observatory', name: '阿布辛贝神庙',     desc: '四尊巨像坐在崖前，朝阳先照到他们的膝盖。', t: 0.84,  side: -1, dist: 26, radius: 12, landmark: 'abu_simbel' },
  { type: 'lake',        name: '尼罗河帆船',       desc: '白帆贴着河面走，两岸棕榈把风切成细条。', t: 0.93,  side: 1,  dist: 28, radius: 22, landmark: 'felucca' },
];

/** 印度：半岛南北环线（金庙到南印神庙，各地标简模） */
const INDIA_POIS: PoiDef[] = [
  { type: 'observatory', name: '阿姆利则·金庙',   desc: '金顶映在水池里，廊道把诵经声绕成一圈。', t: 0.04,  side: -1, dist: 24, radius: 10, landmark: 'golden_temple' },
  { type: 'observatory', name: '德里·印度门',     desc: '砂岩拱门对着林荫大道，黄昏把门洞染成暖黄。', t: 0.12,  side: 1,  dist: 24, radius: 8,  landmark: 'india_gate' },
  { type: 'observatory', name: '德里·红堡',       desc: '红砂岩城墙压得很低，城门里还留着一截阴影。', t: 0.20,  side: -1, dist: 26, radius: 12, landmark: 'red_fort' },
  { type: 'lake',        name: '阿格拉·泰姬陵',   desc: '白大理石倒映在水渠里，四座尖塔把天空钉住。', t: 0.28,  side: 1,  dist: 30, radius: 22, landmark: 'taj_mahal' },
  { type: 'observatory', name: '斋浦尔·风之宫',   desc: '粉红窗格叠成蜂巢，风从无数小孔里穿过去。', t: 0.36,  side: -1, dist: 22, radius: 10, landmark: 'hawa_mahal' },
  { type: 'lake',        name: '瓦拉纳西·恒河码头', desc: '石阶没入河水，晨雾里有一排伞和香火。', t: 0.44,  side: 1,  dist: 28, radius: 24, landmark: 'varanasi' },
  { type: 'lighthouse',  name: '孟买·印度门',     desc: '海拱对着阿拉伯海，潮气把石头打得发亮。', t: 0.52,  side: -1, dist: 26, radius: 10, landmark: 'gateway_india' },
  { type: 'observatory', name: '海德拉巴·查尔米纳', desc: '四座宣礼塔撑起拱门，老城的尘土在脚下发黄。', t: 0.60,  side: 1,  dist: 22, radius: 9,  landmark: 'charminar' },
  { type: 'observatory', name: '迈索尔王宫',       desc: '灰石宫殿叠着拱廊，灯亮时整座城像被镀了一层。', t: 0.68,  side: -1, dist: 24, radius: 12, landmark: 'mysore' },
  { type: 'lake',        name: '喀拉拉·船屋',     desc: '长船贴着椰林水道走，水比岸上的风更绿。', t: 0.76,  side: 1,  dist: 30, radius: 24, landmark: 'kerala' },
  { type: 'forest',      name: '马杜赖·米纳克希', desc: '彩塔一层层堆到天上，神像在壁龛里挤得很满。', t: 0.84,  side: -1, dist: 24, radius: 12, landmark: 'meenakshi' },
  { type: 'forest',      name: '埃洛拉石窟',       desc: '整座神庙从岩壁里挖出来，柱影比凿痕还深。', t: 0.93,  side: 1,  dist: 22, radius: 14, landmark: 'ellora' },
];

/** 加拿大：东西向宽幅环线（太平洋到大西洋，各地标简模） */
const CANADA_POIS: PoiDef[] = [
  { type: 'forest',      name: '温哥华·图腾柱',   desc: '彩色木柱立在杉林边，海风把纹样吹得很清楚。', t: 0.04,  side: -1, dist: 22, radius: 12, landmark: 'vancouver_totem' },
  { type: 'observatory', name: '温哥华·狮门桥',   desc: '钢索跨过海峡，两岸的山把桥夹成一条细线。', t: 0.12,  side: 1,  dist: 26, radius: 10, landmark: 'lions_gate' },
  { type: 'meadow',      name: '班夫·落基山',     desc: '雪峰插进松石湖里，花甸比公路还要安静。', t: 0.20,  side: -1, dist: 30, radius: 22, landmark: 'banff' },
  { type: 'observatory', name: '卡尔加里塔',       desc: '细塔托着圆盘观景台，草原风从脚下一直吹到塔顶。', t: 0.28,  side: 1,  dist: 24, radius: 8,  landmark: 'calgary_tower' },
  { type: 'lighthouse',  name: '多伦多·CN塔',     desc: '针塔刺破湖面雾气，观景舱像一枚停住的飞碟。', t: 0.36,  side: -1, dist: 24, radius: 9,  landmark: 'cn_tower' },
  { type: 'lake',        name: '尼亚加拉·马蹄瀑', desc: '水帘砸成一圈白雾，桥栏杆整天都是湿的。', t: 0.44,  side: 1,  dist: 30, radius: 24, landmark: 'horseshoe' },
  { type: 'observatory', name: '渥太华·国会山',   desc: '绿铜尖顶对着草坪，钟楼把整座城按得很齐。', t: 0.52,  side: -1, dist: 24, radius: 10, landmark: 'parliament_hill' },
  { type: 'observatory', name: '蒙特利尔圣母院',   desc: '双塔贴着广场升起，彩窗把石墙染成暖色。', t: 0.60,  side: 1,  dist: 22, radius: 10, landmark: 'notre_dame_mtl' },
  { type: 'observatory', name: '魁北克·芳堤娜',   desc: '铜绿尖顶压在城墙上，河风比石头还冷。', t: 0.68,  side: -1, dist: 24, radius: 12, landmark: 'frontenac' },
  { type: 'lighthouse',  name: '佩吉湾灯塔',       desc: '白塔坐在花岗岩石窝里，浪把基座打得很亮。', t: 0.76,  side: 1,  dist: 26, radius: 10, landmark: 'peggy_cove' },
  { type: 'meadow',      name: '北极·因努克苏克', desc: '石人立在苔原上，风向标比影子还要少。', t: 0.84,  side: -1, dist: 24, radius: 18, landmark: 'inuksuk' },
  { type: 'forest',      name: '丘吉尔北极熊',     desc: '白熊走过冻原边缘，远处还有一条没化开的冰线。', t: 0.93,  side: 1,  dist: 22, radius: 14, landmark: 'polar_bear' },
];

/** 法国：紧凑六边形环线（巴黎到蔚蓝海岸，各地标简模） */
const FRANCE_POIS: PoiDef[] = [
  { type: 'lighthouse',  name: '巴黎·埃菲尔铁塔', desc: '铁格子一层层收上去，塞纳河把塔影拉得很长。', t: 0.04,  side: -1, dist: 24, radius: 9,  landmark: 'eiffel' },
  { type: 'observatory', name: '巴黎·凯旋门',     desc: '石拱对着星形大道，车灯在门洞里来回切。', t: 0.12,  side: 1,  dist: 22, radius: 8,  landmark: 'arc_triomphe' },
  { type: 'observatory', name: '巴黎·圣母院',     desc: '双塔夹着玫瑰窗，钟声比河风先到桥上。', t: 0.20,  side: -1, dist: 24, radius: 10, landmark: 'notre_dame' },
  { type: 'observatory', name: '巴黎·卢浮宫',     desc: '玻璃锥嵌进石庭院，倒影把天空折成三角形。', t: 0.28,  side: 1,  dist: 24, radius: 10, landmark: 'louvre' },
  { type: 'observatory', name: '巴黎·圣心堂',     desc: '白圆顶坐在蒙马特高坡上，整座城在脚下发灰。', t: 0.36,  side: -1, dist: 22, radius: 10, landmark: 'sacre_coeur' },
  { type: 'observatory', name: '凡尔赛宫',         desc: '长廊把花园摊开，喷泉比雕像还要亮。', t: 0.44,  side: 1,  dist: 26, radius: 12, landmark: 'versailles' },
  { type: 'lake',        name: '圣米歇尔山',       desc: '修道院立在潮汐岛上，退潮时路才从水里露出来。', t: 0.52,  side: -1, dist: 30, radius: 24, landmark: 'mont_saint_michel' },
  { type: 'lake',        name: '卢瓦尔·舍农索',   desc: '城堡骑在河上，拱桥把两岸的花园接成一条。', t: 0.60,  side: 1,  dist: 28, radius: 22, landmark: 'chenonceau' },
  { type: 'meadow',      name: '普罗旺斯·薰衣草', desc: '紫条一块块铺到天边，蜂鸣比风还密。', t: 0.68,  side: -1, dist: 24, radius: 22, landmark: 'lavender' },
  { type: 'forest',      name: '加尔桥',           desc: '三层石拱跨过河谷，影子在水里叠成格子。', t: 0.76,  side: 1,  dist: 24, radius: 14, landmark: 'pont_du_gard' },
  { type: 'meadow',      name: '勃朗峰',           desc: '白峰压在阿尔卑斯尽头，云比山走得还慢。', t: 0.84,  side: -1, dist: 28, radius: 20, landmark: 'mont_blanc' },
  { type: 'lake',        name: '蔚蓝海岸',         desc: '粉墙贴着海湾排开，海水比瓷砖还要蓝。', t: 0.93,  side: 1,  dist: 30, radius: 24, landmark: 'cote_azur' },
];

/** 巴西：南北大陆环线（亚马孙到里约，各地标简模） */
const BRAZIL_POIS: PoiDef[] = [
  { type: 'observatory', name: '里约·基督像',     desc: '张开双臂立在峰顶，海湾把整座城托在手心里。', t: 0.04,  side: -1, dist: 24, radius: 10, landmark: 'christ_redeemer' },
  { type: 'observatory', name: '里约·面包山',     desc: '花岗岩石馒头探出海面，缆车像一条细线。', t: 0.12,  side: 1,  dist: 26, radius: 12, landmark: 'sugarloaf' },
  { type: 'lake',        name: '科帕卡巴纳',       desc: '弯沙滩贴着黑白波纹人行道，浪比鼓点还齐。', t: 0.20,  side: -1, dist: 30, radius: 24, landmark: 'copacabana' },
  { type: 'observatory', name: '马拉卡纳球场',     desc: '椭圆看台围成一口碗，夜灯会把草皮烫绿。', t: 0.28,  side: 1,  dist: 24, radius: 12, landmark: 'maracana' },
  { type: 'lake',        name: '伊瓜苏瀑布',       desc: '水帘铺得很宽，雾把热带树冠都打湿了。', t: 0.36,  side: -1, dist: 32, radius: 26, landmark: 'iguazu' },
  { type: 'observatory', name: '巴西利亚国会',     desc: '双塔夹着两只白碗，草原把首都摊成一张图。', t: 0.44,  side: 1,  dist: 24, radius: 10, landmark: 'brasilia' },
  { type: 'forest',      name: '萨尔瓦多·佩洛里尼奥', desc: '彩色殖民楼挤在坡上，鼓声从石板路里冒出来。', t: 0.52,  side: -1, dist: 22, radius: 12, landmark: 'pelourinho' },
  { type: 'forest',      name: '奥林达教堂',       desc: '白塔从椰林里探出，海风把钟声送得很远。', t: 0.60,  side: 1,  dist: 22, radius: 12, landmark: 'olinda' },
  { type: 'lake',        name: '潘塔纳尔湿地',     desc: '浅水铺到天边，鸟影比船还要密。', t: 0.68,  side: -1, dist: 30, radius: 24, landmark: 'pantanal' },
  { type: 'meadow',      name: '伦索伊斯沙丘',     desc: '白沙丘里嵌着蓝水洼，风把棱线一遍遍重画。', t: 0.76,  side: 1,  dist: 28, radius: 20, landmark: 'lencois' },
  { type: 'lake',        name: '马瑙斯·亚马孙剧场', desc: '粉墙歌剧院立在雨林城里，穹顶比树冠还要亮。', t: 0.84,  side: -1, dist: 28, radius: 22, landmark: 'teatro_amazonas' },
  { type: 'forest',      name: '亚马孙河',         desc: '褐绿大河从树海里穿过，对岸几乎看不见。', t: 0.93,  side: 1,  dist: 26, radius: 16, landmark: 'amazon' },
];

/** 墨西哥：角状环线（下加州石拱到尤卡坦玛雅城，各地标简模） */
const MEXICO_POIS: PoiDef[] = [
  { type: 'lake',        name: '洛斯卡沃斯石拱',   desc: '砂岩拱门立在海湾里，潮水把石头打成暖黄色。', t: 0.04,  side: -1, dist: 28, radius: 22, landmark: 'cabo_arch' },
  { type: 'meadow',      name: '铜峡谷',           desc: '红岩一层层切开，列车比鹰飞得还要低。', t: 0.12,  side: 1,  dist: 28, radius: 20, landmark: 'copper_canyon' },
  { type: 'observatory', name: '瓜达拉哈拉主教堂', desc: '黄塔尖顶对着广场，晚钟把整座城按得很齐。', t: 0.20,  side: -1, dist: 24, radius: 10, landmark: 'guadalajara' },
  { type: 'observatory', name: '特奥蒂瓦坎',       desc: '太阳金字塔压在大道尽头，影子比台阶还长。', t: 0.28,  side: 1,  dist: 28, radius: 14, landmark: 'teotihuacan' },
  { type: 'observatory', name: '墨西哥城大教堂',   desc: '双塔贴着宪法广场升起，石墙被夕阳烫成金色。', t: 0.36,  side: -1, dist: 24, radius: 10, landmark: 'catedral_mex' },
  { type: 'lighthouse',  name: '独立天使',         desc: '金翅立在高柱顶上，大道从她脚下向四面散开。', t: 0.44,  side: 1,  dist: 22, radius: 8,  landmark: 'angel_independencia' },
  { type: 'observatory', name: '美术宫',           desc: '白石宫殿托着橙圆顶，玻璃幕把天空折得很浅。', t: 0.52,  side: -1, dist: 24, radius: 10, landmark: 'bellas_artes' },
  { type: 'lake',        name: '霍奇米尔科彩船',   desc: '花船挤在运河里，桨声比玛丽亚奇还密。', t: 0.60,  side: 1,  dist: 30, radius: 24, landmark: 'xochimilco' },
  { type: 'meadow',      name: '波波卡特佩特',     desc: '雪顶火山从高原升起，烟比云走得还慢。', t: 0.68,  side: -1, dist: 30, radius: 22, landmark: 'popocatepetl' },
  { type: 'forest',      name: '帕伦克神庙',       desc: '石阶神庙嵌进雨林，猿鸣把雾声压得很低。', t: 0.76,  side: 1,  dist: 22, radius: 14, landmark: 'palenque' },
  { type: 'observatory', name: '奇琴伊察',         desc: '四边阶梯金字塔对着丛林，春分时影子会变成蛇。', t: 0.84,  side: -1, dist: 26, radius: 12, landmark: 'chichen_itza' },
  { type: 'lake',        name: '图卢姆海边城堡',   desc: '玛雅石墙贴着加勒比海蓝，浪把崖壁打得很白。', t: 0.93,  side: 1,  dist: 28, radius: 22, landmark: 'tulum' },
];

/** 英国：列岛南北环线（苏格兰到白崖，各地标简模） */
const UK_POIS: PoiDef[] = [
  { type: 'meadow',      name: '巨人堤道',         desc: '六棱石柱从海里冒出来，浪把柱顶打得很平。', t: 0.04,  side: -1, dist: 26, radius: 18, landmark: 'giant_causeway' },
  { type: 'observatory', name: '爱丁堡城堡',       desc: '石堡压在死火山上，风比城垛还要尖。', t: 0.12,  side: 1,  dist: 24, radius: 12, landmark: 'edinburgh_castle' },
  { type: 'lake',        name: '尼斯湖',           desc: '黑绿湖水铺到山脚，雾气贴着水面走。', t: 0.20,  side: -1, dist: 32, radius: 26, landmark: 'loch_ness' },
  { type: 'forest',      name: '哈德良长城',       desc: '矮石墙横过丘陵，罗马把国境线钉在草里。', t: 0.28,  side: 1,  dist: 22, radius: 14, landmark: 'hadrians_wall' },
  { type: 'lake',        name: '湖区',             desc: '镜面湖夹在圆丘之间，羊比人走得还慢。', t: 0.36,  side: -1, dist: 28, radius: 22, landmark: 'lake_district' },
  { type: 'observatory', name: '约克大教堂',       desc: '哥特双塔对着老城，彩窗把石墙染成冷色。', t: 0.44,  side: 1,  dist: 24, radius: 10, landmark: 'york_minster' },
  { type: 'meadow',      name: '巨石阵',           desc: '石门围成一圈，草原把影子拉成日晷。', t: 0.52,  side: -1, dist: 26, radius: 18, landmark: 'stonehenge' },
  { type: 'observatory', name: '伦敦塔桥',         desc: '双塔吊桥跨过泰晤士，桥面比河风还要齐。', t: 0.60,  side: 1,  dist: 26, radius: 10, landmark: 'tower_bridge' },
  { type: 'lighthouse',  name: '大本钟',           desc: '钟楼贴着议会，整点把整条河按得很准。', t: 0.68,  side: -1, dist: 24, radius: 9,  landmark: 'big_ben' },
  { type: 'observatory', name: '圣保罗大教堂',     desc: '石穹顶压在城上，十字把天空钉住。', t: 0.76,  side: 1,  dist: 24, radius: 10, landmark: 'st_pauls' },
  { type: 'observatory', name: '温莎城堡',         desc: '圆塔立在泰晤士上游，旗在风里拍得很整齐。', t: 0.84,  side: -1, dist: 24, radius: 12, landmark: 'windsor' },
  { type: 'lighthouse',  name: '多佛白崖',         desc: '白垩崖壁对着海峡，灯塔比浪先看见对岸。', t: 0.93,  side: 1,  dist: 28, radius: 16, landmark: 'white_cliffs' },
];

/** 韩国：半岛南北环线（景福宫到济州，各地标简模） */
const KOREA_POIS: PoiDef[] = [
  { type: 'lighthouse',  name: '首尔塔',           desc: '细塔立在南山风里，夜灯把汉江折成一条金线。', t: 0.04,  side: -1, dist: 24, radius: 8,  landmark: 'n_seoul_tower' },
  { type: 'observatory', name: '景福宫',           desc: '丹青殿宇对着北岳山，石阶把影子叠得很齐。', t: 0.12,  side: 1,  dist: 24, radius: 12, landmark: 'gyeongbokgung' },
  { type: 'forest',      name: '北村韩屋',         desc: '瓦垄巷子挤在山坡上，烟囱比旗杆还密。', t: 0.20,  side: -1, dist: 22, radius: 12, landmark: 'bukchon' },
  { type: 'lighthouse',  name: '乐天世界塔',       desc: '玻璃针塔刺破江南，云比电梯走得还慢。', t: 0.28,  side: 1,  dist: 24, radius: 9,  landmark: 'lotte_tower' },
  { type: 'observatory', name: '水原华城',         desc: '石墙绕城一圈，炮楼把平原看得很远。', t: 0.36,  side: -1, dist: 24, radius: 12, landmark: 'hwaseong' },
  { type: 'observatory', name: '庆州瞻星台',       desc: '瓶形石台对着夜空，新罗把星辰记在砖缝里。', t: 0.44,  side: 1,  dist: 22, radius: 8,  landmark: 'cheomseongdae' },
  { type: 'forest',      name: '佛国寺',           desc: '双塔立在石阶上，钟声比松涛先到。', t: 0.52,  side: -1, dist: 22, radius: 12, landmark: 'bulguksa' },
  { type: 'forest',      name: '甘川文化村',       desc: '彩屋叠在釜山坡上，巷子比海风还窄。', t: 0.60,  side: 1,  dist: 22, radius: 12, landmark: 'gamcheon' },
  { type: 'lake',        name: '海云台',           desc: '弯沙滩贴着高楼，浪把脚印一遍遍抹平。', t: 0.68,  side: -1, dist: 28, radius: 22, landmark: 'haeundae' },
  { type: 'meadow',      name: '汉拿山',           desc: '火山口嵌在云里，济州的风比熔岩还硬。', t: 0.76,  side: 1,  dist: 28, radius: 20, landmark: 'hallasan' },
  { type: 'forest',      name: '济州石爷爷',       desc: '玄武岩人像立在田埂，帽子比笑容还圆。', t: 0.84,  side: -1, dist: 22, radius: 12, landmark: 'hareubang' },
  { type: 'meadow',      name: '城山日出峰',       desc: '火山口探进海里，晨光比草还要绿。', t: 0.93,  side: 1,  dist: 26, radius: 18, landmark: 'seongsan' },
];

/** 意大利：靴形南北环线（罗马到西西里，各地标简模） */
const ITALY_POIS: PoiDef[] = [
  { type: 'observatory', name: '罗马斗兽场',       desc: '破拱一层层围成椭圆，影子在拱洞里来回切。', t: 0.04,  side: -1, dist: 26, radius: 12, landmark: 'colosseum' },
  { type: 'observatory', name: '万神殿',           desc: '圆穹顶开着天眼，雨会从圆心落到石板上。', t: 0.12,  side: 1,  dist: 22, radius: 10, landmark: 'pantheon' },
  { type: 'observatory', name: '梵蒂冈圣彼得',     desc: '石穹顶压在广场上，柱廊把天空围成一圈。', t: 0.20,  side: -1, dist: 24, radius: 12, landmark: 'vatican' },
  { type: 'observatory', name: '罗马广场',         desc: '残柱立在荒草里，帝国把路铺到脚边就停了。', t: 0.28,  side: 1,  dist: 22, radius: 12, landmark: 'roman_forum' },
  { type: 'observatory', name: '比萨斜塔',         desc: '白塔斜着站在草坪上，风似乎也偏了一点。', t: 0.36,  side: -1, dist: 22, radius: 8,  landmark: 'pisa' },
  { type: 'observatory', name: '佛罗伦萨百花',     desc: '红瓦穹顶压在老城上，钟楼把影子拉得很长。', t: 0.44,  side: 1,  dist: 24, radius: 10, landmark: 'florence_duomo' },
  { type: 'lake',        name: '威尼斯',           desc: '贡多拉贴着墙根走，水比石板路还要亮。', t: 0.52,  side: -1, dist: 30, radius: 24, landmark: 'venice' },
  { type: 'observatory', name: '米兰大教堂',       desc: '石刺密密插向天空，广场把整座城摊得很开。', t: 0.60,  side: 1,  dist: 24, radius: 10, landmark: 'milan_duomo' },
  { type: 'forest',      name: '庞贝',             desc: '火山灰里露出墙基，街道还留着车辙。', t: 0.68,  side: -1, dist: 22, radius: 14, landmark: 'pompeii' },
  { type: 'lake',        name: '阿马尔菲',         desc: '彩楼贴着悬崖，海比瓷砖还要蓝。', t: 0.76,  side: 1,  dist: 28, radius: 22, landmark: 'amalfi' },
  { type: 'forest',      name: '五渔村',           desc: '五座彩村挂在崖上，火车从隧道里钻出来。', t: 0.84,  side: -1, dist: 22, radius: 14, landmark: 'cinque_terre' },
  { type: 'meadow',      name: '埃特纳火山',       desc: '黑坡托着白烟，西西里把火藏在地心里。', t: 0.93,  side: 1,  dist: 28, radius: 20, landmark: 'etna' },
];

/** 土耳其：东西向宽幅环线（伊斯坦布尔到阿拉拉特，各地标简模） */
const TURKEY_POIS: PoiDef[] = [
  { type: 'observatory', name: '圣索菲亚',         desc: '巨穹顶压在金角湾上，宣礼塔把天空钉成四点。', t: 0.04,  side: -1, dist: 24, radius: 12, landmark: 'hagia_sophia' },
  { type: 'observatory', name: '蓝色清真寺',       desc: '六座细塔围着庭院，瓷砖把光折成冷蓝。', t: 0.12,  side: 1,  dist: 24, radius: 12, landmark: 'blue_mosque' },
  { type: 'lighthouse',  name: '加拉塔塔',         desc: '石塔立在贝伊奥卢坡上，海峡风比钟还尖。', t: 0.20,  side: -1, dist: 22, radius: 8,  landmark: 'galata' },
  { type: 'observatory', name: '博斯普鲁斯大桥',   desc: '钢索跨过两洲，船从桥底下把海切开。', t: 0.28,  side: 1,  dist: 26, radius: 10, landmark: 'bosphorus' },
  { type: 'meadow',      name: '卡帕多奇亚',       desc: '石笋城堡从荒原里长出来，热气球比云还低。', t: 0.36,  side: -1, dist: 28, radius: 20, landmark: 'cappadocia' },
  { type: 'lake',        name: '棉花堡',           desc: '白台阶叠着蓝水洼，矿泉把山坡浇成瓷器。', t: 0.44,  side: 1,  dist: 28, radius: 22, landmark: 'pamukkale' },
  { type: 'forest',      name: '以弗所',           desc: '石柱大道通向图书馆，残墙把风切成格子。', t: 0.52,  side: -1, dist: 22, radius: 14, landmark: 'ephesus' },
  { type: 'observatory', name: '特洛伊木马',       desc: '木马立在城垣前，海风比传说走得还远。', t: 0.60,  side: 1,  dist: 22, radius: 10, landmark: 'troy' },
  { type: 'meadow',      name: '内姆鲁特山',       desc: '巨石头像坐在山顶，日出先照到他们的额头。', t: 0.68,  side: -1, dist: 26, radius: 16, landmark: 'nemrut' },
  { type: 'lake',        name: '安塔利亚港',       desc: '旧港口贴着白崖，帆比橙树还密。', t: 0.76,  side: 1,  dist: 28, radius: 22, landmark: 'antalya' },
  { type: 'forest',      name: '苏美拉修道院',     desc: '修道院嵌进崖壁，雾从谷底往上爬。', t: 0.84,  side: -1, dist: 24, radius: 14, landmark: 'sumela' },
  { type: 'meadow',      name: '阿拉拉特山',       desc: '雪峰压在亚美尼亚高原尽头，云比山走得还慢。', t: 0.93,  side: 1,  dist: 30, radius: 22, landmark: 'ararat' },
];

/** 沙特阿拉伯：沙漠南北环线（红海到纳季德，各地标简模） */
const SAUDI_POIS: PoiDef[] = [
  { type: 'observatory', name: '麦加禁寺',         desc: '黑立方立在庭院中央，细塔把朝向钉得很准。', t: 0.04,  side: -1, dist: 26, radius: 12, landmark: 'haram' },
  { type: 'observatory', name: '麦地那先知寺',     desc: '绿穹顶压在廊柱上，庭院比沙漠还要静。', t: 0.12,  side: 1,  dist: 24, radius: 12, landmark: 'nabawi' },
  { type: 'lighthouse',  name: '利雅得王国中心',   desc: '倒三角塔开着天窗，草原把首都摊成一张图。', t: 0.20,  side: -1, dist: 24, radius: 9,  landmark: 'kingdom_centre' },
  { type: 'observatory', name: '麦斯马克堡',       desc: '泥砖城堡压在旧城里，城门还留着一截阴影。', t: 0.28,  side: 1,  dist: 22, radius: 10, landmark: 'masmak' },
  { type: 'forest',      name: '迪里耶',           desc: '泥墙巷子贴着干河床，棕榈把风切成细条。', t: 0.36,  side: -1, dist: 22, radius: 14, landmark: 'diriyah' },
  { type: 'forest',      name: '希格拉石墓',       desc: '岩壁上开着墓室口，沙漠把凿痕保存得很深。', t: 0.44,  side: 1,  dist: 24, radius: 14, landmark: 'hegra' },
  { type: 'meadow',      name: '象岩',             desc: '整块砂岩像象鼻探出，影子在沙上折成弧。', t: 0.52,  side: -1, dist: 26, radius: 16, landmark: 'elephant_rock' },
  { type: 'lighthouse',  name: '吉达喷泉',         desc: '水柱刺破红海夜空，潮气把码头打得很亮。', t: 0.60,  side: 1,  dist: 26, radius: 10, landmark: 'jeddah_fountain' },
  { type: 'lake',        name: '红海礁岸',         desc: '珊瑚贴着浅滩，水比对岸的沙还要蓝。', t: 0.68,  side: -1, dist: 30, radius: 24, landmark: 'red_sea' },
  { type: 'meadow',      name: '世界边缘',         desc: '石灰岩悬崖切开高原，风从谷底一直吹到靴面。', t: 0.76,  side: 1,  dist: 28, radius: 18, landmark: 'edge_world' },
  { type: 'meadow',      name: '空旷四分地',       desc: '沙丘一道道铺到天边，脚印比风先消失。', t: 0.84,  side: -1, dist: 30, radius: 22, landmark: 'empty_quarter' },
  { type: 'forest',      name: '阿卜哈山地',       desc: '绿阶梯田嵌进云里，阿西尔比沙漠更凉。', t: 0.93,  side: 1,  dist: 24, radius: 14, landmark: 'abha' },
];

/** 南非：南端大陆环线（桌山到克鲁格，各地标简模） */
const SOUTH_AFRICA_POIS: PoiDef[] = [
  { type: 'meadow',      name: '桌山',             desc: '平顶山压在开普敦上头，云桌布比风还整齐。', t: 0.04,  side: -1, dist: 30, radius: 22, landmark: 'table_mountain' },
  { type: 'lighthouse',  name: '好望角',           desc: '灯塔立在非洲南端，两洋的风在这里碰头。', t: 0.12,  side: 1,  dist: 26, radius: 10, landmark: 'cape_point' },
  { type: 'lake',        name: '罗本岛',           desc: '石堡岛浮在桌湾里，潮水把墙根打得很白。', t: 0.20,  side: -1, dist: 28, radius: 22, landmark: 'robben_island' },
  { type: 'forest',      name: '企鹅滩',           desc: '圆企鹅走在圆石头上，浪比它们还要吵。', t: 0.28,  side: 1,  dist: 24, radius: 14, landmark: 'boulders' },
  { type: 'observatory', name: '联合大厦',         desc: '双翼办公楼坐在山坡上，草坪把首都摊开。', t: 0.36,  side: -1, dist: 24, radius: 12, landmark: 'union_buildings' },
  { type: 'observatory', name: '约翰内斯堡',       desc: '矿渣山与玻璃楼并立，高原把影子拉得很长。', t: 0.44,  side: 1,  dist: 24, radius: 10, landmark: 'joburg' },
  { type: 'forest',      name: '克鲁格',           desc: '金合欢树下有兽道，暮色比尘土还要红。', t: 0.52,  side: -1, dist: 26, radius: 16, landmark: 'kruger' },
  { type: 'meadow',      name: '德拉肯斯堡',       desc: '玄武岩墙立在云上，溪水从裂缝里掉下去。', t: 0.60,  side: 1,  dist: 28, radius: 20, landmark: 'drakensberg' },
  { type: 'forest',      name: '布莱德河峡谷',     desc: '绿峡谷一层层切开，三孔瀑布把雾送得很远。', t: 0.68,  side: -1, dist: 24, radius: 16, landmark: 'blyde' },
  { type: 'lake',        name: '德班海滨',         desc: '暖浪贴着棕榈排开，板走球比潮汐还齐。', t: 0.76,  side: 1,  dist: 28, radius: 22, landmark: 'durban' },
  { type: 'lake',        name: '花园大道',         desc: '海湾和林带交替出现，雾从山里滑到海边。', t: 0.84,  side: -1, dist: 28, radius: 22, landmark: 'garden_route' },
  { type: 'lighthouse',  name: '厄加勒斯角',       desc: '灯塔钉在大陆最南，海图在这里把洋流分开。', t: 0.93,  side: 1,  dist: 26, radius: 10, landmark: 'agulhas' },
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
  {
    id: 'japan',
    name: '日本',
    blurb: '狭长列岛公路，从北海道的棱堡骑向富士与京都，直到冲绳朱门。',
    curve: {
      baseRadius: 560,
      ctrlCount: 76,
      radiusNoiseScale: 1.35,
      radiusNoiseScale2: 2.6,
      seedOffset1: 77,
      seedOffset2: 19,
      heightScale: 20,
      heightFreq: 0.00115,
      heightSeedX: 9.1,
      heightSeedZ: 3.4,
      heightBias: 0.42,
      scaleX: 0.38,
      scaleZ: 1.82,
      rotateY: 0.62,
    },
    poiDefs: JAPAN_POIS,
    palette: {
      grass: [0.34, 0.56, 0.30],
      skirt: [0.32, 0.52, 0.28],
    },
    coastLeft: true,
  },
  {
    id: 'usa',
    name: '美国',
    blurb: '东西向宽幅公路，从金门与峡谷骑向总统山，直到自由女神。',
    curve: {
      baseRadius: 640,
      ctrlCount: 74,
      radiusNoiseScale: 1.55,
      radiusNoiseScale2: 3.1,
      seedOffset1: 28,
      seedOffset2: 91,
      heightScale: 40,
      heightFreq: 0.00122,
      heightSeedX: 6.4,
      heightSeedZ: 18.7,
      heightBias: 0.38,
      scaleX: 1.72,
      scaleZ: 0.68,
    },
    poiDefs: USA_POIS,
    palette: {
      grass: [0.42, 0.52, 0.26],
      skirt: [0.46, 0.48, 0.28],
    },
  },
  {
    id: 'australia',
    name: '澳大利亚',
    blurb: '大陆环线从歌剧院骑向红土中央，再绕过尖峰石阵回到南方。',
    curve: {
      baseRadius: 620,
      ctrlCount: 72,
      radiusNoiseScale: 1.5,
      radiusNoiseScale2: 2.9,
      seedOffset1: 53,
      seedOffset2: 12,
      heightScale: 24,
      heightFreq: 0.0011,
      heightSeedX: 11.2,
      heightSeedZ: 7.6,
      heightBias: 0.41,
      scaleX: 1.28,
      scaleZ: 0.92,
    },
    poiDefs: AUSTRALIA_POIS,
    palette: {
      grass: [0.50, 0.48, 0.24],
      skirt: [0.54, 0.44, 0.26],
    },
    coastLeft: true,
  },
  {
    id: 'egypt',
    name: '埃及',
    blurb: '沿尼罗河谷南下，从亚历山大灯塔骑向金字塔与阿布辛贝。',
    curve: {
      baseRadius: 580,
      ctrlCount: 70,
      radiusNoiseScale: 1.25,
      radiusNoiseScale2: 2.4,
      seedOffset1: 8,
      seedOffset2: 44,
      heightScale: 14,
      heightFreq: 0.00095,
      heightSeedX: 2.8,
      heightSeedZ: 19.5,
      heightBias: 0.46,
      scaleX: 0.34,
      scaleZ: 1.88,
    },
    poiDefs: EGYPT_POIS,
    palette: {
      grass: [0.62, 0.52, 0.30],
      skirt: [0.68, 0.54, 0.32],
    },
  },
  {
    id: 'india',
    name: '印度',
    blurb: '半岛环线从金庙与泰姬陵南下，直到喀拉拉的船屋与米纳克希。',
    curve: {
      baseRadius: 600,
      ctrlCount: 72,
      radiusNoiseScale: 1.45,
      radiusNoiseScale2: 2.8,
      seedOffset1: 33,
      seedOffset2: 81,
      heightScale: 28,
      heightFreq: 0.00112,
      heightSeedX: 5.7,
      heightSeedZ: 14.2,
      heightBias: 0.40,
      scaleX: 0.86,
      scaleZ: 1.42,
    },
    poiDefs: INDIA_POIS,
    palette: {
      grass: [0.36, 0.50, 0.22],
      skirt: [0.40, 0.48, 0.24],
    },
  },
  {
    id: 'canada',
    name: '加拿大',
    blurb: '东西向宽幅公路，从狮门桥与落基山骑向国会山，直到大西洋灯塔。',
    curve: {
      baseRadius: 660,
      ctrlCount: 74,
      radiusNoiseScale: 1.6,
      radiusNoiseScale2: 3.2,
      seedOffset1: 17,
      seedOffset2: 59,
      heightScale: 42,
      heightFreq: 0.00118,
      heightSeedX: 8.3,
      heightSeedZ: 21.1,
      heightBias: 0.37,
      scaleX: 1.82,
      scaleZ: 0.56,
    },
    poiDefs: CANADA_POIS,
    palette: {
      grass: [0.38, 0.48, 0.40],
      skirt: [0.44, 0.52, 0.50],
    },
  },
  {
    id: 'france',
    name: '法国',
    blurb: '紧凑环线从铁塔与卢浮宫南下，直到薰衣草田与蔚蓝海岸。',
    curve: {
      baseRadius: 540,
      ctrlCount: 70,
      radiusNoiseScale: 1.3,
      radiusNoiseScale2: 2.5,
      seedOffset1: 64,
      seedOffset2: 23,
      heightScale: 22,
      heightFreq: 0.00108,
      heightSeedX: 3.6,
      heightSeedZ: 12.8,
      heightBias: 0.43,
      scaleX: 1.14,
      scaleZ: 1.08,
    },
    poiDefs: FRANCE_POIS,
    palette: {
      grass: [0.32, 0.54, 0.26],
      skirt: [0.34, 0.50, 0.24],
    },
  },
  {
    id: 'brazil',
    name: '巴西',
    blurb: '南北大陆环线从基督像与瀑布北上，直到亚马孙河与沙丘水洼。',
    curve: {
      baseRadius: 620,
      ctrlCount: 72,
      radiusNoiseScale: 1.55,
      radiusNoiseScale2: 3.0,
      seedOffset1: 46,
      seedOffset2: 97,
      heightScale: 30,
      heightFreq: 0.00114,
      heightSeedX: 13.4,
      heightSeedZ: 6.9,
      heightBias: 0.39,
      scaleX: 0.88,
      scaleZ: 1.38,
    },
    poiDefs: BRAZIL_POIS,
    palette: {
      grass: [0.22, 0.48, 0.18],
      skirt: [0.26, 0.46, 0.20],
    },
  },
  {
    id: 'mexico',
    name: '墨西哥',
    blurb: '角状环线从下加州石拱骑向高原金字塔，直到尤卡坦的海边玛雅城。',
    curve: {
      baseRadius: 600,
      ctrlCount: 72,
      radiusNoiseScale: 1.5,
      radiusNoiseScale2: 2.9,
      seedOffset1: 21,
      seedOffset2: 74,
      heightScale: 36,
      heightFreq: 0.00116,
      heightSeedX: 7.2,
      heightSeedZ: 16.8,
      heightBias: 0.38,
      scaleX: 1.32,
      scaleZ: 0.80,
      rotateY: -0.52,
    },
    poiDefs: MEXICO_POIS,
    palette: {
      grass: [0.50, 0.46, 0.26],
      skirt: [0.54, 0.42, 0.24],
    },
  },
  {
    id: 'uk',
    name: '英国',
    blurb: '列岛南北公路，从巨人堤与爱丁堡骑向巨石阵，直到塔桥与多佛白崖。',
    curve: {
      baseRadius: 560,
      ctrlCount: 74,
      radiusNoiseScale: 1.4,
      radiusNoiseScale2: 2.7,
      seedOffset1: 88,
      seedOffset2: 31,
      heightScale: 26,
      heightFreq: 0.0012,
      heightSeedX: 10.4,
      heightSeedZ: 4.7,
      heightBias: 0.42,
      scaleX: 0.48,
      scaleZ: 1.72,
      rotateY: 0.12,
    },
    poiDefs: UK_POIS,
    palette: {
      grass: [0.28, 0.50, 0.28],
      skirt: [0.32, 0.48, 0.30],
    },
    coastLeft: true,
  },
  {
    id: 'korea',
    name: '韩国',
    blurb: '半岛南北公路，从南山塔与景福宫骑向佛国寺，直到济州汉拿山。',
    curve: {
      baseRadius: 540,
      ctrlCount: 72,
      radiusNoiseScale: 1.35,
      radiusNoiseScale2: 2.6,
      seedOffset1: 39,
      seedOffset2: 71,
      heightScale: 28,
      heightFreq: 0.00118,
      heightSeedX: 6.1,
      heightSeedZ: 13.4,
      heightBias: 0.41,
      scaleX: 0.44,
      scaleZ: 1.62,
      rotateY: 0.18,
    },
    poiDefs: KOREA_POIS,
    palette: {
      grass: [0.32, 0.52, 0.26],
      skirt: [0.30, 0.50, 0.24],
    },
  },
  {
    id: 'italy',
    name: '意大利',
    blurb: '靴形环线从斗兽场骑向佛罗伦萨与威尼斯，直到五渔村与埃特纳。',
    curve: {
      baseRadius: 580,
      ctrlCount: 74,
      radiusNoiseScale: 1.4,
      radiusNoiseScale2: 2.7,
      seedOffset1: 52,
      seedOffset2: 18,
      heightScale: 30,
      heightFreq: 0.00114,
      heightSeedX: 8.8,
      heightSeedZ: 2.9,
      heightBias: 0.40,
      scaleX: 0.52,
      scaleZ: 1.52,
      rotateY: 0.38,
    },
    poiDefs: ITALY_POIS,
    palette: {
      grass: [0.34, 0.52, 0.24],
      skirt: [0.36, 0.48, 0.22],
    },
  },
  {
    id: 'turkey',
    name: '土耳其',
    blurb: '东西向宽幅公路，从圣索菲亚骑向卡帕多奇亚，直到棉花堡与阿拉拉特。',
    curve: {
      baseRadius: 620,
      ctrlCount: 72,
      radiusNoiseScale: 1.5,
      radiusNoiseScale2: 2.9,
      seedOffset1: 11,
      seedOffset2: 67,
      heightScale: 32,
      heightFreq: 0.0011,
      heightSeedX: 14.2,
      heightSeedZ: 9.6,
      heightBias: 0.39,
      scaleX: 1.58,
      scaleZ: 0.70,
    },
    poiDefs: TURKEY_POIS,
    palette: {
      grass: [0.48, 0.50, 0.28],
      skirt: [0.50, 0.46, 0.26],
    },
  },
  {
    id: 'saudi',
    name: '沙特阿拉伯',
    blurb: '沙漠南北环线从红海喷泉骑向纳季德城堡，直到空旷沙丘与阿卜哈山地。',
    curve: {
      baseRadius: 600,
      ctrlCount: 70,
      radiusNoiseScale: 1.28,
      radiusNoiseScale2: 2.5,
      seedOffset1: 27,
      seedOffset2: 93,
      heightScale: 18,
      heightFreq: 0.00098,
      heightSeedX: 3.4,
      heightSeedZ: 17.1,
      heightBias: 0.45,
      scaleX: 0.78,
      scaleZ: 1.32,
    },
    poiDefs: SAUDI_POIS,
    palette: {
      grass: [0.62, 0.52, 0.30],
      skirt: [0.66, 0.50, 0.32],
    },
  },
  {
    id: 'south_africa',
    name: '南非',
    blurb: '南端大陆环线从桌山与好望角骑向克鲁格，直到花园大道与厄加勒斯角。',
    curve: {
      baseRadius: 600,
      ctrlCount: 72,
      radiusNoiseScale: 1.48,
      radiusNoiseScale2: 2.85,
      seedOffset1: 61,
      seedOffset2: 24,
      heightScale: 34,
      heightFreq: 0.00112,
      heightSeedX: 12.6,
      heightSeedZ: 5.3,
      heightBias: 0.38,
      scaleX: 1.08,
      scaleZ: 1.18,
    },
    poiDefs: SOUTH_AFRICA_POIS,
    palette: {
      grass: [0.48, 0.46, 0.24],
      skirt: [0.52, 0.42, 0.22],
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
  { id: 'usa', name: '美国', lat: 39.0, lon: -98.0, open: true, countryId: 'usa' },
  { id: 'japan', name: '日本', lat: 36.0, lon: 138.0, open: true, countryId: 'japan' },
  { id: 'brazil', name: '巴西', lat: -10.0, lon: -55.0, open: true, countryId: 'brazil' },
  { id: 'france', name: '法国', lat: 46.0, lon: 2.0, open: true, countryId: 'france' },
  { id: 'australia', name: '澳大利亚', lat: -25.0, lon: 134.0, open: true, countryId: 'australia' },
  { id: 'india', name: '印度', lat: 22.0, lon: 78.0, open: true, countryId: 'india' },
  { id: 'canada', name: '加拿大', lat: 56.0, lon: -106.0, open: true, countryId: 'canada' },
  { id: 'egypt', name: '埃及', lat: 26.0, lon: 30.0, open: true, countryId: 'egypt' },
  { id: 'mexico', name: '墨西哥', lat: 23.6, lon: -102.5, open: true, countryId: 'mexico' },
  { id: 'uk', name: '英国', lat: 54.0, lon: -2.5, open: true, countryId: 'uk' },
  { id: 'korea', name: '韩国', lat: 36.5, lon: 127.8, open: true, countryId: 'korea' },
  { id: 'italy', name: '意大利', lat: 42.8, lon: 12.5, open: true, countryId: 'italy' },
  { id: 'turkey', name: '土耳其', lat: 39.0, lon: 35.0, open: true, countryId: 'turkey' },
  { id: 'saudi', name: '沙特阿拉伯', lat: 24.0, lon: 45.0, open: true, countryId: 'saudi' },
  { id: 'south_africa', name: '南非', lat: -29.0, lon: 25.0, open: true, countryId: 'south_africa' },
];
