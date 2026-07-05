import { useEffect } from 'react';
import type { PendingGraduation, Player } from '../types/game';
import { calculateLifeType, generateGraduationSummary } from '../utils/gameLogic';
import { playLifeEndSound, vibrate } from '../utils/sound';

interface GraduationModalProps {
  pendingGraduation: PendingGraduation;
  player: Player;
  soundEnabled: boolean;
  onAcknowledge: () => void;
}

/** 80歳以降、確率判定で訪れる「人生の卒業」を伝える専用モーダル。固定ゴールではなく、プレイヤーごとに時期・理由が異なる。 */
function GraduationModal({ pendingGraduation, player, soundEnabled, onAcknowledge }: GraduationModalProps) {
  const { playerName, age, reason } = pendingGraduation;
  const lifeType = calculateLifeType(player);
  const summary = generateGraduationSummary(player);

  // このモーダルは表示される瞬間に毎回新しくマウントされるため、初回表示時に1回だけ鳴らす。
  useEffect(() => {
    if (soundEnabled) playLifeEndSound();
    vibrate([50, 80, 50]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="modal-overlay modal-overlay--calm">
      <div className="modal modal--graduation">
        <div className="modal__mood-banner modal__mood-banner--graduation">🕊️ {reason.title}</div>

        <h3 className="modal__title">{playerName}さんの人生の卒業</h3>
        <p className="modal__description">{reason.body}</p>

        <div className="graduation-modal__facts">
          <div className="graduation-modal__fact">
            <span className="graduation-modal__fact-label">卒業年齢</span>
            <span className="graduation-modal__fact-value">{age}歳</span>
          </div>
          <div className="graduation-modal__fact">
            <span className="graduation-modal__fact-label">卒業理由</span>
            <span className="graduation-modal__fact-value">{reason.label}</span>
          </div>
          <div className="graduation-modal__fact">
            <span className="graduation-modal__fact-label">人生タイプ</span>
            <span className="graduation-modal__fact-value">{lifeType.name}</span>
          </div>
        </div>

        <p className="graduation-modal__last-words">「{summary}」</p>

        <button type="button" className="btn btn--primary btn--large" onClick={onAcknowledge}>
          次へ
        </button>
      </div>
    </div>
  );
}

export default GraduationModal;
