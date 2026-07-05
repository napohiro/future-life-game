import { useEffect, useMemo, useRef, useState } from 'react';
import { playRouletteResultSound, playRouletteTickSound, playSpinStartSound, vibrate } from '../utils/sound';

interface RouletteProps {
  disabled: boolean;
  currentAge: number;
  // 現在のプレイヤーの「寿命を迎える」確率（0〜1）。0の場合は寿命枠を表示しない
  // （寿命リスク開始年齢に達していない、または寿命免除ターン中）。
  deathChance: number;
  soundEnabled: boolean;
  onRoll: () => number | 'death';
  onRollSettled: () => void;
}

// idle: 静止中 / spinning: 一定速度で回転中 / slowing: 減速中（速度は単調減少） /
// stopped: 止まった直後（軽いバウンド演出） / resultPause: 数字を見せる余韻（この間はコマがまだ動かない）
type SpinPhase = 'idle' | 'spinning' | 'slowing' | 'stopped' | 'resultPause';

interface WheelSegment {
  type: 'number' | 'death';
  value?: number;
  startAngle: number;
  angleSpan: number;
  centerAngle: number;
}

const SPIN_TICK_MS = 45;
const SPIN_SPEED_DEG_PER_TICK = 32;
const SPIN_ANGULAR_VELOCITY = SPIN_SPEED_DEG_PER_TICK / SPIN_TICK_MS; // deg / ms（減速の起点となる速度）
const AUTO_STOP_MS = 5000;
const EXTRA_SLOWDOWN_SPINS = 1; // 減速中にあと何周してから止まるか
const STOPPED_BOUNCE_MS = 320;
const RESULT_PAUSE_MS = 600; // バウンド後、さらに余韻を持たせる時間（合計で停止後 約0.9秒 でコマが動き出す）
const TICK_SOUND_INTERVAL_MS = 110;
const NUMBER_RADIUS_PX = 26; // roulette-wheel(76px)の半径に合わせた数字ラベルの配置半径
// 寿命枠の見た目の割合は、常に大きくなり過ぎないよう上限を設ける
// （実際の判定確率はこの上限に関わらず、渡された deathChance をそのまま使う）。
const MAX_DEATH_VISUAL_FRACTION = 0.4;
const NUMBER_COLORS = ['#ff6f91', '#ffb020', '#22c55e', '#2fb6d9', '#8b5cf6', '#f5c518'];
const DEATH_COLOR = '#5b5a72';

/** 数字1〜6（＋寿命リスクがある場合は寿命枠）のセグメント配置を作る。寿命枠が無い場合は等分の6分割になる。 */
function buildSegments(deathChance: number): WheelSegment[] {
  const deathFraction = deathChance > 0 ? Math.min(MAX_DEATH_VISUAL_FRACTION, deathChance) : 0;
  const deathSpan = 360 * deathFraction;
  const numberSpan = (360 - deathSpan) / 6;

  const segments: WheelSegment[] = [];
  let angle = 0;
  for (let n = 1; n <= 6; n++) {
    segments.push({ type: 'number', value: n, startAngle: angle, angleSpan: numberSpan, centerAngle: angle + numberSpan / 2 });
    angle += numberSpan;
  }
  if (deathSpan > 0) {
    segments.push({ type: 'death', startAngle: angle, angleSpan: deathSpan, centerAngle: angle + deathSpan / 2 });
  }
  return segments;
}

/**
 * 人生ゲーム風の盤面型ルーレット。
 * 1回目のタップで回転が始まり、回転中にもう一度タップすると減速して止まる。
 * 何もしなければ5秒後に自動で減速が始まる。
 *
 * 減速は「今の回転速度から、速度が時間に対して一定の割合で0まで下がる」物理計算で行うため、
 * 回転中の速度から減速開始の瞬間に速度が変わらず、そこから単調に遅くなって自然に止まる。
 *
 * 寿命リスク開始年齢を超えると、盤面に「寿命を迎える」枠が加わる（年齢とともに少しずつ大きくなる）。
 * 寿命枠に止まった場合は、通常の移動アニメーションを行わず、人生の終幕演出（親コンポーネント側）へ進む。
 */
