import { useEffect, useState } from 'react';

interface TitleScreenProps {
  onStart: () => void;
  onShowHowToPlay: () => void;
}

const BUTTON_REVEAL_DELAY_MS = 2000;

/**
 * ファーストビュー（FV.png）を全画面表示し、世界観を邪魔しないよう
 * 操作ボタンは表示から少し間を置いてからフェードインさせる。
 */
function TitleScreen({ onStart, onShowHowToPlay }: TitleScreenProps) {
  const [showActions, setShowActions] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowActions(true), BUTTON_REVEAL_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="screen title-screen">
      <img src="/FV.png" alt="近未来★人生ゲーム" className="title-screen__fv-image" />

      <div className={`title-screen__actions ${showActions ? 'title-screen__actions--visible' : ''}`}>
        <button
          type="button"
          className="title-screen__cta title-screen__cta--primary"
          onClick={onStart}
          disabled={!showActions}
        >
          スタート
        </button>
        <button
          type="button"
          className="title-screen__cta title-screen__cta--ghost"
          onClick={onShowHowToPlay}
          disabled={!showActions}
        >
          遊び方
        </button>
        <p className="title-screen__note">2〜4人であそべます</p>
      </div>
    </div>
  );
}

export default TitleScreen;
