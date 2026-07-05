import { getCalendarYear, getGengoLabel } from '../data/eras';
import { getPlayerCharacter } from '../data/playerCharacters';
import type { EraId, Player } from '../types/game';
import { STAT_ICONS, getDisplayOccupation, getLifeStageName, getLongevityBadge, getPlayerVisual } from '../utils/gameLogic';

interface TurnAnnouncementProps {
  player: Player;
  playerIndex: number;
  playerCount: number;
  era: EraId;
  onDismiss: () => void;
}

/**
 * 各ターン開始時に一瞬はさむ「手番の引き継ぎ」演出。
 * スマホ1台を回して遊ぶ想定のため、次に操作すべき人が誰かを一目で示し、
 * 「スマホを渡す」タイミングを自然に作る。タップで消えて通常画面に戻る。
 */
function TurnAnnouncement({ player, playerIndex, playerCount, era, onDismiss }: TurnAnnouncementProps) {
  const visual = getPlayerVisual(playerIndex);
  const character = getPlayerCharacter(player.characterId);
  const calendarYear = getCalendarYear(era, player.age);
  const longevityBadge = getLongevityBadge(player.age, era);

  return (
    <div className="turn-announce-overlay" onClick={onDismiss} role="button" tabIndex={0}>
      <div
        className="turn-announce-card"
        style={{ borderColor: visual.color, boxShadow: `0 0 0 1px ${visual.color}33, 0 24px 60px rgba(10, 14, 26, 0.45)` }}
      >
        <div className="turn-announce-card__glow" style={{ background: visual.colorSoft }} aria-hidden="true" />
        <span className="turn-announce-card__avatar" style={{ background: visual.color }}>
          <img src={character.avatar} alt="" className="avatar-face-img" />
        </span>
        <div className="turn-announce-card__label">次のばん</div>
        <div className="turn-announce-card__name" style={{ color: visual.color }}>
          {player.name}さん
        </div>
        {playerCount > 1 && <p className="turn-announce-card__handoff">📱 スマホを{player.name}さんへ渡してね</p>}

        <div className="turn-announce-card__facts">
          <span className="turn-announce-card__fact">
            {getLifeStageName(player.age)}・{player.age}歳
            {era === 'showa' ? `（${getGengoLabel(calendarYear)}・${calendarYear}年）` : `（${calendarYear}年）`}
            {longevityBadge && (
              <span className="turn-announce-card__longevity-badge">
                {longevityBadge.icon} {longevityBadge.label}
              </span>
            )}
          </span>
          <span className="turn-announce-card__fact">{getDisplayOccupation(player.age, player.occupation)}</span>
        </div>

        <div className="turn-announce-card__stats">
          <span className="turn-announce-card__stat">{STAT_ICONS.money} {player.money.toLocaleString()}万円</span>
          <span className="turn-announce-card__stat">{STAT_ICONS.happiness} {player.happiness}</span>
          <span className="turn-announce-card__stat">{STAT_ICONS.health} {player.health}</span>
        </div>

        <button type="button" className="btn btn--primary btn--large turn-announce-card__cta" onClick={onDismiss}>
          はじめる
        </button>
      </div>
    </div>
  );
}

export default TurnAnnouncement;
