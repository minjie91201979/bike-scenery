// style.mjs — 统一的卡通画风系统
// 目的：让「任意国家」的店铺在风格上保持一致，提高整套游戏素材的辨识度与系列感。
// 设计要点：
//   1. 所有国家共用同一段 base 描述（线条 / 配色 / 视角 / 光照 / 构图）。
//   2. 用 negative 约束排除写实、文字、水印等破坏统一度的因素。
//   3. 国家差异只通过 countries.mjs 里的 building / signature / palette / light 注入。

export const STYLE = {
  // 每个国家提示词都会拼接的「风格底座」
  base: [
    'flat vector cartoon illustration',
    'clean bold black outlines',
    'vibrant saturated colors',
    'cute kawaii game asset style',
    'simple geometric building shapes',
    'soft even studio lighting',
    'centered front-facing storefront elevation view',
    'slight low angle',
    'minimal plain light background',
    'no people',
    'no readable text, no letters, no words, no signage text',
    'no watermark, no signature',
    'crisp high detail',
  ],
  // 负面约束（作为 Avoid 指令写进提示词，保证跨接口兼容）
  negative: [
    'photorealistic',
    '3d render',
    'blurry',
    'grainy',
    'low quality',
    'watermark',
    'text',
    'signature',
    'ugly',
    'distorted',
  ],
};

/**
 * 把国家配置组装成最终提示词。
 * @param {object} country countries.mjs 中的单条配置
 * @returns {{prompt:string, negative:string}}
 */
export function buildPrompt(country) {
  const prompt = [
    ...STYLE.base,
    country.building,
    country.signature,
    `color palette: ${country.palette}`,
    country.light,
  ].join(', ');

  const negative = 'Avoid: ' + STYLE.negative.join(', ') + '.';
  return { prompt, negative };
}
