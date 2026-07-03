import { useState } from 'react';
import type { PlayerSetupInput } from '../types/game';
import { calculateAge } from '../utils/gameLogic';

interface PlayerSetupProps {
  onStart: (inputs: PlayerSetupInput[]) => void;
  onBack: () => void;
}

function createEmptyInputs(count: number): PlayerSetupInput[] {
  return Array.from({ length: count }, () => ({ name: '', birthDate: '' }));
}

function PlayerSetup({ onStart, onBack }: PlayerSetupProps) {
  const [playerCount, setPlayerCount] = useState(2);
  const [inputs, setInputs] = useState<PlayerSetupInput[]>(createEmptyInputs(2));

  const handleCountChange = (count: number) => {
    setPlayerCount(count);
    setInputs((prev) => {
      const next = createEmptyInputs(count);
      prev.forEach((input, index) => {
        if (index < count) next[index] = input;
      });
      return next;
    });
  };

  const handleFieldChange = (index: number, field: keyof PlayerSetupInput, value: string) => {
    setInputs((prev) => prev.map((input, i) => (i === index ? { ...input, [field]: value } : input)));
  };

  const today = new Date().toISOString().slice(0, 10);

  const isValid = inputs.every((input) => input.name.trim().length > 0 && input.birthDate.length > 0);

  const handleSubmit = () => {
    if (!isValid) return;
    onStart(inputs);
  };

  return (
    <div className="screen player-setup">
      <h2 className="screen__heading">プレイヤー設定</h2>

      <div className="player-setup__count">
        <span className="player-setup__count-label">プレイ人数</span>
        <div className="segmented">
          {[2, 3].map((count) => (
            <button
              key={count}
              type="button"
              className={`segmented__option ${playerCount === count ? 'segmented__option--active' : ''}`}
              onClick={() => handleCountChange(count)}
            >
              {count}人
            </button>
          ))}
        </div>
      </div>

      <div className="player-setup__list">
        {inputs.map((input, index) => {
          const age = input.birthDate ? calculateAge(input.birthDate) : null;
          return (
            <div key={index} className="player-setup__card">
              <div className="player-setup__card-title">プレイヤー{index + 1}</div>
              <label className="field">
                <span className="field__label">名前</span>
                <input
                  type="text"
                  className="field__input"
                  placeholder="例：たろう"
                  maxLength={12}
                  value={input.name}
                  onChange={(e) => handleFieldChange(index, 'name', e.target.value)}
                />
              </label>
              <label className="field">
                <span className="field__label">誕生日</span>
                <input
                  type="date"
                  className="field__input"
                  max={today}
                  value={input.birthDate}
                  onChange={(e) => handleFieldChange(index, 'birthDate', e.target.value)}
                />
              </label>
              {age !== null && <div className="player-setup__age">現在の年齢：{age}歳</div>}
            </div>
          );
        })}
      </div>

      <p className="player-setup__hint">
        ※ 年齢差は最年長プレイヤーを基準にスタート補正されます（若いプレイヤーほど有利にスタート）。
      </p>

      <div className="player-setup__actions">
        <button type="button" className="btn btn--ghost" onClick={onBack}>
          戻る
        </button>
        <button type="button" className="btn btn--primary" disabled={!isValid} onClick={handleSubmit}>
          つぎへ（世界設定）
        </button>
      </div>
    </div>
  );
}

export default PlayerSetup;
