import { ALL_EVENTS, pickRandomEvent } from '../data/boardEvents';
import { getCategoryBoostsForRoutes } from '../data/branchRoutes';
import type {
  EventCategory,
  EventType,
  GameEvent,
  GameSettings,
  GameState,
  GraduationReason,
  LifeLogEntry,
  LifeStage,
  LogImportance,
  Player,
  PlayerSetupInput,
  Rarity,
  SquareType,
  StatEffects,
  StatKey,
  StatusEffects,
} from '../types/game';
import { STAT_KEYS } from '../types/game';

// 「1マス＝1歳」で統一：position 0（0歳・誕生）〜position 100（100歳）の101マス構成。
export const BOARD_SIZE = 101;

export const STAT_LABELS: Record<StatKey, string> = {
  money: '資産',
  health: '健康',
  happiness: '幸福',
  knowledge: '知識',
  relationships: '人間関係',
  freedom: '自由',
  experience: '経験',
  luck: '運',
  mentalStrength: '精神力',
  trust: '信用',
  socialContribution: '社会貢献',
  aiAffinity: 'AI親和性',
  actionPower: '行動力',
};

export const STAT_ICONS: Record<StatKey, string> = {
  money: '💰',
  health: '❤️',
  happiness: '😊',
  knowledge: '📚',
  relationships: '🤝',
  freedom: '🕊️',
  experience: '⭐',
  luck: '🍀',
  mentalStrength: '🧠',
  trust: '🤝‍✨',
  socialContribution: '🌍',
  aiAffinity: '🤖',
  actionPower: '🔥',
};

export const EVENT_CATEGORY_LABELS: Record<EventCategory, string> = {
  child: '子供時代',
  student: '学生生活',
  work: '仕事',
  love: '恋愛',
  marriage: '結婚',
  divorce: '離婚',
  childcare: '子育て',
  care: '介護',
  investment: '投資',
  health: '健康',
  illness: '病気',
  accident: '事故',
  ai: 'AI',
  disaster: '災害',
  space: '宇宙',
  hobby: '趣味',
  challenge: '挑戦',
  study: '学び',
  elder: '老後',
  death: '別れ',
  social: '社会貢献',
  fraud: 'トラブル',
  jobChange: '転職',
  startup: '起業',
  family: '家族',
  friend: '友達',
  club: '部活',
  path: '進路',
  partTime: 'アルバイト',
  retirement: '退職',
  grandchild: '孫',
  endOfLife: '終活',
  reflection: '人生回想',
  smallChallenge: '小さな挑戦',
  smallPinch: '小さなピンチ',
  housing: '住居',
};

// 職業・年収・恋愛家族状況・住居（StatKeyとは別枠の「状態」ステータス）の表示用ラベル・アイコン。
export const STATUS_FIELD_LABELS = {
  occupation: '職業',
  annualIncome: '年収',
  romanceStatus: '恋愛・家族',
  housingStatus: '住居',
  assetRank: '資産ランク',
} as const;

export const STATUS_FIELD_ICONS = {
  occupation: '💼',
  annualIncome: '💴',
  romanceStatus: '💞',
  housingStatus: '🏠',
  assetRank: '🏆',
} as const;

// イベントの性格（EventType）の表示ラベル・アイコン。結果モーダル・人生ログの控えめなバッジに使う。
export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  choice: '選択イベント',
  lucky: '幸運イベント',
  unlucky: '不運イベント',
  growth: '成長イベント',
  turningPoint: '人生の転機',
  nearFuture: '近未来イベント',
};

export const EVENT_TYPE_ICONS: Record<EventType, string> = {
  choice: '🔀',
  lucky: '🍀',
  unlucky: '⚡',
  growth: '🌱',
  turningPoint: '🌟',
  nearFuture: '🚀',
};

// プレイヤーごとの色・アイコン（盤面のコマやカードの縁取りに共通で使う）
export interface PlayerVisual {
  color: string;
  colorSoft: string;
  icon: string;
}

const PLAYER_VISUALS: PlayerVisual[] = [
  { color: '#2f6fed', colorSoft: '#dbe9ff', icon: '🧑' },
  { color: '#ff6f91', colorSoft: '#ffe1e9', icon: '👩' },
  { color: '#22b07d', colorSoft: '#d7f5e6', icon: '🧑‍🦰' },
  { color: '#8b5cf6', colorSoft: '#ece5fd', icon: '🧑‍🦱' },
];

export function getPlayerVisual(index: number): PlayerVisual {
  return PLAYER_VISUALS[index % PLAYER_VISUALS.length];
}

// 盤面のコマは、プレイヤーごとの色はそのままに、年代に応じてアイコンだけ変化させる。
const STAGE_TOKEN_ICONS: Record<LifeStage, string> = {
  stage1: '👶',
  stage2: '🧑‍🎓',
  stage3: '🧑‍💼',
  stage4: '🧑‍💼',
  stage5: '🧑‍🌾',
  stage6: '🧓',
};

export function getStageTokenIcon(stage: LifeStage): string {
  return STAGE_TOKEN_ICONS[stage];
}

// ---------------------------------------------------------------------------
// 人生ステージ（盤面のマス位置と実年齢の両方から参照する共通テーブル）
// ---------------------------------------------------------------------------

interface LifeStageMeta {
  id: LifeStage;
  maxAge: number;
  name: string;
  color: string;
}

const LIFE_STAGES: LifeStageMeta[] = [
  { id: 'stage1', maxAge: 12, name: '幼少期', color: '#ffd9e8' },
  { id: 'stage2', maxAge: 22, name: '学生時代', color: '#cfe3ff' },
  { id: 'stage3', maxAge: 39, name: '若者・社会人前半', color: '#d3f3d9' },
  { id: 'stage4', maxAge: 59, name: '人生の転機', color: '#ffe9b8' },
  { id: 'stage5', maxAge: 79, name: 'セカンドライフ', color: '#ffd3b0' },
  { id: 'stage6', maxAge: Infinity, name: '老後・近未来', color: '#e3d6ff' },
];

function findLifeStageMeta(ageOrPosition: number): LifeStageMeta {
  return LIFE_STAGES.find((stage) => ageOrPosition <= stage.maxAge) ?? LIFE_STAGES[LIFE_STAGES.length - 1];
}

export function getLifeStageName(age: number): string {
  return findLifeStageMeta(age).name;
}

/** マス位置から人生ステージを判定する（盤面は0〜100マス＝0〜100歳と1対1で対応する）。 */
export function getBoardStage(position: number): LifeStage {
  return findLifeStageMeta(position).id;
}

export function getLifeStageMeta(stage: LifeStage): { name: string; color: string } {
  const meta = LIFE_STAGES.find((s) => s.id === stage) ?? LIFE_STAGES[LIFE_STAGES.length - 1];
  return { name: meta.name, color: meta.color };
}

