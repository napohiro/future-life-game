import { ALL_EVENTS, pickRandomEvent } from '../data/boardEvents';
import { getCategoryBoostsForRoutes } from '../data/branchRoutes';
import { DEFAULT_ERA, getCalendarYear } from '../data/eras';
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
  RelationshipStatus,
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
  travel: '旅行',
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

// 構造化されたrelationshipStatusの表示ラベル（独身・交際中・既婚・離婚）。
export const RELATIONSHIP_STATUS_LABELS: Record<RelationshipStatus, string> = {
  single: '独身',
  dating: '交際中',
  married: '既婚',
  divorced: '離婚',
};

/** プレイヤー情報・履歴で使う、恋愛・家族状況の表示文字列（例：「既婚・子どもあり」）。
 * イベントごとに表記ゆれのあった従来のromanceStatus（自由文字列）に代わり、
 * 常に一貫した4状態＋子どもの有無で表示する。 */
export function getRelationshipDisplayLabel(player: Player): string {
  const base = RELATIONSHIP_STATUS_LABELS[player.relationshipStatus];
  return player.hasChildren ? `${base}・子どもあり` : base;
}

/** 表示用の肩書き。データ上のoccupation（生成時は「学生」）はそのままに、
 * 0〜6歳だけは見た目として不自然な「学生」表示を避け、年齢に応じた表示に差し替える。
 * 7歳以降は既存のplayer.occupationをそのまま表示する（イベントによる変化にも影響しない）。 */
