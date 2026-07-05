import { useEffect, useMemo, useRef } from 'react';
import { BOARD_AREA_CARDS, getCurrentBoardArea } from '../data/boardAreas';
import { BRANCH_POINTS, getBranchPointForPosition } from '../data/branchRoutes';
import { getCalendarYear, getEraDefinition, getGengoLabel } from '../data/eras';
import { getPlayerCharacter } from '../data/playerCharacters';
import { ERA_BACKGROUND_IMAGES } from '../data/uiAssets';
import type { EraId, MoveAnimationState, Player } from '../types/game';
import {
  buildSmoothPathD,
  generateBoardPath,
  generateBranchDecorations,
  generateDirectionArrows,
  generateStagePath,
} from '../utils/boardPath';
import {
  getBoardMilestone,
  getBoardStage,
  getLifeStageName,
  getLongevityBadge,
  getPlayerVisual,
  getSquareType,
} from '../utils/gameLogic';
import BoardAreaCard from './BoardAreaCard';
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
  era: EraId;
  lastRoll: number | null;
  rollDisabled: boolean;
  moveAnimation: MoveAnimationState | null;
  soundEnabled: boolean;
  // 現在のプレイヤーが今回のターンで「寿命を迎える」確率（0〜1）。寿命リスク開始年齢以下や
  // 免除ターン中は0になり、ルーレットに寿命枠は表示されない。
  deathChance: number;
  onRoll: () => number | 'death';
  onRollSettled: () => void;
  onToggleSound: () => void;
  onShowLifeLog: () => void;
  onShowNewspaper: () => void;
}

