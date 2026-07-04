import { useEffect, useRef, useState } from 'react';
import { playRouletteResultSound, playRouletteTickSound } from '../utils/sound';

interface RouletteProps {
  disabled: boolean;
  lastRoll: number | null;
  soundEnabled: boolean;
  onRoll: () => number;
  onRollSettled: () => void;
}

// idle: 静止中 / spinning: 一定速度で回転中 / slowing: 減速中（速度は単調減少） /
// stopped: 止まった直後（軽いバウンド演出） / resultPause: 数字を見せる余韻（この間はコマがまだ動かない）
type SpinPhase = 'idle' | 'spinning' | 'slowing' | 'stopped' | 'resultPause';

const SEGMENT_COUNT = 6;
const SEGMENT_ANGLE = 360 / SEGMENT_COUNT;
const SPIN_TICK_MS = 45;
const SPIN_SPEED_DEG_PER_TICK = 32;
const SPIN_ANGULAR_VELOCITY = SPIN_SPEED_DEG_PER_TICK / SPIN_TICK_MS; // deg / ms（減速の起点となる速度）
const AUTO_STOP_MS = 5000;
const EXTRA_SLOWDOWN_SPINS = 1; // 減速中にあと何周してから止まるか
const STOPPED_BOUNCE_MS = 320;
const RESULT_PAUSE_MS = 600; // バウンド後、さらに余韻を持たせる時間（合計で停止後 約0.9秒 でコマが動き出す）
const TICK_SOUND_INTERVAL_MS = 110;
const NUMBER_RADIUS_PX = 38;

/**
 * 人生ゲーム風の盤面型ルーレット。
 * 1回目のタップで回転が始まり、回転中にもう一度タップすると減速して止まる。
 * 何もしなければ5秒後に自動で減速が始まる。
 *
 * 減速は「今の回転速度から、速度が時間に対して一定の割合で0まで下がる」物理計算で行うため、
 * 回転中の速度から減速開始の瞬間に速度が変わらず、そこから単調に遅くなって自然に止まる。
 */
function Roulette({ disabled, lastRoll, soundEnabled, onRoll, onRollSettled }: RouletteProps) {
  const [rotation, setRotation] = useState(0);
  const [phase, setPhase] = useState<SpinPhase>('idle');
  const [resultNumber, setResultNumber] = useState<number | null>(lastRoll);

  const rotationRef = useRef(0);
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

  /** 回転中(spinning)から減速(slowing)へ移行し、速度0まで単調に減速して結果の数字でぴったり止まる。 */
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
    const result = onRoll();

    // 盤面は「数字k(1〜6)の中心が角度(k-1)*60度」の配置。針は常に真上(0度)にあるので、
    // 結果の数字の中心が0度に来るように、減速で進む距離を決める。
    const targetAngle = (360 - (result - 1) * SEGMENT_ANGLE) % 360;
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
        finishStop(result);
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

  // 完全停止 → 軽いバウンド → 数字を見せる余韻(resultPause) の順で進み、
  // 余韻が終わってから初めて親（App側）にコマ移動の開始を伝える。
  const finishStop = (result: number) => {
    setPhase('stopped');
    setResultNumber(result);
    if (soundEnabled) playRouletteResultSound();

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
    setResultNumber(null);

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

  return (
    <div className="roulette">
      <div className="roulette__info">
        <div className="roulette__result-row">
          {resultNumber !== null && (phase === 'idle' || phase === 'stopped' || phase === 'resultPause') ? (
            <span className="roulette__result-readout">
              出た数字：<strong>{resultNumber}</strong>
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
          style={{ transform: `rotate(${rotation}deg)` }}
        >
          {Array.from({ length: SEGMENT_COUNT }, (_, i) => i + 1).map((n, i) => (
            <span
              key={n}
              className="roulette-wheel__number"
              style={{ transform: `rotate(${i * SEGMENT_ANGLE}deg) translateY(-${NUMBER_RADIUS_PX}px)` }}
            >
              {n}
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
