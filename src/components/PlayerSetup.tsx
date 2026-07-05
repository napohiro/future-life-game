import { useState } from 'react';
import { DEFAULT_CHARACTER_ID, PLAYER_CHARACTERS } from '../data/playerCharacters';
import type { PlayerSetupInput } from '../types/game';

interface PlayerSetupProps {
  onStart: (inputs: PlayerSetupInput[]) => void;
  onBack: () => void;
}

// 選んだキャラクターだけは、ページ更新後も引き継げるようlocalStorageに保存する。
const CHARACTER_STORAGE_KEY = 'jinsei-game:player-character-ids';

function loadStoredCharacterIds(): string[] {
  try {
    const raw = localStorage.getItem(CHARACTER_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((v): v is string => typeof v === 'string');
  } catch {
    return [];
  }
}

function saveStoredCharacterIds(ids: string[]) {
  try {
    localStorage.setItem(CHARACTER_STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // localStorageが使えない環境（プライベートモード等）でも、ゲーム進行には影響させない。
  }
}

function createEmptyInputs(count: number): PlayerSetupInput[] {
  const stored = loadStoredCharacterIds();
  return Array.from({ length: count }, (_, i) => ({ name: '', characterId: stored[i] ?? DEFAULT_CHARACTER_ID }));
}

function PlayerSetup({ onStart, onBack }: PlayerSetupProps) {
  const [playerCount, setPlayerCount] = useState(2);
  const [inputs, setInputs] = useState<PlayerSetupInput[]>(() => createEmptyInputs(2));

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

  const handleNameChange = (index: number, value: string) => {
    setInputs((prev) => prev.map((input, i) => (i === index ? { ...input, name: value } : input)));
  };

  const handleCharacterSelect = (index: number, characterId: string) => {
    setInputs((prev) => {
      const next = prev.map((input, i) => (i === index ? { ...input, characterId } : input));
      saveStoredCharacterIds(next.map((input) => input.characterId ?? DEFAULT_CHARACTER_ID));
      return next;
    });
  };

  const isValid = inputs.every((input) => input.name.trim().length > 0);

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
          {[2, 3, 4].map((count) => (
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
        {inputs.map((input, index) => (
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
                onChange={(e) => handleNameChange(index, e.target.value)}
              />
            </label>

            <span className="field__label">キャラクター</span>
            <div className="character-select-grid">
              {PLAYER_CHARACTERS.map((character) => {
                const active = input.characterId === character.id;
                return (
                  <button
                    key={character.id}
                    type="button"
                    className={`character-select-card ${active ? 'character-select-card--active' : ''}`}
                    onClick={() => handleCharacterSelect(index, character.id)}
                    aria-pressed={active}
                    aria-label={`${character.label}を選択`}
                  >
                    {active && <span className="character-select-card__check">✔</span>}
                    <img
                      src={character.avatar}
                      alt={character.label}
                      className="character-select-card__image"
                      draggable={false}
                    />
                    <span className="character-select-card__label">{character.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <p className="player-setup__hint">※ 全員0歳からスタートします。年齢に応じて人生イベントが変化していきます。</p>

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
