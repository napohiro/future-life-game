import { useRef, useState } from 'react';
import './App.css';
import { getBranchPointForPosition } from './data/branchRoutes';
import EventModal from './components/EventModal';
import FinalReport from './components/FinalReport';
import GameBoard from './components/GameBoard';
import GraduationModal from './components/GraduationModal';
import HowToPlay from './components/HowToPlay';
import LifeLog from './components/LifeLog';
import Newspaper from './components/Newspaper';
import PlayerSetup from './components/PlayerSetup';
import RouteChoiceModal from './components/RouteChoiceModal';
import TitleScreen from './components/TitleScreen';
import WorldSettings from './components/WorldSettings';
import type {
  BranchRoute,
  EventChoice,
  GameSettings,
  GameState,
  MoveAnimationState,
  Player,
  PlayerSetupInput,
} from './types/game';
import {
  ELDER_GRADUATION_START_AGE,
  appendLifeLog,
  applyEffectsToPlayer,
  applyStatusEffectsToPlayer,
  createInitialGameState,
  deriveImportance,
  drawEventForPosition,
  findNextActivePlayerIndex,
  forcedGraduationAtBoardEnd,
  getBoardMilestone,
  getEventType,
  initializePlayers,
  isGameFinished,
  movePlayerPosition,
  rollDice,
  rollGraduationCheck,
} from './utils/gameLogic';
import type { DrawnEvent } from './utils/gameLogic';
import { playMoveStepSound } from './utils/sound';

const STEP_DURATION_MS = 400; // 1マス進むごとの間（350〜500msの範囲）
const POST_MOVE_PAUSE_MS = 500; // 全マス移動完了後、イベント表示までの間

interface PendingMove {
  playerId: string;
  playerName: string;
  playerSnapshot: Player;
  targetPosition: number;
  finished: boolean;
  settings: GameSettings;
  roll: number;
  chosenRoutes: string[];
}

