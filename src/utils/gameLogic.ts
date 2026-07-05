import { ALL_EVENTS, pickRandomEvent } from '../data/boardEvents';
import { getCategoryBoostsForRoutes } from '../data/branchRoutes';
import { DEFAULT_ERA } from '../data/eras';
import { getBaseDeathChance } from '../data/lifespanSettings';
import { DEFAULT_CHARACTER_ID } from '../data/playerCharacters';
import type {
  EraId,
  EventCategory,
  EventType,
  FateInfluenceStat,
  FateOutcome,
  GameEvent,
  GameSettings,
  GameState,
  GraduationReason,
  LifeLogEntry,
  LifeStage,
  LogImportance,
  PendingEventResult,
  PersonalityTrait,
  Player,
  PlayerSetupInput,
  Rarity,
  SquareType,
  StatEffects,
  StatKey,
  StatusEffects,
} from '../types/game';
import { STAT_KEYS } from '../types/game';

// 「1マス＝1歳」で統一：position 0（0歳・誕生）〜position 150（150歳）の151マス構成。
export const BOARD_SIZE = 151;

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
  fortune: '幸運チャンス',
  memory: '思い出',
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

// ---------------------------------------------------------------------------
// 個性・才能（ゲーム開始時にランダムで1つ付与。人生の方向性に少しだけ影響する）
// ---------------------------------------------------------------------------

interface PersonalityDefinition {
  label: string;
  icon: string;
  description: string;
  // 初期ステータスへのごく小さな補正（強すぎる能力差にならないよう1項目・小幅のみ）。
  statBonus: StatEffects;
}

export const PERSONALITY_TRAITS: Record<PersonalityTrait, PersonalityDefinition> = {
  curious: { label: '好奇心旺盛', icon: '🔍', description: '新しいことに目がない性格。', statBonus: { knowledge: 5 } },
  steady: { label: 'コツコツ型', icon: '🐢', description: '地道な努力を積み重ねるのが得意。', statBonus: { mentalStrength: 5 } },
  popular: { label: '人望がある', icon: '🌟', description: '自然と周りに人が集まる。', statBonus: { relationships: 5 } },
  healthy: { label: '体が丈夫', icon: '💪', description: '生まれつき体が丈夫。', statBonus: { health: 5 } },
  artistic: { label: '芸術センス', icon: '🎨', description: '感性豊かで表現が得意。', statBonus: { happiness: 5 } },
  analytical: { label: '数字に強い', icon: '📊', description: '論理的に考えるのが得意。', statBonus: { luck: 5 } },
  techLover: { label: '技術が好き', icon: '🤖', description: '新しい技術にすぐ馴染む。', statBonus: { aiAffinity: 5 } },
  familyOriented: { label: '家族思い', icon: '👨‍👩‍👧', description: '家族との時間を大切にする。', statBonus: { relationships: 5 } },
  competitive: { label: '勝負強い', icon: '🔥', description: 'ここぞという時に力を発揮する。', statBonus: { actionPower: 5 } },
  cautious: { label: '慎重派', icon: '🛡️', description: '石橋を叩いて渡るタイプ。', statBonus: { trust: 5 } },
};

const PERSONALITY_TRAIT_KEYS = Object.keys(PERSONALITY_TRAITS) as PersonalityTrait[];

export function pickRandomPersonality(): PersonalityTrait {
  return PERSONALITY_TRAIT_KEYS[Math.floor(Math.random() * PERSONALITY_TRAIT_KEYS.length)];
}

/** 個性を人生フラグ表記にする（イベントのrequiredFlags/excludedFlagsで参照するため）。 */
export function personalityFlag(trait: PersonalityTrait): string {
  return `personality:${trait}`;
}

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

export interface LongevityBadge {
  icon: string;
  label: string;
}

// 「同じ年齢でも時代によって意味合いが変わる」ことを表す控えめな追加表示。
// 各時代の「中心的な人生終了年齢帯」より年上になった時にだけ出現し、通常の人生ステージ表示に
// 上乗せする形で使う（80歳未満・各時代の通常範囲内では null を返し、既存表示のままにする）。
const LONGEVITY_BADGE_TIERS: Record<EraId, { minAge: number; icon: string; label: string }[]> = {
  showa: [
    { minAge: 150, icon: '🏁', label: '人生の最終章' },
    { minAge: 123, icon: '🌟', label: '人類最高齢級' },
    { minAge: 120, icon: '✨', label: '昭和の伝説的長寿' },
    { minAge: 100, icon: '📖', label: '極めて稀な長寿' },
    { minAge: 80, icon: '🌿', label: '長寿期' },
  ],
  present: [
    { minAge: 150, icon: '🏁', label: '人生の最終章' },
    { minAge: 123, icon: '🌟', label: '人類最高齢級' },
    { minAge: 120, icon: '✨', label: '超長寿クラス' },
    { minAge: 100, icon: '📖', label: '長寿期' },
  ],
  future: [
    { minAge: 150, icon: '🏁', label: '人生の最終章' },
    { minAge: 123, icon: '🌟', label: '人類最高齢更新ルート' },
    { minAge: 120, icon: '✨', label: '超長寿クラス' },
  ],
};

