import { useEffect, useMemo, useRef } from 'react';
import { BRANCH_POINTS, getBranchPointForPosition } from '../data/branchRoutes';
import type { MoveAnimationState, Player } from '../types/game';
import {
  buildSmoothPathD,
  generateBoardPath,
  generateBranchDecorations,
  generateDirectionArrows,
  generateStagePath,
} from '../utils/boardPath';
import { getBoardMilestone, getBoardStage, getLifeStageName, getPlayerVisual, getSquareType } from '../utils/gameLogic';
import BoardSquare from './BoardSquare';
import BoardStageSection from './BoardStageSection';
import PlayerCard from './PlayerCard';
import Roulette from './Roulette';
import StageBackground from './StageBackground';

const ELDER_FOG_START_POSITION = 80;
const ELDER_FOG_VISIBILITY_RANGE = 6;

interface GameBoardProps {
  players: Player[];
  currentPlayerIndex: number;
  boardSize: number;
  lastRoll: number | null;
  rollDisabled: boolean;
  moveAnimation: MoveAnimationState | null;
  soundEnabled: boolean;
  onRoll: () => number;
  onRollSettled: () => void;
  onToggleSound: () => void;
  onShowLifeLog: () => void;
  onShowNewspaper: () => void;
}

function GameBoard({
  players,
  currentPlayerIndex,
  boardSize,
  lastRoll,
  rollDisabled,
  moveAnimation,
  soundEnabled,
  onRoll,
  onRollSettled,
  onToggleSound,
  onShowLifeLog,
  onShowNewspaper,
}: GameBoardProps) {
  const currentPlayer = players[currentPlayerIndex];
  const currentSquareRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    currentSquareRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [currentPlayer?.position, currentPlayerIndex]);

  const currentVisual = currentPlayer ? getPlayerVisual(currentPlayerIndex) : null;
  const currentStage = currentPlayer ? getBoardStage(currentPlayer.position) : 'stage1';

  // 老後・近未来エリア（80歳〜）は固定ゴールではないため、進んだ分だけ道が見える「霧マップ」にする。
  // 全プレイヤーのうち最も先へ進んだ位置を基準に、そこから数マス先までだけを見せる。
  const elderRevealFrontier = Math.max(ELDER_FOG_START_POSITION - 1, ...players.map((p) => p.position));
  const fogBoundary = elderRevealFrontier + ELDER_FOG_VISIBILITY_RANGE;

  const boardPoints = useMemo(() => generateBoardPath(boardSize), [boardSize]);
  const stageBands = useMemo(() => generateStagePath(boardPoints), [boardPoints]);
  const pathD = useMemo(() => buildSmoothPathD(boardPoints), [boardPoints]);
  const branchDecorations = useMemo(() => generateBranchDecorations(BRANCH_POINTS, boardPoints), [boardPoints]);
  const directionArrows = useMemo(() => generateDirectionArrows(boardPoints), [boardPoints]);
  const canvasHeight = useMemo(() => Math.max(...boardPoints.map((p) => p.y)) + 90, [boardPoints]);

  return (
    <StageBackground stage={currentStage} className="screen game-board">
      <div
        className="game-board__top"
        style={currentVisual ? { borderColor: currentVisual.color } : undefined}
      >
        {currentPlayer && !currentPlayer.finished ? (
          <div className="game-board__turn">
            <span className="game-board__turn-avatar" style={{ background: currentVisual!.colorSoft }}>
              {currentVisual!.icon}
            </span>
            <div className="game-board__turn-text">
              <strong>{currentPlayer.name}</strong> さんの番です
              <div className="game-board__turn-stage">{getLifeStageName(currentPlayer.age)}・{currentPlayer.age}歳</div>
            </div>
          </div>
        ) : (
          <span>ゲーム終了処理中…</span>
        )}
        <div className="game-board__top-actions">
          <button type="button" className="btn btn--ghost btn--icon" onClick={onToggleSound} title="効果音のON/OFF">
            {soundEnabled ? '🔊' : '🔇'}
          </button>
          <button type="button" className="btn btn--ghost btn--small" onClick={onShowNewspaper}>
            人生新聞
          </button>
          <button type="button" className="btn btn--ghost btn--small" onClick={onShowLifeLog}>
            人生ログ
          </button>
        </div>
      </div>

      {moveAnimation && (
        <div className="game-board__move-toast">
          {moveAnimation.playerName}さん、{moveAnimation.totalSteps}マス進みます
          {moveAnimation.stepIndex > 0 && (
            <span className="game-board__move-toast-progress">
              {' '}
              （{moveAnimation.stepIndex} / {moveAnimation.totalSteps}マス）
            </span>
          )}
        </div>
      )}

      <p className="board-info-note">
        💡 人生の節目（18・30・45・60歳）では、将来のルートが分かれることがあります。
      </p>
      {currentStage === 'stage6' && (
        <p className="board-info-note board-info-note--fog">
          🌫️ この先の人生は、まだ見えていません。進むごとに、少しずつ道が開けていきます。
        </p>
      )}

      <div className="board-scroll">
        <div className="board-canvas" style={{ height: canvasHeight }}>
          {stageBands.map((band) => (
            <BoardStageSection key={band.stage} stage={band.stage} top={band.top} height={band.height} />
          ))}

          <svg className="board-path-svg" viewBox={`0 0 100 ${canvasHeight}`} preserveAspectRatio="none">
            <path d={pathD} className="board-path-line" />
            {branchDecorations.map((decoration) =>
              decoration.nodes.map((node) => (
                <path
                  key={node.id}
                  d={`M ${decoration.originX} ${decoration.originY} Q ${(decoration.originX + node.x) / 2} ${
                    (decoration.originY + node.y) / 2
                  } ${node.x} ${node.y}`}
                  className="board-branch-line"
                />
              )),
            )}
          </svg>

          {directionArrows
            .filter((arrow) => arrow.position <= fogBoundary)
            .map((arrow, i) => (
              <span
                key={i}
                className="board-direction-arrow"
                style={{ left: `${arrow.x}%`, top: arrow.y, transform: `translate(-50%, -50%) rotate(${arrow.angleDeg}deg)` }}
              >
                ➜
              </span>
            ))}

          {boardPoints.map((point) => {
            const isFogged = point.position >= ELDER_FOG_START_POSITION && point.position > fogBoundary;
            const squareType = getSquareType(point.position);
            const isMilestone = squareType === 'turningPoint';
            const branchPoint = getBranchPointForPosition(point.position);
            const milestone = getBoardMilestone(point.position);
            const isCurrentPlayerSquare = currentPlayer?.position === point.position;
            const occupants = players
              .map((player, playerIndex) => ({ player, playerIndex, isCurrent: player.id === currentPlayer?.id }))
              .filter(({ player }) => player.position === point.position);

            return (
              <BoardSquare
                key={point.position}
                ref={isCurrentPlayerSquare ? currentSquareRef : undefined}
                position={point.position}
                x={point.x}
                y={point.y}
                stage={point.stage}
                squareType={squareType}
                isMilestone={isMilestone}
                milestone={isFogged ? undefined : milestone}
                isBranch={!isFogged && !!branchPoint}
                branchName={branchPoint?.name}
                isFogged={isFogged}
                occupants={occupants}
                isCurrentPlayerSquare={isCurrentPlayerSquare}
              />
            );
          })}

          {branchDecorations.map((decoration) =>
            decoration.nodes.map((node) => (
              <div
                key={node.id}
                className="board-branch-node"
                style={{ left: `${node.x}%`, top: node.y }}
                title={node.label}
              >
                <span className="board-branch-node__icon">{node.icon}</span>
                <span className="board-branch-node__label">{node.label}</span>
              </div>
            )),
          )}
        </div>
      </div>

      <Roulette
        disabled={rollDisabled || !currentPlayer || currentPlayer.finished}
        lastRoll={lastRoll}
        soundEnabled={soundEnabled}
        onRoll={onRoll}
        onRollSettled={onRollSettled}
      />

      <div className="game-board__players">
        {players.map((player, index) => (
          <PlayerCard key={player.id} player={player} index={index} isCurrent={index === currentPlayerIndex} compact />
        ))}
      </div>
    </StageBackground>
  );
}

export default GameBoard;
