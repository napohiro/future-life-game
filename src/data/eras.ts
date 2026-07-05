import type { EraDefinition, EraId } from '../types/game';

// ============================================================
// 時代設定プリセット
// ------------------------------------------------------------
// 将来「昭和編」「バブル編」「2100年編」等を追加する場合は、
// types/game.ts の EraId に値を足し、この配列に定義を1件追加するだけでよい。
// ============================================================

export const ERA_DEFINITIONS: EraDefinition[] = [
  {
    id: 'showa',
    name: '昭和編',
    year: 1948,
    description: '戦後から始まる、懐かしさと成長の時代を生きる',
    icon: '📻',
  },
  {
    id: 'present',
    name: '現代編',
    year: 2026,
    description: 'AIが社会に入り始めた、変化の時代を生きる',
    icon: '📱',
  },
  {
    id: 'future',
    name: '近未来編',
    year: 2050,
    description: 'AI・ロボット・宇宙旅行が日常になった未来を生きる',
    icon: '🚀',
  },
];

// 既存の挙動（2050年の近未来編）をそのまま初期値にする。
export const DEFAULT_ERA: EraId = 'future';

export function getEraDefinition(id: EraId): EraDefinition {
  return ERA_DEFINITIONS.find((era) => era.id === id) ?? ERA_DEFINITIONS.find((era) => era.id === DEFAULT_ERA)!;
}

/** 時代の開始年＋現在の年齢から、物語上の「現在の暦年」を算出する（例：現代編・30歳→2056年）。 */
export function getCalendarYear(id: EraId, age: number): number {
  return getEraDefinition(id).year + age;
}

// 昭和23年(1948)〜昭和63年(1988) / 平成元年(1989)〜平成30年(2018) / 令和元年(2019)〜。
// 昭和編（1948年スタート）でのみ、年齢に応じた元号表示に使う。
const GENGO_TABLE: { name: string; startYear: number }[] = [
  { name: '令和', startYear: 2019 },
  { name: '平成', startYear: 1989 },
  { name: '昭和', startYear: 1926 },
];

/** 西暦から「昭和23年」「平成元年」「令和6年」のような元号表示を作る（昭和編の年表示用）。 */
export function getGengoLabel(calendarYear: number): string {
  const gengo = GENGO_TABLE.find((g) => calendarYear >= g.startYear) ?? GENGO_TABLE[GENGO_TABLE.length - 1];
  const yearInGengo = calendarYear - gengo.startYear + 1;
  return `${gengo.name}${yearInGengo === 1 ? '元' : yearInGengo}年`;
}