// 現在のステージに応じて画面全体の雰囲気を少し変えるための背景グラデーション。
export const LIFE_STAGE_BACKGROUNDS: Record<LifeStage, string> = {
  stage1: 'linear-gradient(180deg, #e3f9d5 0%, #eef3fb 260px, #eef3fb 100%)', // 幼少期：明るい緑
  stage2: 'linear-gradient(180deg, #dbe9ff 0%, #eef3fb 260px, #eef3fb 100%)', // 学生時代：青
  stage3: 'linear-gradient(180deg, #d6f3f7 0%, #eef3fb 260px, #eef3fb 100%)', // 若者・社会人前半：水色
  stage4: 'linear-gradient(180deg, #ffe1bd 0%, #eef3fb 260px, #eef3fb 100%)', // 人生の転機：夕焼けオレンジ
  stage5: 'linear-gradient(180deg, #eaf2c8 0%, #eef3fb 260px, #eef3fb 100%)', // セカンドライフ：落ち着いた黄緑
  stage6: 'linear-gradient(180deg, #e6dcf7 0%, #eef3fb 260px, #eef3fb 100%)', // 老後・近未来：淡い紫
};

export interface BoardStageTheme {
  id: LifeStage;
  title: string;
  ageRangeLabel: string;
  gradient: string;
  decorations: string[];
}

// 盤面を年代ステージごとの「世界」として見せるためのテーマ（背景グラデーション・装飾・見出し）。
// BoardStageSection コンポーネントがステージ単位でこのテーマをまとめて適用する。
export const BOARD_STAGE_THEMES: BoardStageTheme[] = [
  {
    id: 'stage1',
    title: '幼少期エリア',
    ageRangeLabel: '0〜12歳',
    gradient: 'linear-gradient(135deg, #d9f5df 0%, #d8ecfb 100%)',
    decorations: ['🌳', '🏡', '🛝', '🦋', '☀️'],
  },
  {
    id: 'stage2',
    title: '学生時代エリア',
    ageRangeLabel: '13〜22歳',
    gradient: 'linear-gradient(135deg, #ffe0ec 0%, #dbe9ff 100%)',
    decorations: ['🌸', '🏫', '📚', '⚽', '🎒'],
  },
  {
    id: 'stage3',
    title: '若者・社会人前半エリア',
    ageRangeLabel: '23〜39歳',
    gradient: 'linear-gradient(135deg, #d6f3f7 0%, #e7ebee 100%)',
    decorations: ['🚉', '🏢', '☕', '🏙️', '💼'],
  },
  {
    id: 'stage4',
    title: '人生の転機エリア',
    ageRangeLabel: '40〜59歳',
    gradient: 'linear-gradient(135deg, #ffdfb8 0%, #ffe9d6 100%)',
    decorations: ['🌇', '🏘️', '🏥', '👨‍👩‍👧', '🔀'],
  },
  {
    id: 'stage5',
    title: 'セカンドライフエリア',
    ageRangeLabel: '60〜79歳',
    gradient: 'linear-gradient(135deg, #eaf2c8 0%, #e3f3da 100%)',
    decorations: ['🌾', '🚜', '✈️', '🎣', '👵'],
  },
  {
    id: 'stage6',
    title: '老後・近未来エリア',
    ageRangeLabel: '80歳〜',
    gradient: 'linear-gradient(135deg, #e6dcf7 0%, #d9e4fb 100%)',
    decorations: ['🌌', '🤖', '🚀', '🏙️', '✨'],
  },
];

export function getBoardStageTheme(stage: LifeStage): BoardStageTheme {
  return BOARD_STAGE_THEMES.find((t) => t.id === stage) ?? BOARD_STAGE_THEMES[0];
}

// ---------------------------------------------------------------------------
// マス種類
// ---------------------------------------------------------------------------

export const SQUARE_TYPE_META: Record<SquareType, { icon: string; label: string; accent: string }> = {
  normal: { icon: '', label: '通常', accent: '#8fa6d6' },
  chance: { icon: '🍀', label: 'チャンス', accent: '#22c55e' },
  pinch: { icon: '⚡', label: 'ピンチ', accent: '#e0453f' },
  aiEra: { icon: '🤖', label: 'AI時代', accent: '#8b5cf6' },
  turningPoint: { icon: '🔀', label: '人生の転機', accent: '#d4af37' },
  love: { icon: '💕', label: '恋愛', accent: '#ff6f91' },
  work: { icon: '💼', label: '仕事', accent: '#2fb6d9' },
  family: { icon: '👨‍👩‍👧', label: '家族', accent: '#b5651d' },
  health: { icon: '🏥', label: '健康', accent: '#e0453f' },
  investment: { icon: '📈', label: '投資', accent: '#2e9e5b' },
  study: { icon: '📖', label: '学び', accent: '#3b82f6' },
  hobby: { icon: '🎨', label: '趣味', accent: '#f5c518' },
  social: { icon: '🌍', label: '社会貢献', accent: '#16a34a' },
  future: { icon: '🚀', label: '近未来', accent: '#7c4dff' },
  superRare: { icon: '✨', label: '超レア', accent: '#f5b301' },
};

// イベント抽選時に各マス種類が優先するイベントカテゴリ（空配列は「そのステージで許可された全カテゴリから抽選」を意味する）。
const SQUARE_TYPE_CATEGORY_MAP: Record<SquareType, EventCategory[]> = {
  normal: [],
  chance: ['love', 'work', 'investment', 'hobby', 'study', 'social', 'startup', 'friend', 'smallChallenge', 'challenge'],
  pinch: ['illness', 'accident', 'fraud', 'disaster', 'divorce', 'care', 'smallPinch'],
  aiEra: ['ai'],
  turningPoint: ['jobChange', 'marriage', 'divorce', 'death', 'startup', 'elder', 'path', 'retirement'],
  love: ['love', 'marriage', 'divorce'],
  work: ['work', 'jobChange', 'startup', 'partTime'],
  family: ['family', 'childcare', 'care', 'marriage', 'grandchild', 'housing'],
  health: ['health', 'illness', 'accident'],
  investment: ['investment', 'fraud'],
  study: ['study', 'child', 'student', 'club', 'path'],
  hobby: ['hobby'],
  social: ['social', 'friend', 'housing'],
  future: ['space', 'ai', 'disaster'],
  superRare: [],
};

// 各ステージの最初のマス（＝新しい人生ステージへ踏み出す「人生の転機マス」）。
const STAGE_BOUNDARY_POSITIONS = [13, 23, 40, 60, 80];

export interface BoardMilestone {
  position: number;
  icon: string;
  title: string;
}

// 盤面上でひときわ大きく表示する「人生の節目」マス。squareType/カテゴリ制御とは独立した、見た目だけの装飾情報。
export const BOARD_MILESTONES: BoardMilestone[] = [
  { position: 0, icon: '👶', title: '誕生' },
  { position: 6, icon: '🎒', title: '小学校入学' },
  { position: 13, icon: '📘', title: '中学校入学' },
  { position: 18, icon: '🎓', title: '卒業・進路' },
  { position: 23, icon: '💼', title: '社会人スタート' },
  { position: 30, icon: '🧭', title: '働き方の選択' },
  { position: 40, icon: '🔀', title: '人生の転機' },
  { position: 60, icon: '🌅', title: '定年・再出発' },
  { position: 80, icon: '🌌', title: '老後・近未来' },
];

export function getBoardMilestone(position: number): BoardMilestone | undefined {
  return BOARD_MILESTONES.find((m) => m.position === position);
}

