import { rand } from './World';

/** 中国 56 个民族官方名称 */
export const CHINA_ETHNICITIES = [
  '汉族', '蒙古族', '回族', '藏族', '维吾尔族', '苗族', '彝族', '壮族', '布依族', '朝鲜族',
  '满族', '侗族', '瑶族', '白族', '土家族', '哈尼族', '哈萨克族', '傣族', '黎族', '傈僳族',
  '佤族', '畲族', '高山族', '拉祜族', '水族', '东乡族', '纳西族', '景颇族', '柯尔克孜族', '土族',
  '达斡尔族', '仫佬族', '羌族', '布朗族', '撒拉族', '毛南族', '仡佬族', '锡伯族', '阿昌族', '普米族',
  '塔吉克族', '怒族', '乌孜别克族', '俄罗斯族', '鄂温克族', '德昂族', '保安族', '裕固族', '京族', '塔塔尔族',
  '独龙族', '鄂伦春族', '赫哲族', '门巴族', '珞巴族', '基诺族',
] as const;

export type ChinaEthnicityName = (typeof CHINA_ETHNICITIES)[number];

export type HeadwearKind = 'none' | 'hat' | 'scarf' | 'veil' | 'fur' | 'crown';

/** 服饰配色与头饰定义（中国民族 / 俄罗斯传统装均可复用） */
export interface OutfitDef {
  name: string;
  primary: number;
  secondary: number;
  accent: number;
  headwear: HeadwearKind;
  /** 皮肤色，默认东亚肤色 */
  skin?: number;
}

