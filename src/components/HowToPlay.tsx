interface HowToPlayProps {
  onBack: () => void;
}

const STEPS: { icon: string; text: string }[] = [
  { icon: '👥', text: '2〜3人で遊びます。名前と誕生日を入力してスタート。' },
  { icon: '🎲', text: '順番にルーレットを回して、盤面のコマを進めます。' },
  { icon: '🎴', text: '止まったマスの種類に応じて、人生イベントが発生します。' },
  { icon: '🔀', text: '選択肢があるイベントでは、選んだ内容で人生が変わります。' },
  { icon: '💰', text: 'お金だけでは勝てません。健康・幸福・人間関係なども大切です。' },
  { icon: '🏆', text: '最後は資産だけでなく、人生スコアや人生タイプで評価されます。' },
];

function HowToPlay({ onBack }: HowToPlayProps) {
  return (
    <div className="screen how-to-play">
      <h2 className="screen__heading">遊び方</h2>

      <div className="how-to-play__list">
        {STEPS.map((step, index) => (
          <div className="how-to-play__item" key={index}>
            <span className="how-to-play__icon">{step.icon}</span>
            <p className="how-to-play__text">{step.text}</p>
          </div>
        ))}
      </div>

      <button type="button" className="btn btn--primary btn--large" onClick={onBack}>
        タイトルに戻る
      </button>
    </div>
  );
}

export default HowToPlay;
