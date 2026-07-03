import type { BranchPoint, EventCategory } from '../types/game';

// ============================================================
// 人生の分岐点データ（Ver.2）
// ------------------------------------------------------------
// 18・30・45・60歳の分岐マスで選ぶ「人生ルート」。
// 選んだルートは player.currentRoute / chosenRoutes に記録され、
// - 人生ログ・人生新聞・最終レポートに表示される
// - 以降のイベント抽選で categoryBoost に含まれるカテゴリが少し出やすくなる
// という2つの効果を持つ。ボード自体が物理的に分かれるような本格分岐はまだ実装しない。
// ============================================================

export const BRANCH_POINTS: BranchPoint[] = [
  {
    id: 'branch-path',
    position: 18,
    name: '進路分岐',
    routes: [
      {
        id: 'path-study',
        name: '進学する',
        icon: '🎓',
        startPosition: 18,
        endPosition: 19,
        description: 'さらに学び、専門性を高める道を選んだ。',
        logCategory: 'study',
        categoryBoost: ['study'],
        effectsModifier: { knowledge: 10 },
      },
      {
        id: 'path-work',
        name: '就職する',
        icon: '💼',
        startPosition: 18,
        endPosition: 19,
        description: '早く社会に出て働く道を選んだ。',
        logCategory: 'work',
        categoryBoost: ['work', 'jobChange'],
        effectsModifier: { money: 10, experience: 5 },
      },
      {
        id: 'path-specialty',
        name: '専門分野を学ぶ',
        icon: '🔬',
        startPosition: 18,
        endPosition: 19,
        description: '専門学校などで、手に職をつける道を選んだ。',
        logCategory: 'study',
        categoryBoost: ['study'],
        effectsModifier: { knowledge: 8, experience: 5 },
      },
      {
        id: 'path-challenge',
        name: '挑戦の道へ進む',
        icon: '🔥',
        startPosition: 18,
        endPosition: 19,
        description: '型にはまらない挑戦の道を選んだ。',
        logCategory: 'challenge',
        categoryBoost: ['challenge', 'startup'],
        effectsModifier: { actionPower: 10, luck: 5 },
      },
    ],
  },
  {
    id: 'branch-work',
    position: 30,
    name: '働き方分岐',
    routes: [
      {
        id: 'work-employee',
        name: '会社員として安定を選ぶ',
        icon: '🏢',
        startPosition: 30,
        endPosition: 31,
        description: '安定した会社員としての道を選んだ。',
        logCategory: 'work',
        categoryBoost: ['work'],
        effectsModifier: { trust: 10, money: 5 },
      },
      {
        id: 'work-startup',
        name: '起業に挑戦する',
        icon: '🚀',
        startPosition: 30,
        endPosition: 31,
        description: '自分の事業を興す道を選んだ。',
        logCategory: 'startup',
        categoryBoost: ['startup', 'investment'],
        effectsModifier: { actionPower: 10, experience: 5 },
      },
      {
        id: 'work-free',
        name: '自由な働き方を選ぶ',
        icon: '🕊️',
        startPosition: 30,
        endPosition: 31,
        description: '組織に縛られない自由な働き方を選んだ。',
        logCategory: 'hobby',
        categoryBoost: ['hobby'],
        effectsModifier: { freedom: 10, happiness: 5 },
      },
      {
        id: 'work-ai',
        name: 'AIスキルを伸ばす',
        icon: '🤖',
        startPosition: 30,
        endPosition: 31,
        description: 'AIを使いこなすスキルを磨く道を選んだ。',
        logCategory: 'ai',
        categoryBoost: ['ai', 'work'],
        effectsModifier: { aiAffinity: 10, knowledge: 5 },
      },
    ],
  },
  {
    id: 'branch-turning',
    position: 45,
    name: '人生転機分岐',
    routes: [
      {
        id: 'turning-family',
        name: '家族を大切にする',
        icon: '👨‍👩‍👧',
        startPosition: 45,
        endPosition: 46,
        description: '家族との時間を大切にする道を選んだ。',
        logCategory: 'family',
        categoryBoost: ['family', 'childcare', 'care'],
        effectsModifier: { relationships: 10, happiness: 5 },
      },
      {
        id: 'turning-work',
        name: '仕事で勝負する',
        icon: '📈',
        startPosition: 45,
        endPosition: 46,
        description: '仕事にさらに力を注ぐ道を選んだ。',
        logCategory: 'work',
        categoryBoost: ['work', 'jobChange'],
        effectsModifier: { money: 10, experience: 5 },
      },
      {
        id: 'turning-study',
        name: '学び直す',
        icon: '📖',
        startPosition: 45,
        endPosition: 46,
        description: '新しい学びに挑戦し直す道を選んだ。',
        logCategory: 'study',
        categoryBoost: ['study'],
        effectsModifier: { knowledge: 10, mentalStrength: 5 },
      },
      {
        id: 'turning-health',
        name: '健康を立て直す',
        icon: '💪',
        startPosition: 45,
        endPosition: 46,
        description: '生活習慣を見直し、健康を立て直す道を選んだ。',
        logCategory: 'health',
        categoryBoost: ['health', 'illness'],
        effectsModifier: { health: 10, mentalStrength: 5 },
      },
    ],
  },
  {
    id: 'branch-secondlife',
    position: 60,
    name: 'セカンドライフ分岐',
    routes: [
      {
        id: 'second-community',
        name: '地域活動を始める',
        icon: '🌍',
        startPosition: 60,
        endPosition: 61,
        description: '地域とのつながりを大切にする道を選んだ。',
        logCategory: 'social',
        categoryBoost: ['social', 'friend'],
        effectsModifier: { socialContribution: 10, relationships: 5 },
      },
      {
        id: 'second-hobby',
        name: '趣味を深める',
        icon: '🎨',
        startPosition: 60,
        endPosition: 61,
        description: '趣味に打ち込む道を選んだ。',
        logCategory: 'hobby',
        categoryBoost: ['hobby'],
        effectsModifier: { happiness: 10, mentalStrength: 5 },
      },
      {
        id: 'second-health',
        name: '健康を最優先する',
        icon: '🏥',
        startPosition: 60,
        endPosition: 61,
        description: '健康第一の暮らしを選んだ。',
        logCategory: 'health',
        categoryBoost: ['health', 'illness'],
        effectsModifier: { health: 10, mentalStrength: 5 },
      },
      {
        id: 'second-challenge',
        name: '新しい挑戦をする',
        icon: '✨',
        startPosition: 60,
        endPosition: 61,
        description: 'この年になっても、新しい挑戦を始めた。',
        logCategory: 'challenge',
        categoryBoost: ['challenge'],
        effectsModifier: { actionPower: 10, luck: 5 },
      },
    ],
  },
];

export const BRANCH_TRIGGER_POSITIONS: number[] = BRANCH_POINTS.map((bp) => bp.position);

export function getBranchPointForPosition(position: number): BranchPoint | undefined {
  return BRANCH_POINTS.find((bp) => bp.position === position);
}

const ROUTE_LOOKUP: Map<string, { name: string; icon: string; categoryBoost: EventCategory[] }> = new Map(
  BRANCH_POINTS.flatMap((bp) => bp.routes.map((route) => [route.id, route])),
);

export function getRouteById(routeId: string): { name: string; icon: string; categoryBoost: EventCategory[] } | undefined {
  return ROUTE_LOOKUP.get(routeId);
}

/** プレイヤーが選んだ全ルートから、イベント抽選で優遇するカテゴリの一覧を作る（重複はそのまま重みとして活かす）。 */
export function getCategoryBoostsForRoutes(chosenRoutes: string[]): EventCategory[] {
  return chosenRoutes.flatMap((routeId) => ROUTE_LOOKUP.get(routeId)?.categoryBoost ?? []);
}
