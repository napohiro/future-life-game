import type { FateRoulette } from '../types/game';

// ============================================================
// 運命ルーレット プリセット
// ------------------------------------------------------------
// 「選択＋運」イベント用の結果テーブル。イベントデータ側は
// これらのプリセットを choice.fateRoulette に指定するだけでよい。
// 個別イベントで独自の結果テーブルが必要な場合は、同じ形の
// オブジェクトをその場で定義してもよい（将来の拡張しやすさを優先した構造）。
// ============================================================

export const INVESTMENT_FATE_ROULETTE: FateRoulette = {
  title: '投資の運命',
  influenceStat: 'money',
  outcomes: [
    { id: 'great-success', label: '大成功', severity: 'greatSuccess', weight: 6, effects: { money: 100, happiness: 15, luck: 10 } },
    { id: 'success', label: '利益', severity: 'success', weight: 24, effects: { money: 40, happiness: 5 } },
    { id: 'neutral', label: '現状維持', severity: 'neutral', weight: 30, effects: {} },
    { id: 'failure', label: '損失', severity: 'failure', weight: 28, effects: { money: -30, mentalStrength: -5 } },
    { id: 'great-failure', label: '大損', severity: 'greatFailure', weight: 12, effects: { money: -70, mentalStrength: -15, happiness: -10 } },
  ],
};

export const JOB_CHANGE_FATE_ROULETTE: FateRoulette = {
  title: '転職の運命',
  influenceStat: 'trust',
  outcomes: [
    {
      id: 'ideal-offer',
      label: '理想の内定',
      severity: 'greatSuccess',
      weight: 8,
      effects: { money: 20, happiness: 20, actionPower: 10 },
      statusEffects: { occupation: '希望の職種', annualIncomeDelta: 100 },
    },
    {
      id: 'offer',
      label: '内定',
      severity: 'success',
      weight: 26,
      effects: { money: 10, happiness: 10 },
      statusEffects: { occupation: '転職先の会社員', annualIncomeDelta: 50 },
    },
    {
      id: 'conditional',
      label: '条件付き採用',
      severity: 'neutral',
      weight: 32,
      effects: { happiness: 2 },
      statusEffects: { occupation: '契約社員', annualIncomeDelta: 10 },
    },
    { id: 'rejected', label: '見送り', severity: 'failure', weight: 24, effects: { happiness: -10, mentalStrength: -5 } },
    { id: 'retry', label: '再挑戦', severity: 'greatFailure', weight: 10, effects: { happiness: -15, mentalStrength: -10, freedom: -5 } },
  ],
};

export const RELATIONSHIP_FATE_ROULETTE: FateRoulette = {
  title: '出会いの運命',
  influenceStat: 'trust',
  outcomes: [
    {
      id: 'best-encounter',
      label: '最高の出会い',
      severity: 'greatSuccess',
      weight: 8,
      effects: { happiness: 20, relationships: 20 },
      statusEffects: { romanceStatus: '交際中' },
    },
    { id: 'good-relationship', label: '良い関係になる', severity: 'success', weight: 26, effects: { happiness: 10, relationships: 12 } },
    { id: 'friendship', label: '友人関係に落ち着く', severity: 'neutral', weight: 32, effects: { relationships: 5 } },
    { id: 'miss', label: 'すれ違う', severity: 'failure', weight: 24, effects: { happiness: -8, relationships: -5 } },
    { id: 'worsen', label: '関係が悪化する', severity: 'greatFailure', weight: 10, effects: { happiness: -15, relationships: -15, trust: -5 } },
  ],
};

// 事故・健康リスクなど「人生終了」につながりうる運命ルーレット。
// 最も厳しい結果（人生終了の危機）にのみ endsLifeChance を設定し、
// そこに至っても必ず人生終了するわけではない（さらに低確率の抽選を挟む）ようにしている。
export const HEALTH_RISK_FATE_ROULETTE: FateRoulette = {
  title: '安否の運命',
  influenceStat: 'health',
  outcomes: [
    { id: 'safe', label: '無事', severity: 'greatSuccess', weight: 40, effects: { mentalStrength: 5 } },
    { id: 'minor', label: '軽い影響', severity: 'success', weight: 30, effects: { health: -5 } },
    { id: 'caution', label: '要注意', severity: 'neutral', weight: 18, effects: { health: -15, money: -10 } },
    { id: 'major-damage', label: '大きなダメージ', severity: 'failure', weight: 9, effects: { health: -30, money: -20, mentalStrength: -10 } },
    {
      id: 'life-crisis',
      label: '人生終了の危機',
      severity: 'greatFailure',
      weight: 3,
      effects: { health: -40 },
      endsLifeChance: 0.4,
    },
  ],
};

export const TECH_FATE_ROULETTE: FateRoulette = {
  title: '近未来テクノロジーの運命',
  influenceStat: 'aiAffinity',
  outcomes: [
    { id: 'breakthrough', label: '革新的な成功', severity: 'greatSuccess', weight: 8, effects: { money: 40, aiAffinity: 15, happiness: 15 } },
    { id: 'convenient', label: '大きな便利さを得る', severity: 'success', weight: 26, effects: { freedom: 15, happiness: 10 } },
    { id: 'small-effect', label: '小さな効果', severity: 'neutral', weight: 34, effects: { aiAffinity: 5 } },
    { id: 'cost-only', label: 'コストだけかかる', severity: 'failure', weight: 22, effects: { money: -20, happiness: -5 } },
    { id: 'trouble', label: 'トラブル発生', severity: 'greatFailure', weight: 10, effects: { money: -30, mentalStrength: -10, trust: -5 } },
  ],
};

// 現代編（2026年）専用イベント用の軽いテクノロジー運。近未来編のTECH_FATE_ROULETTEとは異なり、
// SNS/スマホ/生成AIツールなど「今の延長線上の便利さ」に振った効果量にしている。
export const PRESENT_TECH_FATE_ROULETTE: FateRoulette = {
  title: 'デジタル活用の運命',
  influenceStat: 'aiAffinity',
  outcomes: [
    { id: 'viral-hit', label: '思わぬバズり', severity: 'greatSuccess', weight: 8, effects: { money: 20, happiness: 15, aiAffinity: 10 } },
    { id: 'useful', label: '便利に使いこなせた', severity: 'success', weight: 26, effects: { freedom: 10, happiness: 8 } },
    { id: 'so-so', label: 'まずまずの効果', severity: 'neutral', weight: 34, effects: { aiAffinity: 5 } },
    { id: 'time-sink', label: '時間を取られただけだった', severity: 'failure', weight: 22, effects: { happiness: -5, mentalStrength: -5 } },
    { id: 'backlash', label: '炎上・トラブルになった', severity: 'greatFailure', weight: 10, effects: { money: -15, trust: -10, mentalStrength: -10 } },
  ],
};
