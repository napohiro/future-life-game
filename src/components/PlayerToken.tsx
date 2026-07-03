import type { LifeStage } from '../types/game';
import { getPlayerVisual, getStageTokenIcon } from '../utils/gameLogic';

interface PlayerTokenProps {
  playerIndex: number;
  name: string;
  isCurrent: boolean;
  stage?: LifeStage;
}

/** プレイヤーごとに色は固定、アイコンは今立っている人生ステージに応じて変化する（幼少期は子供、老後はシニア等）。 */
function PlayerToken({ playerIndex, name, isCurrent, stage }: PlayerTokenProps) {
  const visual = getPlayerVisual(playerIndex);
  const icon = stage ? getStageTokenIcon(stage) : visual.icon;
  return (
    <span
      className={`token ${isCurrent ? 'token--current' : ''}`}
      style={{ background: visual.color }}
      title={name}
    >
      {icon}
    </span>
  );
}

export default PlayerToken;
