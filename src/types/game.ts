// 近未来人生ゲーム - 型定義（Ver.1.0）
// 将来、AI生成イベント／人生新聞／Supabase保存などを追加する際もこの型を拡張していく想定。

export type StatKey =
  | 'money'
  | 'health'
  | 'happiness'
  | 'knowledge'
  | 'relationships'
  | 'freedom'
  | 'experience'
  | 'luck'
  | 'mentalStrength'
  | 'trust'
  | 'socialContribution'
  | 'aiAffinity'
  | 'actionPower';

export const STAT_KEYS: StatKey[] = [
  'money',
  'health',
  'happiness',
  'knowledge',
  'relationships',
  'freedom',
  'experience',
  'luck',
  'mentalStrength',
  'trust',
  'socialContribution',
  'aiAffinity',
  'actionPower',
];

// 盤面・実年齢の両方で使う人生ステージ（Ver.1.0で120マス・6ステージ構成に拡張）。
// stage1:幼少期 0-12 / stage2:学生時代 13-22 / stage3:若者・社会人前半 23-39
// stage4:人生の転機 40-59 / stage5:セカンドライフ 60-79 / stage6:老後・近未来 80〜
export type LifeStage = 'stage1' | 'stage2' | 'stage3' | 'stage4' | 'stage5' | 'stage6';

// マス種類。マスの見た目・イベント抽選の傾向を決める。
export type SquareType =
  | 'normal'
  | 'chance'
  | 'pinch'
  | 'aiEra'
  | 'turningPoint'
  | 'love'
  | 'work'
  | 'family'
  | 'health'
  | 'investment'
  | 'study'
  | 'hobby'
  | 'social'
  | 'future'
  | 'superRare';

// イベントのテーマカテゴリ（固定イベントデータの分類軸）。
export type EventCategory =
  | 'child'
  | 'student'
  | 'work'
  | 'love'
  | 'marriage'
  | 'divorce'
  | 'childcare'
  | 'care'
  | 'investment'
  | 'health'
  | 'illness'
  | 'accident'
  | 'ai'
  | 'disaster'
  | 'space'
  | 'hobby'
  | 'challenge'
  | 'study'
  | 'elder'
  | 'death'
  | 'social'
  | 'fraud'
  | 'jobChange'
  | 'startup'
  | 'friend'
  | 'club'
  | 'path'
  | 'partTime'
  | 'retirement'
  | 'grandchild'
  | 'endOfLife'
  | 'reflection'
  | 'smallChallenge'
  | 'smallPinch'
  | 'family'
  | 'housing'
  | 'fortune';

export type Rarity = 'common' | 'rare' | 'superRare';

// 時代設定のID。将来「昭和編」「バブル編」等を追加する際は、この型に値を足し、
// data/eras.ts の ERA_DEFINITIONS に定義を1件追加するだけでよい構造にしてある。
export type EraId = 'present' | 'future';

// 時代1つ分の定義（時代選択画面・世界設定バッジ・ゲーム画面上部表示で共通利用）。
export interface EraDefinition {
  id: EraId;
  name: string; // 例：'現代編'
  year: number; // 例：2026
  description: string;
  icon: string;
}

export type StatEffects = Partial<Record<StatKey, number>>;

// イベントの性格を表す分類軸（EventCategoryとは別軸）。結果モーダル・人生ログの小さなラベル表示に使う。
// 明示的に指定しない既存イベントは、utils/gameLogic.ts の deriveEventType() が内容から自動判定する。
export type EventType = 'choice' | 'lucky' | 'unlucky' | 'growth' | 'turningPoint' | 'nearFuture';

// 職業・年収・恋愛家族状況・住居など、数値の増減ではなく「状態そのもの」が変化する系のステータス。
// 将来的に複数エンディングへ拡張しやすいよう、StatEffects（数値差分）とは独立したデータ構造にしてある。
export interface StatusEffects {
  occupation?: string;
  annualIncomeDelta?: number;
  romanceStatus?: string;
  housingStatus?: string;
}

// 運命ルーレットの結果の重要度（見た目の色・アイコンに使う5段階）。
export type FateSeverity = 'greatSuccess' | 'success' | 'neutral' | 'failure' | 'greatFailure';

export interface FateOutcome {
  id: string;
  label: string;
  severity: FateSeverity;
  // 抽選の基準重み。プレイヤーのステータス（influenceStat）に応じて少しだけ補正される。
  weight: number;
  effects: StatEffects;
  statusEffects?: StatusEffects;
  // この結果に至った場合の「人生終了」確率（0〜1）。最も厳しい結果（greatFailure）にのみ設定するのが基本。
  endsLifeChance?: number;
}

// どのステータスが結果の出やすさに少し影響するか（例：健康が高いほど健康リスク系の良い結果が出やすい）。
export type FateInfluenceStat = 'health' | 'trust' | 'money' | 'aiAffinity';

