import FateRoulette from './FateRoulette';
import type { EventChoice, FateOutcome, GameEvent, PendingEventResult, PendingFateRoulette, SquareType, StatKey } from '../types/game';
import {
  EVENT_TYPE_ICONS,
  EVENT_TYPE_LABELS,
  FATE_SEVERITY_ICONS,
  FATE_SEVERITY_LABELS,
  SQUARE_TYPE_META,
  STAT_ICONS,
  STAT_LABELS,
  STATUS_FIELD_ICONS,
  STATUS_FIELD_LABELS,
  getBoardMilestone,
  getEventType,
} from '../utils/gameLogic';

interface EventModalProps {
  event: GameEvent;
  age: number;
  squareType: SquareType;
  result: PendingEventResult | null;
  pendingFate: PendingFateRoulette | null;
  soundEnabled: boolean;
  onChoose: (choice?: EventChoice) => void;
  onConfirm: () => void;
  onSpinFate: () => FateOutcome;
  onFateSettled: (outcome: FateOutcome) => void;
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

// 病気・事故・事件・災害など「人生終了」につながりうる危険イベント専用のバナー。
// 通常のsquareType別バナー（MOOD_BANNER）より優先して表示し、一目で「特別な出来事」だと
// 分かるようにする。ただし恐怖を煽りすぎないよう、既存のpinch（赤系）より落ち着いた琥珀色にしている。
const RISK_CATEGORY_LABEL: Partial<Record<GameEvent['category'], string>> = {
  illness: '🏥 健康リスク',
  health: '🏥 健康リスク',
  accident: '🚧 事故リスク',
  disaster: '🌪️ 災害イベント',
  travel: '✈️ 旅の分岐',
  fraud: '⚠️ 事件リスク',
  care: '🏥 健康リスク',
};

function isRiskEvent(event: GameEvent): boolean {
  return (
    event.riskLevel !== undefined ||
    event.endsLifeChance !== undefined ||
    (event.choices?.some((c) => c.endsLifeChance !== undefined) ?? false)
  );
}

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

function EventModal({
  event,
  age,
  squareType,
  result,
  pendingFate,
  soundEnabled,
  onChoose,
  onConfirm,
  onSpinFate,
  onFateSettled,
}: EventModalProps) {
  const squareMeta = SQUARE_TYPE_META[squareType];
  const rarityBadge = RARITY_BADGE[event.rarity];
  const milestone = getBoardMilestone(age);
  const isMemoryCard = event.category === 'memory';
  const isRisk = result === null && isRiskEvent(event);
  const moodClass = isMemoryCard
    ? 'modal--memory-card'
    : milestone
      ? 'modal--milestone'
      : isRisk
        ? 'modal--risk'
        : MOOD_CLASS[squareType] ?? '';
  const moodBanner = MOOD_BANNER[squareType];
  const riskCategoryLabel = RISK_CATEGORY_LABEL[event.category];
  const eventType = result ? result.eventType : getEventType(event);

  return (
    <div className="modal-overlay">
      <div className={`modal ${moodClass}`}>
        {result === null ? (
          <>
            {isMemoryCard ? (
              <div className="modal__mood-banner modal__mood-banner--memory-card">📼 思い出カード</div>
            ) : milestone ? (
              <div className="modal__mood-banner modal__mood-banner--milestone">
                🎉 人生の節目：{milestone.title}
              </div>
            ) : isRisk ? (
              <div className="modal__mood-banner modal__mood-banner--risk">
                ⚠️ 運命の分岐
                {riskCategoryLabel && <span className="modal__risk-sublabel">{riskCategoryLabel}</span>}
              </div>
            ) : (
              moodBanner && <div className={`modal__mood-banner ${moodBanner.className}`}>{moodBanner.text}</div>
            )}

            {!isMemoryCard && (
              <div className="modal__badge-row">
                <div className="modal__badge">{age}歳・{squareMeta.icon} {squareMeta.label}マス</div>
                <div className="modal__badge modal__badge--type">
                  {EVENT_TYPE_ICONS[eventType]} {EVENT_TYPE_LABELS[eventType]}
                </div>
                {rarityBadge && <div className="modal__badge modal__badge--rare">{rarityBadge}</div>}
              </div>
            )}
            <h3 className="modal__title">{event.title}</h3>
            <p className="modal__description">{event.description}</p>
            {isMemoryCard && event.memoryQuote && <p className="modal__memory-quote">「{event.memoryQuote}」</p>}

            {pendingFate ? (
              <FateRoulette
                title={pendingFate.fateRoulette.title}
                outcomes={pendingFate.fateRoulette.outcomes}
                soundEnabled={soundEnabled}
                onSpin={onSpinFate}
                onSettled={onFateSettled}
              />
            ) : event.choices ? (
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
            <div className="modal__badge-row">
              <div className="modal__badge">結果</div>
              <div className="modal__badge modal__badge--type">
                {EVENT_TYPE_ICONS[eventType]} {EVENT_TYPE_LABELS[eventType]}
              </div>
            </div>
            <h3 className="modal__title">{event.title}</h3>
            {result.choiceLabel && <p className="modal__choice-label">選択：{result.choiceLabel}</p>}
            {result.fateOutcomeLabel && result.fateSeverity && (
              <div className={`modal__fate-result modal__fate-result--${result.fateSeverity}`}>
                <span className="modal__fate-result-icon">{FATE_SEVERITY_ICONS[result.fateSeverity]}</span>
                <span className="modal__fate-result-label">
                  運命の結果：{result.fateOutcomeLabel}（{FATE_SEVERITY_LABELS[result.fateSeverity]}）
                </span>
              </div>
            )}

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
              {result.statusEffects?.occupation !== undefined && (
                <li className="modal__effect--status">
                  {STATUS_FIELD_ICONS.occupation} {STATUS_FIELD_LABELS.occupation} → {result.statusEffects.occupation}
                </li>
              )}
              {result.statusEffects?.annualIncomeDelta !== undefined && result.statusEffects.annualIncomeDelta !== 0 && (
                <li className={result.statusEffects.annualIncomeDelta > 0 ? 'modal__effect--up' : 'modal__effect--down'}>
                  <span className="modal__effect-arrow">{result.statusEffects.annualIncomeDelta > 0 ? '▲' : '▼'}</span>
                  {STATUS_FIELD_ICONS.annualIncome} {STATUS_FIELD_LABELS.annualIncome}{' '}
                  {result.statusEffects.annualIncomeDelta > 0 ? '+' : ''}
                  {result.statusEffects.annualIncomeDelta}万円
                </li>
              )}
              {result.statusEffects?.romanceStatus !== undefined && (
                <li className="modal__effect--status">
                  {STATUS_FIELD_ICONS.romanceStatus} {STATUS_FIELD_LABELS.romanceStatus} → {result.statusEffects.romanceStatus}
                </li>
              )}
              {result.statusEffects?.housingStatus !== undefined && (
                <li className="modal__effect--status">
                  {STATUS_FIELD_ICONS.housingStatus} {STATUS_FIELD_LABELS.housingStatus} → {result.statusEffects.housingStatus}
                </li>
              )}
              {Object.keys(result.effects).length === 0 && !result.statusEffects && (
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
