interface TitleScreenProps {
  onStart: () => void;
  onShowHowToPlay: () => void;
}

function TitleScreen({ onStart, onShowHowToPlay }: TitleScreenProps) {
  return (
    <div className="screen title-screen">
      <div className="title-screen__badge">2050</div>
      <h1 className="title-screen__title">
        近未来★
        <br />
        人生ゲーム
      </h1>
      <p className="title-screen__lead">
        ルーレットを回して人生を進めよう。
        <br />
        AI・宇宙旅行・介護ロボット…
        <br />
        近未来の出来事があなたの人生を変える。
      </p>
      <button type="button" className="btn btn--primary btn--large" onClick={onStart}>
        ゲームをはじめる
      </button>
      <button type="button" className="btn btn--ghost btn--large" onClick={onShowHowToPlay}>
        遊び方を見る
      </button>
      <p className="title-screen__note">2〜3人であそべます</p>
    </div>
  );
}

export default TitleScreen;
