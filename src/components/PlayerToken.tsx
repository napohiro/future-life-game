import { getPlayerCharacter } from '../data/playerCharacters';

interface PlayerTokenProps {
  characterId: string;
  name: string;
  isCurrent: boolean;
}

/** 盤面を移動するプレイヤーコマ。選択済みキャラクターの台座付きトークン画像をそのまま表示する。 */
function PlayerToken({ characterId, name, isCurrent }: PlayerTokenProps) {
  const character = getPlayerCharacter(characterId);
  return (
    <span className={`token ${isCurrent ? 'token--current' : ''}`} title={name}>
      <img src={character.token} alt={name} className="token__image" draggable={false} />
    </span>
  );
}

export default PlayerToken;
