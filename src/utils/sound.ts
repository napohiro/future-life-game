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

export function playRouletteTickSound(): void {
  beep(440, 50, 0.035);
}

export function playRouletteResultSound(): void {
  beep(880, 160, 0.06);
}

export function playMoveStepSound(): void {
  beep(320, 40, 0.03);
}
