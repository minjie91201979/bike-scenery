import type { Artist, Playlist, RecommendContext, SearchType, Track } from '../types';
import type { MusicProvider } from './types';

/** Tiny silent WAV (0.3s) — enough for HTMLAudioElement play without network. */
const SILENT_WAV =
  'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA=';

const ARTISTS: Artist[] = [
  { id: 'ma-1', name: '周深', coverUrl: '' },
  { id: 'ma-2', name: '陈绮贞', coverUrl: '' },
  { id: 'ma-3', name: '朴树', coverUrl: '' },
  { id: 'ma-4', name: '李健', coverUrl: '' },
  { id: 'ma-5', name: '王菲', coverUrl: '' },
];

const TRACKS: Track[] = [
  { id: 'mt-1', name: '大鱼', artists: [ARTISTS[0]], album: '大鱼海棠', durationMs: 278000, sourceId: 'mt-1' },
  { id: 'mt-2', name: '旅行的意义', artists: [ARTISTS[1]], album: '华丽的冒险', durationMs: 265000, sourceId: 'mt-2' },
  { id: 'mt-3', name: '平凡之路', artists: [ARTISTS[2]], album: '猎人手记', durationMs: 251000, sourceId: 'mt-3' },
  { id: 'mt-4', name: '贝加尔湖畔', artists: [ARTISTS[3]], album: '依然', durationMs: 302000, sourceId: 'mt-4' },
  { id: 'mt-5', name: '传奇', artists: [ARTISTS[4]], album: '致青春', durationMs: 286000, sourceId: 'mt-5' },
  { id: 'mt-6', name: '光年之外', artists: [ARTISTS[0]], album: '太空', durationMs: 235000, sourceId: 'mt-6' },
  { id: 'mt-7', name: '鱼', artists: [ARTISTS[1]], album: '华丽的冒险', durationMs: 248000, sourceId: 'mt-7' },
  { id: 'mt-8', name: '那些花儿', artists: [ARTISTS[2]], album: '我去2000年', durationMs: 292000, sourceId: 'mt-8' },
  { id: 'mt-9', name: '风吹一夏', artists: [ARTISTS[3]], album: '音乐傲骨', durationMs: 240000, sourceId: 'mt-9' },
  { id: 'mt-10', name: '红豆', artists: [ARTISTS[4]], album: '唱游', durationMs: 255000, sourceId: 'mt-10' },
  { id: 'mt-11', name: '起风了', artists: [{ id: 'ma-6', name: '买辣椒也用券' }], album: '起风了', durationMs: 325000, sourceId: 'mt-11' },
  { id: 'mt-12', name: '晴天', artists: [{ id: 'ma-7', name: '周杰伦' }], album: '叶惠美', durationMs: 269000, sourceId: 'mt-12' },
];