function App() {
  const [gameState, setGameState] = useState<GameState>(createInitialGameState());
  const [pendingPlayerInputs, setPendingPlayerInputs] = useState<PlayerSetupInput[] | null>(null);
  const [activeDraw, setActiveDraw] = useState<DrawnEvent | null>(null);
  const [moveAnimation, setMoveAnimation] = useState<MoveAnimationState | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  // ルーレットが結果を出してから「止まりきって余韻を終える」までの間、移動内容を保持しておく置き場。
  // ルーレット側が完全に停止・静止するまで、コマは実際には動かさない。
  const pendingMoveRef = useRef<PendingMove | null>(null);

  const handleGoToSetup = () => {
    setGameState((prev) => ({ ...prev, phase: 'setup' }));
  };

  const handleShowHowToPlay = () => {
    setGameState((prev) => ({ ...prev, phase: 'howToPlay' }));
  };

  const handleBackToTitle = () => {
    setPendingPlayerInputs(null);
    setActiveDraw(null);
    setMoveAnimation(null);
    pendingMoveRef.current = null;
    setGameState(createInitialGameState());
  };

  const handlePlayersReady = (inputs: PlayerSetupInput[]) => {
    setPendingPlayerInputs(inputs);
    setGameState((prev) => ({ ...prev, phase: 'worldSettings' }));
  };

  const handleStartGame = (settings: GameSettings) => {
    if (!pendingPlayerInputs) return;
    const players = initializePlayers(pendingPlayerInputs);
    setGameState({
      ...createInitialGameState(),
      phase: 'playing',
      players,
      settings,
    });
  };

  const setPlayerPosition = (playerId: string, position: number) => {
    setGameState((prev) => ({
      ...prev,
      players: prev.players.map((p) => (p.id === playerId ? { ...p, position, age: position } : p)),
    }));
  };

  const finalizeMove = (
    playerSnapshot: Player,
    finalPosition: number,
    reachedBoardEnd: boolean,
    settings: GameSettings,
    roll: number,
    chosenRoutes: string[],
  ) => {
    const playerId = playerSnapshot.id;
    const age = finalPosition;

    // 80歳以降は、ターンごとに（ステータスを反映した）卒業判定を行う。盤面の物理的な終端に
    // 達した場合も、まだ卒業していなければそこで強制的に卒業とする（老後は固定ゴールではないが、
    // 盤面のマス数には限りがあるための安全策）。
    let graduationReason = age >= ELDER_GRADUATION_START_AGE ? rollGraduationCheck(playerSnapshot, age, settings) : null;
    if (!graduationReason && reachedBoardEnd) {
      graduationReason = forcedGraduationAtBoardEnd(playerSnapshot);
    }

    if (graduationReason) {
      setActiveDraw(null);
      setGameState((prev) => ({
        ...prev,
        players: prev.players.map((p) =>
          p.id === playerId
            ? { ...p, position: finalPosition, age, finished: true, graduationAge: age, graduationReasonId: graduationReason!.id }
            : p,
        ),
        lastRoll: roll,
        turnCount: prev.turnCount + 1,
        activeEvent: null,
        activePlayerIdForEvent: null,
        pendingResult: null,
        pendingGraduation: { playerId, playerName: playerSnapshot.name, age, reason: graduationReason },
      }));
      setMoveAnimation(null);
      return;
    }

    const draw = drawEventForPosition(finalPosition, settings, chosenRoutes);
    setActiveDraw(draw);
    setGameState((prev) => ({
      ...prev,
      players: prev.players.map((p) =>
        p.id === playerId ? { ...p, position: finalPosition, age: finalPosition, finished: reachedBoardEnd } : p,
      ),
      lastRoll: roll,
      turnCount: prev.turnCount + 1,
      activeEvent: draw.event,
      activePlayerIdForEvent: playerId,
      pendingResult: null,
    }));
    setMoveAnimation(null);
  };

  // ルーレットが数字を確定させるために呼ぶ。ここでは結果を計算して保持するだけで、
  // コマは動かさない（ルーレットが完全に停止し、余韻を終えてから handleRollSettled で動かす）。
  const handleRoll = (): number => {
    const roll = rollDice();
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    if (
      !currentPlayer ||
      currentPlayer.finished ||
      gameState.activeEvent ||
      gameState.pendingBranchChoice ||
      gameState.pendingGraduation ||
      moveAnimation
    ) {
      return roll;
    }

    const { position: targetPosition, finished } = movePlayerPosition(currentPlayer.position, roll, gameState.boardSize);

    pendingMoveRef.current = {
      playerId: currentPlayer.id,
      playerName: currentPlayer.name,
      playerSnapshot: currentPlayer,
      targetPosition,
      finished,
      settings: gameState.settings,
      roll,
      chosenRoutes: currentPlayer.chosenRoutes,
    };

    return roll;
  };

  // ルーレットが完全に停止し、数字を見せる余韻（resultPause）まで終えたタイミングで呼ばれる。
  // ここで初めて「〇〇さん、〇マス進みます」の表示とコマの1マスずつの移動を開始する。
  const handleRollSettled = () => {
    const pending = pendingMoveRef.current;
    pendingMoveRef.current = null;
    if (!pending) return;

    const { playerId, playerName, playerSnapshot, targetPosition, finished, settings, roll, chosenRoutes } = pending;

    setMoveAnimation({ playerId, playerName, roll, stepIndex: 0, totalSteps: roll });

    let current = playerSnapshot.position;
    const stepToNext = () => {
      current += 1;
      const stepIndex = current - playerSnapshot.position;
      if (soundEnabled) playMoveStepSound();
      if (current >= targetPosition) {
        setPlayerPosition(playerId, targetPosition);
        setMoveAnimation({ playerId, playerName, roll, stepIndex: roll, totalSteps: roll });
        // 移動が終わってからすぐイベントを出すのではなく、少し間を置いて落ち着かせる。
        setTimeout(() => {
          finalizeMove(playerSnapshot, targetPosition, finished, settings, roll, chosenRoutes);
        }, POST_MOVE_PAUSE_MS);
      } else {
        setPlayerPosition(playerId, current);
        setMoveAnimation({ playerId, playerName, roll, stepIndex, totalSteps: roll });
        setTimeout(stepToNext, STEP_DURATION_MS);
      }
    };
    setTimeout(stepToNext, STEP_DURATION_MS);
  };

  const handleChooseEventOption = (choice?: EventChoice) => {
    setGameState((prev) => {
      if (!prev.activeEvent) return prev;
      const effects = choice ? choice.effects : prev.activeEvent.effects;
      const statusEffects = choice ? choice.statusEffects : prev.activeEvent.statusEffects;
      return {
        ...prev,
        pendingResult: { effects, statusEffects, choiceLabel: choice?.label, eventType: getEventType(prev.activeEvent) },
      };
    });
  };

  const handleConfirmEventResult = () => {
    setGameState((prev) => {
      if (!prev.activeEvent || !prev.pendingResult || !prev.activePlayerIdForEvent) return prev;
      const event = prev.activeEvent;
      const result = prev.pendingResult;

      const updatedPlayers = prev.players.map((p) => {
        if (p.id !== prev.activePlayerIdForEvent) return p;
        const withEffects = applyEffectsToPlayer(p, result.effects);
        const withStatusEffects = applyStatusEffectsToPlayer(withEffects, result.statusEffects);
        // 巨大イベントマス（人生の節目）で起きた出来事は、重要度を最高ランクにして
        // 人生ログ・最終レポートの「ベストイベント」に残りやすくする。
        const isMilestoneSquare = getBoardMilestone(withStatusEffects.position) !== undefined;
        return appendLifeLog(withStatusEffects, {
          turn: prev.turnCount,
          age: withStatusEffects.age,
          position: withStatusEffects.position,
          eventTitle: event.title,
          eventDescription: event.logText,
          choiceLabel: result.choiceLabel,
          effects: result.effects,
          statusEffects: result.statusEffects,
          category: event.category,
          importance: isMilestoneSquare ? 'critical' : deriveImportance(event.rarity),
          eventType: result.eventType,
        });
      });

      const finished = isGameFinished(updatedPlayers);
      const nextIndex = finished
        ? prev.currentPlayerIndex
        : findNextActivePlayerIndex(updatedPlayers, prev.currentPlayerIndex);

      // 人生の分岐点（18・30・45・60歳）にちょうど到達していたら、通常イベントの後にルート選択を挟む。
      // 既存の抽選・進行ロジックには一切手を加えず、追加のステップとして後付けしている。
      const movedPlayer = updatedPlayers.find((p) => p.id === prev.activePlayerIdForEvent);
      const branchPoint = movedPlayer ? getBranchPointForPosition(movedPlayer.position) : undefined;
      const alreadyChosen = branchPoint
        ? branchPoint.routes.some((route) => movedPlayer!.chosenRoutes.includes(route.id))
        : true;
      const pendingBranchChoice =
        branchPoint && !alreadyChosen
          ? {
              branchId: branchPoint.id,
              branchName: branchPoint.name,
              playerId: movedPlayer!.id,
              playerName: movedPlayer!.name,
              routes: branchPoint.routes,
            }
          : null;

      return {
        ...prev,
        players: updatedPlayers,
        activeEvent: null,
        pendingResult: null,
        activePlayerIdForEvent: null,
        pendingBranchChoice,
        currentPlayerIndex: nextIndex === -1 ? prev.currentPlayerIndex : nextIndex,
        phase: finished ? 'finished' : 'playing',
        showLifeLog: finished ? false : prev.showLifeLog,
        showNewspaper: finished ? false : prev.showNewspaper,
      };
    });
  };

  const handleChooseRoute = (route: BranchRoute) => {
    setGameState((prev) => {
      if (!prev.pendingBranchChoice) return prev;
      const { playerId, branchName } = prev.pendingBranchChoice;
      const updatedPlayers = prev.players.map((p) => {
        if (p.id !== playerId) return p;
        const withEffects = route.effectsModifier ? applyEffectsToPlayer(p, route.effectsModifier) : p;
        const withRoute = { ...withEffects, currentRoute: route.id, chosenRoutes: [...p.chosenRoutes, route.id] };
        // ルート選択も人生ログに残す。「〇歳：人生の分岐：〇〇」の形で、人生新聞にもそのまま反映される。
        return appendLifeLog(withRoute, {
          turn: prev.turnCount,
          age: withRoute.age,
          position: withRoute.position,
          eventTitle: `${branchName}：${route.name}`,
          eventDescription: route.description,
          effects: route.effectsModifier ?? {},
          category: route.logCategory,
          importance: 'critical',
          eventType: 'turningPoint',
        });
      });
      return { ...prev, players: updatedPlayers, pendingBranchChoice: null };
    });
  };

  // 「人生の卒業」モーダルを確認したら、卒業を人生ログの最後の1件として記録し、次のプレイヤーへ進む。
  const handleAcknowledgeGraduation = () => {
    setGameState((prev) => {
      if (!prev.pendingGraduation) return prev;
      const { playerId, age, reason } = prev.pendingGraduation;

      const updatedPlayers = prev.players.map((p) => {
        if (p.id !== playerId) return p;
        return appendLifeLog(p, {
          turn: prev.turnCount,
          age,
          position: p.position,
          eventTitle: `${reason.title}：${reason.label}`,
          eventDescription: reason.body,
          effects: {},
          category: 'death',
          importance: 'critical',
          eventType: 'turningPoint',
        });
      });

      const finished = isGameFinished(updatedPlayers);
      const nextIndex = finished
        ? prev.currentPlayerIndex
        : findNextActivePlayerIndex(updatedPlayers, prev.currentPlayerIndex);

      return {
        ...prev,
        players: updatedPlayers,
        pendingGraduation: null,
        currentPlayerIndex: nextIndex === -1 ? prev.currentPlayerIndex : nextIndex,
        phase: finished ? 'finished' : 'playing',
        showLifeLog: finished ? false : prev.showLifeLog,
        showNewspaper: finished ? false : prev.showNewspaper,
      };
    });
  };

  const handleShowLifeLog = () => setGameState((prev) => ({ ...prev, showLifeLog: true }));
  const handleCloseLifeLog = () => setGameState((prev) => ({ ...prev, showLifeLog: false }));
  const handleShowNewspaper = () => setGameState((prev) => ({ ...prev, showNewspaper: true }));
  const handleCloseNewspaper = () => setGameState((prev) => ({ ...prev, showNewspaper: false }));
  const handleToggleSound = () => setSoundEnabled((prev) => !prev);

  return (
    <div className="app-shell">
      {gameState.phase === 'title' && (
        <TitleScreen onStart={handleGoToSetup} onShowHowToPlay={handleShowHowToPlay} />
      )}

      {gameState.phase === 'howToPlay' && <HowToPlay onBack={handleBackToTitle} />}

      {gameState.phase === 'setup' && (
        <PlayerSetup onStart={handlePlayersReady} onBack={handleBackToTitle} />
      )}

      {gameState.phase === 'worldSettings' && (
        <WorldSettings
          initialSettings={gameState.settings}
          onStart={handleStartGame}
          onBack={() => setGameState((prev) => ({ ...prev, phase: 'setup' }))}
        />
      )}

      {gameState.phase === 'playing' && (
        <>
          <GameBoard
            players={gameState.players}
            currentPlayerIndex={gameState.currentPlayerIndex}
            boardSize={gameState.boardSize}
            lastRoll={gameState.lastRoll}
            rollDisabled={
              gameState.activeEvent !== null ||
              gameState.pendingBranchChoice !== null ||
              gameState.pendingGraduation !== null ||
              moveAnimation !== null
            }
            moveAnimation={moveAnimation}
            soundEnabled={soundEnabled}
            onRoll={handleRoll}
            onRollSettled={handleRollSettled}
            onToggleSound={handleToggleSound}
            onShowLifeLog={handleShowLifeLog}
            onShowNewspaper={handleShowNewspaper}
          />
          {gameState.activeEvent && activeDraw && (
            <EventModal
              event={gameState.activeEvent}
              age={gameState.players.find((p) => p.id === gameState.activePlayerIdForEvent)?.age ?? 0}
              squareType={activeDraw.squareType}
              result={gameState.pendingResult}
              onChoose={handleChooseEventOption}
              onConfirm={handleConfirmEventResult}
            />
          )}
          {gameState.pendingBranchChoice && (
            <RouteChoiceModal pendingBranchChoice={gameState.pendingBranchChoice} onChoose={handleChooseRoute} />
          )}
          {gameState.pendingGraduation && (
            <GraduationModal
              pendingGraduation={gameState.pendingGraduation}
              player={gameState.players.find((p) => p.id === gameState.pendingGraduation!.playerId)!}
              onAcknowledge={handleAcknowledgeGraduation}
            />
          )}
          {gameState.showLifeLog && <LifeLog players={gameState.players} onClose={handleCloseLifeLog} />}
          {gameState.showNewspaper && <Newspaper players={gameState.players} onClose={handleCloseNewspaper} />}
        </>
      )}

      {gameState.phase === 'finished' && (
        <FinalReport players={gameState.players} onRestart={handleBackToTitle} />
      )}
    </div>
  );
}

export default App;