function GameBoard({
  players,
  currentPlayerIndex,
  boardSize,
  era,
  lastRoll,
  rollDisabled,
  moveAnimation,
  soundEnabled,
  deathChance,
  onRoll,
  onRollSettled,
  onToggleSound,
  onShowLifeLog,
  onShowNewspaper,
}: GameBoardProps) {
  const currentPlayer = players[currentPlayerIndex];
  const eraDefinition = getEraDefinition(era);
  const currentSquareRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    currentSquareRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [currentPlayer?.position, currentPlayerIndex]);

  const currentVisual = currentPlayer ? getPlayerVisual(currentPlayerIndex) : null;
  const currentCharacter = currentPlayer ? getPlayerCharacter(currentPlayer.characterId) : null;
  const currentStage = currentPlayer ? getBoardStage(currentPlayer.position) : 'stage1';
  const currentArea = getCurrentBoardArea(currentPlayer?.age ?? 0);
  const currentLongevityBadge = currentPlayer ? getLongevityBadge(currentPlayer.age, era) : null;

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

  // 各エリアカードは「開始年齢＝盤面position」のマスのy座標を基準に、その少し上へ配置する。
  // マス（38px角、中心がpoint.y）の上端より少し上にカードの下端が来るよう、定数分だけ引き上げる。
  const AREA_CARD_Y_OFFSET = 25;
  const areaCardPlacements = useMemo(
    () =>
      BOARD_AREA_CARDS.map((areaCard) => {
        const anchor = boardPoints.find((p) => p.position === areaCard.startAge);
        return anchor ? { areaCard, y: anchor.y - AREA_CARD_Y_OFFSET } : null;
      }).filter((placement): placement is { areaCard: (typeof BOARD_AREA_CARDS)[number]; y: number } => placement !== null),
    [boardPoints],
  );

  return (
    <StageBackground stage={currentStage} className="screen game-board">
      <div
        className="game-board__era-backdrop"
        style={{ backgroundImage: `url(${ERA_BACKGROUND_IMAGES[era]})` }}
        aria-hidden="true"
      />
      <div className="game-board__era-strip">
        <span className="game-board__stage-pill">
          {currentArea.icon} {currentArea.title}｜{currentArea.ageLabel}
        </span>
        <span className={`game-board__era-pill game-board__era-pill--${era}`}>
          {eraDefinition.icon} {eraDefinition.year}年｜{eraDefinition.name}
        </span>
      </div>
      <div
        className="game-board__top"
        style={
          currentVisual
            ? {
                borderLeftColor: currentVisual.color,
                background: `linear-gradient(135deg, #fff 60%, ${currentVisual.colorSoft} 165%)`,
              }
            : undefined
        }
      >
        {currentPlayer && !currentPlayer.finished ? (
          <div className="game-board__turn">
            <span className="game-board__turn-avatar-wrap" style={{ color: currentVisual!.color }}>
              <span className="game-board__turn-avatar" style={{ background: currentVisual!.colorSoft }}>
                <img src={currentCharacter!.avatar} alt="" className="avatar-face-img" />
              </span>
            </span>
            <div className="game-board__turn-text">
              <div className="game-board__turn-heading" style={{ color: currentVisual!.color }}>
                ▶ 只今の順番
              </div>
              <div className="game-board__turn-name">{currentPlayer.name}さん</div>
              <div className="game-board__turn-age">
                <span className="game-board__turn-age-label">現在</span>
                <span key={currentPlayer.age} className="game-board__turn-age-value">
                  {currentPlayer.age}
                </span>
                <span className="game-board__turn-age-unit">歳</span>
              </div>
              <div className="game-board__turn-meta">
                {getLifeStageName(currentPlayer.age)}・{currentPlayer.age}歳（
                {era === 'showa' ? `${getGengoLabel(getCalendarYear(era, currentPlayer.age))}・` : ''}
                {getCalendarYear(era, currentPlayer.age)}年）
                {currentLongevityBadge && (
                  <span className="game-board__longevity-badge">
                    {currentLongevityBadge.icon} {currentLongevityBadge.label}
                  </span>
                )}
              </div>
              <div className="game-board__turn-occupation">💼 {currentPlayer.occupation}</div>
              <div className="game-board__turn-priority-stats">
                <span>💰{currentPlayer.money.toLocaleString()}万円</span>
                <span>😊{currentPlayer.happiness}</span>
                <span>❤️{currentPlayer.health}</span>
              </div>
            </div>
          </div>
        ) : (
          <span>ゲーム終了処理中…</span>
        )}
        <div className="game-board__top-actions">
          <button
            type="button"
            className="btn--icon-round"
            onClick={onToggleSound}
            title="効果音のON/OFF"
            aria-label="効果音のON/OFF"
          >
            {soundEnabled ? '🔊' : '🔇'}
          </button>
          <button
            type="button"
            className="btn--icon-round"
            onClick={onShowNewspaper}
            title="人生新聞"
            aria-label="人生新聞"
          >
            📰
          </button>
          <button
            type="button"
            className="btn--icon-round"
            onClick={onShowLifeLog}
            title="人生ログ"
            aria-label="人生ログ"
          >
            📖
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
          <div
            className={`board-canvas__era-backdrop board-canvas__era-backdrop--${era}`}
            style={{ backgroundImage: `url(${ERA_BACKGROUND_IMAGES[era]})` }}
            aria-hidden="true"
          />
          <div className={`board-canvas__era-overlay board-canvas__era-overlay--${era}`} aria-hidden="true" />

          {stageBands.map((band) => (
            <BoardStageSection key={band.stage} stage={band.stage} top={band.top} height={band.height} era={era} />
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

          {areaCardPlacements.map(({ areaCard, y }) => (
            <BoardAreaCard
              key={areaCard.id}
              title={areaCard.title}
              ageLabel={areaCard.ageLabel}
              icon={areaCard.icon}
              y={y}
              era={era}
              isCurrent={areaCard.id === currentArea.id}
            />
          ))}
        </div>
      </div>

      <div className="game-board__players">
        {players.map((player, index) => (
          <PlayerCard key={player.id} player={player} index={index} isCurrent={index === currentPlayerIndex} era={era} compact />
        ))}
      </div>

      {/* ルーレットは通常のドキュメントフローから外し、画面下部に固定表示する。
          スクロール位置に関わらず常に操作でき、イベントモーダル（z-index高）表示中は
          自動的にその下に隠れるため、重なりや誤操作の心配がない。 */}
      <div className="game-board__roulette-dock">
        <Roulette
          disabled={rollDisabled || !currentPlayer || currentPlayer.finished}
          lastRoll={lastRoll}
          currentAge={currentPlayer?.age ?? 0}
          deathChance={deathChance}
          soundEnabled={soundEnabled}
          onRoll={onRoll}
          onRollSettled={onRollSettled}
        />
      </div>
    </StageBackground>
  );
}

export default GameBoard;
