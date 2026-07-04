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
  FateOutcome,
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
  applyFlagsToPlayer,
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
  mergeStatEffects,
  mergeStatusEffects,
  movePlayerPosition,
  pickEarlyEndingReason,
  pickFateOutcome,
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

    // イベント抽選には、移動後の年齢・人生フラグ・過去の履歴を反映した最終状態のプレイヤーを渡す。
    // これにより、同じマスでもプレイヤーごとの人生に応じて違う候補から抽選される。
    const finalizedPlayer: Player = { ...playerSnapshot, position: finalPosition, age: finalPosition, finished: reachedBoardEnd };
    const draw = drawEventForPosition(finalizedPlayer, settings);
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
    };

    return roll;
  };

  // ルーレットが完全に停止し、数字を見せる余韻（resultPause）まで終えたタイミングで呼ばれる。
  // ここで初めて「〇〇さん、〇マス進みます」の表示とコマの1マスずつの移動を開始する。
  const handleRollSettled = () => {
    const pending = pendingMoveRef.current;
    pendingMoveRef.current = null;
    if (!pending) return;

    const { playerId, playerName, playerSnapshot, targetPosition, finished, settings, roll } = pending;

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
          finalizeMove(playerSnapshot, targetPosition, finished, settings, roll);
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
      const fateRoulette = choice ? choice.fateRoulette : prev.activeEvent.fateRoulette;
      // 運命ルーレットが設定されている場合は、結果をすぐには確定せず、
      // ルーレットを回してから（handleFateSettled経由で）結果を確定する。
      if (fateRoulette) {
        return {
          ...prev,
          pendingFateRoulette: {
            fateRoulette,
            baseEffects: choice ? choice.effects : prev.activeEvent.effects,
            baseStatusEffects: choice ? choice.statusEffects : prev.activeEvent.statusEffects,
            baseEndsLifeChance: choice ? choice.endsLifeChance : prev.activeEvent.endsLifeChance,
            baseGrantsFlags: choice ? choice.grantsFlags : prev.activeEvent.grantsFlags,
            choiceLabel: choice?.label,
          },
        };
      }
      const effects = choice ? choice.effects : prev.activeEvent.effects;
      const statusEffects = choice ? choice.statusEffects : prev.activeEvent.statusEffects;
      const endsLifeChance = choice ? choice.endsLifeChance : prev.activeEvent.endsLifeChance;
      const grantsFlags = choice ? choice.grantsFlags : prev.activeEvent.grantsFlags;
      return {
        ...prev,
        pendingResult: {
          effects,
          statusEffects,
          endsLifeChance,
          grantsFlags,
          choiceLabel: choice?.label,
          eventType: getEventType(prev.activeEvent),
        },
      };
    });
  };

  // 運命ルーレットが回り始めるタイミングで、結果をあらかじめ1回だけ抽選する
  // （移動用ルーレットのonRollと同じパターン：見た目の着地先を決めるため先に確定させる）。
  const handleSpinFate = (): FateOutcome => {
    const pending = gameState.pendingFateRoulette;
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    return pickFateOutcome(pending!.fateRoulette.outcomes, currentPlayer, pending!.fateRoulette.influenceStat);
  };

  // 運命ルーレットが完全に止まったら、選択の効果とルーレットの結果を合算し、通常の結果画面へ進む。
  const handleFateSettled = (outcome: FateOutcome) => {
    setGameState((prev) => {
      if (!prev.pendingFateRoulette || !prev.activeEvent) return prev;
      const pending = prev.pendingFateRoulette;
      const effects = mergeStatEffects(pending.baseEffects, outcome.effects);
      const statusEffects = mergeStatusEffects(pending.baseStatusEffects, outcome.statusEffects);
      const endsLifeChance = outcome.endsLifeChance ?? pending.baseEndsLifeChance;
      return {
        ...prev,
        pendingFateRoulette: null,
        pendingResult: {
          effects,
          statusEffects,
          endsLifeChance,
          grantsFlags: pending.baseGrantsFlags,
          choiceLabel: pending.choiceLabel,
          eventType: getEventType(prev.activeEvent),
          fateOutcomeLabel: outcome.label,
          fateSeverity: outcome.severity,
        },
      };
    });
  };

  const handleConfirmEventResult = () => {
    setGameState((prev) => {
      if (!prev.activeEvent || !prev.pendingResult || !prev.activePlayerIdForEvent) return prev;
      const event = prev.activeEvent;
      const result = prev.pendingResult;
      // 選択（または選択肢のないイベント自体）に人生終了の確率が設定されている場合、
      // ここで低確率抽選を行う。安全な選択肢を選べば endsLifeChance が付かないため、
      // プレイヤーの選択次第で回避できる。
      const rolledEarlyEnding = result.endsLifeChance !== undefined && Math.random() < result.endsLifeChance;
      // 運命ルーレットで大成功・大失敗を引いた場合は、人生新聞・人生ログで目立つよう重要度を上げる。
      const isBigFateResult = result.fateSeverity === 'greatSuccess' || result.fateSeverity === 'greatFailure';

      let updatedPlayers = prev.players.map((p) => {
        if (p.id !== prev.activePlayerIdForEvent) return p;
        const withEffects = applyEffectsToPlayer(p, result.effects);
        const withStatusEffects = applyStatusEffectsToPlayer(withEffects, result.statusEffects);
        // 留学経験・AIスキルなど、この出来事によって新たに得た人生フラグを積み上げる。
        const withFlags = applyFlagsToPlayer(withStatusEffects, result.grantsFlags);
        // 巨大イベントマス（人生の節目）で起きた出来事は、重要度を最高ランクにして
        // 人生ログ・最終レポートの「ベストイベント」に残りやすくする。
        const isMilestoneSquare = getBoardMilestone(withFlags.position) !== undefined;
        return appendLifeLog(withFlags, {
          turn: prev.turnCount,
          age: withFlags.age,
          position: withFlags.position,
          eventTitle: event.title,
          eventDescription: event.logText,
          choiceLabel: result.choiceLabel,
          effects: result.effects,
          statusEffects: result.statusEffects,
          category: event.category,
          importance: isMilestoneSquare || rolledEarlyEnding || isBigFateResult ? 'critical' : deriveImportance(event.rarity),
          eventType: result.eventType,
          eventId: event.id,
          fateOutcomeLabel: result.fateOutcomeLabel,
          fateSeverity: result.fateSeverity,
        });
      });

      if (rolledEarlyEnding) {
        // 80歳未満でも起こりうる、低確率の「人生終了」。老後の卒業と同じ仕組み（pendingGraduation）を
        // 再利用することで、人生新聞・人生ログ・最終ステータスの扱いや以降のターン除外を統一している。
        const endingPlayer = updatedPlayers.find((p) => p.id === prev.activePlayerIdForEvent)!;
        const reason = pickEarlyEndingReason(event.category);
        updatedPlayers = updatedPlayers.map((p) =>
          p.id === prev.activePlayerIdForEvent
            ? { ...p, finished: true, graduationAge: endingPlayer.age, graduationReasonId: reason.id }
            : p,
        );
        return {
          ...prev,
          players: updatedPlayers,
          activeEvent: null,
          pendingResult: null,
          activePlayerIdForEvent: null,
          pendingGraduation: { playerId: endingPlayer.id, playerName: endingPlayer.name, age: endingPlayer.age, reason },
        };
      }

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
          eventId: route.id,
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
          eventId: reason.id,
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
              pendingFate={gameState.pendingFateRoulette}
              soundEnabled={soundEnabled}
              onChoose={handleChooseEventOption}
              onConfirm={handleConfirmEventResult}
              onSpinFate={handleSpinFate}
              onFateSettled={handleFateSettled}
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
