import type { EraDefinition, EraId, GameSettings } from '../types/game';

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

// ============================================================
// 時代ごとの「社会の前提」プロフィール
// ------------------------------------------------------------
// かつては世界設定画面でプレイヤーがAI社会レベル・景気・災害頻度・寿命モードを
// 個別に選んでいたが、現在は選んだ時代に応じてこれらが自動的に決まる説明画面
// （WorldSettings.tsx）になっている。ここで時代ごとの固定値と説明文を一元管理する。
// ============================================================

export interface EraSocietyProfile {
  aiSociety: string;
  economy: string;
  disaster: string;
  longevity: string;
  settings: Pick<GameSettings, 'aiSocietyLevel' | 'economy' | 'disasterFrequency' | 'longevityMode'>;
}

export const ERA_SOCIETY_PROFILES: Record<EraId, EraSocietyProfile> = {
  showa: {
    aiSociety: 'AIやデジタル機器はまだ登場せず、AIに関するイベントは基本的に起こりません。',
    economy: '高度経済成長期を思わせる好景気の時代です。',
    disaster: '災害の起こりやすさは標準的です。',
    longevity: '寿命の目安は60〜80歳ごろです。',
    settings: { aiSocietyLevel: 'low', economy: 'boom', disasterFrequency: 'normal', longevityMode: 'standard' },
  },
  present: {
    aiSociety: 'AI・スマホ・SNS・自動化が、生活のすみずみまで広がっています。',
    economy: '不景気や物価高、格差など、先行きの不透明さを感じる時代です。',
    disaster: '災害の起こりやすさは標準的です。',
    longevity: '寿命の目安は80〜100歳ごろです。',
    settings: { aiSocietyLevel: 'mid', economy: 'recession', disasterFrequency: 'normal', longevityMode: 'standard' },
  },
  future: {
    aiSociety: 'AI医療・AIによる仕事支援・自動運転・ホログラムなどが当たり前になっています。',
    economy: '好況・不況は固定されておらず、ゲーム中の出来事によって移り変わります。',
    disaster: '大規模災害や気候変動、インフラ障害が起こる可能性は残されています。',
    longevity: '再生医療などの進歩により、寿命の目安は100〜120歳ごろまで伸びています。',
    settings: { aiSocietyLevel: 'high', economy: 'normal', disasterFrequency: 'normal', longevityMode: 'longevity' },
  },
};

export function getEraSocietyProfile(id: EraId): EraSocietyProfile {
  return ERA_SOCIETY_PROFILES[id] ?? ERA_SOCIETY_PROFILES[DEFAULT_ERA];
}
