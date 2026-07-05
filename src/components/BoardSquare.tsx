import { forwardRef } from 'react';
import { MILESTONE_ICON_IMAGES, SQUARE_TYPE_ICON_IMAGES } from '../data/uiAssets';
import type { LifeStage, Player, SquareType } from '../types/game';
import { SQUARE_TYPE_META, getLifeStageMeta } from '../utils/gameLogic';
import PlayerToken from './PlayerToken';
import SquareIcon from './SquareIcon';

export interface SquareOccupant {
  player: Player;
  playerIndex: number;
  isCurrent: boolean;
}

export interface BoardSquareMilestone {
  icon: string;
  title: string;
}

export interface BoardSquareProps {
  position: number;
  x: number;
  y: number;
  stage: LifeStage;
  squareType: SquareType;
  isBranch?: boolean;
  branchName?: string;
  isMilestone?: boolean;
  milestone?: BoardSquareMilestone;
  isFogged?: boolean;
  occupants: SquareOccupant[];
  isCurrentPlayerSquare: boolean;
}

const BoardSquare = forwardRef<HTMLDivElement, BoardSquareProps>(function BoardSquare(
  { position, x, y, stage, squareType, isBranch, branchName, isMilestone, milestone, isFogged, occupants, isCurrentPlayerSquare },
  ref,
) {
  const stageMeta = getLifeStageMeta(stage);
  const squareMeta = SQUARE_TYPE_META[squareType];

  const classNames = [
    'board-square',
    isFogged ? 'board-square--fogged' : '',
    isMilestone && !isFogged ? 'board-square--milestone' : '',
    milestone && !isFogged ? 'board-square--giant' : '',
    isBranch ? 'board-square--branch' : '',
    isCurrentPlayerSquare ? 'board-square--current' : '',
    squareType === 'superRare' && !isFogged ? 'board-square--super-rare' : '',
    squareType === 'chance' && !isFogged ? 'board-square--chance' : '',
    squareType === 'pinch' && !isFogged ? 'board-square--pinch' : '',
  ]
    .filter(Boolean)
    .join(' ');

  if (isFogged) {
    return (
      <div
        ref={ref}
        className={classNames}
        style={{ left: `${x}%`, top: y }}
        title="この先の人生は、まだ見えていません"
      >
        <span className="board-square__fog-icon">？</span>
      </div>
    );
  }

  const titleParts = [stageMeta.name, squareMeta.label];
  if (branchName) titleParts.push(branchName);
  if (milestone) titleParts.push(milestone.title);

  return (
    <div
      ref={ref}
      className={classNames}
      style={{
        left: `${x}%`,
        top: y,
        background: stageMeta.color,
        boxShadow: squareType !== 'normal' && squareType !== 'superRare' ? `inset 0 0 0 2px ${squareMeta.accent}` : undefined,
      }}
      title={titleParts.join('・')}
    >
      {milestone ? (
        <SquareIcon src={MILESTONE_ICON_IMAGES[position]} emoji={milestone.icon} className="board-square__giant-icon" />
      ) : (
        <SquareIcon src={SQUARE_TYPE_ICON_IMAGES[squareType]} emoji={squareMeta.icon} className="board-square__icon" />
      )}
      <span className="board-square__index">{position}</span>
      {isBranch && <span className="board-square__branch-mark">🔀</span>}
      {milestone && <span className="board-square__giant-label">{milestone.title}</span>}
      <div className="board-square__tokens" data-count={occupants.length}>
        {occupants.map(({ player, isCurrent }) => (
          <PlayerToken key={player.id} characterId={player.characterId} name={player.name} isCurrent={isCurrent} />
        ))}
      </div>
    </div>
  );
});

export default BoardSquare;