/** Quiet travel placeholders named by country — offline flavor only. */
const SCENE_MOCK: Record<string, Track[]> = {
  china: [
    { id: 'mc-cn-1', name: '华语·晴天（示意）', artists: [{ id: 'ma-7', name: '周杰伦' }], album: '中国电台', durationMs: 269000, sourceId: 'mc-cn-1' },
    { id: 'mc-cn-2', name: '华语·大鱼（示意）', artists: [ARTISTS[0]], album: '中国电台', durationMs: 278000, sourceId: 'mc-cn-2' },
    { id: 'mc-cn-3', name: '华语·平凡之路（示意）', artists: [ARTISTS[2]], album: '中国电台', durationMs: 251000, sourceId: 'mc-cn-3' },
  ],
  russia: [
    { id: 'mc-ru-1', name: '俄语·伏尔加河畔（示意）', artists: [{ id: 'ma-ru', name: '俄语经典' }], album: '俄罗斯电台', durationMs: 280000, sourceId: 'mc-ru-1' },
    { id: 'mc-ru-2', name: '俄语·雪原夜曲（示意）', artists: [{ id: 'ma-ru', name: '俄语经典' }], album: '俄罗斯电台', durationMs: 265000, sourceId: 'mc-ru-2' },
    { id: 'mc-ru-3', name: '俄语·莫斯科之夜（示意）', artists: [{ id: 'ma-ru', name: '俄语经典' }], album: '俄罗斯电台', durationMs: 240000, sourceId: 'mc-ru-3' },
  ],
  japan: [
    { id: 'mc-jp-1', name: '日语·樱花道（示意）', artists: [{ id: 'ma-jp', name: 'J-POP' }], album: '日本电台', durationMs: 255000, sourceId: 'mc-jp-1' },
    { id: 'mc-jp-2', name: '日语·都市夜行（示意）', artists: [{ id: 'ma-jp', name: 'J-POP' }], album: '日本电台', durationMs: 248000, sourceId: 'mc-jp-2' },
    { id: 'mc-jp-3', name: '日语·海边电车（示意）', artists: [{ id: 'ma-jp', name: 'J-POP' }], album: '日本电台', durationMs: 272000, sourceId: 'mc-jp-3' },
  ],
  usa: [
    { id: 'mc-us-1', name: '美式·公路经典（示意）', artists: [{ id: 'ma-us', name: 'American classics' }], album: '美国电台', durationMs: 260000, sourceId: 'mc-us-1' },
    { id: 'mc-us-2', name: '美式·加州阳光（示意）', artists: [{ id: 'ma-us', name: 'American classics' }], album: '美国电台', durationMs: 245000, sourceId: 'mc-us-2' },
    { id: 'mc-us-3', name: '美式·城市节奏（示意）', artists: [{ id: 'ma-us', name: 'American classics' }], album: '美国电台', durationMs: 230000, sourceId: 'mc-us-3' },
  ],
  france: [
    { id: 'mc-fr-1', name: '法语·香颂小径（示意）', artists: [{ id: 'ma-fr', name: 'French chanson' }], album: '法国电台', durationMs: 270000, sourceId: 'mc-fr-1' },
    { id: 'mc-fr-2', name: '法语·塞纳河畔（示意）', artists: [{ id: 'ma-fr', name: 'French chanson' }], album: '法国电台', durationMs: 258000, sourceId: 'mc-fr-2' },
    { id: 'mc-fr-3', name: '法语·咖啡馆时光（示意）', artists: [{ id: 'ma-fr', name: 'French chanson' }], album: '法国电台', durationMs: 242000, sourceId: 'mc-fr-3' },
  ],
  korea: [
    { id: 'mc-kr-1', name: '韩语·首尔夜色（示意）', artists: [{ id: 'ma-kr', name: 'K-POP' }], album: '韩国电台', durationMs: 235000, sourceId: 'mc-kr-1' },
    { id: 'mc-kr-2', name: '韩语·汉江风（示意）', artists: [{ id: 'ma-kr', name: 'K-POP' }], album: '韩国电台', durationMs: 250000, sourceId: 'mc-kr-2' },
  ],
  uk: [
    { id: 'mc-uk-1', name: '英伦·雨巷（示意）', artists: [{ id: 'ma-uk', name: 'British classics' }], album: '英国电台', durationMs: 248000, sourceId: 'mc-uk-1' },
    { id: 'mc-uk-2', name: '英伦·海岸线（示意）', artists: [{ id: 'ma-uk', name: 'British classics' }], album: '英国电台', durationMs: 262000, sourceId: 'mc-uk-2' },
  ],
  italy: [
    { id: 'mc-it-1', name: '意语·托斯卡纳（示意）', artists: [{ id: 'ma-it', name: 'Italian classics' }], album: '意大利电台', durationMs: 255000, sourceId: 'mc-it-1' },
    { id: 'mc-it-2', name: '意语·海岸小调（示意）', artists: [{ id: 'ma-it', name: 'Italian classics' }], album: '意大利电台', durationMs: 240000, sourceId: 'mc-it-2' },
  ],
  brazil: [
    { id: 'mc-br-1', name: '巴西·Bossa Nova（示意）', artists: [{ id: 'ma-br', name: 'Bossa Nova' }], album: '巴西电台', durationMs: 220000, sourceId: 'mc-br-1' },
    { id: 'mc-br-2', name: '巴西·海岸节奏（示意）', artists: [{ id: 'ma-br', name: 'Bossa Nova' }], album: '巴西电台', durationMs: 235000, sourceId: 'mc-br-2' },
  ],
  india: [
    { id: 'mc-in-1', name: '印度·宝莱坞金曲（示意）', artists: [{ id: 'ma-in', name: 'Bollywood' }], album: '印度电台', durationMs: 280000, sourceId: 'mc-in-1' },
    { id: 'mc-in-2', name: '印度·恒河晨光（示意）', artists: [{ id: 'ma-in', name: 'Bollywood' }], album: '印度电台', durationMs: 265000, sourceId: 'mc-in-2' },
  ],
  egypt: [
    { id: 'mc-eg-1', name: '埃及·尼罗河畔（示意）', artists: [{ id: 'ma-eg', name: '阿拉伯经典' }], album: '埃及电台', durationMs: 270000, sourceId: 'mc-eg-1' },
    { id: 'mc-eg-2', name: '埃及·沙漠弦音（示意）', artists: [{ id: 'ma-eg', name: '阿拉伯经典' }], album: '埃及电台', durationMs: 255000, sourceId: 'mc-eg-2' },
  ],
  saudi: [
    { id: 'mc-sa-1', name: '沙特·沙漠夜歌（示意）', artists: [{ id: 'ma-sa', name: '阿拉伯经典' }], album: '沙特电台', durationMs: 260000, sourceId: 'mc-sa-1' },
    { id: 'mc-sa-2', name: '沙特·绿洲民谣（示意）', artists: [{ id: 'ma-sa', name: '阿拉伯经典' }], album: '沙特电台', durationMs: 248000, sourceId: 'mc-sa-2' },
  ],
  turkey: [
    { id: 'mc-tr-1', name: '土耳其·博斯普鲁斯（示意）', artists: [{ id: 'ma-tr', name: 'Turkish classics' }], album: '土耳其电台', durationMs: 252000, sourceId: 'mc-tr-1' },
    { id: 'mc-tr-2', name: '土耳其·安纳托利亚（示意）', artists: [{ id: 'ma-tr', name: 'Turkish classics' }], album: '土耳其电台', durationMs: 240000, sourceId: 'mc-tr-2' },
  ],
  mexico: [
    { id: 'mc-mx-1', name: '墨西哥·拉丁经典（示意）', artists: [{ id: 'ma-mx', name: 'Latin classics' }], album: '墨西哥电台', durationMs: 245000, sourceId: 'mc-mx-1' },
    { id: 'mc-mx-2', name: '墨西哥·广场午后（示意）', artists: [{ id: 'ma-mx', name: 'Latin classics' }], album: '墨西哥电台', durationMs: 238000, sourceId: 'mc-mx-2' },
  ],
  australia: [
    { id: 'mc-au-1', name: '澳洲·海岸公路（示意）', artists: [{ id: 'ma-au', name: 'Aussie classics' }], album: '澳大利亚电台', durationMs: 250000, sourceId: 'mc-au-1' },
    { id: 'mc-au-2', name: '澳洲·内陆阳光（示意）', artists: [{ id: 'ma-au', name: 'Aussie classics' }], album: '澳大利亚电台', durationMs: 242000, sourceId: 'mc-au-2' },
  ],
  canada: [
    { id: 'mc-ca-1', name: '加拿大·枫叶民谣（示意）', artists: [{ id: 'ma-ca', name: 'Canadian classics' }], album: '加拿大电台', durationMs: 255000, sourceId: 'mc-ca-1' },
    { id: 'mc-ca-2', name: '加拿大·湖畔吉他（示意）', artists: [{ id: 'ma-ca', name: 'Canadian classics' }], album: '加拿大电台', durationMs: 248000, sourceId: 'mc-ca-2' },
  ],
  south_africa: [
    { id: 'mc-za-1', name: '南非·开普敦节奏（示意）', artists: [{ id: 'ma-za', name: 'African classics' }], album: '南非电台', durationMs: 235000, sourceId: 'mc-za-1' },
    { id: 'mc-za-2', name: '南非·草原鼓点（示意）', artists: [{ id: 'ma-za', name: 'African classics' }], album: '南非电台', durationMs: 228000, sourceId: 'mc-za-2' },
  ],
};