export function getDisplayOccupation(age: number, occupation: string): string {
  if (age <= 0) return '誕生';
  if (age <= 6) return '幼児';
  return occupation;
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

/**
 * 史実・時代背景イベントの yearRange（暦年の範囲）に、現在の「物語上の暦年」が
 * 収まっているかを判定する。yearRange未指定のイベントは常にtrue（暦年による絞り込みを受けない）。
 * 「昭和編の幼少期に大阪万博イベントが出るより、年齢と西暦が合う時期に出る方が自然」という
 * 要望に対応するための、年齢(minAge/maxAge)とは独立した絶対年基準のフィルタ。
 */
function isEventYearEligible(event: GameEvent, era: EraId, age: number): boolean {
  if (!event.yearRange) return true;
  const calendarYear = getCalendarYear(era, age);
  const [from, to] = event.yearRange;
  return calendarYear >= from && calendarYear <= to;
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

// ---------------------------------------------------------------------------
// 恋愛・結婚・離婚・子ども関連イベントの状態フィルタ
// ------------------------------------------------------------
// 「独身なのに再婚」「既婚なのに新しい恋愛」のような人生ストーリー上の矛盾を防ぐための
// 追加フィルタ。既存のイベントデータ（category等）は一切変更せず、カテゴリごとの既定条件＋
// 個別イベントの例外リストという2段構えで、この関数だけで判定を完結させている。
// ---------------------------------------------------------------------------

// カテゴリごとの既定条件（このrelationshipStatusの時だけ候補になる）。指定が無いカテゴリは
// 関係状態による制限を受けない（例：family=家族一般の出来事は誰にでも起こりうる）。
const CATEGORY_RELATIONSHIP_REQUIREMENT: Partial<Record<EventCategory, RelationshipStatus[]>> = {
  // loveカテゴリの大部分は「新しい出会い・交際開始」を表すため、独身・離婚後にのみ許可する。
  // 交際中の人向けの継続コンテンツ（別れ・プロポーズ等）はRELATIONSHIP_EVENT_STATUS_OVERRIDESで
  // 個別に['dating']を許可しており、「交際中は新しい恋愛開始イベントを出さない」を両立させている。
  love: ['single', 'divorced'],
  // marriage（婚約・結婚）は独身・交際中・離婚後のいずれからでも起こってよい。既婚では重婚を防ぐ。
  marriage: ['single', 'dating', 'divorced'],
  // 別れ話・離婚は「交際中」または「既婚」でなければ起こりようがない。
  divorce: ['dating', 'married'],
  // 孫は自分の子どもがいて初めて存在しうる（hasChildrenは別途チェック）ため、
  // ここでは既婚・離婚後（子がいる前提の年代）にだけ許可しておく。
  grandchild: ['married', 'divorced'],
};

// カテゴリの既定条件では表現できない個別イベントの例外（新規の恋愛・結婚ではなく、
// 既存の関係の継続・別れ・プロポーズ・結婚後限定の内容など）。
const RELATIONSHIP_EVENT_STATUS_OVERRIDES: Record<string, RelationshipStatus[]> = {
  'love-02': ['dating'], // 遠距離恋愛（交際中の発展）
  'love-03': ['dating'], // 長年の恋人と別れた
  'love-04': ['dating'], // プロポーズをした（交際中のみ）
  'marriage-02': ['married'], // 結婚式を挙げた
  'marriage-03': ['married'], // 義理の家族との関係に悩んだ
  'marriage-04': ['divorced'], // 再婚（離婚済みでのみ。重婚・二重結婚を防ぐ）
  'divorce-03': ['divorced'], // 離婚後の子の親権
  // 出産イベントは「交際中」または「既婚」でのみ（パートナー関係が成立している時のみ）。
  'childcare-01': ['dating', 'married'],
  'nf-love-03': ['dating', 'married'],
};

// 「子どもがいること」が前提の個別イベント（category単体では判定できないため個別指定）。
const REQUIRES_CHILDREN_EVENT_IDS = new Set([
  'childcare-02',
  'childcare-03',
  'childcare-04',
  'childcare-05',
  'present-childcare-hoikuen',
  'grandchild-01',
  'grandchild-02',
  'showa-midlife-child-independence',
  'showa-midlife-grandchild',
  'elder-grandchild-walk',
  'longevity-present-four-generations',
  'longevity-future-greatgrandchild',
  'longevity-showa-four-generations',
]);

// 出産そのものを表すイベント。まだ子どもがいないプレイヤーにのみ候補にする
// （同じプレイヤーに「子供が生まれた」が何度も重複して起きないようにする簡易ガード）。
const CHILDBIRTH_EVENT_IDS = new Set(['childcare-01', 'nf-love-03']);

/** 恋愛・結婚・離婚・子ども関連イベントが、プレイヤーの現在の人生状態と矛盾しないかを判定する。 */
function isRelationshipEventEligible(event: GameEvent, player: Player): boolean {
  const requiredStatuses = RELATIONSHIP_EVENT_STATUS_OVERRIDES[event.id] ?? CATEGORY_RELATIONSHIP_REQUIREMENT[event.category];
  if (requiredStatuses && !requiredStatuses.includes(player.relationshipStatus)) return false;

  if (REQUIRES_CHILDREN_EVENT_IDS.has(event.id) && !player.hasChildren) return false;
  if (CHILDBIRTH_EVENT_IDS.has(event.id) && player.hasChildren) return false;

  return true;
}

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
  if (!isRelationshipEventEligible(event, player)) return false;

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

// 昭和編の画像付き史実イベント（historicalPriority: true）の優先出現確率。
// キーは「現在の暦年とtargetYearの差の絶対値」、値はその年に優先イベントを出す確率。
// 3年以上離れている場合はテーブルに無いため対象外（＝通常抽選にすべて委ねる）。
const HISTORICAL_PRIORITY_CHANCE_BY_DISTANCE: Record<number, number> = {
  0: 0.7,
  1: 0.4,
  2: 0.2,
};

/**
 * 昭和編・現代編・近未来編共通：現在の暦年（時代の開始年＋年齢）が targetYear に近い、未経験の
 * 史実／未来予測イベント（historicalPriority: true）を、通常のマス種類・年代カテゴリ抽選より
 * 前に優先判定する。昭和編は実際の史実、現代編（2026年スタート）・近未来編（2050年スタート）は
 * それぞれの世界線でのフィクションとしての未来予測イベントが対象。カテゴリがSTAGE_CATEGORY_ALLOWLIST
 * に含まれているかは問わない（史実・未来予測イベントは意図的にハンドピックされた候補のため、
 * 通常のカテゴリしばりの対象外として扱う）。
 * 対象イベントが無い・3年より離れている・確率抽選に外れた場合は null を返し、
 * 呼び出し元（getEventForSquare）は通常のカスケード抽選にそのまま進む。
 */
function drawHistoricalPriorityEvent(player: Player, stage: LifeStage, settings: GameSettings): GameEvent | null {
  if (settings.era !== 'showa' && settings.era !== 'present' && settings.era !== 'future') return null;

  const currentYear = getCalendarYear(settings.era, player.age);
  const candidates = ALL_EVENTS.filter(
    (e) =>
      e.historicalPriority === true &&
      e.targetYear !== undefined &&
      e.ageCategory === stage &&
      isEventEligibleForPlayer(e, player, player.age) &&
      isEventAvailableForEra(e, settings.era),
  );
  if (candidates.length === 0) return null;

  const distances = candidates.map((e) => Math.abs(currentYear - e.targetYear!));
  const minDistance = Math.min(...distances);
  const chance = HISTORICAL_PRIORITY_CHANCE_BY_DISTANCE[minDistance];
  if (chance === undefined || Math.random() >= chance) return null;

  const closest = candidates.filter((_, i) => distances[i] === minDistance);
  return pickRandomEvent(closest);
}

// ============================================================
// 「この年の社会」表示（EventModal上部）用の見出し
// ------------------------------------------------------------
// 既存の史実イベント（historicalPriority: true / targetYear指定あり）を、その手番で実際に
// 抽選されたかどうかに関わらず「その年、世の中で起きていたこと」として見出し表示するための
// マッピング。抽選ロジック（drawHistoricalPriorityEvent・出現率）や効果・人生ログには一切影響しない、
// 表示専用の追加情報。
// ============================================================
export interface SocietyHeadline {
  year: number;
  headline: string;
}

const SOCIETY_HEADLINE_BY_EVENT_ID: Record<string, string> = {
  'showa-history-tv-broadcast': 'テレビ放送が始まる',
  'showa-history-tokyo-tower': '東京タワー完成',
  'showa-history-tokyo-olympics': '東京オリンピック開催',
  'showa-history-shinkansen': '東海道新幹線開業',
  'showa-history-300million-case': '三億円事件が発生',
  'showa-teen-expo-inspired': '大阪万博（日本万国博覧会）開催',
  'showa-youth-oil-shock': 'オイルショック（石油危機）',
  'showa-history-famicom': '家庭用ゲーム機（ファミコン）発売',
  'showa-history-heisei-change': '昭和から平成へ改元',
  'showa-history-great-earthquake-1995': '大規模な地震災害が発生',
  'showa-history-lehman-shock': 'リーマン・ショック（世界的な金融危機）',
  // 現代編（2026年スタート）：史実ではなく、ゲーム内フィクションとしての未来予測トピック。
  // 2026年はゲーム開始年そのものなので、最初の社会イベントは2027年から。
  'present-future-2027-ai-daily': '生成AIが日常化',
  'present-future-2031-ai-education': 'AI教育の普及',
  'present-future-2036-sns-trust': 'SNS信用社会',
  'present-future-2041-path-diversity': '進路の多様化',
  'present-future-2046-side-job-standard': '副業・複業が標準化',
  'present-future-2051-housing-loan': '住宅ローン・住まいの選択',
  'present-future-2056-care-work-balance': '介護と仕事の両立',
  'present-future-2061-ai-colleague': 'AI同僚時代',
  'present-future-2066-dual-residence': '地方移住・二拠点生活',
  'present-future-2071-life-redesign': '人生再設計ブーム',
  'present-future-2076-healthspan-business': '健康寿命ビジネス拡大',
  'present-future-2086-second-career': 'セカンドキャリア時代',
  // 近未来編（2050年スタート）：宇宙開発・宇宙人との協力を軸にした未来フィクションのトピック。
  'future-society-2051-private-spaceport': '民間宇宙港が一般利用を開始',
  'future-society-2055-lunar-city': '月面居住区が本格稼働',
  'future-society-2060-mars-route': '火星定期航路が開設',
  'future-society-2065-deep-space-signal': '深宇宙から知的信号を受信',
  'future-society-2070-first-contact': '宇宙人との平和的接触が実現',
  'future-society-2075-alien-cooperation': '宇宙人との共同研究が始まる',
  'future-society-2080-stellar-engine': '宇宙人技術で新型航行エンジンが実用化',
  'future-society-2085-solar-system-network': '地球・月・火星を結ぶ生活圏が形成',
  'future-society-2090-jovian-mission': '木星圏探査プロジェクトが始動',
  'future-society-2095-exoplanet-project': '居住可能惑星への移住計画が発表',
  'future-society-2100-interplanetary-school': '他惑星留学・移住準備制度が始まる',
  'future-society-2110-new-world-settlement': '人類と宇宙人が協力する新惑星都市が誕生',
};

/**
 * 現在の暦年（時代の開始年＋年齢）に該当する「社会イベント見出し」一覧を返す
 * （EventModal上部の「この年の社会」表示用）。該当が無い年は空配列を返し、
 * 呼び出し元はその場合セクション自体を表示しない。
 */
export function getSocietyHeadlinesForYear(era: EraId, calendarYear: number): SocietyHeadline[] {
  return ALL_EVENTS.filter(
    (e) =>
      e.targetYear === calendarYear &&
      (!e.era || e.era.includes(era)) &&
      SOCIETY_HEADLINE_BY_EVENT_ID[e.id] !== undefined,
  ).map((e) => ({ year: e.targetYear!, headline: SOCIETY_HEADLINE_BY_EVENT_ID[e.id] }));
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

  // 0段階目：昭和編の画像付き史実イベント優先抽選。対象年に近ければ高確率で割り込み、
  // 対象外・確率抽選に外れた場合は何もせず、以下の通常カスケードへそのまま進む。
  const historicalEvent = drawHistoricalPriorityEvent(player, stage, settings);
  if (historicalEvent) return historicalEvent;

  const stageAllowedCategories = STAGE_CATEGORY_ALLOWLIST[stage];
  const preferredCategories = SQUARE_TYPE_CATEGORY_MAP[squareType].filter((c) => stageAllowedCategories.includes(c));

  // 1段階目：マス種類が示すカテゴリ ∩ 年代で許可されたカテゴリ ∩ 年代(ageCategory)が完全一致 ∩ プレイヤー個人の適格性 ∩ 時代
  const preferredCategoryList = preferredCategories.length > 0 ? preferredCategories : stageAllowedCategories;
  let pool = ALL_EVENTS.filter(
    (e) =>
      e.ageCategory === stage &&
      preferredCategoryList.includes(e.category) &&
      isEventEligibleForPlayer(e, player, age) &&
      isEventAvailableForEra(e, settings.era) &&
      isEventYearEligible(e, settings.era, age),
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
      isEventAvailableForEra(e, settings.era) &&
      isEventYearEligible(e, settings.era, age),
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
const INITIAL_RELATIONSHIP_STATUS: RelationshipStatus = 'single';
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
      relationshipStatus: INITIAL_RELATIONSHIP_STATUS,
      hasChildren: false,
      marriageCount: 0,
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
  if (statusEffects.relationshipStatus !== undefined) {
    updated.relationshipStatus = statusEffects.relationshipStatus;
    // 結婚に至るたびに結婚回数を1増やす（離婚を挟まない限り、この分岐自体がイベント抽選で
    // 除外されるため二重加算は起きない）。
    if (statusEffects.relationshipStatus === 'married') {
      updated.marriageCount = player.marriageCount + 1;
    }
  }
  if (statusEffects.hasChildren !== undefined) updated.hasChildren = statusEffects.hasChildren;
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
  'travel',
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

/**
 * このイベントが「選択肢を選ぶ」「運命ルーレットを回す」「早期ゲームオーバー判定を伴う」といった、
 * プレイヤーの操作・追加演出を必要とする段階表示（内容確認→結果確認の2ステップ）が要るかどうか。
 * false の場合、App.tsx はイベント抽選と同時に結果を確定し、EventModalは1モーダルで
 * 内容と結果を一度に表示する（スマホでの「同じ内容を2回見る」テンポの悪さを避けるため）。
 */
export function eventNeedsStagedFlow(event: GameEvent): boolean {
  return (event.choices?.length ?? 0) > 0 || event.fateRoulette !== undefined || event.endsLifeChance !== undefined;
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
  if (extra?.relationshipStatus !== undefined) merged.relationshipStatus = extra.relationshipStatus;
  if (extra?.hasChildren !== undefined) merged.hasChildren = extra.hasChildren;
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
  {
    id: 'earlyTravel',
    label: '旅先での出来事',
    title: '人生の卒業',
    body: '出かけた先での思いがけない出来事により、人生の幕を閉じることになりました。それでも、そこに至るまでの日々は確かなものでした。',
  },
  // 昭和編の特別な旅行イベント専用の卒業理由。実在の出来事を静かに思わせる表現に留め、
  // 日付・会社名・便名の史実対応・犠牲者数などは一切記載しない（史実への配慮）。
  {
    id: 'showaFlightTragedy',
    label: '旅立ちの日',
    title: '人生の卒業',
    body: 'その便は、のちに人々の記憶に長く残る大きな事故に見舞われた便でした。あなたの人生は、ここで静かに幕を閉じました。',
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
function pickEarlyEndingReasonByCategory(category: EventCategory): GraduationReason {
  if (category === 'illness') return getGraduationReason('earlyIllness');
  if (category === 'disaster') return getGraduationReason('earlyDisaster');
  if (category === 'travel') return getGraduationReason('earlyTravel');
  return getGraduationReason('earlyAccident');
}

/**
 * 80歳未満の「人生終了」イベントが発生した際の卒業理由を選ぶ。
 * イベント（または選んだ選択肢）に graduationReasonId が明示されている場合はそれを優先し
 * （史実をモチーフにした特別イベントなど、専用の一言が必要な場合に使う）、
 * なければ従来通りカテゴリから汎用的な理由を選ぶ。
 */
export function resolveEarlyEndingReason(category: EventCategory, graduationReasonId?: string): GraduationReason {
  if (graduationReasonId) return getGraduationReason(graduationReasonId);
  return pickEarlyEndingReasonByCategory(category);
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

/**
 * 病気・事故・災害などのイベント単位の「人生終了確率」（endsLifeChance）を、プレイヤーの
 * ステータスに応じて僅かに補正する。寿命システム（calculateLifespanDeathChance）と同じ考え方で、
 * 「健康なら病気に強く、資産があれば医療・避難で助かりやすく、幸福度・関係が厚いと支えがある」
 * ことを表現する。ただし補正幅は小さく抑え、選択そのものの回避効果（endsLifeChanceを付けない）
 * が主たる回避手段であり続けるようにしている。
 */
export function adjustEndsLifeChance(baseChance: number, player: Player): number {
  let chance = baseChance * calculateHealthLifespanFactor(player.health);

  // 資産が多いほど医療・避難行動へのアクセスが良く、僅かにリスクが下がる。
  const moneyFactor = 1 - Math.max(-0.15, Math.min(0.15, (player.money - 300) / 4000));
  chance *= moneyFactor;

  // 幸福度・人間関係の支えが厚いほど、僅かにリスクが下がる。
  const supportFactor = 1 - Math.max(-0.1, Math.min(0.1, (player.happiness + player.relationships - 100) / 800));
  chance *= supportFactor;

  return Math.min(0.95, Math.max(0.005, chance));
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

// ---------------------------------------------------------------------------
// 人生ストーリー（最終レポート用の物語生成）
// ------------------------------------------------------------
// generateFinalChapter等と同じく、Ver.1.0では固定テンプレートの組み合わせで文章を生成する
// プレースホルダー方針（将来はここをAI生成に差し替える想定）。厳密な因果関係の検証は行わず、
// 「人生ストーリーとして自然につながって見えること」を優先する。
// ---------------------------------------------------------------------------

const TURNING_POINT_CATEGORIES: EventCategory[] = [
  'marriage', 'divorce', 'childcare', 'jobChange', 'startup', 'housing', 'care', 'illness', 'accident', 'disaster', 'path', 'retirement',
];

function turningPointPriority(log: LifeLogEntry): number {
  return Math.abs(weightedNetEffect(log.effects)) + IMPORTANCE_RANKING_BONUS[log.importance];
}

/** 進学・結婚・離婚・転職・住宅購入・介護・危険イベントなど「人生の転機」となった出来事を抽出する。 */
export function getTurningPointLogs(player: Player, count = 5): LifeLogEntry[] {
  const candidates = player.lifeLogs.filter(
    (log) => log.eventType === 'turningPoint' || log.importance === 'critical' || TURNING_POINT_CATEGORIES.includes(log.category),
  );
  return [...candidates].sort((a, b) => turningPointPriority(b) - turningPointPriority(a)).slice(0, count);
}

const BEST_REASON_BY_CATEGORY: Partial<Record<EventCategory, string>> = {
  housing: '暮らしの拠点ができ、人生に安定感が生まれました。',
  marriage: '支え合えるパートナーを得て、人生に安心が加わりました。',
  childcare: '新しい家族の存在が、日々に温かい張り合いを与えました。',
  grandchild: '新しい世代との出会いが、人生に穏やかな喜びを添えました。',
  work: '積み重ねた努力が実を結び、自信につながりました。',
  jobChange: '新しい環境が、人生の可能性を広げました。',
  startup: '自分の力で道を切り開いた経験が、大きな自信になりました。',
  investment: '堅実な備えが、この先の安心材料になりました。',
  study: '学びを深めたことが、その後の視野を広げました。',
  health: '心身を整えたことが、人生を支える土台になりました。',
  family: '家族との時間が、かけがえのない支えになりました。',
  friend: '気の置けない仲間との時間が、人生を豊かにしました。',
  love: '心通わせる相手との出会いが、日々に彩りを添えました。',
  hobby: '好きなことに打ち込んだ時間が、心の余裕を育てました。',
  social: '人や地域とのつながりが、人生に彩りを添えました。',
  ai: '新しい技術とうまく付き合えたことが、暮らしを前に進めました。',
};
const BEST_REASON_FALLBACK = 'この出来事が、人生に小さな明るさを加えました。';

/** ベストイベントに添える「なぜ人生にとって良かったのか」の一言。 */
export function describeBestEventReason(log: LifeLogEntry): string {
  return BEST_REASON_BY_CATEGORY[log.category] ?? BEST_REASON_FALLBACK;
}

const PINCH_REASON_BY_CATEGORY: Partial<Record<EventCategory, string>> = {
  divorce: '大きな喪失を経験しましたが、そのぶん一人で立つ強さを学びました。',
  friend: '人との距離の難しさを知る出来事でしたが、その後の人間関係への向き合い方に影響しました。',
  love: 'すれ違いを経験しましたが、次の関係を大切にする気持ちにつながりました。',
  illness: '体と向き合う大変さを知りましたが、健康の大切さに気づくきっかけになりました。',
  accident: '思いがけない出来事に見舞われましたが、日々の当たり前のありがたさに気づく機会になりました。',
  disaster: '厳しい状況に見舞われましたが、周囲との支え合いの大切さを実感しました。',
  fraud: '苦い経験でしたが、その後は物事をより慎重に見極める目が育ちました。',
  jobChange: '思うようにいかない時期でしたが、次の一歩を考え直すきっかけになりました。',
  care: '負担の大きい時期でしたが、家族との関わり方を見つめ直す機会になりました。',
  smallPinch: 'ちょっとしたつまずきでしたが、乗り越える力が少しずつ育ちました。',
  investment: '手痛い経験でしたが、お金との付き合い方を学ぶ機会になりました。',
};
const PINCH_REASON_FALLBACK = '簡単ではない時期でしたが、この経験がその後の歩みを支えました。';

/** ピンチイベントに添える「どう乗り越えたか・何を学んだか」の一言。暗くなりすぎないトーンにしている。 */
export function describePinchEventReason(log: LifeLogEntry): string {
  return PINCH_REASON_BY_CATEGORY[log.category] ?? PINCH_REASON_FALLBACK;
}

const TURNING_POINT_REASON_BY_CATEGORY: Partial<Record<EventCategory, string>> = {
  marriage: 'この出来事を境に、人生の歩み方が「自分一人」から「誰かと共に」へと変わりました。',
  divorce: 'この出来事を境に、それまでとは違う生き方を選び直すことになりました。',
  childcare: 'この出来事を境に、日々の暮らしの中心に家族が加わりました。',
  jobChange: 'この出来事を境に、それまでとは違う環境で新しい力を試すことになりました。',
  startup: 'この出来事を境に、人に雇われる立場から自ら道を作る立場へと変わりました。',
  housing: 'この出来事を境に、暮らしの拠点が定まり、人生に落ち着きが生まれました。',
  care: 'この出来事を境に、家族との向き合い方を見つめ直すことになりました。',
  illness: 'この出来事を境に、健康というものへの向き合い方が変わりました。',
  accident: 'この出来事を境に、日々の当たり前の大切さを強く意識するようになりました。',
  disaster: 'この出来事を境に、備えることの大切さを実感するようになりました。',
  path: 'この出来事を境に、それまでとは違う道を歩み始めました。',
  retirement: 'この出来事を境に、それまでとは違うペースの日々が始まりました。',
};
const TURNING_POINT_REASON_FALLBACK = 'この出来事が、その後の人生の方向を静かに変えました。';

/** 人生の転機に添える「この出来事が人生の方向を変えた」ことが分かる一言。 */
export function describeTurningPointReason(log: LifeLogEntry): string {
  return TURNING_POINT_REASON_BY_CATEGORY[log.category] ?? TURNING_POINT_REASON_FALLBACK;
}

export interface ForeshadowConnection {
  earlyLog: LifeLogEntry;
  laterLog: LifeLogEntry;
  text: string;
}

interface ForeshadowSeed {
  earlyCategories: EventCategory[];
  laterCategories: EventCategory[];
  text: string;
}

// 「早い時期のカテゴリ」→「後年の関連カテゴリ」の対応表。実際の因果関係の検証はせず、
// 人生ストーリーとして自然に見える組み合わせを定義している。
const FORESHADOW_SEEDS: ForeshadowSeed[] = [
  {
    earlyCategories: ['friend', 'smallPinch', 'love'],
    laterCategories: ['family', 'marriage', 'childcare'],
    text: '若い頃に知った人との距離の難しさが、後に家族や仲間との関係を大切にする価値観につながりました。',
  },
  {
    earlyCategories: ['accident', 'illness'],
    laterCategories: ['health', 'care'],
    text: '早い時期に経験した体の不安が、後に健康を大切にする習慣につながりました。',
  },
  {
    earlyCategories: ['ai', 'study'],
    laterCategories: ['jobChange', 'startup', 'work'],
    text: 'まだ珍しかった頃に触れたAI・学びの経験が、後の仕事の選び方に影響しました。',
  },
  {
    earlyCategories: ['hobby', 'challenge', 'smallChallenge'],
    laterCategories: ['startup', 'jobChange', 'social'],
    text: '若い頃に夢中になった挑戦が、後に新しい一歩を踏み出す力になりました。',
  },
  {
    earlyCategories: ['fraud', 'disaster'],
    laterCategories: ['investment', 'housing', 'care'],
    text: '早い時期に経験した苦い出来事が、後により慎重な選択をする力になりました。',
  },
];

const FORESHADOW_EARLY_AGE_LIMIT = 30;
const FORESHADOW_MIN_GAP_YEARS = 5;
const FORESHADOW_MAX_RESULTS = 4;

/**
 * 早い時期の出来事が、後の人生につながって見える組み合わせを抽出する。
 * 完全な因果関係の証明ではなく、人生ストーリーとして自然に読める「伏線」の演出用。
 */
export function getForeshadowingConnections(player: Player): ForeshadowConnection[] {
  const results: ForeshadowConnection[] = [];
  const usedEarlyIds = new Set<string>();
  const usedLaterIds = new Set<string>();

  for (const seed of FORESHADOW_SEEDS) {
    const earlyLog = player.lifeLogs.find(
      (log) => log.age <= FORESHADOW_EARLY_AGE_LIMIT && seed.earlyCategories.includes(log.category) && !usedEarlyIds.has(log.id),
    );
    if (!earlyLog) continue;
    const laterLog = player.lifeLogs.find(
      (log) =>
        log.age >= earlyLog.age + FORESHADOW_MIN_GAP_YEARS &&
        seed.laterCategories.includes(log.category) &&
        !usedLaterIds.has(log.id),
    );
    if (!laterLog) continue;

    results.push({ earlyLog, laterLog, text: seed.text });
    usedEarlyIds.add(earlyLog.id);
    usedLaterIds.add(laterLog.id);
    if (results.length >= FORESHADOW_MAX_RESULTS) break;
  }

  return results;
}

interface LifeStoryBracket {
  minAge: number;
  maxAge: number;
}

// 幼少期／学生時代／若者・社会人／壮年期／老後の5区分（LIFE_STAGESの年齢帯と揃えている）。
const LIFE_STORY_BRACKETS: LifeStoryBracket[] = [
  { minAge: 0, maxAge: 12 },
  { minAge: 13, maxAge: 22 },
  { minAge: 23, maxAge: 39 },
  { minAge: 40, maxAge: 59 },
  { minAge: 60, maxAge: Infinity },
];

/** 区分内で最も重要度・影響量が大きいログを、その区分の「アンカー」として選ぶ。 */
function pickAnchorLog(logs: LifeLogEntry[]): LifeLogEntry | undefined {
  if (logs.length === 0) return undefined;
  return [...logs].sort((a, b) => turningPointPriority(b) - turningPointPriority(a))[0];
}

function eraStoryOpening(player: Player, era: EraId): string {
  if (era === 'showa') return `${player.name}さんの人生は、家族や近所の支え合いが色濃く残る昭和の時代に始まりました。`;
  if (era === 'future') return `${player.name}さんの人生は、AIやテクノロジーが暮らしに溶け込んだ近未来の時代に始まりました。`;
  return `${player.name}さんの人生は、変化の速い現代社会の中で始まりました。`;
}

function eraFlavorPhrase(era: EraId): string {
  if (era === 'showa') return '会社や地域との関わりを大切にしながら';
  if (era === 'future') return 'AIとの付き合い方を模索しながら';
  return '転職や副業といった選択肢と向き合いながら';
}

// 人生ログがこの件数以下の場合は、多くを語らず短く丁寧な文章にとどめる
// （幼少期など早い段階で人生の終幕を迎えた場合に、不自然に長い物語を作らないため）。
const SHORT_LIFE_STORY_LOG_THRESHOLD = 3;

/**
 * 最終レポートの「人生ストーリー」本文（プレースホルダー）。
 * Ver.1.0では固定テンプレートの組み合わせで生成するが、将来はここをAI生成に差し替える想定。
 * 年代ごとにアンカーとなる出来事を1つずつ選び、時代背景の語彙を添えながら物語としてつなげる。
 */
export function generateLifeStory(player: Player, era: EraId): string {
  if (player.lifeLogs.length <= SHORT_LIFE_STORY_LOG_THRESHOLD) {
    const anchor = pickAnchorLog(player.lifeLogs);
    const anchorPhrase = anchor ? `「${anchor.eventTitle}」という出来事もありましたが、` : '';
    return `${eraStoryOpening(player, era)}${anchorPhrase}まだ多くを語るには短い時間でしたが、そこで過ごした日々は確かなものでした。`;
  }

  const paragraphs: string[] = [eraStoryOpening(player, era)];

  const bracketAnchors = LIFE_STORY_BRACKETS.map((bracket) =>
    pickAnchorLog(player.lifeLogs.filter((log) => log.age >= bracket.minAge && log.age <= bracket.maxAge)),
  );

  const youngAnchor = bracketAnchors[0] ?? bracketAnchors[1];
  if (youngAnchor) {
    const tone =
      weightedNetEffect(youngAnchor.effects) < 0
        ? 'それは簡単なことではありませんでしたが、その出来事は、のちの選択に静かに影を落としました。'
        : 'その出来事は、その後の人生に小さな自信を残しました。';
    paragraphs.push(`${youngAnchor.age}歳の頃、「${youngAnchor.eventTitle}」という出来事がありました。${tone}`);
  }

  const workAnchor = bracketAnchors[2] ?? bracketAnchors[3];
  if (workAnchor) {
    paragraphs.push(
      `${eraFlavorPhrase(era)}、${workAnchor.age}歳では「${workAnchor.eventTitle}」を経験しました。人生は順風満帆ではありませんでしたが、そのたびに選び直しながら、${player.name}さんは前へ進んでいきました。`,
    );
  }

  const relationshipPhrase =
    player.relationshipStatus === 'married'
      ? player.hasChildren
        ? '家族と過ごす時間が、人生を支える大きな柱になりました。'
        : 'パートナーと過ごす時間が、人生の支えになりました。'
      : player.relationshipStatus === 'divorced'
        ? '人との関係には浮き沈みがありましたが、それもまた人生の一部でした。'
        : '一人の時間も、人とのつながりも、どちらも大切にしながら歩んできました。';
  paragraphs.push(relationshipPhrase);

  const elderAnchor = bracketAnchors[4];
  const closingFacts = '資産の多さだけでなく、人とのつながりや、健康を守ろうとした日々が、この人生を支えていたことに気づかされます。';
  const elderPhrase = elderAnchor ? `${elderAnchor.age}歳での「${elderAnchor.eventTitle}」を経て、` : '';
  if (player.graduationReasonId) {
    const reason = getGraduationReason(player.graduationReasonId);
    paragraphs.push(`${elderPhrase}${reason.body}${closingFacts}`);
  } else {
    paragraphs.push(`${elderPhrase}${closingFacts}`);
  }

  paragraphs.push('これは、派手ではないけれど、確かに自分の足で歩いた人生でした。');

  return paragraphs.join('\n\n');
}

/**
 * 最終レポートの「最後の総評」本文（プレースホルダー）。
 * 「勝ち負け」ではなく、資産・幸福度・健康・人間関係のバランスから人生の質を語る。
 */
export function generateFinalReview(player: Player): string {
  const type = calculateLifeType(player);
  const balanceScore = Math.round((player.happiness + player.health + player.relationships) / 3);

  const balancePhrase =
    balanceScore >= 70
      ? '幸福度・健康・人間関係のバランスが取れた、穏やかな充実感のある人生でした。'
      : balanceScore >= 45
        ? '良いことばかりではありませんでしたが、そのたびにバランスを取り戻しながら歩んだ人生でした。'
        : '楽ではない場面も多くありましたが、それでも歩みを止めなかった人生でした。';

  const moneyPhrase = player.money >= 800 ? '資産にも恵まれましたが、それだけが物差しではなく、' : '資産の多さだけが物差しではなく、';

  return `この人生は、大成功というよりも、何度も選び直した人生でした。${moneyPhrase}${balancePhrase}${type.headline}。最終的に残ったものは、数字だけでは測れない、${player.name}さんらしい歩みそのものでした。`;
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

