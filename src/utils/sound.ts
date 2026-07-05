// 軽量な効果音（Web Audio APIで生成。音声ファイルを持たないシンプルな実装）。
// ユーザー操作（ボタンクリック）の延長で呼ばれるため、ブラウザの自動再生制限にも引っかからない。

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioContextCtor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextCtor) return null;
  if (!audioContext) {
    audioContext = new AudioContextCtor();
  }
  if (audioContext.state === 'suspended') {
    audioContext.resume().catch(() => undefined);
  }
  return audioContext;
}

function beep(frequency: number, durationMs: number, volume: number) {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = frequency;
    gain.gain.value = volume;
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start();
    oscillator.stop(ctx.currentTime + durationMs / 1000);
  } catch {
    // 音が鳴らせない環境でもゲーム進行には影響させない。
  }
}

/** 複数の音を少し間を空けて連続再生する（成功・失敗などの「和音っぽい」演出に使う）。 */
function beepSequence(notes: { frequency: number; durationMs: number; volume: number; delayMs: number }[]) {
  for (const note of notes) {
    setTimeout(() => beep(note.frequency, note.durationMs, note.volume), note.delayMs);
  }
}

export function playRouletteTickSound(): void {
  beep(440, 50, 0.035);
}

export function playRouletteResultSound(): void {
  beep(880, 160, 0.06);
}

export function playMoveStepSound(): void {
  beep(320, 40, 0.03);
}

/** 移動用・運命ルーレットが回り始める瞬間の、軽く弾むような開始音。 */
export function playSpinStartSound(): void {
  beep(520, 70, 0.045);
}

/** 運命ルーレット：大成功。明るく上昇する3音。 */
export function playGreatSuccessSound(): void {
  beepSequence([
    { frequency: 660, durationMs: 110, volume: 0.06, delayMs: 0 },
    { frequency: 880, durationMs: 110, volume: 0.06, delayMs: 100 },
    { frequency: 1100, durationMs: 200, volume: 0.07, delayMs: 200 },
  ]);
}

/** 運命ルーレット：成功。明るい2音。 */
export function playSuccessSound(): void {
  beepSequence([
    { frequency: 660, durationMs: 100, volume: 0.055, delayMs: 0 },
    { frequency: 830, durationMs: 150, volume: 0.06, delayMs: 90 },
  ]);
}

/** 運命ルーレット：失敗。低めに沈む2音。 */
export function playFailureSound(): void {
  beepSequence([
    { frequency: 330, durationMs: 120, volume: 0.05, delayMs: 0 },
    { frequency: 260, durationMs: 180, volume: 0.05, delayMs: 100 },
  ]);
}

/** 運命ルーレット：大失敗。静かに沈む低音（過度に驚かせない控えめな演出）。 */
export function playGreatFailureSound(): void {
  beepSequence([
    { frequency: 220, durationMs: 160, volume: 0.05, delayMs: 0 },
    { frequency: 165, durationMs: 260, volume: 0.055, delayMs: 140 },
  ]);
}

/** 人生新聞を開いたときの「号外」チャイム。 */
export function playNewspaperExtraSound(): void {
  beepSequence([
    { frequency: 740, durationMs: 90, volume: 0.05, delayMs: 0 },
    { frequency: 740, durationMs: 90, volume: 0.05, delayMs: 150 },
  ]);
}

/** 人生終了・人生の卒業を伝える、静かで落ち着いた音。 */
export function playLifeEndSound(): void {
  beepSequence([
    { frequency: 392, durationMs: 220, volume: 0.045, delayMs: 0 },
    { frequency: 330, durationMs: 320, volume: 0.045, delayMs: 220 },
  ]);
}

/** 最終結果画面に到達したときの、締めくくりの和音。 */
export function playFinalResultSound(): void {
  beepSequence([
    { frequency: 523, durationMs: 140, volume: 0.055, delayMs: 0 },
    { frequency: 659, durationMs: 140, volume: 0.055, delayMs: 110 },
    { frequency: 784, durationMs: 260, volume: 0.06, delayMs: 220 },
  ]);
}

/**
 * 対応端末のみで軽くバイブレーションさせる。navigator.vibrate が無い環境（PC・iOS Safari等）でも
 * 例外を投げず、ゲーム進行に一切影響しないようにしている。
 */
export function vibrate(pattern: number | number[]): void {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(pattern);
    }
  } catch {
    // バイブレーション非対応・拒否環境でも無視する。
  }
}
