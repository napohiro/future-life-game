import type { EraId, SquareType } from '../types/game';

// ============================================================
// UI素材（背景画像・盤面アイコン）の一元管理
// ------------------------------------------------------------
// 画像パスを各コンポーネントに直書きせず、必ずここを経由して参照する。
// 対応する画像が無い（もしくは読み込みに失敗した）場合は、呼び出し側で
// 既存の絵文字アイコンへ安全にフォールバックする（components/SquareIcon.tsx）。
// ============================================================

/** 時代選択カード・ゲーム盤の背景に使う、時代ごとの世界観画像。 */
export const ERA_BACKGROUND_IMAGES: Record<EraId, string> = {
  showa: '/assets/backgrounds/bg-showa.png',
  present: '/assets/backgrounds/bg-present-2026.png',
  future: '/assets/backgrounds/bg-future-2050.png',
};

// 盤面マスの種類ごとのアイコン画像。normal（無地）と superRare（虹色シマー演出で
// 十分特別感が出るため）は、あえて画像を割り当てず既存の絵文字のままにしている。
export const SQUARE_TYPE_ICON_IMAGES: Partial<Record<SquareType, string>> = {
  chance: '/assets/icons/icon-lucky.png',
  pinch: '/assets/icons/icon-health.png',
  aiEra: '/assets/icons/icon-ai.png',
  turningPoint: '/assets/icons/icon-up.png',
  love: '/assets/icons/icon-love.png',
  work: '/assets/icons/icon-bussiness.png',
  family: '/assets/icons/icon-home.png',
  health: '/assets/icons/icon-hospital.png',
  investment: '/assets/icons/icon-assets.png',
  study: '/assets/icons/icon-study.png',
  hobby: '/assets/icons/icon-club.png',
  social: '/assets/icons/icon-friend.png',
  future: '/assets/icons/icon-space.png',
};

// 「人生の節目」の巨大マス（BOARD_MILESTONES、gameLogic.ts）の位置＝年齢ごとのアイコン画像。
export const MILESTONE_ICON_IMAGES: Record<number, string> = {
  0: '/assets/icons/icon-birth.png',
  6: '/assets/icons/icon-school.png',
  13: '/assets/icons/icon-school.png',
  18: '/assets/icons/icon-graduation.png',
  23: '/assets/icons/icon-bussiness.png',
  30: '/assets/icons/icon-up.png',
  40: '/assets/icons/icon-up.png',
  60: '/assets/icons/icon-longlife.png',
  80: '/assets/icons/icon-space.png',
  100: '/assets/icons/icon-longlife.png',
  120: '/assets/icons/icon-lucky.png',
  150: '/assets/icons/icon-up.png',
};