export interface FateRoulette {
  title: string;
  outcomes: FateOutcome[];
  influenceStat?: FateInfluenceStat;
}

export interface EventChoice {
  id: string;
  label: string;
  effects: StatEffects;
  statusEffects?: StatusEffects;
  // このコマンドを選んだ場合に「人生終了」に至る確率（0〜1）。低確率・任意設定。
  // 安全側の選択肢では設定しない（＝回避できる）ことで、プレイヤーの選択で軽減・回避できる余地を残す。
  endsLifeChance?: number;
  // 設定されている場合、選択直後に結果を確定せず、運命ルーレットを表示してから結果を確定する。
  fateRoulette?: FateRoulette;
  // この選択をすると付与される「人生フラグ」（留学経験・AIスキルなど）。以降のイベント抽選条件に使う。
  grantsFlags?: string[];
}

export interface GameEvent {
  id: string;
  title: string;
  description: string;
  ageCategory: LifeStage;
  category: EventCategory;
  squareType: SquareType;
  effects: StatEffects;
  statusEffects?: StatusEffects;
  // 選択肢を持たないイベント自体が「人生終了」に至る確率（0〜1）。低確率・任意設定。
  endsLifeChance?: number;
  // 選択肢を持たないイベント自体に運命ルーレットを設定する場合に使う。
  fateRoulette?: FateRoulette;
  // 選択肢を持たないイベント自体が付与する人生フラグ。
  grantsFlags?: string[];
  // 年齢による厳密な絞り込み（未指定の場合はageCategoryの年代幅がそのまま適用される）。
  // 例：幼少期(stage1)の中でも「読書にハマる」はminAge:6など、より自然な年齢に絞れる。
  minAge?: number;
  maxAge?: number;
  // このイベントの候補条件。プレイヤーの人生フラグ（lifeFlags）を見て絞り込む。
  requiredFlags?: string[]; // すべて満たしている場合のみ候補になる
  excludedFlags?: string[]; // いずれか1つでも満たしていたら候補から除外
  // 一生に一度しか発生しない（留学など）。
  oncePerGame?: boolean;
  // 同じイベントが再度候補になるまでに必要な年数（同一イベントIDでの間隔）。
  cooldownYears?: number;
  // 人生ログにそのまま使う本文。「〇〇して、〇〇になった」のような一文。
  logText: string;
  rarity: Rarity;
  choices?: EventChoice[];
  // 近未来イベント判定や、将来AIが生成タグ付けする際に使うフリータグ
  futureTag?: string;
  eventType?: EventType;
  // このイベントが出現しうる時代を明示的に限定する場合に指定する（例：現代編専用イベントに ['present']）。
  // 未指定の場合は全時代共通（既存イベントは原則これ）。近未来編限定の判定は futureTag / category(ai, space)
  // から自動判定するため、既存イベントにこのフィールドを付与し直す必要はない。
  era?: EraId[];
}

export type LogImportance = 'normal' | 'high' | 'critical';

export interface LifeLogEntry {
  id: string;
  turn: number;
  age: number;
  position: number;
  eventTitle: string;
  eventDescription: string;
  choiceLabel?: string;
  effects: StatEffects;
  statusEffects?: StatusEffects;
  category: EventCategory;
  importance: LogImportance;
  eventType: EventType;
  // 運命ルーレットを経た結果の場合のみ設定される。
  fateOutcomeLabel?: string;
  fateSeverity?: FateSeverity;
  // 発生元イベント（またはルート分岐・卒業理由）のID。oncePerGame・クールダウン判定や
  // 「同じイベントの繰り返しを避ける」ためのプレイヤー個人の履歴照会に使う。
  eventId: string;
}

export interface Player {
  id: string;
  name: string;
  age: number;
  position: number;
  money: number;
  health: number;
  happiness: number;
  knowledge: number;
  relationships: number;
  freedom: number;
  experience: number;
  luck: number;
  mentalStrength: number;
  trust: number;
  socialContribution: number;
  aiAffinity: number;
  actionPower: number;
  lifeLogs: LifeLogEntry[];
  finished: boolean;
  // 人生の分岐点（BranchPoint）で選んだルート。将来、本格的なルート分岐機能を追加する際の下地。
  currentRoute?: string;
  chosenRoutes: string[];
  // 「人生の卒業」を迎えた年齢と理由（80歳以降、確率判定で決まる。固定ゴールではない）。
  graduationAge?: number;
  graduationReasonId?: string;
  // 職業・年収・恋愛家族状況・住居。数値ステータス（StatKey）とは別枠で管理し、
  // 現時点では最終スコア・卒業判定には影響させない（将来の複数エンディング拡張用の下地）。
  occupation: string;
  annualIncome: number;
  romanceStatus: string;
  housingStatus: string;
  // ゲーム開始時にランダムで1つ付与される、小さな個性・才能（人生の方向性に少しだけ影響する）。
  personality: PersonalityTrait;
  // 留学経験・AIスキル・起業経験など、過去の重要な選択の積み重ねを表す「人生フラグ」。
  // イベント抽選の候補条件（requiredFlags/excludedFlags）に使う。数値スコアには影響しない。
  lifeFlags: string[];
}

