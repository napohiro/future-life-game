import { useEffect, useMemo, useRef, useState } from 'react';
import { BOARD_AREA_CARDS, getCurrentBoardArea } from '../data/boardAreas';
import { BRANCH_POINTS, getBranchPointForPosition } from '../data/branchRoutes';
import { getEraDefinition } from '../data/eras';
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
  const [showParticipants, setShowParticipants] = useState(false);

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

      <div className="game-board__header">
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
                <div className="game-board__turn-row1">
                  <span className="game-board__turn-name">{currentPlayer.name}さん</span>
                  <span className="game-board__turn-age">
                    現在
                    <span key={currentPlayer.age} className="game-board__turn-age-value">
                      {currentPlayer.age}
                    </span>
                    歳
                  </span>
                  {currentLongevityBadge && (
                    <span className="game-board__longevity-badge">
                      {currentLongevityBadge.icon} {currentLongevityBadge.label}
                    </span>
                  )}
                </div>
                <div className="game-board__turn-priority-stats">
                  <span className="game-board__turn-stat game-board__turn-stat--money">
                    💰 {currentPlayer.money.toLocaleString()}万円
                  </span>
                  <span className="game-board__turn-stat">😊 幸福 {currentPlayer.happiness}</span>
                  <span className="game-board__turn-stat">❤️ 健康 {currentPlayer.health}</span>
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

        {/* 参加者は常時は小さな丸アバターの帯だけを表示し、盤面の表示領域を圧迫しない。
            タップすると各プレイヤーの詳細ステータスをモーダルで確認できる。 */}
        <button
          type="button"
          className="game-board__participants"
          onClick={() => setShowParticipants(true)}
          aria-haspopup="dialog"
          aria-label={`参加者一覧を表示（${players.length}人）`}
        >
          <span className="game-board__participants-avatars">
            {players.map((player, index) => {
              const visual = getPlayerVisual(index);
              const character = getPlayerCharacter(player.characterId);
              const isThisTurn = index === currentPlayerIndex;
              return (
                <span
                  key={player.id}
                  className={`game-board__participant-avatar ${isThisTurn ? 'game-board__participant-avatar--current' : ''} ${player.finished ? 'game-board__participant-avatar--finished' : ''}`}
                  style={{ background: visual.colorSoft, borderColor: isThisTurn ? visual.color : undefined }}
                >
                  <img src={character.avatar} alt="" className="avatar-face-img" />
                </span>
              );
            })}
          </span>
          <span className="game-board__participants-label">参加者 {players.length}人</span>
          <span className="game-board__participants-chevron" aria-hidden="true">
            ›
          </span>
        </button>
      </div>

      <div className="game-board__board-area">
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

        <div className="board-scroll">
          <div className="board-scroll__notes">
            <p className="board-info-note">
              💡 人生の節目（18・30・45・60歳）では、将来のルートが分かれることがあります。
            </p>
            {currentStage === 'stage6' && (
              <p className="board-info-note board-info-note--fog">
                🌫️ この先の人生は、まだ見えていません。進むごとに、少しずつ道が開けていきます。
              </p>
            )}
          </div>

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
      </div>

      {/* 下部は「ルーレット」のみのコンパクトな固定フッター。プレイヤー一覧は上部の
          参加者アバター帯（タップでモーダル表示）に集約したため、盤面
          （.game-board__board-area）がflex:1で使える残り全域が最大限確保できる。 */}
      <div className="game-board__footer">
        <div className="game-board__roulette-dock">
          {/* keyに現在の手番プレイヤーIDを使うことで、手番が次のプレイヤーに切り替わるたびに
              Rouletteを再マウントし、前のプレイヤーの結果表示（「3年進む→7歳へ」等）や
              回転角度・強調表示を初期状態にリセットする。同じプレイヤーが続けて振る分には
              再マウントされないため、直前の結果はそのまま見え続ける（意図した挙動）。 */}
          <Roulette
            key={currentPlayer?.id ?? 'none'}
            disabled={rollDisabled || !currentPlayer || currentPlayer.finished}
            currentAge={currentPlayer?.age ?? 0}
            deathChance={deathChance}
            soundEnabled={soundEnabled}
            onRoll={onRoll}
            onRollSettled={onRollSettled}
          />
        </div>
      </div>

      {showParticipants && (
        <div className="modal-overlay">
          <div className="modal modal--tall">
            <div className="modal__header">
              <h3 className="modal__title">👥 参加者一覧</h3>
              <button type="button" className="btn btn--ghost btn--small" onClick={() => setShowParticipants(false)}>
                閉じる
              </button>
            </div>
            <div className="game-board__participants-list">
              {players.map((player, index) => (
                <PlayerCard key={player.id} player={player} index={index} isCurrent={index === currentPlayerIndex} era={era} />
              ))}
            </div>
          </div>
        </div>
      )}
    </StageBackground>
  );
}

export default GameBoard;
