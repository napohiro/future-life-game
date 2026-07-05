import type { EraId } from '../types/game';

// ============================================================
// 寿命システム設定（時代ごとの「寿命リスク開始年齢」と確率カーブ）
// ------------------------------------------------------------
// 時代ごとに「寿命リスクが本格的に始まる年齢」と、それ以降の年代帯別の
// 基礎確率を一元管理する。実際の判定（健康・治療・免疫等の補正込み）は
// utils/gameLogic.ts の calculateLifespanDeathChance() が担う。
// ============================================================

export interface LifespanTier {
  minAge: number;
  maxAge: number;
  deathChance: number;
}

export interface LifespanSetting {
  riskStartAge: number;
  tiers: LifespanTier[];
}

export const LIFESPAN_SETTINGS: Record<EraId, LifespanSetting> = {
  // 昭和編：60歳を超えたら寿命リスク開始（ショートゲーム）
  showa: {
    riskStartAge: 60,
    tiers: [
      { minAge: 61, maxAge: 64, deathChance: 0.05 },
      { minAge: 65, maxAge: 69, deathChance: 0.1 },
      { minAge: 70, maxAge: 74, deathChance: 0.2 },
      { minAge: 75, maxAge: 79, deathChance: 0.35 },
      { minAge: 80, maxAge: Infinity, deathChance: 0.55 },
    ],
  },
  // 現代編2026：80歳を超えたら寿命リスク開始（ミドルゲーム）
  present: {
    riskStartAge: 80,
    tiers: [
      { minAge: 81, maxAge: 84, deathChance: 0.05 },
      { minAge: 85, maxAge: 89, deathChance: 0.1 },
      { minAge: 90, maxAge: 94, deathChance: 0.2 },
      { minAge: 95, maxAge: 99, deathChance: 0.35 },
      { minAge: 100, maxAge: Infinity, deathChance: 0.55 },
    ],
  },
  // 近未来編2050：100歳を超えたら寿命リスク開始（ロングゲーム）
  future: {
    riskStartAge: 100,
    tiers: [
      { minAge: 101, maxAge: 104, deathChance: 0.05 },
      { minAge: 105, maxAge: 109, deathChance: 0.1 },
      { minAge: 110, maxAge: 114, deathChance: 0.2 },
      { minAge: 115, maxAge: 119, deathChance: 0.35 },
      { minAge: 120, maxAge: Infinity, deathChance: 0.55 },
    ],
  },
};

export function getLifespanSetting(era: EraId): LifespanSetting {
  return LIFESPAN_SETTINGS[era];
}

/** 時代・年齢から「寿命リスク開始年齢を超えているか」を判定する。 */
export function isPastLifespanRiskAge(era: EraId, age: number): boolean {
  return age > LIFESPAN_SETTINGS[era].riskStartAge;
}

/** 時代・年齢から、補正前の基礎寿命確率を返す（開始年齢以下は0）。 */
export function getBaseDeathChance(era: EraId, age: number): number {
  const setting = LIFESPAN_SETTINGS[era];
  if (age <= setting.riskStartAge) return 0;
  const tier = setting.tiers.find((t) => age >= t.minAge && age <= t.maxAge);
  return tier ? tier.deathChance : setting.tiers[setting.tiers.length - 1].deathChance;
}
