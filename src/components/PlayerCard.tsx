import { useState } from 'react';
import { getRouteById } from '../data/branchRoutes';
import type { Player, StatKey } from '../types/game';
import { STAT_ICONS, STAT_LABELS, getLifeStageName, getPlayerVisual } from '../utils/gameLogic';

interface PlayerCardProps {
  player: Player;
  index: number;
  isCurrent: boolean;
  compact?: boolean;
}

const BAR_STAT_KEYS: StatKey[] = ['health', 'happiness', 'knowledge', 'relationships', 'freedom'];
const PRIMARY_CHIP_KEYS: StatKey[] = ['health', 'happiness', 'relationships', 'freedom'];
const DETAIL_CHIP_KEYS: StatKey[] = [
  'knowledge',
  'experience',
  'luck',
  'mentalStrength',
  'trust',
  'socialContribution',
  'aiAffinity',
  'actionPower',
];

function ChosenRouteList({ chosenRoutes }: { chosenRoutes: string[] }) {
  if (chosenRoutes.length === 0) return null;
  return (
    <div className="player-card__routes">
      <span className="player-card__routes-label">🧭 選んだルート</span>
      <div className="player-card__routes-list">
        {chosenRoutes.map((routeId) => {
          const route = getRouteById(routeId);
          if (!route) return null;
          return (
            <span className="stat-chip" key={routeId}>
              {route.icon} {route.name}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function PlayerCard({ player, index, isCurrent, compact = false }: PlayerCardProps) {
  const visual = getPlayerVisual(index);
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={`player-card ${isCurrent ? 'player-card--current' : ''} ${player.finished ? 'player-card--finished' : ''}`}
      style={{ borderColor: isCurrent ? visual.color : undefined }}
    >
      <div className="player-card__header">
        <span className="player-card__avatar" style={{ background: visual.colorSoft }}>
          {visual.icon}
        </span>
        <span className="player-card__name">
          {player.name}
          {isCurrent && (
            <span className="player-card__turn-badge" style={{ background: visual.color }}>
              手番
            </span>
          )}
          {player.finished && <span className="player-card__finished-badge">🕊️ 卒業済み</span>}
        </span>
        <span className="player-card__age">
          {getLifeStageName(player.age)}・{player.age}歳（マス {player.position}）
        </span>
      </div>

      <div className="player-card__money">
        {STAT_ICONS.money} {player.money.toLocaleString()}万円
      </div>

      {compact ? (
        <>
          <div className="player-card__chip-row">
            {PRIMARY_CHIP_KEYS.map((key) => (
              <span className="stat-chip" key={key}>
                {STAT_ICONS[key]} {player[key]}
              </span>
            ))}
            <button type="button" className="stat-chip stat-chip--toggle" onClick={() => setExpanded((v) => !v)}>
              {expanded ? '▲ 閉じる' : '▼ 詳細ステータス'}
            </button>
          </div>
          {expanded && (
            <>
              <div className="player-card__chip-row">
                {DETAIL_CHIP_KEYS.map((key) => (
                  <span className="stat-chip" key={key} title={STAT_LABELS[key]}>
                    {STAT_ICONS[key]} {STAT_LABELS[key]} {player[key]}
                  </span>
                ))}
              </div>
              <ChosenRouteList chosenRoutes={player.chosenRoutes} />
            </>
          )}
        </>
      ) : (
        <div className="player-card__stats">
          {BAR_STAT_KEYS.map((key) => (
            <div className="stat-bar" key={key}>
              <span className="stat-bar__label">
                {STAT_ICONS[key]} {STAT_LABELS[key]}
              </span>
              <div className="stat-bar__track">
                <div className="stat-bar__fill" style={{ width: `${player[key]}%` }} />
              </div>
              <span className="stat-bar__value">{player[key]}</span>
            </div>
          ))}
          <div className="player-card__chip-row">
            {DETAIL_CHIP_KEYS.map((key) => (
              <span className="stat-chip" key={key} title={STAT_LABELS[key]}>
                {STAT_ICONS[key]} {STAT_LABELS[key]} {player[key]}
              </span>
            ))}
          </div>
          <ChosenRouteList chosenRoutes={player.chosenRoutes} />
        </div>
      )}
    </div>
  );
}

export default PlayerCard;
