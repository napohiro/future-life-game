import { useState } from 'react';
import { getEraDefinition } from '../data/eras';
import type { EraId, LogImportance, Player, StatEffects, StatKey, StatusEffects } from '../types/game';
import {
  EVENT_CATEGORY_LABELS,
  EVENT_TYPE_ICONS,
  EVENT_TYPE_LABELS,
  FATE_SEVERITY_ICONS,
  STAT_ICONS,
  STATUS_FIELD_ICONS,
  formatLifeLogHeadline,
  getPlayerVisual,
} from '../utils/gameLogic';

interface LifeLogProps {
  players: Player[];
  era: EraId;
  onClose: () => void;
}

const IMPORTANCE_LABEL: Record<LogImportance, string> = {
  normal: '',
  high: '✨ 重要',
  critical: '🌟 人生の大事件',
};

function EffectBadges({ effects, statusEffects }: { effects: StatEffects; statusEffects?: StatusEffects }) {
  const keys = (Object.keys(effects) as StatKey[]).filter((key) => effects[key]);
  const hasStatusEffects =
    statusEffects &&
    (statusEffects.occupation !== undefined ||
      statusEffects.romanceStatus !== undefined ||
      statusEffects.housingStatus !== undefined ||
      (statusEffects.annualIncomeDelta ?? 0) !== 0);

  if (keys.length === 0 && !hasStatusEffects) {
    return <span className="life-log__effect-badge">変化なし</span>;
  }
  return (
    <>
      {keys.map((key) => {
        const value = effects[key]!;
        return (
          <span
            key={key}
            className={`life-log__effect-badge ${value > 0 ? 'life-log__effect-badge--up' : 'life-log__effect-badge--down'}`}
          >
            {STAT_ICONS[key]} {value > 0 ? '+' : ''}
            {value}
          </span>
        );
      })}
      {statusEffects?.occupation !== undefined && (
        <span className="life-log__effect-badge">{STATUS_FIELD_ICONS.occupation} {statusEffects.occupation}</span>
      )}
      {statusEffects?.annualIncomeDelta !== undefined && statusEffects.annualIncomeDelta !== 0 && (
        <span
          className={`life-log__effect-badge ${statusEffects.annualIncomeDelta > 0 ? 'life-log__effect-badge--up' : 'life-log__effect-badge--down'}`}
        >
          {STATUS_FIELD_ICONS.annualIncome} {statusEffects.annualIncomeDelta > 0 ? '+' : ''}
          {statusEffects.annualIncomeDelta}万円
        </span>
      )}
      {statusEffects?.romanceStatus !== undefined && (
        <span className="life-log__effect-badge">{STATUS_FIELD_ICONS.romanceStatus} {statusEffects.romanceStatus}</span>
      )}
      {statusEffects?.housingStatus !== undefined && (
        <span className="life-log__effect-badge">{STATUS_FIELD_ICONS.housingStatus} {statusEffects.housingStatus}</span>
      )}
    </>
  );
}

function LifeLog({ players, era, onClose }: LifeLogProps) {
  const [selectedPlayerId, setSelectedPlayerId] = useState(players[0]?.id);
  const selectedPlayerIndex = players.findIndex((p) => p.id === selectedPlayerId);
  const selectedPlayer = players[selectedPlayerIndex] ?? players[0];
  const eraDefinition = getEraDefinition(era);

  return (
    <div className="modal-overlay">
      <div className="modal modal--tall">
        <div className="modal__header">
          <h3 className="modal__title">📖 人生ログ（{eraDefinition.name}・{eraDefinition.year}年）</h3>
          <button type="button" className="btn btn--ghost btn--small" onClick={onClose}>
            閉じる
          </button>
        </div>

        <div className="segmented segmented--wrap">
          {players.map((player, index) => {
            const visual = getPlayerVisual(index);
            const active = player.id === selectedPlayer?.id;
            return (
              <button
                key={player.id}
                type="button"
                className={`segmented__option ${active ? 'segmented__option--active' : ''}`}
                style={active ? { background: visual.color, borderColor: visual.color } : undefined}
                onClick={() => setSelectedPlayerId(player.id)}
              >
                {visual.icon} {player.name}
              </button>
            );
          })}
        </div>

        <div className="life-log__list">
          {selectedPlayer && selectedPlayer.lifeLogs.length === 0 && (
            <p className="life-log__empty">まだ人生の記録がありません。</p>
          )}
          {selectedPlayer?.lifeLogs.map((log) => (
            <div key={log.id} className={`life-log__entry ${log.importance !== 'normal' ? 'life-log__entry--important' : ''}`}>
              <div className="life-log__entry-header">
                <span className="life-log__category">{EVENT_CATEGORY_LABELS[log.category]}</span>
                <span className="life-log__event-type">
                  {EVENT_TYPE_ICONS[log.eventType]} {EVENT_TYPE_LABELS[log.eventType]}
                </span>
                {IMPORTANCE_LABEL[log.importance] && (
                  <span className="life-log__importance">{IMPORTANCE_LABEL[log.importance]}</span>
                )}
              </div>
              <div className="life-log__headline">{formatLifeLogHeadline(log)}</div>
              <div className="life-log__description">{log.eventDescription}</div>
              {log.choiceLabel && <div className="life-log__choice">選択：{log.choiceLabel}</div>}
              {log.fateOutcomeLabel && log.fateSeverity && (
                <div className={`life-log__fate-result life-log__fate-result--${log.fateSeverity}`}>
                  {FATE_SEVERITY_ICONS[log.fateSeverity]} 運命の結果：{log.fateOutcomeLabel}
                </div>
              )}
              <div className="life-log__effects">
                <EffectBadges effects={log.effects} statusEffects={log.statusEffects} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default LifeLog;
