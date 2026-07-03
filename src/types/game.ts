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
  | 'family';

export type Rarity = 'common' | 'rare' | 'superRare';

export type StatEffects = Partial<Record<StatKey, number>>;

export interface EventChoice {
  id: string;
  label: string;
  effects: StatEffects;
}

export interface GameEvent {
  id: string;
  title: string;
  description: string;
  ageCategory: LifeStage;
  category: EventCategory;
  squareType: SquareType;
  effects: StatEffects;
  // 人生ログにそのまま使う本文。「〇〇して、〇〇になった」のような一文。
  logText: string;
  rarity: Rarity;
  choices?: EventChoice[];
  // 近未来イベント判定や、将来AIが生成タグ付けする際に使うフリータグ
  futureTag?: string;
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
  category: EventCategory;
  importance: LogImportance;
}

export interface Player {
  id: string;
  name: string;
  birthDate: string; // ISO 'YYYY-MM-DD'
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
}

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
}

export interface BranchPoint {
  id: string;
  position: number;
  name: string;
  routes: BranchRoute[];
}

export type GamePhase =
  | 'title'
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
  era: string; // 例: '2050'
  aiSocietyLevel: AiSocietyLevel;
  economy: EconomyLevel;
  disasterFrequency: DisasterFrequency;
  longevityMode: LongevityMode;
}

export interface PendingEventResult {
  effects: StatEffects;
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
  pendingBranchChoice: PendingBranchChoice | null;
  pendingGraduation: PendingGraduation | null;
  showLifeLog: boolean;
  showNewspaper: boolean;
}

export interface PlayerSetupInput {
  name: string;
  birthDate: string;
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
