import { useState } from 'react';
import { ERA_DEFINITIONS, DEFAULT_ERA } from '../data/eras';
import type { EraId } from '../types/game';

interface EraSelectProps {
  initialEra?: EraId;
  onStart: (era: EraId) => void;
  onBack: () => void;
}

function EraSelect({ initialEra = DEFAULT_ERA, onStart, onBack }: EraSelectProps) {
  const [selectedEra, setSelectedEra] = useState<EraId>(initialEra);

  return (
    <div className="screen era-select">
      <h2 className="screen__heading">時代を選ぼう</h2>
      <p className="era-select__lead">どの時代の人生を歩むか選んでください。ゲーム中のイベント内容が時代によって変わります。</p>

      <div className="era-select__list">
        {ERA_DEFINITIONS.map((era) => {
          const active = era.id === selectedEra;
          return (
            <button
              key={era.id}
              type="button"
              className={`era-select__card ${active ? 'era-select__card--active' : ''}`}
              onClick={() => setSelectedEra(era.id)}
            >
              <span className="era-select__icon">{era.icon}</span>
              <span className="era-select__name">
                {era.name}｜{era.year}年
              </span>
              <span className="era-select__description">{era.description}</span>
            </button>
          );
        })}
      </div>

      <div className="player-setup__actions">
        <button type="button" className="btn btn--ghost" onClick={onBack}>
          戻る
        </button>
        <button type="button" className="btn btn--primary" onClick={() => onStart(selectedEra)}>
          この時代で決定
        </button>
      </div>
    </div>
  );
}

export default EraSelect;