// 年代ごとに出現してよいマス種類（幼少期・学生時代には恋愛・仕事・投資・介護などの大人向けマスを出さない）。
const STAGE_ALLOWED_SQUARE_TYPES: Record<LifeStage, SquareType[]> = {
  stage1: ['normal', 'chance', 'pinch', 'study', 'family', 'health', 'hobby'],
  stage2: ['normal', 'chance', 'pinch', 'study', 'family', 'health', 'hobby', 'love', 'social', 'work'],
  stage3: ['normal', 'chance', 'pinch', 'aiEra', 'love', 'work', 'family', 'health', 'investment', 'study', 'hobby', 'social', 'future', 'superRare'],
  stage4: ['normal', 'chance', 'pinch', 'aiEra', 'love', 'work', 'family', 'health', 'investment', 'study', 'hobby', 'social', 'future', 'superRare'],
  stage5: ['normal', 'chance', 'pinch', 'aiEra', 'love', 'work', 'family', 'health', 'investment', 'study', 'hobby', 'social', 'future', 'superRare'],
  stage6: ['normal', 'chance', 'pinch', 'aiEra', 'family', 'health', 'social', 'future', 'superRare'],
};

const SQUARE_TYPE_WEIGHTS: { type: SquareType; weight: number }[] = [
  { type: 'normal', weight: 34 },
  { type: 'chance', weight: 10 },
  { type: 'pinch', weight: 10 },
  { type: 'work', weight: 6 },
  { type: 'love', weight: 6 },
  { type: 'family', weight: 6 },
  { type: 'health', weight: 6 },
  { type: 'investment', weight: 5 },
  { type: 'study', weight: 5 },
  { type: 'hobby', weight: 5 },
  { type: 'social', weight: 4 },
  { type: 'aiEra', weight: 4 },
  { type: 'future', weight: 3 },
  { type: 'turningPoint', weight: 4 },
  { type: 'superRare', weight: 2 },
];

