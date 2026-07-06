import { getRouteById } from '../data/branchRoutes';
import { getCalendarYear, getGengoLabel } from '../data/eras';
import { getPlayerCharacter } from '../data/playerCharacters';
import type { EraId, Player, StatKey } from '../types/game';
import {
  PERSONALITY_TRAITS,
  STAT_ICONS,
  STAT_LABELS,
  STATUS_FIELD_ICONS,
  STATUS_FIELD_LABELS,
  calculateAssetRank,
  getDisplayOccupation,
  getLifeStageName,
  getLongevityBadge,
  getPlayerVisual,
  getRelationshipDisplayLabel,
} from '../utils/gameLogic';

interface PlayerCardProps {
  player: Player;
  index: number;
  isCurrent: boolean;
  era: EraId;
}

const BAR_STAT_KEYS: StatKey[] = ['health', 'happiness', 'knowledge', 'relationships', 'freedom'];
const DETAIL_CHIP_KEYS: StatKey[] = [
  'relationships',
  'freedom',
  'knowledge',
  'experience',
  'luck',
  'mentalStrength',
  'trust',
  'socialContribution',
  'aiAffinity',
  'actionPower',
];

/** 職業・年収・恋愛家族状況・住居・資産ランクなど、数値の増減ではなく「状態」を表すステータス一覧。 */
function StatusFieldList({ player }: { player: Player }) {
  const assetRank = calculateAssetRank(player.money);
  return (
    <div className="player-card__status-fields">
      <span className="player-card__status-field">
        {STATUS_FIELD_ICONS.occupation} {STATUS_FIELD_LABELS.occupation}：
        {getDisplayOccupation(player.age, player.occupation)}
      </span>
      <span className="player-card__status-field">
        {STATUS_FIELD_ICONS.annualIncome} {STATUS_FIELD_LABELS.annualIncome}：{player.annualIncome}万円
      </span>
      <span className="player-card__status-field">
        {STATUS_FIELD_ICONS.romanceStatus} {STATUS_FIELD_LABELS.romanceStatus}：{getRelationshipDisplayLabel(player)}
      </span>
      <span className="player-card__status-field">
        {STATUS_FIELD_ICONS.housingStatus} {STATUS_FIELD_LABELS.housingStatus}：{player.housingStatus}
      </span>
      <span className="player-card__status-field">
        {STATUS_FIELD_ICONS.assetRank} {STATUS_FIELD_LABELS.assetRank}：{assetRank}
      </span>
    </div>
  );
}

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

function PlayerCard({ player, index, isCurrent, era }: PlayerCardProps) {
  const visual = getPlayerVisual(index);
  const character = getPlayerCharacter(player.characterId);
  const personality = PERSONALITY_TRAITS[player.personality];
  const longevityBadge = getLongevityBadge(player.age, era);

  return (
    <div
      className={`player-card ${isCurrent ? 'player-card--current' : ''} ${player.finished ? 'player-card--finished' : ''}`}
      style={{ borderColor: isCurrent ? visual.color : undefined }}
    >
      <div className="player-card__header">
        <span className="player-card__avatar" style={{ background: visual.colorSoft }}>
          <img src={character.avatar} alt="" className="avatar-face-img" />
        </span>
        <span className="player-card__name">
          {player.name}
          {isCurrent && (
            <span className="player-card__turn-badge" style={{ background: visual.color }}>
              手番
            </span>
          )}
          {player.finished && <span className="player-card__finished-badge">🕊️ 卒業済み</span>}
          <span className="player-card__personality-badge" title={personality.description}>
            {personality.icon} {personality.label}
          </span>
        </span>
        <span className="player-card__age">
          {getLifeStageName(player.age)}・{player.age}歳（
          {era === 'showa' ? `${getGengoLabel(getCalendarYear(era, player.age))}・` : ''}
          {getCalendarYear(era, player.age)}年）
          {longevityBadge && (
            <span className="player-card__longevity-badge">
              {longevityBadge.icon} {longevityBadge.label}
            </span>
          )}
        </span>
      </div>

      <div className="player-card__money">
        {STAT_ICONS.money} {player.money.toLocaleString()}万円
      </div>

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
        <StatusFieldList player={player} />
        <ChosenRouteList chosenRoutes={player.chosenRoutes} />
      </div>
    </div>
  );
}

export default PlayerCard;
