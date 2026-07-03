import { useState } from 'react';
import type { Player } from '../types/game';
import { buildNewspaperSummaries, formatLifeLogHeadline, getPlayerVisual } from '../utils/gameLogic';

interface NewspaperProps {
  players: Player[];
  onClose: () => void;
}

function Newspaper({ players, onClose }: NewspaperProps) {
  const [selectedPlayerId, setSelectedPlayerId] = useState(players[0]?.id);
  const selectedPlayerIndex = players.findIndex((p) => p.id === selectedPlayerId);
  const selectedPlayer = players[selectedPlayerIndex] ?? players[0];
  const summaries = selectedPlayer ? buildNewspaperSummaries(selectedPlayer) : [];

  return (
    <div className="modal-overlay">
      <div className="modal modal--tall">
        <div className="modal__header">
          <h3 className="modal__title">🗞️ 人生新聞プレビュー</h3>
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

        <div className="newspaper__list">
          {summaries.length === 0 && <p className="life-log__empty">まだ新聞にできる出来事がありません。</p>}
          {summaries.map((summary) => (
            <div key={summary.decadeLabel} className="newspaper__article">
              <div className="newspaper__decade">{selectedPlayer?.name}さんの{summary.decadeLabel}</div>
              <div className="newspaper__headline">「{summary.headline}」</div>
              <ul className="newspaper__events">
                {summary.logs.map((log) => (
                  <li key={log.id}>{formatLifeLogHeadline(log)}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Newspaper;
