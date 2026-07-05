import { useEffect, useRef, useState } from 'react';
import type { FateOutcome } from '../types/game';
import { FATE_SEVERITY_ICONS, FATE_SEVERITY_LABELS } from '../utils/gameLogic';
import {
  playFailureSound,
  playGreatFailureSound,
  playGreatSuccessSound,
  playSpinStartSound,
  playSuccessSound,
  vibrate,
} from '../utils/sound';

const SEVERITY_SOUND: Record<FateOutcome['severity'], () => void> = {
  greatSuccess: playGreatSuccessSound,
  success: playSuccessSound,
  neutral: playSuccessSound,
  failure: playFailureSound,
  greatFailure: playGreatFailureSound,
};

const SEVERITY_VIBRATION: Record<FateOutcome['severity'], number | number[]> = {
  greatSuccess: [40, 40, 40, 40, 80],
  success: [30, 30, 40],
  neutral: 25,
  failure: [40, 40, 40],
  greatFailure: [30, 60, 30, 60, 120],
};

interface FateRouletteProps {
  title: string;
  outcomes: FateOutcome[];
  soundEnabled: boolean;
  onSpin: () => FateOutcome;
  onSettled: (outcome: FateOutcome) => void;
}

// idle: 静止中 / spinning: 一定速度で回転中 / slowing: 減速中 / stopped: 止まった直後（結果表示）
type FatePhase = 'idle' | 'spinning' | 'slowing' | 'stopped';

const SPIN_TICK_MS = 45;
const SPIN_SPEED_DEG_PER_TICK = 28;
const SPIN_ANGULAR_VELOCITY = SPIN_SPEED_DEG_PER_TICK / SPIN_TICK_MS;
const AUTO_STOP_MS = 3000;
const EXTRA_SLOWDOWN_SPINS = 1;
const STOPPED_BOUNCE_MS = 320;
const ICON_RADIUS_PX = 30;

const SEVERITY_COLORS: Record<FateOutcome['severity'], string> = {
  greatSuccess: '#f5c518',
  success: '#3fa876',
  neutral: '#5b6b8c',
  failure: '#e08a3c',
  greatFailure: '#c9463d',
};

/**
 * イベント専用の小型「運命ルーレット」。移動用ルーレットとは別コンポーネントで、
 * 選択＋運で決まるイベントの結果を、タップ操作でその場で決める。
 * 減速は移動用ルーレットと同じ「速度が時間に比例して0まで下がる」物理モデルを使い、
 * 急加速・急停止のない自然な止まり方にしている。
 */
