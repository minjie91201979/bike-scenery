// countries.mjs — 各国特色店铺的文化配置数据层（「绘制逻辑」的数据化表达）
//
// 每条记录描述一座具有国家文化辨识度的卡通店铺：
//   id         唯一的短码，用于命令行参数与文件名
//   name       中文名（游戏内展示用）
//   en         英文名（用于文件名 slug）
//   building   建筑结构 / 地域风格（决定轮廓差异）
//   signature  文化符号元素（决定「一眼认出是哪个国家」）
//   palette    主题配色（强化系列统一下的国别差异）
//   light      时间段 / 光照氛围
//
// 想新增国家，只需在此文件追加一条记录即可，生成器会自动识别。

export const COUNTRIES = [
  {
    id: 'fr',
    name: '法国 · 咖啡馆',
    en: 'French Cafe',
    building:
      'elegant Haussmannian limestone apartment facade with a wrought-iron balcony and tall arched windows',
    signature:
      'red-and-white striped fabric awning, round marble bistro table with a coffee cup, gold CAFE plaque, potted ferns, tiny Eiffel Tower silhouette in the distance',
    palette: 'cream, terracotta red, warm gold, slate grey',
    light: 'bright sunny Parisian morning',
  },
  {
    id: 'jp',
    name: '日本 · 拉面店',
    en: 'Japanese Ramen Shop',
    building:
      'wooden Japanese machiya storefront with dark timber frame, paper shoji sliding doors, tiled hip roof',
    signature:
      'red split noren curtains with a circle motif, glowing red paper lanterns, a big ramen bowl sign, a steaming bowl on the counter, a small bonsai',
    palette: 'warm wood brown, vermilion red, cream, black',
    light: 'cozy evening with warm interior glow',
  },
  {
    id: 'mx',
    name: '墨西哥 · 集市',
    en: 'Mexican Market',
    building:
      'colorful Mexican market stall with arched openings and a Talavera tiled counter',
    signature:
      'a string of papel picado banners, a sombrero hanging, piles of chili and corn, terracotta pots, a cactus, a bright serape blanket',
    palette: 'turquoise, sunny yellow, terracotta, magenta',
    light: 'festive sunny plaza',
  },
  {
    id: 'it',
    name: '意大利 · 冰淇淋店',
    en: 'Italian Gelateria',
    building:
      'Mediterranean building with rounded arches, green shutters, warm terracotta walls',
    signature:
      'green-white-red striped awning, a display of colorful gelato tubs, a pizza sign, a climbing vine with lemons, a checkered bistro',
    palette: 'terracotta, olive green, cream, tomato red',
    light: 'warm Mediterranean afternoon',
  },
  {
    id: 'cn',
    name: '中国 · 茶馆',
    en: 'Chinese Tea House',
    building:
      'traditional Chinese wooden teahouse with upturned curved eaves roof and red lacquer pillars',
    signature:
      'hanging red lanterns, a bronze tea kettle sign, lattice windows, bonsai and bamboo, a hanging plaque with a round emblem',
    palette: 'vermilion red, jade green, gold, dark wood',
    light: 'serene daytime with soft light',
  },
  {
    id: 'gb',
    name: '英国 · 酒吧',
    en: 'English Pub',
    building:
      'red-brick English pub with white Tudor half-timbering and a bay window',
    signature:
      'a hanging carved wooden pub sign, flower boxes with red blooms, a red telephone booth nearby, a fish and chips board, a small flag accent',
    palette: 'deep red brick, forest green, cream, navy',
    light: 'overcast mild afternoon',
  },
  {
    id: 'us',
    name: '美国 · 复古餐厅',
    en: 'American Diner',
    building:
      'retro American roadside diner with chrome trim and big wrap windows',
    signature:
      'a neon EAT sign, red vinyl booths visible inside, a checkered floor strip, a star-spangled banner, classic car bumpers',
    palette: 'cherry red, chrome silver, sky blue, white',
    light: 'nostalgic sunset',
  },
  {
    id: 'nl',
    name: '荷兰 · 奶酪店',
    en: 'Dutch Cheese Shop',
    building:
      'narrow Dutch canal house with a stepped gable and large display windows',
    signature:
      'wheels of cheese on display, a bicycle leaning by the door, a tulip planter, blue-and-white Delft tile accents',
    palette: 'brick red, cobalt blue, cream, yellow',
    light: 'fresh spring morning',
  },
  {
    id: 'gr',
    name: '希腊 · 小酒馆',
    en: 'Greek Taverna',
    building:
      'whitewashed Greek island building with blue domes and arched openings',
    signature:
      'bougainvillea cascading over the wall, blue shutters, a table with olives and feta, fishing net decor',
    palette: 'pure white, Aegean blue, terracotta, olive',
    light: 'sun-drenched midday',
  },
  {
    id: 'in',
    name: '印度 · 香料店',
    en: 'Indian Spice Shop',
    building:
      'vibrant Indian shop with an arched doorway and a jharokha window',
    signature:
      'rows of colorful spice jars, marigold garlands, a small elephant statue, a rangoli pattern on the floor, hanging brass lamps',
    palette: 'saffron yellow, deep orange, magenta, teal',
    light: 'lively bazaar daylight',
  },
  {
    id: 'ma',
    name: '摩洛哥 · 手作店',
    en: 'Moroccan Shop',
    building:
      'Moroccan riad shop with a horseshoe arch and carved plaster walls',
    signature:
      'zellige mosaic tiles, a brass lantern, woven rugs hanging, a mint tea set, argan oil jars',
    palette: 'cobalt blue, white, terracotta, gold',
    light: 'warm souk light',
  },
  {
    id: 'th',
    name: '泰国 · 街头小吃',
    en: 'Thai Street Food',
    building:
      'Thai shophouse with a golden temple-style roof and stucco facade',
    signature:
      'a green-and-red Thai sign, a tuk-tuk beside the stall, a satay grill, tropical plants, a laughing Buddha statue',
    palette: 'golden yellow, emerald green, hot pink, red',
    light: 'tropical dusk',
  },
];

/** 按 id 取单条配置 */
export function getCountry(id) {
  return COUNTRIES.find((c) => c.id === id);
}

/** 把英文名转成安全文件名 slug，例如 'French Cafe' -> 'french_cafe' */
export function slug(en) {
  return en
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}
