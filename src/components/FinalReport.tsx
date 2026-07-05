import { useEffect } from 'react';
import { getRouteById } from '../data/branchRoutes';
import { getPlayerCharacter } from '../data/playerCharacters';
import type { EraId, Player, StatKey } from '../types/game';
import {
  STAT_ICONS,
  STAT_LABELS,
  STATUS_FIELD_ICONS,
  STATUS_FIELD_LABELS,
  calculateLifeType,
  calculateSecondLifeScore,
  calculateTitle,
  formatLifeLogHeadline,
  getDisplayOccupation,
  generateFinalChapter,
  generateGraduationSummary,
  generateLifeSummaryPlaceholder,
  generateReplaySuggestion,
  generateRouteNarrative,
  getBestLifeLogs,
  getGraduationReason,
  getPlayerVisual,
  getRepresentativeNewspaperHeadline,
  getWorstLifeLogs,
  rankPlayers,
} from '../utils/gameLogic';
import { playFinalResultSound, vibrate } from '../utils/sound';

interface FinalReportProps {
  players: Player[];
  era: EraId;
  soundEnabled: boolean;
  onRestart: () => void;
  onPlayDifferentEra: () => void;
}

const RANK_MEDALS = ['🥇', '🥈', '🥉'];

const REPORT_STAT_KEYS: StatKey[] = ['money', 'happiness', 'health', 'trust', 'relationships', 'socialContribution', 'aiAffinity'];

