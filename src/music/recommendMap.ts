import type { SceneId } from '../engine/scenes';

/** Per-country radio: keywords bias NetEase search toward local classics. */
export interface SceneRadio {
  keywords: string[];
  /** Optional playlist ids — secondary after keyword search. */
  playlistIds?: string[];
}

export const SCENE_RADIO: Record<SceneId, SceneRadio> = {
  china: {
    keywords: ['华语经典', '中国风经典', '周杰伦'],
    playlistIds: ['3778678'],
  },
  russia: {
    keywords: ['俄罗斯经典', '俄语金曲', 'Russian classics'],
  },
  japan: {
    keywords: ['日本流行经典', 'J-POP经典', '日语金曲'],
  },
  korea: {
    keywords: ['韩语经典', 'K-POP经典', '韩国流行'],
  },
  usa: {
    keywords: ['欧美经典流行', 'American classics', '美式流行金曲'],
  },
  france: {
    keywords: ['法语经典', 'French chanson', '法国香颂'],
  },
  uk: {
    keywords: ['英伦经典', 'British classics', '英国流行金曲'],
  },
  italy: {
    keywords: ['意大利经典', 'Italian classics', '意大利金曲'],
  },
  brazil: {
    keywords: ['巴西音乐', 'Bossa Nova', '巴西经典'],
  },
  india: {
    keywords: ['印度经典', 'Bollywood classic', '宝莱坞金曲'],
  },
  egypt: {
    keywords: ['埃及音乐', '阿拉伯经典', '中东金曲'],
  },
  saudi: {
    keywords: ['沙特音乐', '阿拉伯经典', '中东民谣'],
  },
  turkey: {
    keywords: ['土耳其经典', 'Turkish classics', '土耳其民谣'],
  },
  mexico: {
    keywords: ['墨西哥音乐', 'Latin classics', '拉丁经典'],
  },
  australia: {
    keywords: ['澳大利亚音乐', 'Aussie classics', '澳州流行'],
  },
  canada: {
    keywords: ['加拿大音乐', 'Canadian classics', '北美民谣'],
  },
  south_africa: {
    keywords: ['南非音乐', 'African classics', '非洲节奏'],
  },
};

export const DEFAULT_RADIO: SceneRadio = {
  keywords: ['旅行轻音乐', '公路旅行歌单', '安静陪伴'],
  playlistIds: ['3778678', '19723756'],
};

export function radioForScene(sceneId?: string): SceneRadio {
  if (!sceneId) return DEFAULT_RADIO;
  return SCENE_RADIO[sceneId as SceneId] ?? DEFAULT_RADIO;
}

export function keywordsForScene(sceneId?: string): string[] {
  return radioForScene(sceneId).keywords;
}

/** @deprecated Prefer radioForScene - kept for callers that only need playlist ids. */
export function playlistsForScene(sceneId?: string): string[] {
  const radio = radioForScene(sceneId);
  return radio.playlistIds?.length ? radio.playlistIds : (DEFAULT_RADIO.playlistIds ?? []);
}

export const DEFAULT_PLAYLIST_IDS = DEFAULT_RADIO.playlistIds ?? ['3778678', '19723756'];