/** 年齢・時代から、控えめな「長寿の節目」バッジを返す（該当なしは null＝通常の人生ステージ表示のまま）。 */
export function getLongevityBadge(age: number, era: EraId): LongevityBadge | null {
  const tier = LONGEVITY_BADGE_TIERS[era].find((t) => age >= t.minAge);
  return tier ? { icon: tier.icon, label: tier.label } : null;
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
// gradientは半透明（alpha 0.5）にしてあり、下に敷かれる時代別背景（game-board__era-backdrop等）が
// ほんのり透けて見えるようにしている（マス自体は不透明色なので視認性には影響しない）。
export const BOARD_STAGE_THEMES: BoardStageTheme[] = [
  {
    id: 'stage1',
    title: '幼少期エリア',
    ageRangeLabel: '0〜12歳',
    gradient: 'linear-gradient(135deg, rgba(217,245,223,0.5) 0%, rgba(216,236,251,0.5) 100%)',
    decorations: ['🌳', '🏡', '🛝', '🦋', '☀️'],
  },
  {
    id: 'stage2',
    title: '学生時代エリア',
    ageRangeLabel: '13〜22歳',
    gradient: 'linear-gradient(135deg, rgba(255,224,236,0.5) 0%, rgba(219,233,255,0.5) 100%)',
    decorations: ['🌸', '🏫', '📚', '⚽', '🎒'],
  },
  {
    id: 'stage3',
    title: '若者・社会人前半エリア',
    ageRangeLabel: '23〜39歳',
    gradient: 'linear-gradient(135deg, rgba(214,243,247,0.5) 0%, rgba(231,235,238,0.5) 100%)',
    decorations: ['🚉', '🏢', '☕', '🏙️', '💼'],
  },
  {
    id: 'stage4',
    title: '人生の転機エリア',
    ageRangeLabel: '40〜59歳',
    gradient: 'linear-gradient(135deg, rgba(255,223,184,0.5) 0%, rgba(255,233,214,0.5) 100%)',
    decorations: ['🌇', '🏘️', '🏥', '👨‍👩‍👧', '🔀'],
  },
  {
    id: 'stage5',
    title: 'セカンドライフエリア',
    ageRangeLabel: '60〜79歳',
    gradient: 'linear-gradient(135deg, rgba(234,242,200,0.5) 0%, rgba(227,243,218,0.5) 100%)',
    decorations: ['🌾', '🚜', '✈️', '🎣', '👵'],
  },
  {
    id: 'stage6',
    title: '老後・近未来エリア',
    ageRangeLabel: '80歳〜',
    gradient: 'linear-gradient(135deg, rgba(230,220,247,0.5) 0%, rgba(217,228,251,0.5) 100%)',
    decorations: ['🌌', '🤖', '🚀', '🏙️', '✨'],
  },
];

// stage3以降は、時代によって盤面の装飾アイコンを一部差し替える（現代編はスマホ・生活寄り、
// 近未来編はAI・ロボット・宇宙寄り）。見た目だけの差分なので、指定しなければ元の装飾のまま。
const STAGE_DECORATIONS_BY_ERA: Partial<Record<LifeStage, Record<EraId, string[]>>> = {
  stage1: {
    present: ['👶', '🏠', '🧸', '🎈', '📺'],
    future: ['👶', '🏠', '🧸', '🎈', '🤖'],
    showa: ['🏠', '🧸', '🚲', '🍡', '📻'],
  },
  stage2: {
    present: ['🏫', '📱', '⚽', '🎒', '📚'],
    future: ['🏫', '🤖', '⚽', '🎒', '📚'],
    showa: ['🏫', '📻', '⚾', '🎒', '🚲'],
  },
  stage3: {
    present: ['🚉', '🏢', '📱', '☕', '💼'],
    future: ['🚉', '🏢', '🤖', '🏙️', '💼'],
    showa: ['🚉', '🏭', '☎️', '🏪', '💼'],
  },
  stage4: {
    present: ['🌇', '🏘️', '🏥', '👨‍👩‍👧', '💻'],
    future: ['🌇', '🏘️', '🤖', '👨‍👩‍👧', '🚀'],
    showa: ['🏘️', '📺', '🚗', '👨‍👩‍👧', '🏢'],
  },
  stage5: {
    present: ['🌾', '🚜', '✈️', '🎣', '👵'],
    future: ['🌌', '🤖', '✈️', '🎣', '👵'],
    showa: ['🌾', '📷', '🍵', '🎣', '👵'],
  },
  stage6: {
    present: ['🏡', '🩺', '📔', '🏙️', '✨'],
    future: ['🌌', '🤖', '🚀', '🧬', '✨'],
    showa: ['🏡', '🩺', '📔', '🎎', '✨'],
  },
};

export function getBoardStageTheme(stage: LifeStage, era?: EraId): BoardStageTheme {
  const theme = BOARD_STAGE_THEMES.find((t) => t.id === stage) ?? BOARD_STAGE_THEMES[0];
  const eraDecorations = era ? STAGE_DECORATIONS_BY_ERA[stage]?.[era] : undefined;
  return eraDecorations ? { ...theme, decorations: eraDecorations } : theme;
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
  { position: 100, icon: '💯', title: '長寿の節目' },
  { position: 120, icon: '🌟', title: '長寿の頂' },
  { position: 150, icon: '🏁', title: '人生の集大成' },
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
  era: DEFAULT_ERA,
  aiSocietyLevel: 'mid',
  economy: 'normal',
  disasterFrequency: 'normal',
  longevityMode: 'standard',
};

// 昭和編は明示的な era タグを持たない既存イベント（現代編・近未来編どちらでも出た汎用プールの一部）に、
// スマホ・SNS・AI・ネット等の“今どき”表現がそのまま紛れ込むと年代がちぐはぐになる。全件を洗い出して
// era タグを付け直す代わりに、タイトル・説明・ログ文にこれらの語が含まれる場合だけ候補から除外する
// 軽量なセーフティネットとして扱う（present/futureの挙動には一切影響しない）。
const SHOWA_ANACHRONISTIC_KEYWORDS = [
  'スマホ', 'スマートフォン', 'SNS', 'インターネット', 'ネット', 'アプリ', 'オンライン',
  'AI', '人工知能', 'ロボット', 'VR', 'ドローン', 'タブレット', '動画配信', 'マッチングアプリ',
  '暗号資産', '仮想通貨', 'NISA', '宇宙旅行', '火星', '衛星', 'リモートワーク', 'テレワーク',
];

function isShowaAnachronistic(event: GameEvent): boolean {
  const text = `${event.title}${event.description}${event.logText}`;
  return SHOWA_ANACHRONISTIC_KEYWORDS.some((word) => text.includes(word));
}

/**
 * イベントが指定の時代で出現しうるかを判定する。
 * 明示的な era タグがあればそれに従う（新規「現代編専用」「昭和編専用」イベント用）。
 * タグが無い既存イベントは、futureTag（近未来フレーバーの自由記述タグ）や
 * category が 'ai'/'space'（本質的に近未来限定のテーマ）であれば近未来編限定とみなし、
 * それ以外は全時代共通として扱う。これにより既存イベントデータを書き換えずに
 * 「現代編・昭和編では近未来的な出来事が出ない」を実現している。
 * 昭和編はさらに、タグなし汎用イベントの中の“今どき”表現も除外する（isShowaAnachronistic）。
 */
function isEventAvailableForEra(event: GameEvent, era: EraId): boolean {
  if (event.era) return event.era.includes(era);
  if ((era === 'present' || era === 'showa') && (event.futureTag || event.category === 'ai' || event.category === 'space')) {
    return false;
  }
  if (era === 'showa' && isShowaAnachronistic(event)) return false;
  return true;
}

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
  stage1: ['child', 'family', 'study', 'hobby', 'health', 'friend', 'smallChallenge', 'smallPinch', 'memory'],
  stage2: ['student', 'study', 'friend', 'club', 'path', 'partTime', 'hobby', 'health', 'love', 'challenge', 'social', 'startup', 'work', 'housing', 'memory'],
  stage3: [
    'work', 'jobChange', 'love', 'marriage', 'divorce', 'startup', 'investment', 'study', 'health',
    'family', 'childcare', 'hobby', 'social', 'challenge', 'accident', 'illness', 'disaster', 'fraud', 'ai', 'housing', 'fortune', 'memory',
  ],
  stage4: [
    'work', 'jobChange', 'startup', 'investment', 'family', 'childcare', 'health', 'illness', 'care',
    'social', 'ai', 'marriage', 'divorce', 'death', 'disaster', 'hobby', 'challenge', 'space', 'study', 'housing', 'fortune', 'memory',
  ],
  stage5: [
    'elder', 'health', 'illness', 'family', 'hobby', 'social', 'care', 'ai', 'space', 'love', 'death',
    'fraud', 'work', 'investment', 'accident', 'disaster', 'retirement', 'grandchild', 'housing', 'fortune', 'memory',
  ],
  stage6: ['elder', 'health', 'illness', 'family', 'care', 'death', 'ai', 'space', 'endOfLife', 'reflection', 'fortune', 'memory'],
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

// 数値スコアには影響させず、あくまで「候補に入るかどうか」だけを左右するクールダウン。
// 結婚・離婚・転職・起業のような人生の大きな節目は、短期間に連続して起きないようにする。
const CATEGORY_COOLDOWN_YEARS: Partial<Record<EventCategory, number>> = {
  marriage: 5,
  divorce: 6,
  jobChange: 3,
  startup: 4,
};

/**
 * イベントが、そのプレイヤーの現在の年齢・人生フラグ・過去の履歴から見て候補になり得るかを判定する。
 * 同じマス・同じ年代でも、プレイヤーごとの人生フラグや経験（lifeLogs）が違えば結果も変わるため、
 * これが「プレイヤーごとに異なるイベントが起こる」仕組みの中心になる。
 */
function isEventEligibleForPlayer(event: GameEvent, player: Player, age: number): boolean {
  if (event.minAge !== undefined && age < event.minAge) return false;
  if (event.maxAge !== undefined && age > event.maxAge) return false;
  if (event.requiredFlags && !event.requiredFlags.every((flag) => player.lifeFlags.includes(flag))) return false;
  if (event.excludedFlags && event.excludedFlags.some((flag) => player.lifeFlags.includes(flag))) return false;

  if (event.oncePerGame && player.lifeLogs.some((log) => log.eventId === event.id)) return false;

  if (event.cooldownYears !== undefined) {
    const lastSameEvent = [...player.lifeLogs].reverse().find((log) => log.eventId === event.id);
    if (lastSameEvent && age - lastSameEvent.age < event.cooldownYears) return false;
  }

  const categoryCooldown = CATEGORY_COOLDOWN_YEARS[event.category];
  if (categoryCooldown !== undefined) {
    const lastCategoryLog = [...player.lifeLogs].reverse().find((log) => log.category === event.category);
    if (lastCategoryLog && age - lastCategoryLog.age < categoryCooldown) return false;
  }

  return true;
}

/** 候補群のうち、そのプレイヤーがまだ経験していないものがあれば優先する（完全な再体験を避ける）。 */
function preferUnexperienced(pool: GameEvent[], player: Player): GameEvent[] {
  const unexperienced = pool.filter((e) => !player.lifeLogs.some((log) => log.eventId === e.id));
  return unexperienced.length > 0 ? unexperienced : pool;
}

/**
 * マス種類・人生ステージ・世界設定・プレイヤー自身の状態から、抽選対象のイベント1件を選ぶ。
 * 固定イベントデータベースからの抽選ロジック本体。将来AI生成に差し替える際は、
 * この関数の呼び出し口（drawEventForPosition）をgenerateAIEventPlaceholder系に差し替えるだけでよい。
 *
 * 年代にふさわしくない出来事（幼少期の結婚・離婚・投資など）が絶対に出ないよう、
 * 必ず「そのステージで許可されたカテゴリ」かつ「イベント自身のageCategoryがそのステージ」の
 * 両方を満たすイベントだけを候補にする。ステージをまたいだフォールバックは行わない。
 * さらに、年齢の厳密な範囲（minAge/maxAge）・人生フラグ・クールダウン・既経験の除外を通すことで、
 * 同じマスに複数のプレイヤーが到達しても、それぞれの人生に応じて違う候補から抽選される。
 */
export function getEventForSquare(player: Player, stage: LifeStage, squareType: SquareType, settings: GameSettings): GameEvent {
  const age = player.age;
  const stageAllowedCategories = STAGE_CATEGORY_ALLOWLIST[stage];
  const preferredCategories = SQUARE_TYPE_CATEGORY_MAP[squareType].filter((c) => stageAllowedCategories.includes(c));

  // 1段階目：マス種類が示すカテゴリ ∩ 年代で許可されたカテゴリ ∩ 年代(ageCategory)が完全一致 ∩ プレイヤー個人の適格性 ∩ 時代
  const preferredCategoryList = preferredCategories.length > 0 ? preferredCategories : stageAllowedCategories;
  let pool = ALL_EVENTS.filter(
    (e) =>
      e.ageCategory === stage &&
      preferredCategoryList.includes(e.category) &&
      isEventEligibleForPlayer(e, player, age) &&
      isEventAvailableForEra(e, settings.era),
  );
  pool = applySettingsBias(pool, settings);
  // 選んだ人生ルート（chosenRoutes）に応じて、関連カテゴリのイベントを少し出やすくする。
  // stage/categoryの厳密フィルタを通した後の候補内で重複追加するだけなので、年代不一致は絶対に起こらない。
  pool = applyRouteBias(pool, getCategoryBoostsForRoutes(player.chosenRoutes));

  if (squareType === 'superRare') {
    const superRarePool = pool.filter((e) => e.rarity === 'superRare');
    if (superRarePool.length > 0) pool = superRarePool;
  } else if (squareType === 'chance') {
    const upgradedPool = pool.filter((e) => e.rarity !== 'common');
    if (upgradedPool.length > 0) pool = upgradedPool;
  }

  pool = preferUnexperienced(pool, player);
  if (pool.length > 0) return pickRandomEvent(pool);

  // 2段階目：マス種類の指定は無視し、そのステージで許可された全カテゴリ・年代一致・適格性・時代のみで再抽選
  let stagePool = ALL_EVENTS.filter(
    (e) =>
      e.ageCategory === stage &&
      stageAllowedCategories.includes(e.category) &&
      isEventEligibleForPlayer(e, player, age) &&
      isEventAvailableForEra(e, settings.era),
  );
  stagePool = preferUnexperienced(stagePool, player);
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
  player: Player,
  stage: LifeStage,
  squareType: SquareType,
  settings: GameSettings,
): Promise<GameEvent> {
  return getEventForSquare(player, stage, squareType, settings);
}

export interface DrawnEvent {
  event: GameEvent;
  stage: LifeStage;
  squareType: SquareType;
}

/**
 * イベント文中の「{age}」を実際の年齢に置き換える。123歳以降のように、発生年齢の幅が広い
 * イベントで「固定の年齢を書いた文章」と「実際の到達年齢」がズレる（矛盾する）のを防ぐための仕組み。
 * 単一年齢に絞れる節目イベント（100歳ちょうど等）は従来通り固定文字列のままでよい。
 */
function resolveEventTextForAge(event: GameEvent, age: number): GameEvent {
  if (!event.title.includes('{age}') && !event.description.includes('{age}') && !event.logText.includes('{age}')) {
    return event;
  }
  const replaceAge = (text: string) => text.replace(/\{age\}/g, String(age));
  return {
    ...event,
    title: replaceAge(event.title),
    description: replaceAge(event.description),
    logText: replaceAge(event.logText),
  };
}

export function drawEventForPosition(player: Player, settings: GameSettings): DrawnEvent {
  const stage = getBoardStage(player.position);
  const squareType = getSquareType(player.position);
  const event = resolveEventTextForAge(getEventForSquare(player, stage, squareType, settings), player.age);
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

function createId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * プレイヤー入力から初期プレイヤー状態を作成する。
 * 全員position 0・age 0からスタートする（時代設定の開始年＋年齢＝現在の暦年はgetCalendarYearで表示用に算出する）。
 */
export function initializePlayers(inputs: PlayerSetupInput[]): Player[] {
  return inputs.map((input) => {
    const personality = pickRandomPersonality();

    const player: Player = {
      id: createId('player'),
      name: input.name.trim(),
      age: 0,
      position: 0,
      money: INITIAL_MONEY,
      health: INITIAL_STAT_VALUE,
      happiness: INITIAL_STAT_VALUE,
      knowledge: INITIAL_STAT_VALUE,
      relationships: INITIAL_STAT_VALUE,
      freedom: INITIAL_STAT_VALUE,
      experience: INITIAL_EXPERIENCE,
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
      personality,
      lifeFlags: [personalityFlag(personality)],
      characterId: input.characterId ?? DEFAULT_CHARACTER_ID,
      lifespanImmunityTurns: 0,
    };
    // 個性による小さな初期補正（強すぎる能力差にならないよう、どの個性も1項目・+5のみ）。
    return applyEffectsToPlayer(player, PERSONALITY_TRAITS[personality].statBonus);
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

/** イベント（または選択）が付与する人生フラグを、重複なくプレイヤーに追加する。 */
export function applyFlagsToPlayer(player: Player, grantsFlags?: string[]): Player {
  if (!grantsFlags || grantsFlags.length === 0) return player;
  const newFlags = grantsFlags.filter((flag) => !player.lifeFlags.includes(flag));
  if (newFlags.length === 0) return player;
  return { ...player, lifeFlags: [...player.lifeFlags, ...newFlags] };
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

// ---------------------------------------------------------------------------
// 運命ルーレット（イベント専用の小型ルーレットで「運」の要素を決める）
// ---------------------------------------------------------------------------

const FATE_GOOD_SEVERITIES = ['greatSuccess', 'success'];
const FATE_BAD_SEVERITIES = ['failure', 'greatFailure'];

/** ステータス値を -1〜+1 の補正係数に正規化する（moneyだけ基準値が異なる）。 */
function normalizedStatShift(player: Player, stat: FateInfluenceStat): number {
  if (stat === 'money') {
    return Math.max(-1, Math.min(1, (player.money - 500) / 1000));
  }
  return Math.max(-1, Math.min(1, (player[stat] - 50) / 50));
}

/**
 * プレイヤーのステータスに応じて、運命ルーレットの結果の出やすさを少しだけ補正する。
 * 例：健康が高いほど健康リスク系の良い結果が、信用が高いほど転職・人間関係の好結果が出やすくなる。
 * ただし補正幅は±30%程度に抑え、あくまで「運」の要素が中心になるようにしている。
 */
function applyFateStatInfluence(outcomes: FateOutcome[], player: Player, influenceStat?: FateInfluenceStat): FateOutcome[] {
  if (!influenceStat) return outcomes;
  const shift = normalizedStatShift(player, influenceStat) * 0.3;
  return outcomes.map((outcome) => {
    if (FATE_GOOD_SEVERITIES.includes(outcome.severity)) {
      return { ...outcome, weight: Math.max(1, outcome.weight * (1 + shift)) };
    }
    if (FATE_BAD_SEVERITIES.includes(outcome.severity)) {
      return { ...outcome, weight: Math.max(1, outcome.weight * (1 - shift)) };
    }
    return outcome;
  });
}

/** 運命ルーレットの結果を、プレイヤーのステータスによる軽い補正込みで抽選する。 */
export function pickFateOutcome(outcomes: FateOutcome[], player: Player, influenceStat?: FateInfluenceStat): FateOutcome {
  const influenced = applyFateStatInfluence(outcomes, player, influenceStat);
  const total = influenced.reduce((sum, o) => sum + o.weight, 0);
  let roll = Math.random() * total;
  for (const outcome of influenced) {
    roll -= outcome.weight;
    if (roll <= 0) return outcome;
  }
  return influenced[influenced.length - 1];
}

/** 選択の効果（choice.effects）と運命ルーレットの結果（outcome.effects）を合算する。 */
export function mergeStatEffects(base: StatEffects, extra: StatEffects): StatEffects {
  const merged: StatEffects = { ...base };
  (Object.keys(extra) as StatKey[]).forEach((key) => {
    merged[key] = (merged[key] ?? 0) + (extra[key] ?? 0);
  });
  return merged;
}

/** 状態ステータス（職業・年収など）は、運命ルーレットの結果があればそちらを優先して上書きする。 */
export function mergeStatusEffects(base?: StatusEffects, extra?: StatusEffects): StatusEffects | undefined {
  if (!base && !extra) return undefined;
  const merged: StatusEffects = { ...base };
  if (extra?.occupation !== undefined) merged.occupation = extra.occupation;
  if (extra?.romanceStatus !== undefined) merged.romanceStatus = extra.romanceStatus;
  if (extra?.housingStatus !== undefined) merged.housingStatus = extra.housingStatus;
  const incomeDelta = (base?.annualIncomeDelta ?? 0) + (extra?.annualIncomeDelta ?? 0);
  if (incomeDelta !== 0) merged.annualIncomeDelta = incomeDelta;
  return merged;
}

export const FATE_SEVERITY_LABELS: Record<FateOutcome['severity'], string> = {
  greatSuccess: '大成功',
  success: '成功',
  neutral: '普通',
  failure: '失敗',
  greatFailure: '大失敗',
};

export const FATE_SEVERITY_ICONS: Record<FateOutcome['severity'], string> = {
  greatSuccess: '🌟',
  success: '✨',
  neutral: '➖',
  failure: '⚡',
  greatFailure: '💥',
};

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

// 時代ごとの新聞の言い回し（トーン）。近未来編は既存の言い回しをそのまま維持し、
// 現代編は生活感のある言葉に寄せている。将来時代を追加する際はここに1エントリ足すだけでよい。
const NEWSPAPER_TONE_BY_ERA: Record<EraId, { positive: string; negative: string; neutral: string }> = {
  present: { positive: '奮闘の10年でした', negative: '波乱の多い10年でした', neutral: '変化に富んだ10年でした' },
  future: { positive: '飛躍の10年でした', negative: '試練の多い10年でした', neutral: '転機が重なった10年でした' },
  showa: { positive: '汗と笑顔が輝いた10年でした', negative: '苦労の絶えない10年でした', neutral: '移り変わりの多い10年でした' },
};

export function generateNewspaperHeadlinePlaceholder(logs: LifeLogEntry[], era: EraId = DEFAULT_ERA): string {
  if (logs.length === 0) {
    return 'これといった出来事のない、穏やかな10年でした。';
  }

  const sorted = [...logs].sort((a, b) => newspaperHeadlinePriority(b) - newspaperHeadlinePriority(a));
  const topCategories = Array.from(new Set(sorted.slice(0, 2).map((log) => EVENT_CATEGORY_LABELS[log.category])));
  const netTotal = logs.reduce((sum, log) => sum + weightedNetEffect(log.effects), 0);
  const tones = NEWSPAPER_TONE_BY_ERA[era];
  const tone = netTotal >= 15 ? tones.positive : netTotal <= -15 ? tones.negative : tones.neutral;

  return `${topCategories.join('と')}が重なった、${tone}`;
}

export function buildNewspaperSummaries(player: Player, era: EraId = DEFAULT_ERA): DecadeSummary[] {
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
      headline: generateNewspaperHeadlinePlaceholder(logs, era),
    }));
}

/** 最終結果画面用に、人生新聞の中から最も出来事が濃かった10年の見出しを1つだけ選んで返す。 */
export function getRepresentativeNewspaperHeadline(player: Player, era: EraId = DEFAULT_ERA): string | null {
  const summaries = buildNewspaperSummaries(player, era);
  if (summaries.length === 0) return null;

  const scored = summaries.map((summary) => ({
    summary,
    score: summary.logs.reduce((sum, log) => sum + IMPORTANCE_RANKING_BONUS[log.importance], 0),
  }));
  const best = scored.reduce((a, b) => (b.score >= a.score ? b : a));
  return `${best.summary.decadeLabel}：「${best.summary.headline}」`;
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
// 盤面の物理的な終端（position 150＝150歳）に達した場合も、その時点で強制的に卒業扱いにする。

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
  // 寿命システム（時代ごとの寿命リスク開始年齢以降のルーレット判定）で人生の終幕を迎えた場合の理由。
  // 唐突・陰鬱にならないよう、人生を振り返るような上品な言葉を選んでいる。
  {
    id: 'lifespanEnd',
    label: '自分らしい人生の終幕',
    title: '人生の終幕',
    body: '選択と出会いを重ねた人生は、ここでひとつの物語を終えます。',
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
  // 盤面の物理的な終端（150歳）に到達した、ごく限られた人だけがたどり着く特別な卒業理由。
  {
    id: 'grandFinale',
    label: '人生の集大成',
    title: '人生の集大成',
    body: '誰もがたどり着けるわけではない150年という長い旅を歩み切り、静かに、しかし誇らしく人生の幕を閉じました。',
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

// 危険な出来事（病気・事故・災害）の経験回数が多いほど、僅かに寿命確率を押し上げる
// （「積み重なった人生の負荷」を表現する。1件あたりの影響は小さく、上限を設けて理不尽にしない）。
const DANGEROUS_HISTORY_CATEGORIES: EventCategory[] = ['illness', 'accident', 'disaster'];
const DANGEROUS_HISTORY_MAX_BONUS = 0.25;

function calculateDangerousHistoryFactor(player: Player): number {
  const count = player.lifeLogs.filter((log) => DANGEROUS_HISTORY_CATEGORIES.includes(log.category)).length;
  return 1 + Math.min(DANGEROUS_HISTORY_MAX_BONUS, count * 0.02);
}

// 健康ステータス（0〜100想定）による寿命確率の補正。
// 「健康状態が高い：半分にする／低い：1.5倍にする」を、health=70で×0.5・health=30で×1.5と
// なる直線でなめらかに繋ぐ（その間は比例的に変化する）。
function calculateHealthLifespanFactor(health: number): number {
  const factor = 1.5 - (health - 30) / 40;
  return Math.min(1.5, Math.max(0.5, factor));
}

/**
 * 寿命リスク開始年齢・年代帯別の基礎確率（data/lifespanSettings.ts）に、健康・資産・家族関係・
 * 治療選択・危険な出来事歴・時代設定という複数のレバーで補正をかけ、その回（ターン）の
 * 「寿命を迎える確率」を計算する。寿命リスク開始年齢以下、または寿命免除ターン中は必ず0を返す。
 * 「努力や選択で少しは寿命を延ばせた」と感じられる余地を残しつつ、長寿を保証はしない。
 */
export function calculateLifespanDeathChance(player: Player, settings: GameSettings): number {
  if (player.lifespanImmunityTurns > 0) return 0;

  const base = getBaseDeathChance(settings.era, player.age);
  if (base <= 0) return 0;

  let chance = base * calculateHealthLifespanFactor(player.health);

  // 資産が多いほど医療・介護へのアクセスが良く、僅かにリスクが下がる（逆に乏しいと僅かに上がる）。
  // 効果は±15%程度に抑え、資産だけで安全になり過ぎないようにしている。
  const moneyFactor = 1 - Math.max(-0.15, Math.min(0.15, (player.money - 300) / 4000));
  chance *= moneyFactor;

  // 家族・人間関係の支えが厚いほど、僅かにリスクが下がる（見守り・介護・心の支え）。
  const relationshipsFactor = 1 - Math.max(-0.08, Math.min(0.08, (player.relationships - 50) / 400));
  chance *= relationshipsFactor;

  // 病気・事故・災害を多く経験してきた人生ほど、僅かに負荷が積み重なっている。
  chance *= calculateDangerousHistoryFactor(player);

  // 長寿治療・再生医療・身体拡張を受け入れてきた場合、その後の寿命確率を少し下げる
  // （近未来編の「長寿治療を選ぶかどうか」という選択を、以降の生存確率にも反映する）。
  if (player.lifeFlags.includes('longevityTreatment')) {
    chance *= 0.82;
  }
  // 意識データ化を選んだ場合、肉体の限界からある程度切り離されたことを表し、さらに下げる。
  if (player.lifeFlags.includes('consciousnessUploaded')) {
    chance *= 0.7;
  }

  // 長寿モード（世界設定）では寿命確率を少し下げる。
  if (settings.longevityMode === 'longevity') {
    chance *= 0.7;
  }

  return Math.min(0.9, Math.max(0.01, chance));
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
    lifespanEnd: 1.5 + player.happiness / 50 + player.relationships / 50,
  };

  const total = Object.values(weights).reduce((sum, w) => sum + w, 0);
  let roll = Math.random() * total;
  for (const reason of GRADUATION_REASONS) {
    roll -= weights[reason.id] ?? 0;
    if (roll <= 0) return reason;
  }
  return GRADUATION_REASONS[GRADUATION_REASONS.length - 1];
}

/** 寿命判定で人生の終幕を迎えた場合の理由を、プレイヤーのステータスに応じて選ぶ。 */
export function pickLifespanEndReason(player: Player): GraduationReason {
  return pickGraduationReason(player, player.age);
}

// 健康・延命に関するプラスイベントを起点に、寿命免除を付与するターン数。
const HEALTH_EVENT_IMMUNITY_TURNS = 1;
const TREATMENT_SUCCESS_IMMUNITY_TURNS = 3;
const HEALTH_BOOST_THRESHOLD = 8;

/**
 * 直前に確定したイベント結果が「健康・延命関連のプラスイベント」に該当する場合、
 * 次のターン以降いくつ寿命判定を免除するかを返す（該当しなければ0）。
 * 健康診断・生活習慣改善・長寿治療の成功など、health効果が大きくプラスだったターンや、
 * 長寿治療フラグを新たに獲得したターンを対象にする。
 */
export function computeLifespanImmunityGrant(event: GameEvent, result: PendingEventResult): number {
  const healthGain = result.effects.health ?? 0;
  const grantedTreatmentFlag = result.grantsFlags?.includes('longevityTreatment') ?? false;
  const isGoodOutcome = result.fateSeverity === undefined || result.fateSeverity === 'greatSuccess' || result.fateSeverity === 'success';

  if (grantedTreatmentFlag && isGoodOutcome) return TREATMENT_SUCCESS_IMMUNITY_TURNS;
  if ((event.category === 'health' || event.category === 'illness') && healthGain >= HEALTH_BOOST_THRESHOLD) {
    return HEALTH_EVENT_IMMUNITY_TURNS;
  }
  if (healthGain >= HEALTH_BOOST_THRESHOLD * 2) return HEALTH_EVENT_IMMUNITY_TURNS;
  return 0;
}

/** 盤面の物理的な終端（150歳）に達したときの、強制的な卒業理由。 */
export function forcedGraduationAtBoardEnd(player: Player): GraduationReason {
  return player.health >= 60 ? getGraduationReason('grandFinale') : getGraduationReason('natural');
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
    pendingFateRoulette: null,
    pendingBranchChoice: null,
    pendingGraduation: null,
    showLifeLog: false,
    showNewspaper: false,
  };
}