/** マス位置だけから決まる安定した疑似乱数（0〜1）。同じマスは常に同じ値になるので、描画のたびにマス種類が変わることはない。 */
function hashPosition(position: number): number {
  const x = Math.sin(position * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

/** マス位置からマス種類を判定する（決定的：同じ位置なら常に同じ結果）。年代にふさわしいマス種類だけを候補にする。 */
export function getSquareType(position: number): SquareType {
  if (position === 0) return 'normal';
  if (STAGE_BOUNDARY_POSITIONS.includes(position)) return 'turningPoint';

  const stage = getBoardStage(position);
  const allowedTypes = STAGE_ALLOWED_SQUARE_TYPES[stage];
  const weights = SQUARE_TYPE_WEIGHTS.filter((w) => allowedTypes.includes(w.type));
  const total = weights.reduce((sum, w) => sum + w.weight, 0);

  const roll = hashPosition(position) * total;
  let cumulative = 0;
  for (const entry of weights) {
    cumulative += entry.weight;
    if (roll < cumulative) return entry.type;
  }
  return 'normal';
}

// ---------------------------------------------------------------------------
// 世界設定
// ---------------------------------------------------------------------------

export const DEFAULT_GAME_SETTINGS: GameSettings = {
  era: '2050',
  aiSocietyLevel: 'mid',
  economy: 'normal',
  disasterFrequency: 'normal',
  longevityMode: 'standard',
};

/** 世界設定によるイベント出現の軽い補正。候補配列に該当イベントを重複追加/除外することで、出現しやすさを調整する。 */
function applySettingsBias(events: GameEvent[], settings: GameSettings): GameEvent[] {
  let biased = events;

  if (settings.aiSocietyLevel === 'high') {
    biased = biased.concat(events.filter((e) => e.category === 'ai' || e.futureTag));
  }
  if (settings.economy === 'boom') {
    biased = biased.concat(events.filter((e) => e.category === 'investment' || e.category === 'work'));
  }
  if (settings.economy === 'recession') {
    biased = biased.concat(events.filter((e) => e.category === 'fraud' || e.category === 'jobChange'));
  }
  if (settings.disasterFrequency === 'high') {
    biased = biased.concat(events.filter((e) => e.category === 'disaster'));
  } else if (settings.disasterFrequency === 'low') {
    biased = biased.filter((e) => e.category !== 'disaster' || hashPosition(e.id.length) < 0.3);
  }
  if (settings.longevityMode === 'longevity') {
    biased = biased.filter((e) => e.category !== 'death' || hashPosition(e.id.length) < 0.4);
  }

  return biased;
}

/** 選んだ人生ルートのcategoryBoostに一致するイベントを重複追加し、少し出やすくする（軽い重み付けのみ）。 */
function applyRouteBias(events: GameEvent[], boostCategories: EventCategory[]): GameEvent[] {
  if (boostCategories.length === 0) return events;
  const boosted = events.filter((e) => boostCategories.includes(e.category));
  return events.concat(boosted);
}

// 年代ごとに出してよいイベントカテゴリ。ここに無いカテゴリ（恋愛・結婚・離婚・仕事・転職・起業・
// 投資・介護・老後・死亡・宇宙旅行等）は、そのステージでは絶対に選ばれない。
const STAGE_CATEGORY_ALLOWLIST: Record<LifeStage, EventCategory[]> = {
  stage1: ['child', 'family', 'study', 'hobby', 'health', 'friend', 'smallChallenge', 'smallPinch'],
  stage2: ['student', 'study', 'friend', 'club', 'path', 'partTime', 'hobby', 'health', 'love', 'challenge', 'social', 'startup', 'work', 'housing'],
  stage3: [
    'work', 'jobChange', 'love', 'marriage', 'divorce', 'startup', 'investment', 'study', 'health',
    'family', 'childcare', 'hobby', 'social', 'challenge', 'accident', 'illness', 'disaster', 'fraud', 'ai', 'housing',
  ],
  stage4: [
    'work', 'jobChange', 'startup', 'investment', 'family', 'childcare', 'health', 'illness', 'care',
    'social', 'ai', 'marriage', 'divorce', 'death', 'disaster', 'hobby', 'challenge', 'space', 'study', 'housing',
  ],
  stage5: [
    'elder', 'health', 'illness', 'family', 'hobby', 'social', 'care', 'ai', 'space', 'love', 'death',
    'fraud', 'work', 'investment', 'accident', 'disaster', 'retirement', 'grandchild', 'housing',
  ],
  stage6: ['elder', 'health', 'illness', 'family', 'care', 'death', 'ai', 'space', 'endOfLife', 'reflection'],
};

function safeFallbackEvent(id: string, stage: LifeStage, category: EventCategory, title: string, logText: string, effects: StatEffects): GameEvent {
  return {
    id,
    title,
    description: logText,
    ageCategory: stage,
    category,
    squareType: 'normal',
    effects,
    logText,
    rarity: 'common',
  };
}

// 「候補が1件も無い」という万一の事態でも、年代にふさわしくない出来事が出ないようにするための最終セーフティネット。
const SAFE_FALLBACK_EVENTS: Record<LifeStage, GameEvent[]> = {
  stage1: [
    safeFallbackEvent('safe-stage1-1', 'stage1', 'child', '公園で遊んだ', '公園で夢中になって遊んだ。', { happiness: 5 }),
    safeFallbackEvent('safe-stage1-2', 'stage1', 'family', '家族と過ごした', '家族とのんびり過ごした。', { happiness: 5, relationships: 5 }),
    safeFallbackEvent('safe-stage1-3', 'stage1', 'smallChallenge', '新しいことを覚えた', '新しいことに挑戦して覚えた。', { knowledge: 5, actionPower: 5 }),
    safeFallbackEvent('safe-stage1-4', 'stage1', 'friend', '友達と仲直りした', '友達と仲直りして、また仲良くなった。', { relationships: 5, happiness: 5 }),
    safeFallbackEvent('safe-stage1-5', 'stage1', 'smallPinch', '転んだけど立ち上がった', '転んでしまったが、泣かずに立ち上がった。', { mentalStrength: 5, health: -2 }),
  ],
  stage2: [
    safeFallbackEvent('safe-stage2-1', 'stage2', 'path', '将来の夢を考えた', '将来の夢について考えた。', { knowledge: 5, mentalStrength: 5 }),
    safeFallbackEvent('safe-stage2-2', 'stage2', 'club', '部活の仲間と汗を流した', '部活の仲間と一緒に汗を流した。', { health: 5, relationships: 5 }),
    safeFallbackEvent('safe-stage2-3', 'stage2', 'study', 'テスト勉強を頑張った', 'テスト勉強に打ち込んだ。', { knowledge: 10 }),
  ],
  stage3: [
    safeFallbackEvent('safe-stage3-1', 'stage3', 'work', '新しい生活のリズムを整えた', '新しい生活のリズムを整えた。', { health: 5, mentalStrength: 5 }),
    safeFallbackEvent('safe-stage3-2', 'stage3', 'work', '仕事で小さな達成感を得た', '仕事で小さな達成感を得た。', { experience: 5, happiness: 5 }),
  ],
  stage4: [
    safeFallbackEvent('safe-stage4-1', 'stage4', 'family', '家族と仕事のバランスに悩んだ', '家族と仕事のバランスに悩みながら過ごした。', { mentalStrength: -5, relationships: 5 }),
    safeFallbackEvent('safe-stage4-2', 'stage4', 'reflection', 'これまでの人生を振り返った', 'これまでの人生を静かに振り返った。', { knowledge: 5, happiness: 5 }),
  ],
  stage5: [
    safeFallbackEvent('safe-stage5-1', 'stage5', 'social', '地域活動を始めた', '地域の活動に参加するようになった。', { socialContribution: 10, relationships: 5 }),
    safeFallbackEvent('safe-stage5-2', 'stage5', 'health', '穏やかな一日を過ごした', '穏やかな一日を過ごした。', { happiness: 5, health: 5 }),
  ],
  stage6: [
    safeFallbackEvent('safe-stage6-1', 'stage6', 'reflection', '人生を振り返った', '人生をゆっくりと振り返った。', { happiness: 10, knowledge: 5 }),
    safeFallbackEvent('safe-stage6-2', 'stage6', 'family', '穏やかな時間を過ごした', '家族と穏やかな時間を過ごした。', { happiness: 5, mentalStrength: 5 }),
  ],
};

/**
 * マス種類・人生ステージ・世界設定から、抽選対象のイベント1件を選ぶ。
 * 固定イベントデータベースからの抽選ロジック本体。将来AI生成に差し替える際は、
 * この関数の呼び出し口（drawEventForPosition）をgenerateAIEventPlaceholder系に差し替えるだけでよい。
 *
 * 年代にふさわしくない出来事（幼少期の結婚・離婚・投資など）が絶対に出ないよう、
 * 必ず「そのステージで許可されたカテゴリ」かつ「イベント自身のageCategoryがそのステージ」の
 * 両方を満たすイベントだけを候補にする。ステージをまたいだフォールバックは行わない。
 */
export function getEventForSquare(
  stage: LifeStage,
  squareType: SquareType,
  settings: GameSettings,
  chosenRoutes: string[] = [],
): GameEvent {
  const stageAllowedCategories = STAGE_CATEGORY_ALLOWLIST[stage];
  const preferredCategories = SQUARE_TYPE_CATEGORY_MAP[squareType].filter((c) => stageAllowedCategories.includes(c));

  // 1段階目：マス種類が示すカテゴリ ∩ 年代で許可されたカテゴリ ∩ 年代(ageCategory)が完全一致
  const preferredCategoryList = preferredCategories.length > 0 ? preferredCategories : stageAllowedCategories;
  let pool = ALL_EVENTS.filter((e) => e.ageCategory === stage && preferredCategoryList.includes(e.category));
  pool = applySettingsBias(pool, settings);
  // 選んだ人生ルート（chosenRoutes）に応じて、関連カテゴリのイベントを少し出やすくする。
  // stage/categoryの厳密フィルタを通した後の候補内で重複追加するだけなので、年代不一致は絶対に起こらない。
  pool = applyRouteBias(pool, getCategoryBoostsForRoutes(chosenRoutes));

  if (squareType === 'superRare') {
    const superRarePool = pool.filter((e) => e.rarity === 'superRare');
    if (superRarePool.length > 0) pool = superRarePool;
  } else if (squareType === 'chance') {
    const upgradedPool = pool.filter((e) => e.rarity !== 'common');
    if (upgradedPool.length > 0) pool = upgradedPool;
  }

  if (pool.length > 0) return pickRandomEvent(pool);

  // 2段階目：マス種類の指定は無視し、そのステージで許可された全カテゴリ・年代一致のみで再抽選
  const stagePool = ALL_EVENTS.filter((e) => e.ageCategory === stage && stageAllowedCategories.includes(e.category));
  if (stagePool.length > 0) return pickRandomEvent(stagePool);

  // 3段階目：どうしても候補が無い場合の、年代にふさわしい安全な汎用イベント
  return pickRandomEvent(SAFE_FALLBACK_EVENTS[stage]);
}

/**
 * AIイベント生成の差し込み口（プレースホルダー）。
 * Ver.1.0ではまだAI APIを呼ばず、固定データベースの抽選（getEventForSquare）にそのまま委譲する。
 * 将来、ここを非同期のLLM呼び出しに置き換えれば、呼び出し元（drawEventForPosition）は変更不要。
 */
export async function generateAIEventPlaceholder(
  stage: LifeStage,
  squareType: SquareType,
  settings: GameSettings,
): Promise<GameEvent> {
  return getEventForSquare(stage, squareType, settings);
}

export interface DrawnEvent {
  event: GameEvent;
  stage: LifeStage;
  squareType: SquareType;
}

export function drawEventForPosition(position: number, settings: GameSettings, chosenRoutes: string[] = []): DrawnEvent {
  const stage = getBoardStage(position);
  const squareType = getSquareType(position);
  const event = getEventForSquare(stage, squareType, settings, chosenRoutes);
  return { event, stage, squareType };
}

// ---------------------------------------------------------------------------
// プレイヤー初期化・基本操作
// ---------------------------------------------------------------------------

// 0〜100の目安ステータスに使うキー（moneyとexperienceは範囲固定なし）
const CLAMPED_STAT_KEYS: StatKey[] = [
  'health',
  'happiness',
  'knowledge',
  'relationships',
  'freedom',
  'luck',
  'mentalStrength',
  'trust',
  'socialContribution',
  'aiAffinity',
  'actionPower',
];

const INITIAL_STAT_VALUE = 50;
const INITIAL_MONEY = 300; // 単位: 万円
const INITIAL_EXPERIENCE = 0;
const INITIAL_OCCUPATION = '学生';
const INITIAL_ANNUAL_INCOME = 0; // 単位: 万円
const INITIAL_ROMANCE_STATUS = '独身';
const INITIAL_HOUSING_STATUS = '実家暮らし';
const MAX_ANNUAL_INCOME = 3000; // 単位: 万円。極端な値で表示が壊れないよう上限を設ける

// 年齢差によるスタート補正のパラメータ（将来チューニングしやすいよう定数化）
// 最年長プレイヤーとの年齢差が大きい（=年下の）プレイヤーほど、
// 序盤で足並みを揃えられるよう初期マスと初期経験値にボーナスを付与する。
const AGE_HANDICAP_POSITION_DIVISOR = 8; // 年齢差8歳ごとに1マス前進ボーナス
const AGE_HANDICAP_MAX_POSITION_BONUS = 6;
const AGE_HANDICAP_EXPERIENCE_PER_YEAR = 2;

export function calculateAge(birthDate: string, today: Date = new Date()): number {
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age -= 1;
  }
  return Math.max(0, age);
}

function createId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * プレイヤー入力から初期プレイヤー状態を作成する。
 * 最年長プレイヤーを基準に、年齢差に応じた初期マス・初期経験値の補正を行う。
 */
export function initializePlayers(inputs: PlayerSetupInput[]): Player[] {
  const ages = inputs.map((input) => calculateAge(input.birthDate));
  const oldestAge = Math.max(...ages);

  return inputs.map((input, index) => {
    const realAge = ages[index];
    const ageDiff = Math.max(0, oldestAge - realAge);
    const positionBonus = Math.min(
      Math.floor(ageDiff / AGE_HANDICAP_POSITION_DIVISOR),
      AGE_HANDICAP_MAX_POSITION_BONUS,
    );
    const experienceBonus = ageDiff * AGE_HANDICAP_EXPERIENCE_PER_YEAR;

    // 盤面は0〜100マス（1マス＝1歳）で人生全体（幼少期〜老後）を表すため、盤面上の「年齢」は
    // プレイヤーの実年齢ではなく、マス位置（＝人生の進み具合）と連動させる。
    // 実年齢はスタート補正（初期マス・初期経験値）の算出だけに使う。
    const player: Player = {
      id: createId('player'),
      name: input.name.trim(),
      birthDate: input.birthDate,
      age: positionBonus,
      position: positionBonus,
      money: INITIAL_MONEY,
      health: INITIAL_STAT_VALUE,
      happiness: INITIAL_STAT_VALUE,
      knowledge: INITIAL_STAT_VALUE,
      relationships: INITIAL_STAT_VALUE,
      freedom: INITIAL_STAT_VALUE,
      experience: INITIAL_EXPERIENCE + experienceBonus,
      luck: INITIAL_STAT_VALUE,
      mentalStrength: INITIAL_STAT_VALUE,
      trust: INITIAL_STAT_VALUE,
      socialContribution: INITIAL_STAT_VALUE,
      aiAffinity: INITIAL_STAT_VALUE,
      actionPower: INITIAL_STAT_VALUE,
      lifeLogs: [],
      finished: false,
      chosenRoutes: [],
      occupation: INITIAL_OCCUPATION,
      annualIncome: INITIAL_ANNUAL_INCOME,
      romanceStatus: INITIAL_ROMANCE_STATUS,
      housingStatus: INITIAL_HOUSING_STATUS,
    };
    return player;
  });
}

/** 所持金から資産ランクを判定する（表示専用の派生値。Playerには保存しない）。 */
export function calculateAssetRank(money: number): string {
  if (money < 100) return 'ランクD（節約生活）';
  if (money < 500) return 'ランクC（一般市民）';
  if (money < 1500) return 'ランクB（ゆとり世帯）';
  if (money < 5000) return 'ランクA（富裕層）';
  return 'ランクS（資産家）';
}

export function rollDice(): number {
  return Math.floor(Math.random() * 6) + 1;
}

export function movePlayerPosition(
  position: number,
  roll: number,
  boardSize: number = BOARD_SIZE,
): { position: number; finished: boolean } {
  const nextPosition = position + roll;
  if (nextPosition >= boardSize - 1) {
    return { position: boardSize - 1, finished: true };
  }
  return { position: nextPosition, finished: false };
}

function clampStat(key: StatKey, value: number): number {
  if (CLAMPED_STAT_KEYS.includes(key)) {
    return Math.min(100, Math.max(0, value));
  }
  return Math.max(0, value);
}

export function applyEffectsToPlayer(player: Player, effects: StatEffects): Player {
  const updated: Player = { ...player };
  (Object.keys(effects) as StatKey[]).forEach((key) => {
    const delta = effects[key] ?? 0;
    updated[key] = clampStat(key, updated[key] + delta);
  });
  return updated;
}

/**
 * 職業・年収・恋愛家族状況・住居の変化を適用する。数値ステータス（StatKey）とは別枠のため、
 * calculateFinalScore・称号判定・卒業判定など既存のスコア計算には一切影響しない。
 */
export function applyStatusEffectsToPlayer(player: Player, statusEffects?: StatusEffects): Player {
  if (!statusEffects) return player;
  const updated: Player = { ...player };
  if (statusEffects.occupation !== undefined) updated.occupation = statusEffects.occupation;
  if (statusEffects.romanceStatus !== undefined) updated.romanceStatus = statusEffects.romanceStatus;
  if (statusEffects.housingStatus !== undefined) updated.housingStatus = statusEffects.housingStatus;
  if (statusEffects.annualIncomeDelta !== undefined) {
    updated.annualIncome = Math.min(
      MAX_ANNUAL_INCOME,
      Math.max(0, updated.annualIncome + statusEffects.annualIncomeDelta),
    );
  }
  return updated;
}

const UNLUCKY_LEANING_CATEGORIES: EventCategory[] = [
  'illness',
  'accident',
  'disaster',
  'fraud',
  'divorce',
  'death',
  'smallPinch',
  'care',
];

function sumEffectValues(effects: StatEffects): number {
  return (Object.keys(effects) as StatKey[]).reduce((sum, key) => sum + (effects[key] ?? 0), 0);
}

/**
 * イベントの「性格」（EventType）を判定する。明示的に指定されていればそれを優先し、
 * 未指定の既存イベントは内容（選択肢の有無・マス種類・カテゴリ・効果の符号）から推測する。
 */
export function getEventType(event: GameEvent): EventType {
  if (event.eventType) return event.eventType;
  if (event.choices && event.choices.length > 0) return 'choice';
  if (event.squareType === 'turningPoint') return 'turningPoint';
  if (event.futureTag || event.category === 'ai' || event.category === 'space') return 'nearFuture';
  if (UNLUCKY_LEANING_CATEGORIES.includes(event.category)) return 'unlucky';
  const net = sumEffectValues(event.effects);
  if (event.rarity !== 'common' && net >= 0) return 'lucky';
  if (net < 0) return 'unlucky';
  return 'growth';
}

export function deriveImportance(rarity: Rarity): LogImportance {
  if (rarity === 'superRare') return 'critical';
  if (rarity === 'rare') return 'high';
  return 'normal';
}

export function appendLifeLog(
  player: Player,
  entry: Omit<LifeLogEntry, 'id'>,
): Player {
  const logEntry: LifeLogEntry = { ...entry, id: createId('log') };
  return { ...player, lifeLogs: [...player.lifeLogs, logEntry] };
}

/**
 * 人生ログを「〇歳：〇〇した」という定型文にする。
 * 将来の人生新聞・年表機能でもそのまま使い回せるよう、文言生成をここに集約している。
 */
export function formatLifeLogHeadline(entry: LifeLogEntry): string {
  return `${entry.age}歳：${entry.eventTitle}`;
}

/** 現在のプレイヤーの次に手番を回すべき、まだ人生が終わっていないプレイヤーのインデックスを返す。全員終了していれば-1。 */
export function findNextActivePlayerIndex(players: Player[], currentIndex: number): number {
  for (let offset = 1; offset <= players.length; offset += 1) {
    const candidateIndex = (currentIndex + offset) % players.length;
    if (!players[candidateIndex].finished) {
      return candidateIndex;
    }
  }
  return -1;
}

export function isGameFinished(players: Player[]): boolean {
  return players.every((player) => player.finished);
}

// ---------------------------------------------------------------------------
// スコア・人生タイプ・称号
// ---------------------------------------------------------------------------

export const STAT_SCORE_WEIGHT: Record<StatKey, number> = {
  money: 1 / 20, // 万円単位を他ステータスと同程度の目盛りに換算
  health: 1,
  happiness: 1,
  knowledge: 1,
  relationships: 1,
  freedom: 1,
  experience: 1,
  luck: 1,
  mentalStrength: 1,
  trust: 1,
  socialContribution: 1,
  aiAffinity: 1,
  actionPower: 1,
};

export function calculateFinalScore(player: Player): number {
  const statScore = (Object.keys(STAT_SCORE_WEIGHT) as StatKey[]).reduce((sum, key) => {
    return sum + player[key] * STAT_SCORE_WEIGHT[key];
  }, 0);
  const lifeLogBonus = Math.min(player.lifeLogs.length, 20) * 2;
  return Math.round(statScore + lifeLogBonus);
}

export interface LifeType {
  name: string;
  headline: string;
}

// 波乱万丈タイプの判定に使う「人生の危機」系カテゴリ
const CRISIS_CATEGORIES: EventCategory[] = ['illness', 'accident', 'disaster', 'fraud', 'divorce', 'death'];

interface LifeTypeDefinition {
  name: string;
  headline: string;
  weights?: StatEffects;
  score?: (player: Player) => number;
}

/**
 * 最終ステータスから「人生タイプ」を判定するための簡易ヒューリスティック。
 * 各タイプは関連の深いステータスの加重合計で得点化し、最も高いものを採用する。
 * 「波乱万丈タイプ」だけは人生ログの中身（危機イベントの数）から直接判定する。
 * 将来AIによる総括生成に差し替える場合も、この定義をヒントとして利用できる。
 */
const LIFE_TYPE_DEFINITIONS: LifeTypeDefinition[] = [
  {
    name: '挑戦者タイプ',
    headline: '挑戦と経験にあふれた人生でした',
    weights: { experience: 1, actionPower: 0.5 },
  },
  {
    name: '家族重視タイプ',
    headline: '人とのつながりを大切にした人生でした',
    weights: { relationships: 1, happiness: 0.3 },
  },
  {
    name: '自由人タイプ',
    headline: '自分らしい自由な人生でした',
    weights: { freedom: 1, luck: 0.2 },
  },
  {
    name: '堅実タイプ',
    headline: '着実に築き上げた安定の人生でした',
    weights: { money: 1, trust: 0.4 },
  },
  {
    name: '知識探求タイプ',
    headline: '学びにあふれた人生でした',
    weights: { knowledge: 1, mentalStrength: 0.2 },
  },
  {
    name: '社会貢献タイプ',
    headline: '人や社会のために力を尽くした人生でした',
    weights: { socialContribution: 1, relationships: 0.3 },
  },
  {
    name: '近未来適応タイプ',
    headline: 'AIとともに新しい時代を生き抜いた人生でした',
    weights: { aiAffinity: 1, knowledge: 0.3 },
  },
  {
    name: '波乱万丈タイプ',
    headline: '波乱に満ちた、忘れられない人生でした',
    score: (player) =>
      Math.min(player.lifeLogs.filter((log) => CRISIS_CATEGORIES.includes(log.category)).length, 10) * 18,
  },
];

function scoreLifeTypeDefinition(definition: LifeTypeDefinition, player: Player): number {
  if (definition.score) return definition.score(player);
  const weights = definition.weights ?? {};
  return (Object.keys(weights) as StatKey[]).reduce((sum, key) => {
    const weight = weights[key] ?? 0;
    return sum + player[key] * STAT_SCORE_WEIGHT[key] * weight;
  }, 0);
}

export function calculateLifeType(player: Player): LifeType {
  let best = LIFE_TYPE_DEFINITIONS[0];
  let bestScore = -Infinity;

  LIFE_TYPE_DEFINITIONS.forEach((definition) => {
    const score = scoreLifeTypeDefinition(definition, player);
    if (score > bestScore) {
      bestScore = score;
      best = definition;
    }
  });

  return { name: best.name, headline: best.headline };
}

// 称号：最終ステータスの中で最も高い1項目から決める、人生タイプとは別軸の一言肩書き。
const TITLE_BY_STAT: Record<StatKey, string> = {
  money: '資産家',
  health: '健康の達人',
  happiness: '幸せ発見の名人',
  knowledge: '知の探究者',
  relationships: 'みんなの人気者',
  freedom: '自由な旅人',
  experience: '百戦錬磨の挑戦者',
  luck: '幸運の持ち主',
  mentalStrength: '不屈の精神の持ち主',
  trust: '信頼の人',
  socialContribution: '社会の恩人',
  aiAffinity: 'AIと生きる者',
  actionPower: '行動の人',
};

export function calculateTitle(player: Player): string {
  let bestKey: StatKey = 'happiness';
  let bestValue = -Infinity;

  STAT_KEYS.forEach((key) => {
    const normalized = player[key] * STAT_SCORE_WEIGHT[key];
    if (normalized > bestValue) {
      bestValue = normalized;
      bestKey = key;
    }
  });

  return TITLE_BY_STAT[bestKey];
}

function weightedNetEffect(effects: StatEffects): number {
  return (Object.keys(effects) as StatKey[]).reduce((sum, key) => {
    return sum + (effects[key] ?? 0) * STAT_SCORE_WEIGHT[key];
  }, 0);
}

const IMPORTANCE_RANKING_BONUS: Record<LogImportance, number> = {
  normal: 0,
  high: 8,
  critical: 15,
};

/** 人生のベストイベント（プラスの影響が大きかった順）を取得する。
 * 節目イベント（重要度critical）は多少効果が小さくても選ばれやすいよう、重要度ボーナスを加味する。 */
export function getBestLifeLogs(player: Player, count = 3): LifeLogEntry[] {
  return [...player.lifeLogs]
    .sort(
      (a, b) =>
        weightedNetEffect(b.effects) + IMPORTANCE_RANKING_BONUS[b.importance] -
        (weightedNetEffect(a.effects) + IMPORTANCE_RANKING_BONUS[a.importance]),
    )
    .slice(0, count);
}

/** 人生のピンチイベント（マイナスの影響が大きかった順）を取得する。 */
export function getWorstLifeLogs(player: Player, count = 3): LifeLogEntry[] {
  return [...player.lifeLogs].sort((a, b) => weightedNetEffect(a.effects) - weightedNetEffect(b.effects)).slice(0, count);
}

/**
 * 一言総括の生成（プレースホルダー）。
 * Ver.1.0では固定テンプレートで組み立てるが、将来はここをAI生成に差し替える想定。
 */
export function generateLifeSummaryPlaceholder(player: Player): string {
  const type = calculateLifeType(player);
  const title = calculateTitle(player);
  return `${player.name}さんは「${title}」として、${type.headline}`;
}

const ROUTE_NARRATIVE_CHALLENGE_CATEGORIES: EventCategory[] = ['challenge', 'startup'];
const ROUTE_NARRATIVE_WARM_CATEGORIES: EventCategory[] = ['family', 'childcare', 'care', 'health', 'illness', 'social', 'friend'];
const ROUTE_NARRATIVE_AI_CATEGORIES: EventCategory[] = ['ai'];
const ROUTE_NARRATIVE_STUDY_CATEGORIES: EventCategory[] = ['study'];

/**
 * 選んだ人生ルートの傾向から、その人の人生観を一言で表す（プレースホルダー）。
 * Ver.1.0では固定テンプレートで組み立てるが、将来はここをAI生成に差し替える想定。
 */
export function generateRouteNarrative(player: Player): string {
  if (player.chosenRoutes.length === 0) {
    return 'まだ人生の分岐点を選んでいません。';
  }

  const boosts = getCategoryBoostsForRoutes(player.chosenRoutes);
  const countIn = (categories: EventCategory[]) => boosts.filter((b) => categories.includes(b)).length;

  const candidates = [
    { text: '安定よりも挑戦を選び続けた人生でした。', score: countIn(ROUTE_NARRATIVE_CHALLENGE_CATEGORIES) },
    { text: '家族と健康を大切にした、穏やかで温かい人生でした。', score: countIn(ROUTE_NARRATIVE_WARM_CATEGORIES) },
    { text: 'AI時代の変化に適応し続けた、近未来型の人生でした。', score: countIn(ROUTE_NARRATIVE_AI_CATEGORIES) },
    { text: '学びを重ね、知識を深め続けた人生でした。', score: countIn(ROUTE_NARRATIVE_STUDY_CATEGORIES) },
  ];

  const best = candidates.reduce((a, b) => (b.score > a.score ? b : a));
  if (best.score === 0) return '自分らしい選択を重ねた人生でした。';
  return best.text;
}

const REPLAY_SUGGESTIONS: { routeId: string; text: string }[] = [
  { routeId: 'work-startup', text: '次は起業ルートを選んでみる？' },
  { routeId: 'second-health', text: '今度は健康重視の人生を試してみよう。' },
  { routeId: 'work-ai', text: 'AI適応型の人生も体験してみよう。' },
  { routeId: 'turning-family', text: '家族重視ルートでは違う結末になるかもしれません。' },
];

/** 「もう一度遊びたくなる」ための、次回プレイへの一言提案（プレースホルダー）。 */
export function generateReplaySuggestion(player: Player): string {
  const candidate = REPLAY_SUGGESTIONS.find((s) => !player.chosenRoutes.includes(s.routeId));
  return candidate?.text ?? 'また違うルートを選んで、新しい人生の結末を見つけてみましょう。';
}

// ---------------------------------------------------------------------------
// 人生新聞プレビュー（10年ごとの見出し）
// ---------------------------------------------------------------------------

export interface DecadeSummary {
  decadeLabel: string;
  logs: LifeLogEntry[];
  headline: string;
}

/**
 * 10年ごとの見出し生成（プレースホルダー）。
 * Ver.1.0では固定テンプレートで組み立てるが、将来はここをAI生成に差し替える想定。
 */
// 転職・結婚・起業・大きな投資成功/失敗・家族の変化・重要な健康イベントなど「人生の転機」は、
// 数値的な影響が小さくても見出しに選ばれやすいよう優先度を上げる。
const EVENT_TYPE_HEADLINE_BONUS: Partial<Record<LifeLogEntry['eventType'], number>> = {
  turningPoint: 20,
  choice: 8,
};

function newspaperHeadlinePriority(log: LifeLogEntry): number {
  return (
    Math.abs(weightedNetEffect(log.effects)) +
    IMPORTANCE_RANKING_BONUS[log.importance] +
    (EVENT_TYPE_HEADLINE_BONUS[log.eventType] ?? 0)
  );
}

export function generateNewspaperHeadlinePlaceholder(logs: LifeLogEntry[]): string {
  if (logs.length === 0) {
    return 'これといった出来事のない、穏やかな10年でした。';
  }

  const sorted = [...logs].sort((a, b) => newspaperHeadlinePriority(b) - newspaperHeadlinePriority(a));
  const topCategories = Array.from(new Set(sorted.slice(0, 2).map((log) => EVENT_CATEGORY_LABELS[log.category])));
  const netTotal = logs.reduce((sum, log) => sum + weightedNetEffect(log.effects), 0);
  const tone = netTotal >= 15 ? '飛躍の10年でした' : netTotal <= -15 ? '試練の多い10年でした' : '転機が重なった10年でした';

  return `${topCategories.join('と')}が重なった、${tone}`;
}

export function buildNewspaperSummaries(player: Player): DecadeSummary[] {
  const groups = new Map<number, LifeLogEntry[]>();
  player.lifeLogs.forEach((log) => {
    const decade = Math.floor(log.age / 10) * 10;
    if (!groups.has(decade)) groups.set(decade, []);
    groups.get(decade)!.push(log);
  });

  return Array.from(groups.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([decade, logs]) => ({
      decadeLabel: `${decade}代`,
      logs,
      headline: generateNewspaperHeadlinePlaceholder(logs),
    }));
}

export interface RankedPlayer {
  player: Player;
  score: number;
  rank: number;
}

export function rankPlayers(players: Player[]): RankedPlayer[] {
  const scored = players
    .map((player) => ({ player, score: calculateFinalScore(player) }))
    .sort((a, b) => b.score - a.score);

  return scored.map((entry, index) => ({ ...entry, rank: index + 1 }));
}

// ---------------------------------------------------------------------------
// 人生の卒業（老後の霧マップ・卒業エンド）
// ---------------------------------------------------------------------------
// 80歳（=盤面position80）以降、老後・近未来エリアは固定ゴールを持たない。
// ターンごとに確率判定を行い、ステータスに応じて選ばれた理由で「人生の卒業」を迎える。
// 盤面の物理的な終端（position 100＝100歳）に達した場合も、その時点で強制的に卒業扱いにする。

export const ELDER_GRADUATION_START_AGE = 80;

export const GRADUATION_REASONS: GraduationReason[] = [
  {
    id: 'natural',
    label: '老衰',
    title: '長い旅の終わり',
    body: 'あなたは多くの経験を重ね、静かに人生を卒業しました。',
  },
  {
    id: 'illness',
    label: '病気',
    title: '人生の卒業',
    body: '病と向き合いながらも、最後まで自分らしく生き抜きました。',
  },
  {
    id: 'accident',
    label: '事故',
    title: '人生の卒業',
    body: '突然の出来事でしたが、悔いのない人生を歩んできました。',
  },
  {
    id: 'quiet',
    label: '静かな旅立ち',
    title: '静かな旅立ち',
    body: '静かに、穏やかに、人生の幕を閉じました。',
  },
  {
    id: 'family',
    label: '家族に見守られて卒業',
    title: '人生の卒業',
    body: '家族や仲間に見守られながら、人生の幕を閉じました。',
  },
  {
    id: 'challenge',
    label: '挑戦の途中で卒業',
    title: '最終章',
    body: '最後まで挑戦を続けた人生でした。',
  },
  {
    id: 'longevity',
    label: '長寿をまっとうして卒業',
    title: '最終章',
    body: '長いセカンドライフを楽しみ、穏やかに卒業しました。',
  },
  // 80歳未満でも、低確率で起こりうる「人生終了」イベント用の理由。
  // 理不尽で嫌な印象にならないよう、老後の卒業と同じく静かで品のある言葉を選んでいる。
  {
    id: 'earlyAccident',
    label: '不慮の事故',
    title: '人生の卒業',
    body: '突然の出来事により、志半ばで人生の幕を閉じることになりました。それでも、積み重ねてきた日々は確かなものでした。',
  },
  {
    id: 'earlyIllness',
    label: '病気',
    title: '人生の卒業',
    body: '病と向き合う日々の中で、静かに人生の幕を閉じました。短い時間の中にも、たしかな輝きがありました。',
  },
  {
    id: 'earlyDisaster',
    label: '災害',
    title: '人生の卒業',
    body: '思いがけない災害により、人生の幕を閉じることになりました。あなたが歩んできた道のりは、確かにここにありました。',
  },
];

export function getGraduationReason(id: string): GraduationReason {
  return GRADUATION_REASONS.find((r) => r.id === id) ?? GRADUATION_REASONS[3];
}

/** 80歳未満の「人生終了」イベントが発生した際、イベントのカテゴリに応じた理由を選ぶ。 */
export function pickEarlyEndingReason(category: EventCategory): GraduationReason {
  if (category === 'illness') return getGraduationReason('earlyIllness');
  if (category === 'disaster') return getGraduationReason('earlyDisaster');
  return getGraduationReason('earlyAccident');
}

/** 年代（80歳〜）とステータスから、その回の「卒業確率」を計算する。 */
function calculateGraduationChance(player: Player, age: number, settings: GameSettings): number {
  if (age < ELDER_GRADUATION_START_AGE) return 0;

  let base: number;
  if (age <= 84) base = 0.05;
  else if (age <= 89) base = 0.12;
  else if (age <= 94) base = 0.25;
  else if (age <= 99) base = 0.4;
  else base = 0.55 + Math.min(0.3, (age - 100) * 0.02); // 100歳以降は年々じわじわ上がるが90%を超えない

  // 健康が高いほど確率は下がり、低いほど上がる（50を基準に±）。
  const healthFactor = 1 - (player.health - 50) / 150;
  let chance = base * Math.max(0.4, healthFactor);

  // 長寿モードでは卒業確率を少し下げる。
  if (settings.longevityMode === 'longevity') {
    chance *= 0.7;
  }

  return Math.min(0.9, Math.max(0.02, chance));
}

/** 卒業理由を、プレイヤーのステータスに応じた重み付きランダムで選ぶ。 */
function pickGraduationReason(player: Player, age: number): GraduationReason {
  const weights: Record<string, number> = {
    natural: (age >= 90 ? 3 : 0.5) + player.health / 40,
    illness: Math.max(0.2, (100 - player.health) / 30),
    accident: Math.max(0.2, (100 - player.luck) / 40),
    quiet: 1 + player.happiness / 60,
    family: player.relationships / 25,
    challenge: player.actionPower / 30 + player.experience / 150,
    longevity: age >= 100 ? 2 + player.health / 30 : 0.1,
  };

  const total = Object.values(weights).reduce((sum, w) => sum + w, 0);
  let roll = Math.random() * total;
  for (const reason of GRADUATION_REASONS) {
    roll -= weights[reason.id] ?? 0;
    if (roll <= 0) return reason;
  }
  return GRADUATION_REASONS[GRADUATION_REASONS.length - 1];
}

/**
 * 80歳以降、ターンごとに呼び出す卒業判定。卒業しない場合はnullを返す。
 * 完全なランダムではなく、健康・幸福度・人間関係・運などのステータスを反映する。
 */
export function rollGraduationCheck(player: Player, age: number, settings: GameSettings): GraduationReason | null {
  const chance = calculateGraduationChance(player, age, settings);
  if (Math.random() >= chance) return null;
  return pickGraduationReason(player, age);
}

/** 盤面の物理的な終端（最終マス）に達したときの、強制的な卒業理由。 */
export function forcedGraduationAtBoardEnd(player: Player): GraduationReason {
  return player.health >= 60 ? getGraduationReason('longevity') : getGraduationReason('natural');
}

/** セカンドライフ（老後）をどれだけ楽しめたかを表す簡易スコア（0〜100）。 */
export function calculateSecondLifeScore(player: Player): number {
  return Math.round((player.happiness + player.health + player.relationships) / 3);
}

/**
 * 最終レポート用の、卒業にまつわる一言総括（プレースホルダー）。
 * Ver.1.0では固定テンプレートで組み立てるが、将来はここをAI生成に差し替える想定。
 */
export function generateGraduationSummary(player: Player): string {
  if (player.graduationAge === undefined || !player.graduationReasonId) {
    return `${player.name}さんの人生は、まだ途中です。`;
  }
  const reason = getGraduationReason(player.graduationReasonId);
  const type = calculateLifeType(player);
  return `あなたは${player.graduationAge}歳で、${reason.label}で人生を卒業しました。${type.headline}`;
}

/**
 * 最終レポートの「最後の章」用の、少し物語的な一段落（プレースホルダー）。
 * Ver.1.0では固定テンプレートで組み立てるが、将来はここをAI生成に差し替える想定。
 */
export function generateFinalChapter(player: Player, lastEventHeadline?: string): string {
  if (player.graduationAge === undefined || !player.graduationReasonId) {
    return `${player.name}さんの物語は、まだ続いています。`;
  }
  const reason = getGraduationReason(player.graduationReasonId);
  const secondLifeScore = calculateSecondLifeScore(player);
  const secondLifeLabel = secondLifeScore >= 75 ? '実り多い' : secondLifeScore >= 50 ? '穏やかな' : '静かな';
  const lastEventPart = lastEventHeadline ? `${lastEventHeadline}のあと、` : '';
  return `${lastEventPart}${reason.body}${secondLifeLabel}セカンドライフを経て、${player.graduationAge}歳で静かに物語の幕を閉じました。`;
}

export function createInitialGameState(): GameState {
  return {
    phase: 'title',
    players: [],
    settings: DEFAULT_GAME_SETTINGS,
    currentPlayerIndex: 0,
    boardSize: BOARD_SIZE,
    turnCount: 0,
    lastRoll: null,
    activeEvent: null,
    activePlayerIdForEvent: null,
    pendingResult: null,
    pendingBranchChoice: null,
    pendingGraduation: null,
    showLifeLog: false,
    showNewspaper: false,
  };
}

