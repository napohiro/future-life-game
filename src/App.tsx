import { useEffect, useRef, useState } from 'react';
import './App.css';
import { getBranchPointForPosition } from './data/branchRoutes';
import EraSelect from './components/EraSelect';
import EventModal from './components/EventModal';
import FinalReport from './components/FinalReport';
import GameBoard from './components/GameBoard';
import GraduationModal from './components/GraduationModal';
import HowToPlay from './components/HowToPlay';
import LifeLog from './components/LifeLog';
import Newspaper from './components/Newspaper';
import PlayerSetup from './components/PlayerSetup';
import ReleaseNotesModal from './components/ReleaseNotesModal';
import RouteChoiceModal from './components/RouteChoiceModal';
import TitleScreen from './components/TitleScreen';
import TurnAnnouncement from './components/TurnAnnouncement';
import { getCalendarYear, getEraSocietyProfile } from './data/eras';
import type {
  BranchRoute,
  EraId,
  EventChoice,
  FateOutcome,
  GameSettings,
  GameState,
  MoveAnimationState,
  Player,
  PlayerSetupInput,
} from './types/game';
import {
  adjustEndsLifeChance,
  appendLifeLog,
  applyEffectsToPlayer,
  applyFlagsToPlayer,
  applyStatusEffectsToPlayer,
  calculateLifespanDeathChance,
  computeLifespanImmunityGrant,
  createInitialGameState,
  deriveImportance,
  drawEventForPosition,
  eventNeedsStagedFlow,
  findNextActivePlayerIndex,
  forcedGraduationAtBoardEnd,
  getBoardMilestone,
  getEventType,
  getSocietyHeadlinesForYear,
  initializePlayers,
  isGameFinished,
  mergeStatEffects,
  mergeStatusEffects,
  movePlayerPosition,
  pickFateOutcome,
  pickLifespanEndReason,
  resolveEarlyEndingReason,
  rollDice,
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
  // 寿命システムのルーレット判定で「寿命を迎える」枠に止まった場合はtrue。
  // その場合は移動アニメーションを行わず、直接pendingGraduationへ進む。
  isLifespanEnd: boolean;
}

