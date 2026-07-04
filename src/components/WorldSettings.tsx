import { useState } from 'react';
import { getEraDefinition } from '../data/eras';
import type { AiSocietyLevel, DisasterFrequency, EconomyLevel, GameSettings, LongevityMode } from '../types/game';

interface WorldSettingsProps {
  initialSettings: GameSettings;
  onStart: (settings: GameSettings) => void;
  onBack: () => void;
}

const AI_SOCIETY_OPTIONS: { value: AiSocietyLevel; label: string }[] = [
  { value: 'low', label: '低' },
  { value: 'mid', label: '中' },
  { value: 'high', label: '高' },
];

const ECONOMY_OPTIONS: { value: EconomyLevel; label: string }[] = [
  { value: 'recession', label: '不況' },
  { value: 'normal', label: '普通' },
  { value: 'boom', label: '好景気' },
];

const DISASTER_OPTIONS: { value: DisasterFrequency; label: string }[] = [
  { value: 'low', label: '低' },
  { value: 'normal', label: '普通' },
  { value: 'high', label: '高' },
];

const LONGEVITY_OPTIONS: { value: LongevityMode; label: string }[] = [
  { value: 'standard', label: '標準' },
  { value: 'longevity', label: '長寿' },
];

function WorldSettings({ initialSettings, onStart, onBack }: WorldSettingsProps) {
  const [settings, setSettings] = useState<GameSettings>(initialSettings);
  const eraDefinition = getEraDefinition(settings.era);

  return (
    <div className="screen world-settings">
      <h2 className="screen__heading">世界設定</h2>
      <p className="world-settings__lead">
        あなたが生きる社会の姿を選びましょう。ゲーム中のイベントの出やすさに、少しだけ影響します。
      </p>

      <div className="world-settings__card">
        <div className="world-settings__row-label">時代設定</div>
        <div className="world-settings__era-badge">
          {eraDefinition.icon} {eraDefinition.name}｜{eraDefinition.year}年
        </div>
      </div>

      <div className="world-settings__card">
        <div className="world-settings__row-label">🤖 AI社会レベル</div>
        <div className="segmented">
          {AI_SOCIETY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`segmented__option ${settings.aiSocietyLevel === opt.value ? 'segmented__option--active' : ''}`}
              onClick={() => setSettings((prev) => ({ ...prev, aiSocietyLevel: opt.value }))}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="world-settings__card">
        <div className="world-settings__row-label">💹 景気</div>
        <div className="segmented">
          {ECONOMY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`segmented__option ${settings.economy === opt.value ? 'segmented__option--active' : ''}`}
              onClick={() => setSettings((prev) => ({ ...prev, economy: opt.value }))}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="world-settings__card">
        <div className="world-settings__row-label">🌪️ 災害頻度</div>
        <div className="segmented">
          {DISASTER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`segmented__option ${settings.disasterFrequency === opt.value ? 'segmented__option--active' : ''}`}
              onClick={() => setSettings((prev) => ({ ...prev, disasterFrequency: opt.value }))}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="world-settings__card">
        <div className="world-settings__row-label">⏳ 寿命モード</div>
        <div className="segmented">
          {LONGEVITY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`segmented__option ${settings.longevityMode === opt.value ? 'segmented__option--active' : ''}`}
              onClick={() => setSettings((prev) => ({ ...prev, longevityMode: opt.value }))}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="player-setup__actions">
        <button type="button" className="btn btn--ghost" onClick={onBack}>
          戻る
        </button>
        <button type="button" className="btn btn--primary" onClick={() => onStart(settings)}>
          この世界でゲームスタート
        </button>
      </div>
    </div>
  );
}

export default WorldSettings;
