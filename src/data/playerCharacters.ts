// ============================================================
// プレイヤーキャラクター（顔アイコン・ゲーム盤コマ）定義
// ------------------------------------------------------------
// キャラクター情報をここで一元管理する。プレイヤー設定画面の選択候補（avatar）と、
// 盤面で動くコマ画像（token）は、必ずこの定義から同じ id 経由で対応させる。
// ============================================================

export interface PlayerCharacter {
  id: string;
  label: string;
  avatar: string;
  token: string;
}

export const PLAYER_CHARACTERS: PlayerCharacter[] = Array.from({ length: 8 }, (_, i) => {
  const id = String(i + 1).padStart(2, '0');
  return {
    id,
    label: `タイプ${id}`,
    avatar: `/assets/avatars/player-avatar-${id}.png`,
    token: `/assets/avatars/playertoken/player-token-${id}.png`,
  };
});

export const DEFAULT_CHARACTER_ID = PLAYER_CHARACTERS[0].id;

export function getPlayerCharacter(id: string | undefined): PlayerCharacter {
  return PLAYER_CHARACTERS.find((c) => c.id === id) ?? PLAYER_CHARACTERS[0];
}
