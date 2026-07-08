import type { EraId, Player } from '../types/game';
import {
  describeBestEventReason,
  describePinchEventReason,
  describeTurningPointReason,
  formatLifeLogHeadline,
  generateFinalReview,
  generateLifeStory,
  getBestLifeLogs,
  getForeshadowingConnections,
  getTurningPointLogs,
  getWorstLifeLogs,
} from '../utils/gameLogic';

interface LifeStoryAccordionProps {
  player: Player;
  era: EraId;
}

/**
 * 最終レポート用の「人生を振り返る」折り畳みセクション群。
 * スマホで本文が長くなりすぎないよう、ネイティブの<details>/<summary>で開閉させる
 * （JS側で開閉状態を管理する必要がなく、タップでの開閉も標準で自然に動く）。
 */
function LifeStoryAccordion({ player, era }: LifeStoryAccordionProps) {
  const lifeStory = generateLifeStory(player, era);
  const bestLogs = getBestLifeLogs(player, 5);
  const worstLogs = getWorstLifeLogs(player, 5);
  const turningPoints = getTurningPointLogs(player, 5);
  const foreshadows = getForeshadowingConnections(player);
  const finalReview = generateFinalReview(player);

  return (
    <div className="life-story">
      <h4 className="life-story__title">📖 人生を振り返る</h4>

      <details className="life-story__section" open>
        <summary className="life-story__summary">人生ストーリー</summary>
        <div className="life-story__body">
          {lifeStory.split('\n\n').map((paragraph, index) => (
            <p className="life-story__paragraph" key={index}>
              {paragraph}
            </p>
          ))}
        </div>
      </details>

      {bestLogs.length > 0 && (
        <details className="life-story__section">
          <summary className="life-story__summary">🌟 ベストイベント</summary>
          <div className="life-story__body">
            <ul className="life-story__event-list">
              {bestLogs.map((log) => (
                <li className="life-story__event-item" key={log.id}>
                  <span className="life-story__event-headline">{formatLifeLogHeadline(log)}</span>
                  <span className="life-story__event-reason">{describeBestEventReason(log)}</span>
                </li>
              ))}
            </ul>
          </div>
        </details>
      )}

      {worstLogs.length > 0 && (
        <details className="life-story__section">
          <summary className="life-story__summary">⚡ ピンチイベント</summary>
          <div className="life-story__body">
            <ul className="life-story__event-list">
              {worstLogs.map((log) => (
                <li className="life-story__event-item" key={log.id}>
                  <span className="life-story__event-headline">{formatLifeLogHeadline(log)}</span>
                  <span className="life-story__event-reason">{describePinchEventReason(log)}</span>
                </li>
              ))}
            </ul>
          </div>
        </details>
      )}

      {turningPoints.length > 0 && (
        <details className="life-story__section">
          <summary className="life-story__summary">🔀 人生の転機</summary>
          <div className="life-story__body">
            <ul className="life-story__event-list">
              {turningPoints.map((log) => (
                <li className="life-story__event-item" key={log.id}>
                  <span className="life-story__event-headline">{formatLifeLogHeadline(log)}</span>
                  <span className="life-story__event-reason">{describeTurningPointReason(log)}</span>
                </li>
              ))}
            </ul>
          </div>
        </details>
      )}

      {foreshadows.length > 0 && (
        <details className="life-story__section">
          <summary className="life-story__summary">🧵 伏線になった出来事</summary>
          <div className="life-story__body">
            <ul className="life-story__event-list">
              {foreshadows.map((connection) => (
                <li className="life-story__event-item" key={`${connection.earlyLog.id}-${connection.laterLog.id}`}>
                  <span className="life-story__event-headline">
                    {formatLifeLogHeadline(connection.earlyLog)} → {formatLifeLogHeadline(connection.laterLog)}
                  </span>
                  <span className="life-story__event-reason">{connection.text}</span>
                </li>
              ))}
            </ul>
          </div>
        </details>
      )}

      <details className="life-story__section">
        <summary className="life-story__summary">📝 最後の総評</summary>
        <div className="life-story__body">
          <p className="life-story__paragraph">{finalReview}</p>
        </div>
      </details>
    </div>
  );
}

export default LifeStoryAccordion;