function FateRoulette({ title, outcomes, soundEnabled, onSpin, onSettled }: FateRouletteProps) {
  const segmentAngle = 360 / outcomes.length;
  const [rotation, setRotation] = useState(0);
  const [phase, setPhase] = useState<FatePhase>('idle');
  const [outcome, setOutcome] = useState<FateOutcome | null>(null);

  const rotationRef = useRef(0);
  const spinIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoStopTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const slowdownRafRef = useRef<number | null>(null);

  const clearAllTimers = () => {
    if (spinIntervalRef.current) clearInterval(spinIntervalRef.current);
    if (autoStopTimeoutRef.current) clearTimeout(autoStopTimeoutRef.current);
    if (bounceTimeoutRef.current) clearTimeout(bounceTimeoutRef.current);
    if (slowdownRafRef.current) cancelAnimationFrame(slowdownRafRef.current);
  };

  useEffect(() => clearAllTimers, []);

  const beginSlowdown = () => {
    if (spinIntervalRef.current) {
      clearInterval(spinIntervalRef.current);
      spinIntervalRef.current = null;
    }
    if (autoStopTimeoutRef.current) {
      clearTimeout(autoStopTimeoutRef.current);
      autoStopTimeoutRef.current = null;
    }

    setPhase('slowing');
    const result = onSpin();
    const resultIndex = Math.max(0, outcomes.findIndex((o) => o.id === result.id));

    const targetAngle = (360 - resultIndex * segmentAngle) % 360;
    const currentMod = ((rotationRef.current % 360) + 360) % 360;
    const delta = (targetAngle - currentMod + 360) % 360;
    const distance = EXTRA_SLOWDOWN_SPINS * 360 + delta;

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
      const s = v0 * elapsed - (v0 * elapsed * elapsed) / (2 * duration);
      rotationRef.current = startRotation + s;
      setRotation(rotationRef.current);
      slowdownRafRef.current = requestAnimationFrame(tick);
    };
    slowdownRafRef.current = requestAnimationFrame(tick);
  };

  const finishStop = (result: FateOutcome) => {
    setPhase('stopped');
    setOutcome(result);
    if (soundEnabled) SEVERITY_SOUND[result.severity]();
    vibrate(SEVERITY_VIBRATION[result.severity]);

    bounceTimeoutRef.current = setTimeout(() => {
      onSettled(result);
    }, STOPPED_BOUNCE_MS);
  };

  const startSpin = () => {
    setPhase('spinning');
    setOutcome(null);
    if (soundEnabled) playSpinStartSound();

    spinIntervalRef.current = setInterval(() => {
      rotationRef.current += SPIN_SPEED_DEG_PER_TICK;
      setRotation(rotationRef.current);
    }, SPIN_TICK_MS);

    autoStopTimeoutRef.current = setTimeout(() => {
      beginSlowdown();
    }, AUTO_STOP_MS);
  };

  const handleClick = () => {
    if (phase === 'idle') {
      startSpin();
    } else if (phase === 'spinning') {
      beginSlowdown();
    }
  };

  const isSettling = phase === 'slowing' || phase === 'stopped';
  const gradientStops = outcomes
    .map((o, i) => `${SEVERITY_COLORS[o.severity]} ${i * segmentAngle}deg ${(i + 1) * segmentAngle}deg`)
    .join(', ');

  return (
    <div className="fate-roulette">
      <div className="fate-roulette__title">🔮 {title}</div>

      <button
        type="button"
        className="fate-roulette__wheel-frame"
        onClick={handleClick}
        disabled={isSettling}
        aria-label={phase === 'idle' ? 'タップして運命を回す' : phase === 'spinning' ? 'タップして運命を止める' : '運命ルーレット'}
      >
        <div className="fate-roulette__pointer" aria-hidden="true">
          ▼
        </div>
        <div
          className={[
            'fate-roulette__wheel',
            phase === 'spinning' ? 'fate-roulette__wheel--spinning' : '',
            phase === 'slowing' ? 'fate-roulette__wheel--slowing' : '',
            phase === 'stopped' ? 'fate-roulette__wheel--bounce' : '',
          ].join(' ')}
          style={{ transform: `rotate(${rotation}deg)`, background: `conic-gradient(${gradientStops})` }}
        >
          {outcomes.map((o, i) => (
            <span
              key={o.id}
              className="fate-roulette__icon"
              style={{ transform: `rotate(${i * segmentAngle + segmentAngle / 2}deg) translateY(-${ICON_RADIUS_PX}px)` }}
            >
              {FATE_SEVERITY_ICONS[o.severity]}
            </span>
          ))}
        </div>
        <div className="fate-roulette__hub">🔮</div>
      </button>

      <div className="fate-roulette__status">
        {phase === 'idle' && <span className="fate-roulette__hint">タップして運命を回す</span>}
        {phase === 'spinning' && <span className="fate-roulette__spinning-text">運命が動いています…（タップで止める）</span>}
        {phase === 'slowing' && <span className="fate-roulette__spinning-text">運命が動いています…</span>}
        {phase === 'stopped' && outcome && (
          <div className={`fate-roulette__result fate-roulette__result--${outcome.severity}`}>
            <span className="fate-roulette__result-icon">{FATE_SEVERITY_ICONS[outcome.severity]}</span>
            <span className="fate-roulette__result-label">{outcome.label}</span>
            <span className="fate-roulette__result-severity">{FATE_SEVERITY_LABELS[outcome.severity]}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default FateRoulette;