function Roulette({ disabled, currentAge, deathChance, soundEnabled, onRoll, onRollSettled }: RouletteProps) {
  const [rotation, setRotation] = useState(0);
  const [phase, setPhase] = useState<SpinPhase>('idle');
  // 手番プレイヤーが切り替わるたびにこのコンポーネントごとkeyで再マウントされるため、
  // 初期値は常にnull（前のプレイヤーの結果を引き継がない）。
  const [result, setResult] = useState<number | 'death' | null>(null);
  const [startAge, setStartAge] = useState<number | null>(null);

  const segments = useMemo(() => buildSegments(deathChance), [deathChance]);

  const rotationRef = useRef(0);
  // 減速開始（＝出目が確定した瞬間）の年齢を覚えておき、以降の移動アニメーション中に
  // currentAge が変化しても「進む年数→到達年齢」の表示がぶれないようにする。
  const currentAgeRef = useRef(currentAge);
  currentAgeRef.current = currentAge;
  const segmentsRef = useRef(segments);
  segmentsRef.current = segments;
  const spinIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tickSoundIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoStopTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resultPauseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const slowdownRafRef = useRef<number | null>(null);

  const clearAllTimers = () => {
    if (spinIntervalRef.current) clearInterval(spinIntervalRef.current);
    if (tickSoundIntervalRef.current) clearInterval(tickSoundIntervalRef.current);
    if (autoStopTimeoutRef.current) clearTimeout(autoStopTimeoutRef.current);
    if (bounceTimeoutRef.current) clearTimeout(bounceTimeoutRef.current);
    if (resultPauseTimeoutRef.current) clearTimeout(resultPauseTimeoutRef.current);
    if (slowdownRafRef.current) cancelAnimationFrame(slowdownRafRef.current);
  };

  useEffect(() => clearAllTimers, []);

  /** 回転中(spinning)から減速(slowing)へ移行し、速度0まで単調に減速して結果のマスでぴったり止まる。 */
  const beginSlowdown = () => {
    if (spinIntervalRef.current) {
      clearInterval(spinIntervalRef.current);
      spinIntervalRef.current = null;
    }
    if (tickSoundIntervalRef.current) {
      clearInterval(tickSoundIntervalRef.current);
      tickSoundIntervalRef.current = null;
    }
    if (autoStopTimeoutRef.current) {
      clearTimeout(autoStopTimeoutRef.current);
      autoStopTimeoutRef.current = null;
    }

    setPhase('slowing');
    const rollResult = onRoll();
    setStartAge(currentAgeRef.current);

    // 針は常に真上(0度)にあるので、結果のセグメントの中心が0度に来るように、減速で進む距離を決める。
    const targetSegment =
      rollResult === 'death'
        ? segmentsRef.current.find((s) => s.type === 'death')!
        : segmentsRef.current.find((s) => s.type === 'number' && s.value === rollResult)!;
    const targetAngle = (360 - targetSegment.centerAngle + 360) % 360;
    const currentMod = ((rotationRef.current % 360) + 360) % 360;
    const delta = (targetAngle - currentMod + 360) % 360;
    const distance = EXTRA_SLOWDOWN_SPINS * 360 + delta;

    // 速度が spinning のときの速度(v0)から時間に比例して0まで下がる、という単純な物理モデル。
    // v0*duration/2 = distance となるように所要時間を逆算するので、
    // 「減速し始めた瞬間の速度」と「spinning中の速度」が完全に一致し、急加速が起きない。
    const v0 = SPIN_ANGULAR_VELOCITY;
    const duration = (2 * distance) / v0;
    const startRotation = rotationRef.current;
    const startTime = performance.now();

    const tick = (now: number) => {
      const elapsed = now - startTime;
      if (elapsed >= duration) {
        rotationRef.current = startRotation + distance;
        setRotation(rotationRef.current);
        slowdownRafRef.current = null;
        finishStop(rollResult);
        return;
      }
      // s(t) = v0*t - v0*t^2/(2*duration) … 速度 v(t) = v0*(1 - t/duration) を積分した位置。
      const s = v0 * elapsed - (v0 * elapsed * elapsed) / (2 * duration);
      rotationRef.current = startRotation + s;
      setRotation(rotationRef.current);
      slowdownRafRef.current = requestAnimationFrame(tick);
    };
    slowdownRafRef.current = requestAnimationFrame(tick);
  };

  // 完全停止 → 軽いバウンド → 結果を見せる余韻(resultPause) の順で進み、
  // 余韻が終わってから初めて親（App側）にコマ移動（または人生の終幕）の開始を伝える。
  const finishStop = (rollResult: number | 'death') => {
    setPhase('stopped');
    setResult(rollResult);
    if (rollResult === 'death') {
      // 賑やかな「当たり」演出にはせず、ごく控えめな振動だけに留める
      // （このあと表示される人生の終幕演出のほうで、静かな音を1回鳴らす）。
      vibrate(40);
    } else {
      if (soundEnabled) playRouletteResultSound();
      vibrate(30);
    }

    bounceTimeoutRef.current = setTimeout(() => {
      setPhase('resultPause');
      resultPauseTimeoutRef.current = setTimeout(() => {
        setPhase('idle');
        onRollSettled();
      }, RESULT_PAUSE_MS);
    }, STOPPED_BOUNCE_MS);
  };

  const startSpin = () => {
    setPhase('spinning');
    setResult(null);
    setStartAge(null);
    if (soundEnabled) playSpinStartSound();
    vibrate(20);

    spinIntervalRef.current = setInterval(() => {
      rotationRef.current += SPIN_SPEED_DEG_PER_TICK;
      setRotation(rotationRef.current);
    }, SPIN_TICK_MS);

    if (soundEnabled) {
      tickSoundIntervalRef.current = setInterval(() => playRouletteTickSound(), TICK_SOUND_INTERVAL_MS);
    }

    autoStopTimeoutRef.current = setTimeout(() => {
      beginSlowdown();
    }, AUTO_STOP_MS);
  };

  const handleClick = () => {
    if (disabled) return;
    if (phase === 'idle') {
      startSpin();
    } else if (phase === 'spinning') {
      beginSlowdown();
    }
    // slowing / stopped / resultPause の間は操作を受け付けない（再タップ不可）。
  };

  const isSettling = phase === 'slowing' || phase === 'stopped' || phase === 'resultPause';
  const isInteractive = !disabled && (phase === 'idle' || phase === 'spinning');
  // 自分の番ではない等で disabled になっている間は控えめに沈ませる。
  // slowing/stopped/resultPause は自分の操作で始まった演出の途中なので、あえて暗くしない。
  const isWaitingForTurn = disabled && phase === 'idle';
  const wheelAriaLabel =
    phase === 'idle' ? 'タップしてルーレットを回す' : phase === 'spinning' ? 'タップしてルーレットを止める' : 'ルーレット（停止中）';

  const gradientStops = segments
    .map((s) => `${s.type === 'death' ? DEATH_COLOR : NUMBER_COLORS[(s.value! - 1) % NUMBER_COLORS.length]} ${s.startAngle}deg ${s.startAngle + s.angleSpan}deg`)
    .join(', ');

  return (
    <div className="roulette">
      <div className="roulette__info">
        <div className="roulette__result-row">
          {result !== null && (phase === 'idle' || phase === 'stopped' || phase === 'resultPause') ? (
            <span className="roulette__result-readout">
              {result === 'death' ? (
                <span className="roulette__result-readout--death">🕊️ 運命の時が満ちて…</span>
              ) : startAge !== null ? (
                <>
                  <strong>{result}</strong>年進む → <strong>{startAge + result}歳</strong>へ
                </>
              ) : (
                <>
                  出た数字：<strong>{result}</strong>
                </>
              )}
            </span>
          ) : (
            <span className="roulette__result-readout roulette__result-readout--placeholder">
              {phase === 'spinning' ? 'タップで止まります' : phase === 'slowing' ? '止まります…' : 'ルーレットをタップしてね'}
            </span>
          )}
        </div>
      </div>

      <button
        type="button"
        className={[
          'roulette-wheel-frame',
          phase === 'idle' ? 'roulette-wheel-frame--tappable' : '',
          isWaitingForTurn ? 'roulette-wheel-frame--waiting' : '',
        ].join(' ')}
        onClick={handleClick}
        disabled={disabled || isSettling}
        aria-label={wheelAriaLabel}
      >
        <div className="roulette-wheel-pointer" aria-hidden="true">
          ▼
        </div>
        <div
          className={[
            'roulette-wheel',
            phase === 'idle' ? 'roulette-wheel--idle-glow' : '',
            phase === 'spinning' ? 'roulette-wheel--spinning-fast' : '',
            phase === 'slowing' ? 'roulette-wheel--slowing' : '',
            phase === 'stopped' ? 'roulette-wheel--bounce' : '',
          ].join(' ')}
          style={{ transform: `rotate(${rotation}deg)`, background: `conic-gradient(${gradientStops})` }}
        >
          {segments.map((s) => (
            <span
              key={s.type === 'death' ? 'death' : s.value}
              className={s.type === 'death' ? 'roulette-wheel__number roulette-wheel__number--death' : 'roulette-wheel__number'}
              style={{ transform: `rotate(${s.centerAngle}deg) translateY(-${NUMBER_RADIUS_PX}px)` }}
            >
              {s.type === 'death' ? '🕊️' : s.value}
            </span>
          ))}
        </div>
        <div className="roulette-wheel__hub">🎲</div>

        {isInteractive && (
          <span className="roulette-wheel__tap-hint" aria-hidden="true">
            {phase === 'idle' ? 'タップして回す' : 'タップで止める'}
          </span>
        )}
      </button>
    </div>
  );
}

export default Roulette;