function FinalReport({ players, era, soundEnabled, onRestart, onPlayDifferentEra }: FinalReportProps) {
  const ranked = rankPlayers(players);

  useEffect(() => {
    if (soundEnabled) playFinalResultSound();
    vibrate([40, 60, 40, 60, 80]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="screen final-report">
      <h2 className="screen__heading">人生レポート</h2>
      <p className="final-report__lead">おつかれさまでした。それぞれの人生を振り返りましょう。</p>

      <div className="final-report__list">
        {ranked.map(({ player, score, rank }) => {
          const playerIndex = players.findIndex((p) => p.id === player.id);
          const visual = getPlayerVisual(playerIndex);
          const character = getPlayerCharacter(player.characterId);
          const lifeType = calculateLifeType(player);
          const title = calculateTitle(player);
          const summary = generateLifeSummaryPlaceholder(player);
          const routeNarrative = generateRouteNarrative(player);
          const replaySuggestion = generateReplaySuggestion(player);
          const bestLogs = getBestLifeLogs(player, 3);
          const worstLogs = getWorstLifeLogs(player, 3);

          const graduationReason = player.graduationReasonId ? getGraduationReason(player.graduationReasonId) : null;
          const graduationSummary = graduationReason ? generateGraduationSummary(player) : null;
          const secondLifeScore = calculateSecondLifeScore(player);
          // 卒業ログ自体を除いた、直前の出来事を「最後の出来事」として表示する。
          const nonGraduationLogs = player.lifeLogs.filter((log) => log.category !== 'death' || log.eventTitle !== `${graduationReason?.title}：${graduationReason?.label}`);
          const lastEvent = nonGraduationLogs[nonGraduationLogs.length - 1];
          const finalChapter = graduationReason
            ? generateFinalChapter(player, lastEvent ? formatLifeLogHeadline(lastEvent) : undefined)
            : null;
          const representativeHeadline = getRepresentativeNewspaperHeadline(player, era);

          return (
            <div
              key={player.id}
              className="final-report__card"
              style={{ borderColor: visual.color }}
            >
              <div className="final-report__card-header">
                <span className="final-report__rank">{RANK_MEDALS[rank - 1] ?? `${rank}位`}</span>
                <span className="final-report__avatar" style={{ background: visual.colorSoft }}>
                  <img src={character.avatar} alt="" className="avatar-face-img" />
                </span>
                <span className="final-report__name">{player.name}</span>
                <span className="final-report__score">総合スコア {score}</span>
              </div>

              <div className="final-report__badges">
                <span className="final-report__type-badge" style={{ background: visual.color }}>
                  {lifeType.name}
                </span>
                <span className="final-report__title-badge">称号：{title}</span>
              </div>

              <p className="final-report__headline">{summary}</p>

              <div className="final-report__life-facts">
                <span className="final-report__life-fact">🎂 最終年齢：{player.age}歳</span>
                <span className="final-report__life-fact">
                  {STATUS_FIELD_ICONS.occupation} {STATUS_FIELD_LABELS.occupation}：
                  {getDisplayOccupation(player.age, player.occupation)}
                </span>
                <span className="final-report__life-fact">
                  {STATUS_FIELD_ICONS.romanceStatus} {STATUS_FIELD_LABELS.romanceStatus}：{player.romanceStatus}
                </span>
                <span className="final-report__life-fact">
                  {STATUS_FIELD_ICONS.housingStatus} {STATUS_FIELD_LABELS.housingStatus}：{player.housingStatus}
                </span>
              </div>

              {representativeHeadline && (
                <p className="final-report__newspaper-headline">📰 {representativeHeadline}</p>
              )}

              {graduationReason && (
                <div className="final-report__event-block final-report__event-block--graduation">
                  <div className="final-report__event-heading">🕊️ 人生の卒業</div>
                  <div className="final-report__graduation-facts">
                    <span>卒業年齢：{player.graduationAge}歳</span>
                    <span>卒業理由：{graduationReason.label}</span>
                    <span>セカンドライフ評価：{secondLifeScore}/100</span>
                  </div>
                  {lastEvent && (
                    <div className="final-report__graduation-last-event">
                      最後の出来事：{formatLifeLogHeadline(lastEvent)}
                    </div>
                  )}
                  <p className="final-report__graduation-summary">{graduationSummary}</p>
                </div>
              )}

              {player.chosenRoutes.length > 0 && (
                <div className="final-report__event-block final-report__event-block--route">
                  <div className="final-report__event-heading">🧭 選んだ人生ルート</div>
                  <ul className="final-report__route-list">
                    {player.chosenRoutes.map((routeId) => {
                      const route = getRouteById(routeId);
                      if (!route) return null;
                      return (
                        <li key={routeId}>
                          {route.icon} {route.name}
                        </li>
                      );
                    })}
                  </ul>
                  <p className="final-report__route-narrative">{routeNarrative}</p>
                </div>
              )}

              <div className="final-report__stats">
                {REPORT_STAT_KEYS.map((key) => (
                  <div className="final-report__stat" key={key}>
                    <span className="final-report__stat-label">
                      {STAT_ICONS[key]} {STAT_LABELS[key]}
                    </span>
                    <span className="final-report__stat-value">
                      {player[key]}
                      {key === 'money' ? '万円' : ''}
                    </span>
                  </div>
                ))}
                <div className="final-report__stat">
                  <span className="final-report__stat-label">📖 人生ログ</span>
                  <span className="final-report__stat-value">{player.lifeLogs.length}件</span>
                </div>
              </div>

              {bestLogs.length > 0 && (
                <div className="final-report__event-block">
                  <div className="final-report__event-heading">🌟 人生のベストイベント</div>
                  <ul className="final-report__event-list">
                    {bestLogs.map((log) => (
                      <li key={log.id}>{formatLifeLogHeadline(log)}</li>
                    ))}
                  </ul>
                </div>
              )}

              {worstLogs.length > 0 && (
                <div className="final-report__event-block">
                  <div className="final-report__event-heading">⚡ 人生のピンチイベント</div>
                  <ul className="final-report__event-list">
                    {worstLogs.map((log) => (
                      <li key={log.id}>{formatLifeLogHeadline(log)}</li>
                    ))}
                  </ul>
                </div>
              )}

              {finalChapter && (
                <div className="final-report__event-block final-report__event-block--final-chapter">
                  <div className="final-report__event-heading">📖 最後の章</div>
                  <p className="final-report__final-chapter-text">{finalChapter}</p>
                </div>
              )}

              <p className="final-report__replay-suggestion">💡 {replaySuggestion}</p>
            </div>
          );
        })}
      </div>

      <div className="final-report__actions">
        <button type="button" className="btn btn--ghost btn--large" onClick={onPlayDifferentEra}>
          別の時代で遊ぶ
        </button>
        <button type="button" className="btn btn--primary btn--large" onClick={onRestart}>
          もう一度あそぶ
        </button>
      </div>
    </div>
  );
}

export default FinalReport;
