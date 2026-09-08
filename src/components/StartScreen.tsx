interface Props {
  onStart: () => void;
}

export function StartScreen({ onStart }: Props) {
  return (
    <div id="start">
      <img id="start-bg" src="/assets/cover.png" alt="" />
      <div id="start-inner">
        <div className="tag">Scenery Ride · 3D</div>
        <h1>漫游骑行</h1>
        <p className="sub">
          一条没有终点的环湖公路。风从耳边过去，麦田、花海、风车与远山依次展开。
          不必赶路 —— 慢一点，风景才看得清。
        </p>
        <div className="keycaps">
          <div className="keycap"><b>W / ↑</b> 加速</div>
          <div className="keycap"><b>S / ↓</b> 减速</div>
          <div className="keycap"><b>A / D</b> 换道</div>
          <div className="keycap"><b>C</b> 视角</div>
          <div className="keycap"><b>F</b> 拍照留念</div>
        </div>
        <button id="btn-start" onClick={onStart}>开始漫游</button>
        <div id="loading">React 18 · TypeScript · Three.js</div>
      </div>
    </div>
  );
}
