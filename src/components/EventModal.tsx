import type { EventChoice, GameEvent, PendingEventResult, SquareType, StatKey } from '../types/game';
import { SQUARE_TYPE_META, STAT_ICONS, STAT_LABELS, getBoardMilestone } from '../utils/gameLogic';

interface EventModalProps {
  event: GameEvent;
  age: number;
  squareType: SquareType;
  result: PendingEventResult | null;
  onChoose: (choice?: EventChoice) => void;
  onConfirm: () => void;
}

const RARITY_BADGE: Record<GameEvent['rarity'], string | null> = {
  common: null,
  rare: '✨ レアイベント',
  superRare: '🌟 超レアイベント！',
};

const MOOD_CLASS: Partial<Record<SquareType, string>> = {
  chance: 'modal--chance',
  pinch: 'modal--pinch',
  turningPoint: 'modal--turning-point',
  superRare: 'modal--super-rare',
  aiEra: 'modal--future',
  future: 'modal--future',
  health: 'modal--health',
  family: 'modal--family',
  work: 'modal--work',
};

const MOOD_BANNER: Partial<Record<SquareType, { text: string; className: string }>> = {
  chance: { text: '🍀 チャンス！', className: 'modal__mood-banner--chance' },
  pinch: { text: '⚡ ピンチ！', className: 'modal__mood-banner--pinch' },
  turningPoint: { text: '🔀 人生の転機！', className: 'modal__mood-banner--turning' },
  superRare: { text: '🌈 超レアな出来事！', className: 'modal__mood-banner--super-rare' },
  aiEra: { text: '🤖 AI時代の出来事', className: 'modal__mood-banner--future' },
  future: { text: '🚀 近未来の出来事', className: 'modal__mood-banner--future' },
  health: { text: '🏥 健康にまつわる出来事', className: 'modal__mood-banner--health' },
  family: { text: '👨‍👩‍👧 家族の出来事', className: 'modal__mood-banner--family' },
  work: { text: '💼 仕事にまつわる出来事', className: 'modal__mood-banner--work' },
};

function EventModal({ event, age, squareType, result, onChoose, onConfirm }: EventModalProps) {
  const squareMeta = SQUARE_TYPE_META[squareType];
  const rarityBadge = RARITY_BADGE[event.rarity];
  const milestone = getBoardMilestone(age);
  const moodClass = milestone ? 'modal--milestone' : MOOD_CLASS[squareType] ?? '';
  const moodBanner = MOOD_BANNER[squareType];

  return (
    <div className="modal-overlay">
      <div className={`modal ${moodClass}`}>
        {result === null ? (
          <>
            {milestone ? (
              <div className="modal__mood-banner modal__mood-banner--milestone">
                🎉 人生の節目：{milestone.title}
              </div>
            ) : (
              moodBanner && <div className={`modal__mood-banner ${moodBanner.className}`}>{moodBanner.text}</div>
            )}

            <div className="modal__badge-row">
              <div className="modal__badge">{age}歳・{squareMeta.icon} {squareMeta.label}マス</div>
              {rarityBadge && <div className="modal__badge modal__badge--rare">{rarityBadge}</div>}
            </div>
            <h3 className="modal__title">{event.title}</h3>
            <p className="modal__description">{event.description}</p>

            {event.choices ? (
              <div className="modal__choices">
                {event.choices.map((choice) => (
                  <button
                    key={choice.id}
                    type="button"
                    className="btn btn--primary"
                    onClick={() => onChoose(choice)}
                  >
                    {choice.label}
                  </button>
                ))}
              </div>
            ) : (
              <button type="button" className="btn btn--primary btn--large" onClick={() => onChoose(undefined)}>
                次へ
              </button>
            )}
          </>
        ) : (
          <>
            <div className="modal__badge">結果</div>
            <h3 className="modal__title">{event.title}</h3>
            {result.choiceLabel && <p className="modal__choice-label">選択：{result.choiceLabel}</p>}

            <ul className="modal__effects">
              {(Object.keys(result.effects) as StatKey[]).map((key) => {
                const value = result.effects[key] ?? 0;
                if (value === 0) return null;
                return (
                  <li key={key} className={value > 0 ? 'modal__effect--up' : 'modal__effect--down'}>
                    <span className="modal__effect-arrow">{value > 0 ? '▲' : '▼'}</span>
                    {STAT_ICONS[key]} {STAT_LABELS[key]} {value > 0 ? '+' : ''}
                    {value}
                  </li>
                );
              })}
              {Object.keys(result.effects).length === 0 && (
                <li className="modal__effect--none">ステータスの変化はありませんでした</li>
              )}
            </ul>

            <p className="modal__log-preview">📖 人生ログに記録：「{age}歳：{event.title}」</p>

            <button type="button" className="btn btn--primary btn--large" onClick={onConfirm}>
              次へ
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default EventModal;