function hashName(name: string): number {
  let h = 2166136261;
  for (let i = 0; i < name.length; i++) {
    h ^= name.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967296;
}

function paletteForEthnicity(name: string): OutfitDef {
  const t = hashName(name);
  const hues: [number, number, number][] = [
    [0xc23b2e, 0xf5e6c8, 0xc9a227],
    [0x2f6b4f, 0xe8d5a3, 0xd4a574],
    [0x3a5a9a, 0xf0ece4, 0xc9a227],
    [0x8b1e3f, 0xf4e4bc, 0xe07a28],
    [0x5c3d2e, 0xd4c4a8, 0x8a6238],
    [0x1f4e79, 0xe8e4dc, 0xb8860b],
    [0x6b2d5c, 0xf2e8d5, 0xd4a05a],
    [0x2a6e5a, 0xfff4e0, 0xc43c3c],
  ];
  const base = hues[Math.floor(t * hues.length) % hues.length];
  const special: Record<string, Partial<OutfitDef>> = {
    '汉族': { primary: 0xc23b2e, secondary: 0xf5e6c8, accent: 0xc9a227, headwear: 'none' },
    '蒙古族': { primary: 0x2f6b4f, secondary: 0xe8d5a3, accent: 0xc9a227, headwear: 'hat' },
    '回族': { primary: 0xffffff, secondary: 0x2a2a2e, accent: 0xc9a227, headwear: 'hat' },
    '藏族': { primary: 0xc23b2e, secondary: 0x1a1a1c, accent: 0xc9a227, headwear: 'fur' },
    '维吾尔族': { primary: 0x3a5a9a, secondary: 0xf0ece4, accent: 0xc9a227, headwear: 'hat' },
    '苗族': { primary: 0x1a1a2e, secondary: 0xc9a227, accent: 0xe8e4dc, headwear: 'crown' },
    '彝族': { primary: 0x1a1a1c, secondary: 0xc23b2e, accent: 0xc9a227, headwear: 'hat' },
    '壮族': { primary: 0x2a6e8c, secondary: 0xf5e6c8, accent: 0xc23b2e, headwear: 'scarf' },
    '朝鲜族': { primary: 0xf0ece4, secondary: 0xc23b2e, accent: 0x2a6e8c, headwear: 'hat' },
    '满族': { primary: 0x2a2a4a, secondary: 0xc9a227, accent: 0xc23b2e, headwear: 'hat' },
    '侗族': { primary: 0x2f6b4f, secondary: 0xe8d5a3, accent: 0xc23b2e, headwear: 'scarf' },
    '瑶族': { primary: 0xc23b2e, secondary: 0x1a1a1c, accent: 0xc9a227, headwear: 'hat' },
    '白族': { primary: 0xf5f5f2, secondary: 0xc23b2e, accent: 0x3a5a9a, headwear: 'scarf' },
    '土家族': { primary: 0x3a6ec9, secondary: 0xf5e6c8, accent: 0xc23b2e, headwear: 'none' },
    '傣族': { primary: 0xe07a28, secondary: 0xf5e6c8, accent: 0xc9a227, headwear: 'veil' },
    '黎族': { primary: 0x2f6b4f, secondary: 0xc23b2e, accent: 0xc9a227, headwear: 'scarf' },
    '高山族': { primary: 0xc23b2e, secondary: 0x2f6b4f, accent: 0xc9a227, headwear: 'crown' },
    '赫哲族': { primary: 0x3a5a9a, secondary: 0xd4c4a8, accent: 0xeef4fa, headwear: 'fur' },
    '鄂伦春族': { primary: 0x5c3d2e, secondary: 0xd4c4a8, accent: 0xeef4fa, headwear: 'fur' },
    '鄂温克族': { primary: 0x4a3a2a, secondary: 0xc4b8a0, accent: 0xeef4fa, headwear: 'fur' },
    '俄罗斯族': { primary: 0xc23b2e, secondary: 0xf5e6c8, accent: 0x3a5a9a, headwear: 'scarf' },
  };
  const hwRoll = hashName(name + ':hw');
  const headwear: HeadwearKind =
    hwRoll < 0.22 ? 'hat' : hwRoll < 0.4 ? 'scarf' : hwRoll < 0.52 ? 'veil' : hwRoll < 0.62 ? 'fur' : hwRoll < 0.72 ? 'crown' : 'none';
  const sp = special[name] ?? {};
  return {
    name,
    primary: sp.primary ?? base[0],
    secondary: sp.secondary ?? base[1],
    accent: sp.accent ?? base[2],
    headwear: sp.headwear ?? headwear,
    skin: 0xf0c9a4,
  };
}

export const ETHNICITY_OUTFITS: Record<string, OutfitDef> = Object.fromEntries(
  CHINA_ETHNICITIES.map((n) => [n, paletteForEthnicity(n)]),
);

/**
 * 各省固定民族列表（键 = POI 名中「·」前的省份）。
 * 并集覆盖全部 56 个民族；西北/西南未单独设站的群体挂靠邻近省份。
 */
export const PROVINCE_ETHNIC_MAP: Record<string, ChinaEthnicityName[]> = {
  '北京': ['汉族', '满族', '回族', '维吾尔族', '哈萨克族'],
  '河北': ['汉族', '满族', '蒙古族'],
  '山西': ['汉族', '土族', '裕固族', '塔吉克族', '乌孜别克族'],
  '陕西': ['回族', '东乡族', '撒拉族', '保安族', '柯尔克孜族'],
  '四川': ['藏族', '彝族', '羌族', '门巴族', '珞巴族'],
  '云南': ['傣族', '白族', '哈尼族', '纳西族', '基诺族'],
  '贵州': ['侗族', '苗族', '布依族', '水族', '仡佬族'],
  '湖南': ['土家族', '苗族', '瑶族', '傈僳族', '佤族'],
  '湖北': ['土家族', '拉祜族', '景颇族', '布朗族'],
  '安徽': ['汉族', '阿昌族', '普米族', '怒族'],
  '江苏': ['汉族', '德昂族', '独龙族'],
  '浙江': ['汉族', '畲族'],
  '福建': ['汉族', '畲族', '高山族'],
  '广东': ['汉族', '瑶族', '壮族'],
  '广西': ['壮族', '瑶族', '仫佬族', '毛南族', '京族'],
  '海南': ['黎族', '苗族'],
  '河南': ['汉族', '回族'],
  '山东': ['汉族', '回族'],
  '辽宁': ['满族', '蒙古族', '锡伯族', '朝鲜族', '塔塔尔族'],
  '吉林': ['朝鲜族', '满族', '蒙古族'],
  '黑龙江': ['赫哲族', '鄂伦春族', '达斡尔族', '鄂温克族', '俄罗斯族'],
};

export const RUSSIA_OUTFITS: OutfitDef[] = [
  { name: '萨拉凡', primary: 0xc23b2e, secondary: 0xf5e6c8, accent: 0xc9a227, headwear: 'scarf', skin: 0xf2d2b0 },
  { name: '哥萨克', primary: 0x2a3a4a, secondary: 0xc23b2e, accent: 0xc9a227, headwear: 'hat', skin: 0xf0c9a4 },
  { name: '驯鹿牧民', primary: 0x6a4a32, secondary: 0xd4c4a8, accent: 0xeef4fa, headwear: 'fur', skin: 0xe8c4a0 },
  { name: '毛皮袍', primary: 0x5a3d28, secondary: 0xc4b8a0, accent: 0xe8e4dc, headwear: 'fur', skin: 0xf0c9a4 },
  { name: '雪原长袍', primary: 0x3a5a9a, secondary: 0xeef4fa, accent: 0xc9a227, headwear: 'hat', skin: 0xf2d2b0 },
];

export function provinceKeyFromPoiName(poiName: string): string {
  const i = poiName.indexOf('·');
  return i >= 0 ? poiName.slice(0, i) : poiName;
}

/** 该省固定民族池；再按 poi id 种子从池中确定性取 1～2 个 */
export function greetersForChinaPoi(poiName: string, poiId = 1): OutfitDef[] {
  const key = provinceKeyFromPoiName(poiName);
  const pool = PROVINCE_ETHNIC_MAP[key] ?? (['汉族'] as ChinaEthnicityName[]);
  const seed = poiId * 17.31 + key.length * 3.7;
  const count = 1 + (rand(seed) < 0.55 && pool.length > 1 ? 1 : 0);
  const start = Math.floor(rand(seed + 0.41) * pool.length);
  const picked: OutfitDef[] = [];
  for (let i = 0; i < count; i++) {
    const name = pool[(start + i) % pool.length];
    picked.push(ETHNICITY_OUTFITS[name] ?? paletteForEthnicity(name));
  }
  return picked;
}

export function russiaOutfitsForPoi(poiId: number): OutfitDef[] {
  const seed = poiId * 11.7 + 4.2;
  const count = 1 + (rand(seed) < 0.6 ? 1 : 0);
  const start = Math.floor(rand(seed + 0.33) * RUSSIA_OUTFITS.length);
  const out: OutfitDef[] = [];
  for (let i = 0; i < count; i++) {
    out.push(RUSSIA_OUTFITS[(start + i) % RUSSIA_OUTFITS.length]);
  }
  return out;
}

/** 欢迎语（中文） */
export function greeterWelcomeMessage(packId: string, poi: { id: number; name: string }): string | null {
  if (packId === 'china') {
    const g = greetersForChinaPoi(poi.name, poi.id);
    const eth = g[0]?.name ?? '汉族';
    return `「${eth}」欢迎你来到${poi.name}！`;
  }
  if (packId === 'russia') {
    const g = russiaOutfitsForPoi(poi.id);
    const style = g[0]?.name ?? '萨拉凡';
    return `「${style}」欢迎你来到${poi.name}！`;
  }
  return null;
}

/** 开发校验：省份映射是否覆盖全部 56 族 */
export function assertAllEthnicitiesCovered(): { ok: boolean; missing: string[] } {
  const seen = new Set<string>();
  for (const list of Object.values(PROVINCE_ETHNIC_MAP)) {
    for (const n of list) seen.add(n);
  }
  const missing = CHINA_ETHNICITIES.filter((n) => !seen.has(n));
  return { ok: missing.length === 0, missing: [...missing] };
}