function App() {
  const [gameState, setGameState] = useState<GameState>(createInitialGameState());
  const [activeDraw, setActiveDraw] = useState<DrawnEvent | null>(null);
  const [moveAnimation, setMoveAnimation] = useState<MoveAnimationState | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showReleaseNotes, setShowReleaseNotes] = useState(false);
  const [turnAnnouncementPlayerId, setTurnAnnouncementPlayerId] = useState<string | null>(null);
  // ルーレットが結果を出してから「止まりきって余韻を終える」までの間、移動内容を保持しておく置き場。
  // ルーレット側が完全に停止・静止するまで、コマは実際には動かさない。
  const pendingMoveRef = useRef<PendingMove | null>(null);
  // スマホ1台を回して遊ぶ想定のため、手番が切り替わるたびに一度だけ「次のばん」演出を出す。
  // 同じ手番(currentPlayerIndex + turnCount の組)には二度出さないよう、直近に出した組を覚えておく。
  const lastAnnouncedTurnKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (gameState.phase !== 'playing') return;
    if (gameState.activeEvent || gameState.pendingBranchChoice || gameState.pendingGraduation) return;
    if (moveAnimation) return;
    const player = gameState.players[gameState.currentPlayerIndex];
    if (!player || player.finished) return;

    const turnKey = `${gameState.currentPlayerIndex}-${gameState.turnCount}`;
    if (lastAnnouncedTurnKeyRef.current === turnKey) return;
    lastAnnouncedTurnKeyRef.current = turnKey;
    setTurnAnnouncementPlayerId(player.id);
  }, [
    gameState.phase,
    gameState.currentPlayerIndex,
    gameState.turnCount,
    gameState.activeEvent,
    gameState.pendingBranchChoice,
    gameState.pendingGraduation,
    gameState.players,
    moveAnimation,
  ]);

  const handleGoToEraSelect = () => {
    setGameState((prev) => ({ ...prev, phase: 'eraSelect' }));
  };

  const handleEraSelected = (era: EraId) => {
    setGameState((prev) => ({ ...prev, settings: { ...prev.settings, era }, phase: 'setup' }));
  };

  const handleShowHowToPlay = () => {
    setGameState((prev) => ({ ...prev, phase: 'howToPlay' }));
  };

  const handleShowReleaseNotes = () => setShowReleaseNotes(true);
  const handleCloseReleaseNotes = () => setShowReleaseNotes(false);

  const handleBackToTitle = () => {
    setActiveDraw(null);
    setMoveAnimation(null);
    pendingMoveRef.current = null;
    lastAnnouncedTurnKeyRef.current = null;
    setTurnAnnouncementPlayerId(null);
    setGameState(createInitialGameState());
  };

  // 最終結果画面から、時代選択からやり直したい場合のショートカット（タイトル画面を経由しない）。
  const handlePlayDifferentEra = () => {
    setActiveDraw(null);
    setMoveAnimation(null);
    pendingMoveRef.current = null;
    lastAnnouncedTurnKeyRef.current = null;
    setTurnAnnouncementPlayerId(null);
    setGameState({ ...createInitialGameState(), phase: 'eraSelect' });
  };

  const handleDismissTurnAnnouncement = () => setTurnAnnouncementPlayerId(null);

  // 「この時代の社会」説明画面は廃止し、プレイヤー設定の直後に時代ごとの社会設定を自動適用して
  // そのままゲームを開始する（時代選択後の導線を止めないため）。
  const handlePlayersReady = (inputs: PlayerSetupInput[]) => {
    const players = initializePlayers(inputs);
    const profile = getEraSocietyProfile(gameState.settings.era);
    setGameState((prev) => ({
      ...createInitialGameState(),
      phase: 'playing',
      players,
      settings: { ...prev.settings, ...profile.settings },
    }));
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

    // 寿命判定そのものはルーレット側（handleRoll）で既に済んでいるため、ここでは盤面の
    // 物理的な終端（150歳）に達した場合の強制卒業だけを扱う（老後は固定ゴールではないが、
    // 盤面のマス数には限りがあるための安全策）。
    const graduationReason = reachedBoardEnd ? forcedGraduationAtBoardEnd(playerSnapshot) : null;

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

    // 寿命免除ターンは、生き延びたこのターン分を消費して1減らす（0未満にはしない）。
    const nextImmunityTurns = Math.max(0, playerSnapshot.lifespanImmunityTurns - 1);

    // イベント抽選には、移動後の年齢・人生フラグ・過去の履歴を反映した最終状態のプレイヤーを渡す。
    // これにより、同じマスでもプレイヤーごとの人生に応じて違う候補から抽選される。
    const finalizedPlayer: Player = {
      ...playerSnapshot,
      position: finalPosition,
      age: finalPosition,
      finished: reachedBoardEnd,
      lifespanImmunityTurns: nextImmunityTurns,
    };
    const draw = drawEventForPosition(finalizedPlayer, settings);
    setActiveDraw(draw);
    // 選択肢・運命ルーレット・早期ゲームオーバー判定を伴わない「通常イベント」は、抽選と同時に
    // 結果を確定してしまう（choice未指定でhandleChooseEventOptionを呼んだ場合と全く同じ計算）。
    // これにより、EventModalは最初から内容と結果を1モーダルにまとめて表示できる
    // （スマホで同じイベントを2回見せられるテンポの悪さを避けるため）。
    const instantResult = eventNeedsStagedFlow(draw.event)
      ? null
      : {
          effects: draw.event.effects,
          statusEffects: draw.event.statusEffects,
          endsLifeChance: draw.event.endsLifeChance,
          grantsFlags: draw.event.grantsFlags,
          graduationReasonId: draw.event.graduationReasonId,
          eventType: getEventType(draw.event),
        };
    setGameState((prev) => ({
      ...prev,
      players: prev.players.map((p) =>
        p.id === playerId
          ? { ...p, position: finalPosition, age: finalPosition, finished: reachedBoardEnd, lifespanImmunityTurns: nextImmunityTurns }
          : p,
      ),
      lastRoll: roll,
      turnCount: prev.turnCount + 1,
      activeEvent: draw.event,
      activePlayerIdForEvent: playerId,
      pendingResult: instantResult,
    }));
    setMoveAnimation(null);
  };

  // ルーレットが数字（または「寿命を迎える」枠）を確定させるために呼ぶ。
  // ここでは結果を計算して保持するだけで、コマは動かさない
  // （ルーレットが完全に停止し、余韻を終えてから handleRollSettled で動かす）。
  const handleRoll = (): number | 'death' => {
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    if (
      !currentPlayer ||
      currentPlayer.finished ||
      gameState.activeEvent ||
      gameState.pendingBranchChoice ||
      gameState.pendingGraduation ||
      moveAnimation
    ) {
      return rollDice();
    }

    // 寿命システム：時代ごとの寿命リスク開始年齢を超えている場合、通常ルーレットに
    // 「寿命を迎える」枠が加わる。ここで実際に当たったかどうかを1回だけ判定する。
    const deathChance = calculateLifespanDeathChance(currentPlayer, gameState.settings);
    if (deathChance > 0 && Math.random() < deathChance) {
      pendingMoveRef.current = {
        playerId: currentPlayer.id,
        playerName: currentPlayer.name,
        playerSnapshot: currentPlayer,
        targetPosition: currentPlayer.position,
        finished: false,
        settings: gameState.settings,
        roll: 0,
        isLifespanEnd: true,
      };
      return 'death';
    }

    const roll = rollDice();
    const { position: targetPosition, finished } = movePlayerPosition(currentPlayer.position, roll, gameState.boardSize);

    pendingMoveRef.current = {
      playerId: currentPlayer.id,
      playerName: currentPlayer.name,
      playerSnapshot: currentPlayer,
      targetPosition,
      finished,
      settings: gameState.settings,
      roll,
      isLifespanEnd: false,
    };

    return roll;
  };

  // ルーレットが完全に停止し、数字を見せる余韻（resultPause）まで終えたタイミングで呼ばれる。
  // ここで初めて「〇〇さん、〇マス進みます」の表示とコマの1マスずつの移動を開始する。
  const handleRollSettled = () => {
    const pending = pendingMoveRef.current;
    pendingMoveRef.current = null;
    if (!pending) return;

    if (pending.isLifespanEnd) {
      // 寿命を迎えた場合は移動せず、その場で人生の終幕（既存のpendingGraduation演出）へ進む。
      const { playerId, playerName, playerSnapshot } = pending;
      const reason = pickLifespanEndReason(playerSnapshot);
      setActiveDraw(null);
      setGameState((prev) => ({
        ...prev,
        players: prev.players.map((p) =>
          p.id === playerId
            ? { ...p, finished: true, graduationAge: playerSnapshot.age, graduationReasonId: reason.id }
            : p,
        ),
        turnCount: prev.turnCount + 1,
        activeEvent: null,
        activePlayerIdForEvent: null,
        pendingResult: null,
        pendingGraduation: { playerId, playerName, age: playerSnapshot.age, reason },
      }));
      setMoveAnimation(null);
      return;
    }

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
            baseGraduationReasonId: choice ? choice.graduationReasonId : prev.activeEvent.graduationReasonId,
            choiceLabel: choice?.label,
          },
        };
      }
      const effects = choice ? choice.effects : prev.activeEvent.effects;
      const statusEffects = choice ? choice.statusEffects : prev.activeEvent.statusEffects;
      const endsLifeChance = choice ? choice.endsLifeChance : prev.activeEvent.endsLifeChance;
      const grantsFlags = choice ? choice.grantsFlags : prev.activeEvent.grantsFlags;
      const graduationReasonId = choice ? choice.graduationReasonId : prev.activeEvent.graduationReasonId;
      return {
        ...prev,
        pendingResult: {
          effects,
          statusEffects,
          endsLifeChance,
          grantsFlags,
          graduationReasonId,
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
          graduationReasonId: pending.baseGraduationReasonId,
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
      // プレイヤーの選択次第で回避できる。健康・資産・幸福度/関係による僅かな補正も加える。
      const eventPlayerSnapshot = prev.players.find((p) => p.id === prev.activePlayerIdForEvent);
      const rolledEarlyEnding =
        result.endsLifeChance !== undefined &&
        eventPlayerSnapshot !== undefined &&
        Math.random() < adjustEndsLifeChance(result.endsLifeChance, eventPlayerSnapshot);
      // 運命ルーレットで大成功・大失敗を引いた場合は、人生新聞・人生ログで目立つよう重要度を上げる。
      const isBigFateResult = result.fateSeverity === 'greatSuccess' || result.fateSeverity === 'greatFailure';

      let updatedPlayers = prev.players.map((p) => {
        if (p.id !== prev.activePlayerIdForEvent) return p;
        const withEffects = applyEffectsToPlayer(p, result.effects);
        const withStatusEffects = applyStatusEffectsToPlayer(withEffects, result.statusEffects);
        // 留学経験・AIスキルなど、この出来事によって新たに得た人生フラグを積み上げる。
        const withFlags = applyFlagsToPlayer(withStatusEffects, result.grantsFlags);
        // 健康診断・生活習慣改善・延命治療の成功など「健康・延命関連のプラスイベント」だった場合、
        // 次のターン以降しばらく寿命判定を免除する（既存の免除ターンより短ければ据え置く）。
        const immunityGrant = computeLifespanImmunityGrant(event, result);
        const withImmunity =
          immunityGrant > 0
            ? { ...withFlags, lifespanImmunityTurns: Math.max(withFlags.lifespanImmunityTurns, immunityGrant) }
            : withFlags;
        // 巨大イベントマス（人生の節目）で起きた出来事は、重要度を最高ランクにして
        // 人生ログ・最終レポートの「ベストイベント」に残りやすくする。
        const isMilestoneSquare = getBoardMilestone(withImmunity.position) !== undefined;
        return appendLifeLog(withImmunity, {
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
        const reason = resolveEarlyEndingReason(event.category, result.graduationReasonId);
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
      // 時代限定ルート（era指定あり）は、今選んでいる時代と一致するものだけを選択肢に見せる。
      const eraRoutes = branchPoint?.routes.filter((route) => !route.era || route.era.includes(prev.settings.era));
      const alreadyChosen = branchPoint
        ? branchPoint.routes.some((route) => movedPlayer!.chosenRoutes.includes(route.id))
        : true;
      const pendingBranchChoice =
        branchPoint && eraRoutes && !alreadyChosen
          ? {
              branchId: branchPoint.id,
              branchName: branchPoint.name,
              playerId: movedPlayer!.id,
              playerName: movedPlayer!.name,
              routes: eraRoutes,
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
        const withStatusEffects = route.statusEffectsModifier
          ? applyStatusEffectsToPlayer(withEffects, route.statusEffectsModifier)
          : withEffects;
        const withRoute = { ...withStatusEffects, currentRoute: route.id, chosenRoutes: [...p.chosenRoutes, route.id] };
        // ルート選択も人生ログに残す。「〇歳：人生の分岐：〇〇」の形で、人生新聞にもそのまま反映される。
        return appendLifeLog(withRoute, {
          turn: prev.turnCount,
          age: withRoute.age,
          position: withRoute.position,
          eventTitle: `${branchName}：${route.name}`,
          eventDescription: route.description,
          effects: route.effectsModifier ?? {},
          statusEffects: route.statusEffectsModifier,
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

  const currentPlayerForBoard = gameState.players[gameState.currentPlayerIndex];
  const currentDeathChance = currentPlayerForBoard
    ? calculateLifespanDeathChance(currentPlayerForBoard, gameState.settings)
    : 0;

  return (
    <div className="app-shell">
      {gameState.phase === 'title' && (
        <TitleScreen
          onStart={handleGoToEraSelect}
          onShowHowToPlay={handleShowHowToPlay}
          onShowReleaseNotes={handleShowReleaseNotes}
        />
      )}

      {gameState.phase === 'howToPlay' && (
        <HowToPlay onBack={handleBackToTitle} onShowReleaseNotes={handleShowReleaseNotes} />
      )}

      {gameState.phase === 'eraSelect' && (
        <EraSelect onStart={handleEraSelected} onBack={handleBackToTitle} />
      )}

      {gameState.phase === 'setup' && (
        <PlayerSetup
          onStart={handlePlayersReady}
          onBack={() => setGameState((prev) => ({ ...prev, phase: 'eraSelect' }))}
        />
      )}

      {gameState.phase === 'playing' && (
        <>
          <GameBoard
            players={gameState.players}
            currentPlayerIndex={gameState.currentPlayerIndex}
            boardSize={gameState.boardSize}
            era={gameState.settings.era}
            rollDisabled={
              gameState.activeEvent !== null ||
              gameState.pendingBranchChoice !== null ||
              gameState.pendingGraduation !== null ||
              moveAnimation !== null ||
              turnAnnouncementPlayerId !== null
            }
            moveAnimation={moveAnimation}
            soundEnabled={soundEnabled}
            deathChance={currentDeathChance}
            onRoll={handleRoll}
            onRollSettled={handleRollSettled}
            onToggleSound={handleToggleSound}
            onShowLifeLog={handleShowLifeLog}
            onShowNewspaper={handleShowNewspaper}
          />
          {turnAnnouncementPlayerId &&
            (() => {
              const announcedIndex = gameState.players.findIndex((p) => p.id === turnAnnouncementPlayerId);
              const announcedPlayer = gameState.players[announcedIndex];
              if (!announcedPlayer) return null;
              return (
                <TurnAnnouncement
                  player={announcedPlayer}
                  playerIndex={announcedIndex}
                  playerCount={gameState.players.length}
                  era={gameState.settings.era}
                  onDismiss={handleDismissTurnAnnouncement}
                />
              );
            })()}
          {gameState.activeEvent && activeDraw && (
            <EventModal
              event={gameState.activeEvent}
              age={gameState.players.find((p) => p.id === gameState.activePlayerIdForEvent)?.age ?? 0}
              era={gameState.settings.era}
              squareType={activeDraw.squareType}
              result={gameState.pendingResult}
              pendingFate={gameState.pendingFateRoulette}
              soundEnabled={soundEnabled}
              societyEvents={getSocietyHeadlinesForYear(
                gameState.settings.era,
                getCalendarYear(
                  gameState.settings.era,
                  gameState.players.find((p) => p.id === gameState.activePlayerIdForEvent)?.age ?? 0,
                ),
              )}
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
              soundEnabled={soundEnabled}
              onAcknowledge={handleAcknowledgeGraduation}
            />
          )}
          {gameState.showLifeLog && (
            <LifeLog players={gameState.players} era={gameState.settings.era} onClose={handleCloseLifeLog} />
          )}
          {gameState.showNewspaper && (
            <Newspaper
              players={gameState.players}
              era={gameState.settings.era}
              soundEnabled={soundEnabled}
              onClose={handleCloseNewspaper}
            />
          )}
        </>
      )}

      {gameState.phase === 'finished' && (
        <FinalReport
          players={gameState.players}
          era={gameState.settings.era}
          soundEnabled={soundEnabled}
          onRestart={handleBackToTitle}
          onPlayDifferentEra={handlePlayDifferentEra}
        />
      )}

      {showReleaseNotes && <ReleaseNotesModal onClose={handleCloseReleaseNotes} />}
    </div>
  );
}

export default App;
