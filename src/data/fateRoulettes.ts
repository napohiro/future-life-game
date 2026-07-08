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

// 「気になる人から食事に誘われた」専用の出会い運。RELATIONSHIP_FATE_ROULETTEは結婚を前提にした
// イベント（プロポーズ等）でも使い回されており、そちらのbaseStatusEffects（married）を
// 誤って上書きしてしまわないよう、新しい交際状態（relationshipStatus:'dating'）はこちらの
// 専用プリセットにだけ設定する。効果量・重みはRELATIONSHIP_FATE_ROULETTEと同一。
export const NEW_ENCOUNTER_FATE_ROULETTE: FateRoulette = {
  title: '出会いの運命',
  influenceStat: 'trust',
  outcomes: [
    {
      id: 'best-encounter',
      label: '最高の出会い',
      severity: 'greatSuccess',
      weight: 8,
      effects: { happiness: 20, relationships: 20 },
      statusEffects: { romanceStatus: '交際中', relationshipStatus: 'dating' },
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

// 危険度「low」向け。ほとんどが無事〜軽い不調で収まり、人生終了には至らない。
export const MINOR_RISK_FATE_ROULETTE: FateRoulette = {
  title: '運命判定',
  influenceStat: 'health',
  outcomes: [
    { id: 'safe', label: '無事だった', severity: 'greatSuccess', weight: 45, effects: { mentalStrength: 3 } },
    { id: 'minor-injury', label: '軽傷で済んだ', severity: 'success', weight: 30, effects: { health: -5 } },
    { id: 'lingering', label: '少し体調を崩した', severity: 'neutral', weight: 15, effects: { health: -10, happiness: -3 } },
    { id: 'setback', label: 'しばらく本調子に戻らなかった', severity: 'failure', weight: 8, effects: { health: -15, money: -5 } },
    { id: 'prolonged', label: '長引く不調に悩まされた', severity: 'greatFailure', weight: 2, effects: { health: -20, mentalStrength: -5 } },
  ],
};

// 危険度「high」向け。無事〜長期入院〜後遺症〜人生終了まで、幅広い結果を用意する。
export const MAJOR_ACCIDENT_FATE_ROULETTE: FateRoulette = {
  title: '運命判定',
  influenceStat: 'health',
  outcomes: [
    { id: 'safe', label: '無事だった', severity: 'greatSuccess', weight: 22, effects: { mentalStrength: 5 } },
    { id: 'minor-injury', label: '軽傷で済んだ', severity: 'success', weight: 26, effects: { health: -10 } },
    { id: 'long-hospitalization', label: '長期入院となった', severity: 'neutral', weight: 26, effects: { health: -25, money: -30, happiness: -5 } },
    {
      id: 'after-effects',
      label: '後遺症が残った',
      severity: 'failure',
      weight: 18,
      effects: { health: -35, money: -20, mentalStrength: -10 },
    },
    {
      id: 'life-ended',
      label: '人生の幕を閉じた',
      severity: 'greatFailure',
      weight: 8,
      effects: { health: -40 },
      endsLifeChance: 0.55,
    },
  ],
};

// 危険度「critical」向け。史実上の大事故・極めて危険な選択専用。出現頻度自体を
// oncePerGame・superRareで極端に絞ることを前提に、結果は重い方向へ大きく偏らせている。
export const CRITICAL_INCIDENT_FATE_ROULETTE: FateRoulette = {
  title: '運命判定',
  influenceStat: 'health',
  outcomes: [
    { id: 'miraculous-safe', label: '奇跡的に無事だった', severity: 'success', weight: 10, effects: { mentalStrength: 10, luck: 10 } },
    { id: 'after-effects', label: '後遺症が残った', severity: 'neutral', weight: 20, effects: { health: -40, mentalStrength: -15 } },
    {
      id: 'life-ended',
      label: '人生の幕を閉じた',
      severity: 'greatFailure',
      weight: 70,
      effects: { health: -50 },
      endsLifeChance: 0.75,
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

// ============================================================
// 「稀な運イベント」（超レアマス限定）専用プリセット
// ------------------------------------------------------------
// 宝くじ・懸賞・臨時収入・不意の出費など、人生に時々起こる「運」寄りの
// 出来事専用。高額当選が頻発しないよう、はずれ・小当たりの比重を大きくしている。
// ============================================================

// 宝くじ・懸賞。「1等:100万円」級の大当たりはごく低確率（5%前後）に抑え、
// ほとんどは「はずれ」〜「小さな当選」に収まるようにしてある。
export const LOTTERY_FATE_ROULETTE: FateRoulette = {
  title: '宝くじの運命',
  influenceStat: 'money',
  outcomes: [
    { id: 'first-prize', label: '1等：100万円', severity: 'greatSuccess', weight: 4, effects: { money: 100, happiness: 20, luck: 10 } },
    { id: 'second-prize', label: '2等：20万円', severity: 'success', weight: 9, effects: { money: 20, happiness: 10, luck: 5 } },
    { id: 'third-prize', label: '3等：5万円', severity: 'neutral', weight: 18, effects: { money: 5, happiness: 5 } },
    { id: 'small-prize', label: '参加賞：1万円', severity: 'failure', weight: 24, effects: { money: 1, happiness: 2 } },
    { id: 'miss', label: 'はずれ', severity: 'greatFailure', weight: 45, effects: {} },
  ],
};

// 忘れていた口座・資産や思わぬ臨時収入。大きな下振れは基本的に無いプラス寄りのルーレット。
export const WINDFALL_FATE_ROULETTE: FateRoulette = {
  title: '臨時収入の運命',
  influenceStat: 'money',
  outcomes: [
    { id: 'big-windfall', label: '思いがけない大きな臨時収入', severity: 'greatSuccess', weight: 5, effects: { money: 80, happiness: 15, luck: 10 } },
    { id: 'good-windfall', label: 'まとまった臨時収入', severity: 'success', weight: 10, effects: { money: 30, happiness: 10 } },
    { id: 'small-windfall', label: 'ちょっとした臨時収入', severity: 'neutral', weight: 25, effects: { money: 10, happiness: 5 } },
    { id: 'tiny-find', label: '少額の忘れ物を発見', severity: 'failure', weight: 30, effects: { money: 3 } },
    { id: 'nothing', label: '特に何も見つからなかった', severity: 'greatFailure', weight: 30, effects: {} },
  ],
};

// 高額な修理費・出費。マイナス方向が中心だが、severity=greatSuccessは
// 「大事に至らず軽い出費で済んだ」という“最良の結果”として扱う。
export const UNEXPECTED_EXPENSE_FATE_ROULETTE: FateRoulette = {
  title: '出費の運命',
  influenceStat: 'money',
  outcomes: [
    { id: 'minor', label: '大事に至らず、軽い出費で済んだ', severity: 'greatSuccess', weight: 20, effects: { money: -5, mentalStrength: 5 } },
    { id: 'expected', label: '想定内の出費で対応できた', severity: 'success', weight: 30, effects: { money: -15 } },
    { id: 'moderate', label: 'そこそこの出費がかかった', severity: 'neutral', weight: 28, effects: { money: -30, mentalStrength: -5 } },
    { id: 'high', label: '予想以上の高額な出費になった', severity: 'failure', weight: 15, effects: { money: -60, mentalStrength: -10 } },
    { id: 'severe', label: '非常に高額な出費が重なった', severity: 'greatFailure', weight: 7, effects: { money: -100, mentalStrength: -15, happiness: -10 } },
  ],
};

// 著名人・恩師との偶然の出会い。恋愛ではなく人脈・学びの広がりとして扱う
// （RELATIONSHIP_FATE_ROULETTEは恋愛用のため流用しない）。
export const ENCOUNTER_FATE_ROULETTE: FateRoulette = {
  title: '出会いの運命',
  influenceStat: 'trust',
  outcomes: [
    { id: 'life-changing', label: '人生を変える出会いになった', severity: 'greatSuccess', weight: 6, effects: { knowledge: 30, relationships: 15, socialContribution: 10 } },
    { id: 'valuable-advice', label: '貴重なアドバイスをもらえた', severity: 'success', weight: 22, effects: { knowledge: 15, relationships: 10 } },
    { id: 'brief-chat', label: '挨拶を交わした程度だった', severity: 'neutral', weight: 42, effects: { relationships: 5 } },
    { id: 'mistaken', label: '人違いだった', severity: 'failure', weight: 22, effects: { happiness: -3 } },
    { id: 'awkward', label: '気まずい思いをした', severity: 'greatFailure', weight: 8, effects: { happiness: -8, mentalStrength: -5 } },
  ],
};

// 近未来編（2050年）専用。再生医療・身体拡張・長寿治療など「延命につながる医療選択」用。
// 受けない場合は何のリスクも無いが、受ける場合はギャンブル性を持たせている
// （大失敗のみ ends LifeChance を持たせ、選択と運で回避・軽減できる余地を残す）。
export const LONGEVITY_TREATMENT_FATE_ROULETTE: FateRoulette = {
  title: '延命医療の運命',
  influenceStat: 'health',
  outcomes: [
    { id: 'rejuvenated', label: '劇的に若返った', severity: 'greatSuccess', weight: 10, effects: { health: 30, happiness: 15, aiAffinity: 5 } },
    { id: 'recovered', label: '順調に回復した', severity: 'success', weight: 28, effects: { health: 15, happiness: 5 } },
    { id: 'no-change', label: '目立った変化は無かった', severity: 'neutral', weight: 32, effects: {} },
    { id: 'side-effect', label: '副作用に悩まされた', severity: 'failure', weight: 22, effects: { health: -10, mentalStrength: -5 } },
    {
      id: 'complication',
      label: '深刻な合併症が出た',
      severity: 'greatFailure',
      weight: 8,
      effects: { health: -25, mentalStrength: -10 },
      endsLifeChance: 0.15,
    },
  ],
};

// 近未来編（2050年）専用の大型抽選。AI企業株・宇宙旅行・火星移住など、
// 金額に加えexperience/aiAffinityも動く近未来らしい効果配分にしている。
export const FUTURE_LOTTERY_FATE_ROULETTE: FateRoulette = {
  title: '近未来抽選の運命',
  influenceStat: 'aiAffinity',
  outcomes: [
    { id: 'special-selection', label: '特別当選：人生を変える体験', severity: 'greatSuccess', weight: 5, effects: { money: 150, experience: 30, aiAffinity: 15, happiness: 25, luck: 10 } },
    { id: 'premium-selection', label: '上位当選：プレミアムコース', severity: 'success', weight: 9, effects: { money: 60, experience: 20, aiAffinity: 10, happiness: 15 } },
    { id: 'standard-selection', label: '当選：標準コース', severity: 'neutral', weight: 18, effects: { money: 20, experience: 10, happiness: 10 } },
    { id: 'runner-up', label: '補欠当選（小さな特典）', severity: 'failure', weight: 26, effects: { money: 5, happiness: 5 } },
    { id: 'not-selected', label: '落選・不成立', severity: 'greatFailure', weight: 42, effects: {} },
  ],
};

// ============================================================
// 昭和編（1948年スタート）専用プリセット
// ------------------------------------------------------------
// 商店街の福引き・慰安旅行・宝くじなど、その年代の生活感に合った控えめな金額にしてある。
// 現代編・近未来編のような高額当選（100万円級）やAI株・宇宙旅行の類は出さない。
// ============================================================

// 商店街の福引き・年末くじ・懸賞など。1等でも数万円程度に抑えた、昭和の生活感に合う小さな運試し。
export const SHOWA_LOTTERY_FATE_ROULETTE: FateRoulette = {
  title: '福引き・懸賞の運命',
  influenceStat: 'money',
  outcomes: [
    { id: 'first-prize', label: '1等：豪華景品と現金5万円', severity: 'greatSuccess', weight: 5, effects: { money: 5, happiness: 15, luck: 8 } },
    { id: 'second-prize', label: '2等：商品券1万円分', severity: 'success', weight: 15, effects: { money: 1, happiness: 8 } },
    { id: 'third-prize', label: '3等：日用品の詰め合わせ', severity: 'neutral', weight: 30, effects: { happiness: 5 } },
    { id: 'small-prize', label: '4等：ちり紙・マッチ等の参加賞', severity: 'failure', weight: 30, effects: { happiness: 2 } },
    { id: 'miss', label: 'はずれ', severity: 'greatFailure', weight: 20, effects: {} },
  ],
};

// 職場の慰安旅行抽選・親戚からの援助・家電当選キャンペーンなど。控えめな臨時の喜び。
export const SHOWA_WINDFALL_FATE_ROULETTE: FateRoulette = {
  title: '思わぬ援助の運命',
  influenceStat: 'money',
  outcomes: [
    { id: 'big-help', label: '親戚からまとまった援助を受けた', severity: 'greatSuccess', weight: 8, effects: { money: 10, happiness: 12, relationships: 8 } },
    { id: 'good-help', label: '家電購入の抽選に当選した', severity: 'success', weight: 18, effects: { money: 3, happiness: 8 } },
    { id: 'small-help', label: '慰安旅行の幹事に選ばれた', severity: 'neutral', weight: 32, effects: { happiness: 5, relationships: 5 } },
    { id: 'tiny-help', label: 'ちょっとした差し入れをもらった', severity: 'failure', weight: 27, effects: { happiness: 3 } },
    { id: 'nothing', label: '特に何もなかった', severity: 'greatFailure', weight: 15, effects: {} },
  ],
};

// バブル期の土地・株の投資話。好況を反映してやや値が張るが、現代編・近未来編ほどの極端さは持たせていない。
export const SHOWA_BUBBLE_INVESTMENT_FATE_ROULETTE: FateRoulette = {
  title: 'バブル期投資の運命',
  influenceStat: 'money',
  outcomes: [
    { id: 'land-boom', label: '土地・株が大きく値上がりした', severity: 'greatSuccess', weight: 8, effects: { money: 30, happiness: 12 } },
    { id: 'modest-gain', label: 'まずまずの利益が出た', severity: 'success', weight: 22, effects: { money: 12, happiness: 5 } },
    { id: 'flat', label: '大きな変化はなかった', severity: 'neutral', weight: 30, effects: {} },
    { id: 'loss', label: '値下がりして損をした', severity: 'failure', weight: 25, effects: { money: -20, mentalStrength: -5 } },
    { id: 'bubble-burst', label: 'バブル崩壊で大きく資産を失った', severity: 'greatFailure', weight: 15, effects: { money: -35, mentalStrength: -10, happiness: -5 } },
  ],
};

// 不景気による急な収入減・出費増。昭和の暮らしに合わせて、金額は控えめに抑えている。
export const SHOWA_ECONOMY_DOWNTURN_FATE_ROULETTE: FateRoulette = {
  title: '景気変動の運命',
  influenceStat: 'money',
  outcomes: [
    { id: 'minor', label: '影響は軽微で済んだ', severity: 'greatSuccess', weight: 22, effects: { mentalStrength: 5 } },
    { id: 'manage', label: '節約でなんとか乗り切った', severity: 'success', weight: 28, effects: { money: -5 } },
    { id: 'moderate', label: 'ボーナスが減額された', severity: 'neutral', weight: 26, effects: { money: -10, mentalStrength: -3 } },
    { id: 'high', label: '残業代がなくなり家計が苦しくなった', severity: 'failure', weight: 16, effects: { money: -18, mentalStrength: -8 } },
    { id: 'severe', label: '勤め先の業績悪化で収入が大きく減った', severity: 'greatFailure', weight: 8, effects: { money: -28, mentalStrength: -12, happiness: -8 } },
  ],
};
