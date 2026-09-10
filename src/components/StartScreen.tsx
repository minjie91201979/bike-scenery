import { useState } from 'react';
import {
  CHARACTERS,
  getScene,
  type CharacterId,
  type CountryId,
  type RideConfig,
} from '../engine/scenes';
import { requestAppFullscreen } from '../utils/fullscreen';

interface Props {
  countryId: CountryId;
  onStart: (config: RideConfig) => void;
  onBack: () => void;
}

export function StartScreen({ countryId, onStart, onBack }: Props) {
  const [characterId, setCharacterId] = useState<CharacterId>('male');
  const scene = getScene(countryId);
  const character = CHARACTERS.find((c) => c.id === characterId)!;

  const handleStart = () => {
    // Same user gesture — request fullscreen (iOS may ignore; HUD 全屏 button remains)
    void requestAppFullscreen(document.documentElement);
    onStart({ sceneId: countryId, characterId });
  };

  return (
    <div id="start">
      <img id="start-bg" src="/assets/cover.png" alt="" />
      <div id="start-inner">
        <div className="tag">Scenery Ride · 3D</div>
        <h1>漫游骑行</h1>
        <p className="sub">
          已选择 <b>{scene.name}</b>。挑选骑手后即可上路 ——
          不必赶路，慢一点，风景才看得清。
        </p>

        <div className="select-block">
          <div className="select-label">当前国家</div>
          <div className="country-chip">
            <span className="country-chip-name">{scene.name}</span>
            <span className="country-chip-blurb">{scene.blurb}</span>
          </div>
          <button type="button" className="btn-back-globe" onClick={onBack}>
            ← 返回地球选国
          </button>
        </div>

        <div className="select-block">
          <div className="select-label">选择角色</div>
          <div className="select-grid">
            {CHARACTERS.map((c) => (
              <button
                key={c.id}
                type="button"
                className={`select-card${characterId === c.id ? ' selected' : ''}`}
                onClick={() => setCharacterId(c.id)}
              >
                <div className="select-card-title">{c.name}</div>
                <div className="select-card-desc">{c.blurb}</div>
              </button>
            ))}
          </div>
        </div>

        <p className="pick-summary">
          将骑行 <b>{scene.name}</b> · <b>{character.name}</b>
        </p>

        <div className="keycaps">
          <div className="keycap"><b>W / ↑</b> 加速</div>
          <div className="keycap"><b>S / ↓</b> 减速</div>
          <div className="keycap"><b>A / D</b> 换道</div>
          <div className="keycap"><b>C</b> 视角</div>
          <div className="keycap"><b>F</b> 拍照留念</div>
        </div>
        <div className="start-actions">
          <button
            type="button"
            className="btn-fullscreen-start"
            onClick={() => { void requestAppFullscreen(document.documentElement); }}
          >
            全屏
          </button>
          <button id="btn-start" type="button" onClick={handleStart}>
            开始漫游
          </button>
        </div>
        <div id="loading">React 18 · TypeScript · Three.js</div>
      </div>
    </div>
  );
}