function tracksForScene(sceneId?: string): Track[] {
  if (sceneId && SCENE_MOCK[sceneId]) return SCENE_MOCK[sceneId];
  const order = [2, 3, 0, 10, 11, 4, 1, 7, 8, 5];
  return order.map((i) => TRACKS[i]).filter(Boolean);
}

const PLAYLISTS: Playlist[] = [
  { id: 'mp-1', name: '公路旁的风', coverUrl: '', description: '适合慢骑的轻快民谣', trackCount: 8 },
  { id: 'mp-2', name: '黄昏海岸线', coverUrl: '', description: '日落时分的安静陪伴', trackCount: 6 },
  { id: 'mp-3', name: '城市环线 BGM', coverUrl: '', description: '内测曲库精选', trackCount: 10 },
];

function delay(ms = 180): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function match(hay: string, needle: string): boolean {
  return hay.toLowerCase().includes(needle.trim().toLowerCase());
}

export const mockProvider: MusicProvider = {
  id: 'mock',
  label: '内测曲库',

  async search(keyword, type: SearchType, limit = 20) {
    await delay();
    const q = keyword.trim();
    if (!q) return [];
    if (type === 'song') {
      return TRACKS.filter(
        (t) => match(t.name, q) || t.artists.some((a) => match(a.name, q)) || match(t.album ?? '', q),
      ).slice(0, limit);
    }
    if (type === 'artist') {
      return ARTISTS.filter((a) => match(a.name, q)).slice(0, limit);
    }
    return PLAYLISTS.filter(
      (p) => match(p.name, q) || match(p.description ?? '', q),
    ).slice(0, limit);
  },

  async recommend(ctx?: RecommendContext) {
    await delay(120);
    return tracksForScene(ctx?.sceneId);
  },

  async artistTop(artistId, limit = 10) {
    await delay();
    const list = TRACKS.filter((t) => t.artists.some((a) => a.id === artistId));
    if (list.length) return list.slice(0, limit);
    return TRACKS.slice(0, Math.min(limit, 5));
  },

  async playlistTracks(playlistId, limit = 30) {
    await delay();
    const seed = Number(String(playlistId).replace(/\D/g, '').slice(-2) || 1);
    const out: Track[] = [];
    for (let i = 0; i < Math.min(limit, TRACKS.length); i++) {
      out.push(TRACKS[(seed + i) % TRACKS.length]);
    }
    return out;
  },

  async resolvePlayable(_track: Track) {
    await delay(40);
    return SILENT_WAV;
  },
};
