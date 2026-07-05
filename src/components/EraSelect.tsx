import { ERA_DEFINITIONS } from '../data/eras';
import { ERA_BACKGROUND_IMAGES } from '../data/uiAssets';
import type { EraId } from '../types/game';

interface EraSelectProps {
  onStart: (era: EraId) => void;
  onBack: () => void;
}

/** 時代カードはタップした瞬間にその時代で次へ進む（決定ボタンは無し）。 */
function EraSelect({ onStart, onBack }: EraSelectProps) {
  return (
    <div className="screen era-select">
      <h2 className="screen__heading">時代を選ぼう</h2>
      <p className="era-select__lead">どの時代の人生を歩むか選んでください。ゲーム中のイベント内容が時代によって変わります。</p>

      <div className="era-select__list">
        {ERA_DEFINITIONS.map((era) => (
          <button
            key={era.id}
            type="button"
            className={`era-select__card era-select__card--${era.id}`}
            style={{ backgroundImage: `url(${ERA_BACKGROUND_IMAGES[era.id]})` }}
            onClick={() => onStart(era.id)}
            aria-label={`${era.name}（${era.year}年）を選んで次へ進む`}
          >
            <span className="era-select__card-overlay" aria-hidden="true" />
            <span className="era-select__name">
              {era.name}｜{era.year}年
            </span>
            <span className="era-select__description">{era.description}</span>
          </button>
        ))}
      </div>

      <div className="player-setup__actions">
        <button type="button" className="btn btn--ghost" onClick={onBack}>
          戻る
        </button>
      </div>
    </div>
  );
}

export default EraSelect;
