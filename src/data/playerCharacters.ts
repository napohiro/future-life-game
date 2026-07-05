// ============================================================
// プレイヤーキャラクター（顔アイコン・ゲーム盤コマ）定義
// ------------------------------------------------------------
// キャラクター情報をここで一元管理する。プレイヤー設定画面の選択候補（avatar）と、
// 盤面で動くコマ画像（token）は、必ずこの定義から同じ id 経由で対応させる。
// ============================================================

export interface PlayerCharacter {
  id: string;
  label: string;
  /** キャラ選択カードに表示する、性格をひとことで表す短い説明文。 */
  description: string;
  avatar: string;
  token: string;
}

// キャラクターの見た目イメージに合わせた「タイプ」と、ひとことの性格説明。01〜04が男の子、
// 05〜08が女の子で、同じ4タイプ（主人公・知的・活発・癒し系）がそれぞれ対になっている。
// 年齢は持たせない（全プレイヤーは0歳から始まり、盤面を1マス進むごとに実際の年齢が進む仕様）。
const CHARACTER_PROFILES: { label: string; description: string }[] = [
  { label: '主人公タイプ', description: 'まっすぐで前向きな性格' },
  { label: '知的タイプ', description: '落ち着いていて物知り' },
  { label: '活発タイプ', description: '元気いっぱいで行動派' },
  { label: '癒し系タイプ', description: 'やさしくてマイペース' },
  { label: '主人公タイプ', description: 'まっすぐで前向きな性格' },
  { label: '知的タイプ', description: '落ち着いていて物知り' },
  { label: '活発タイプ', description: '元気いっぱいで行動派' },
  { label: '癒し系タイプ', description: 'やさしくてマイペース' },
];

export const PLAYER_CHARACTERS: PlayerCharacter[] = Array.from({ length: 8 }, (_, i) => {
  const id = String(i + 1).padStart(2, '0');
  return {
    id,
    label: CHARACTER_PROFILES[i].label,
    description: CHARACTER_PROFILES[i].description,
    avatar: `/assets/avatars/player-avatar-${id}.png`,
    token: `/assets/avatars/playertoken/player-token-${id}.png`,
  };
});

export const DEFAULT_CHARACTER_ID = PLAYER_CHARACTERS[0].id;

export function getPlayerCharacter(id: string | undefined): PlayerCharacter {
  return PLAYER_CHARACTERS.find((c) => c.id === id) ?? PLAYER_CHARACTERS[0];
}
