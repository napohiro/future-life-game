// ============================================================
// 盤面エリアカード（見出し表示専用）
// ------------------------------------------------------------
// ここで定義する「エリア」は、あくまで盤面上に表示する見出しカード用の
// 区分であり、マスの色分け・出現イベント・寿命判定などに使う既存の
// LifeStage（utils/gameLogic.tsのLIFE_STAGES、6区分）とは独立している。
// 見た目の見出しをより細かく・分かりやすくするための表示専用データなので、
// ここを変更してもゲーム進行ロジックには一切影響しない。
// ============================================================

export interface BoardAreaCardDef {
  id: string;
  title: string;
  ageLabel: string;
  /** このエリアが始まる年齢（=盤面position。1マス=1年のため、そのままposition指定に使える）。 */
  startAge: number;
  icon: string;
}

export const BOARD_AREA_CARDS: BoardAreaCardDef[] = [
  { id: 'infant', title: '幼少期エリア', ageLabel: '0〜12歳', startAge: 0, icon: '👶' },
  { id: 'student', title: '青春・学生エリア', ageLabel: '13〜19歳', startAge: 13, icon: '🎒' },
  { id: 'youngAdult', title: '若者・社会人前半エリア', ageLabel: '20〜29歳', startAge: 20, icon: '💼' },
  { id: 'primeFamily', title: '壮年・家族と仕事エリア', ageLabel: '30〜49歳', startAge: 30, icon: '🏠' },
  { id: 'turningPoint', title: '中年・人生の転機エリア', ageLabel: '50〜64歳', startAge: 50, icon: '🔀' },
  { id: 'secondLife', title: 'セカンドライフエリア', ageLabel: '65〜79歳', startAge: 65, icon: '🌇' },
  { id: 'elder', title: '老後エリア', ageLabel: '80〜99歳', startAge: 80, icon: '🌿' },
  { id: 'longevity', title: '長寿エリア', ageLabel: '100〜120歳', startAge: 100, icon: '✨' },
  { id: 'legend', title: '人類最高齢・伝説エリア', ageLabel: '121歳〜', startAge: 121, icon: '🏆' },
];

/** 年齢から、現在属しているエリアカードを1件返す（該当エリアの開始年齢以下で最も近いもの）。 */
export function getCurrentBoardArea(age: number): BoardAreaCardDef {
  let current = BOARD_AREA_CARDS[0];
  for (const area of BOARD_AREA_CARDS) {
    if (age >= area.startAge) current = area;
  }
  return current;
}
