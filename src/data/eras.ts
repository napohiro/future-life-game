import type { EraDefinition, EraId } from '../types/game';

// ============================================================
// 時代設定プリセット
// ------------------------------------------------------------
// 将来「昭和編」「バブル編」「2100年編」等を追加する場合は、
// types/game.ts の EraId に値を足し、この配列に定義を1件追加するだけでよい。
// ============================================================

export const ERA_DEFINITIONS: EraDefinition[] = [
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
  return ERA_DEFINITIONS.find((era) => era.id === id) ?? ERA_DEFINITIONS[1];
}
