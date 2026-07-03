import { useState } from 'react';
import type { LogImportance, Player, StatKey } from '../types/game';
import { EVENT_CATEGORY_LABELS, STAT_ICONS, formatLifeLogHeadline, getPlayerVisual } from '../utils/gameLogic';

interface LifeLogProps {
  players: Player[];
  onClose: () => void;
}

const IMPORTANCE_LABEL: Record<LogImportance, string> = {
  normal: '',
  high: '✨ 重要',
  critical: '🌟 人生の大事件',
};

function EffectBadges({ effects }: { effects: Partial<Record<StatKey, number>> }) {
  const keys = (Object.keys(effects) as StatKey[]).filter((key) => effects[key]);
  if (keys.length === 0) {
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
    </>
  );
}

function LifeLog({ players, onClose }: LifeLogProps) {
  const [selectedPlayerId, setSelectedPlayerId] = useState(players[0]?.id);
  const selectedPlayerIndex = players.findIndex((p) => p.id === selectedPlayerId);
  const selectedPlayer = players[selectedPlayerIndex] ?? players[0];

  return (
    <div className="modal-overlay">
      <div className="modal modal--tall">
        <div className="modal__header">
          <h3 className="modal__title">📖 人生ログ</h3>
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
                {IMPORTANCE_LABEL[log.importance] && (
                  <span className="life-log__importance">{IMPORTANCE_LABEL[log.importance]}</span>
                )}
              </div>
              <div className="life-log__headline">{formatLifeLogHeadline(log)}</div>
              <div className="life-log__description">{log.eventDescription}</div>
              {log.choiceLabel && <div className="life-log__choice">選択：{log.choiceLabel}</div>}
              <div className="life-log__effects">
                <EffectBadges effects={log.effects} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default LifeLog;