// ゲーム開始時にランダムで1つ付与される、小さな個性・才能。
export type PersonalityTrait =
  | 'curious'
  | 'steady'
  | 'popular'
  | 'healthy'
  | 'artistic'
  | 'analytical'
  | 'techLover'
  | 'familyOriented'
  | 'competitive'
  | 'cautious';

// 卒業理由の1つ。老衰・病気・事故など、ステータスに応じて重み付きで選ばれる。
export interface GraduationReason {
  id: string;
  label: string;
  title: string;
  body: string;
}

// 盤面上の「分かれ道」の1つのルート。Ver.1.0では装飾＋軽いフレーバー効果のみで、
// 本格的な経路分岐（ボード自体が分かれる）はまだ実装しない。将来の拡張口として型だけ先に用意する。
export interface BranchRoute {
  id: string;
  name: string;
  icon: string;
  startPosition: number;
  endPosition: number;
  requiredChoice?: string;
  description: string;
  // 人生ログに記録する際のカテゴリ（人生新聞・最終レポートのバッジ表示にも使う）。
  logCategory: EventCategory;
  // このルートを選んだプレイヤーに対して、今後のイベント抽選で少し出やすくするカテゴリ。
  categoryBoost: EventCategory[];
  effectsModifier?: StatEffects;
  // 選んだ瞬間に職業・住居などの状態ステータスを変える場合に使う（時代限定ルートの職業演出用）。
  statusEffectsModifier?: StatusEffects;
  // このルートが出現する時代を限定する場合に指定する（未指定は全時代共通）。
  era?: EraId[];
}

export interface BranchPoint {
  id: string;
  position: number;
  name: string;
  routes: BranchRoute[];
}

export type GamePhase =
  | 'title'
  | 'eraSelect'
  | 'setup'
  | 'worldSettings'
  | 'howToPlay'
  | 'playing'
  | 'finished';

export type AiSocietyLevel = 'low' | 'mid' | 'high';
export type EconomyLevel = 'recession' | 'normal' | 'boom';
export type DisasterFrequency = 'low' | 'normal' | 'high';
export type LongevityMode = 'standard' | 'longevity';

// 世界設定。Ver.1.0ではイベント抽選に軽く影響する程度だが、将来の本格反映のために独立した型にしてある。
export interface GameSettings {
  era: EraId; // 時代選択画面で選んだ時代（'present'=現代編2026年 / 'future'=近未来編2050年）
  aiSocietyLevel: AiSocietyLevel;
  economy: EconomyLevel;
  disasterFrequency: DisasterFrequency;
  longevityMode: LongevityMode;
}

export interface PendingEventResult {
  effects: StatEffects;
  statusEffects?: StatusEffects;
  choiceLabel?: string;
  eventType: EventType;
  endsLifeChance?: number;
  fateOutcomeLabel?: string;
  fateSeverity?: FateSeverity;
  grantsFlags?: string[];
}

// 選択肢（または選択肢のないイベント自体）に運命ルーレットが設定されていた場合、
// 実際に回して結果が決まるまでの間だけ保持する一時的な状態。
export interface PendingFateRoulette {
  fateRoulette: FateRoulette;
  baseEffects: StatEffects;
  baseStatusEffects?: StatusEffects;
  baseEndsLifeChance?: number;
  baseGrantsFlags?: string[];
  choiceLabel?: string;
}

export interface PendingBranchChoice {
  branchId: string;
  branchName: string;
  playerId: string;
  playerName: string;
  routes: BranchRoute[];
}

export interface PendingGraduation {
  playerId: string;
  playerName: string;
  age: number;
  reason: GraduationReason;
}

export interface GameState {
  phase: GamePhase;
  players: Player[];
  settings: GameSettings;
  currentPlayerIndex: number;
  boardSize: number;
  turnCount: number;
  lastRoll: number | null;
  activeEvent: GameEvent | null;
  activePlayerIdForEvent: string | null;
  pendingResult: PendingEventResult | null;
  pendingFateRoulette: PendingFateRoulette | null;
  pendingBranchChoice: PendingBranchChoice | null;
  pendingGraduation: PendingGraduation | null;
  showLifeLog: boolean;
  showNewspaper: boolean;
}

export interface PlayerSetupInput {
  name: string;
}

// ルーレット後、コマが1マスずつ進む演出の間だけ保持する一時的な状態。
// stepIndex は「今何マス目まで進んだか」（0はまだ動き出す前）、totalSteps は今回の合計移動マス数。
export interface MoveAnimationState {
  playerId: string;
  playerName: string;
  roll: number;
  stepIndex: number;
  totalSteps: number;
}
