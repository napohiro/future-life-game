import { getEraDefinition, getEraSocietyProfile } from '../data/eras';
import type { GameSettings } from '../types/game';

interface WorldSettingsProps {
  initialSettings: GameSettings;
  onStart: (settings: GameSettings) => void;
  onBack: () => void;
}

function WorldSettings({ initialSettings, onStart, onBack }: WorldSettingsProps) {
  const eraDefinition = getEraDefinition(initialSettings.era);
  const profile = getEraSocietyProfile(initialSettings.era);

  const handleStart = () => {
    onStart({ ...initialSettings, ...profile.settings });
  };

  return (
    <div className="screen world-settings">
      <h2 className="screen__heading">この時代の社会</h2>
      <p className="world-settings__lead">
        選んだ時代に応じて、社会の前提が自動で決まります。内容はゲーム中のイベントの出やすさに、少しだけ影響します。
      </p>

      <div className="world-settings__card">
        <div className="world-settings__row-label">時代設定</div>
        <div className="world-settings__era-badge">
          {eraDefinition.icon} {eraDefinition.name}｜{eraDefinition.year}年
        </div>
      </div>

      <div className="world-settings__card">
        <div className="world-settings__row-label">🤖 AI・テクノロジー</div>
        <p className="world-settings__row-text">{profile.aiSociety}</p>
      </div>

      <div className="world-settings__card">
        <div className="world-settings__row-label">💹 景気</div>
        <p className="world-settings__row-text">{profile.economy}</p>
      </div>

      <div className="world-settings__card">
        <div className="world-settings__row-label">🌪️ 災害</div>
        <p className="world-settings__row-text">{profile.disaster}</p>
      </div>

      <div className="world-settings__card">
        <div className="world-settings__row-label">⏳ 寿命の目安</div>
        <p className="world-settings__row-text">{profile.longevity}</p>
      </div>

      <div className="player-setup__actions">
        <button type="button" className="btn btn--ghost" onClick={onBack}>
          戻る
        </button>
        <button type="button" className="btn btn--primary" onClick={handleStart}>
          この時代でゲームスタート
        </button>
      </div>
    </div>
  );
}

export default WorldSettings;
