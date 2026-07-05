// ============================================================
// プレイヤーキャラクター（顔アイコン・ゲーム盤コマ）定義
// ------------------------------------------------------------
// キャラクター情報をここで一元管理する。プレイヤー設定画面の選択候補（avatar）と、
// 盤面で動くコマ画像（token）は、必ずこの定義から同じ id 経由で対応させる。
// ============================================================

export interface PlayerCharacter {
  id: string;
  label: string;
  /** キャラクターの見た目イメージにあわせた年齢帯（例：`12〜18歳`）。ゲーム内の実年齢とは無関係の表示用情報。 */
  ageRangeLabel: string;
  avatar: string;
  token: string;
}

// キャラクターの見た目イメージに合わせた「タイプ」と年齢帯。01〜04が男の子、05〜08が女の子で、
// 同じ4タイプ（主人公・知的・活発・癒し系）がそれぞれ対になっている。
const CHARACTER_PROFILES: { label: string; ageRangeLabel: string }[] = [
  { label: '主人公タイプ', ageRangeLabel: '12〜18歳' },
  { label: '知的タイプ', ageRangeLabel: '14〜20歳' },
  { label: '活発タイプ', ageRangeLabel: '12〜18歳' },
  { label: '癒し系タイプ', ageRangeLabel: '13〜19歳' },
  { label: '主人公タイプ', ageRangeLabel: '12〜18歳' },
  { label: '知的タイプ', ageRangeLabel: '14〜20歳' },
  { label: '活発タイプ', ageRangeLabel: '12〜18歳' },
  { label: '癒し系タイプ', ageRangeLabel: '13〜19歳' },
];

export const PLAYER_CHARACTERS: PlayerCharacter[] = Array.from({ length: 8 }, (_, i) => {
  const id = String(i + 1).padStart(2, '0');
  return {
    id,
    label: CHARACTER_PROFILES[i].label,
    ageRangeLabel: CHARACTER_PROFILES[i].ageRangeLabel,
    avatar: `/assets/avatars/player-avatar-${id}.png`,
    token: `/assets/avatars/playertoken/player-token-${id}.png`,
  };
});

export const DEFAULT_CHARACTER_ID = PLAYER_CHARACTERS[0].id;

export function getPlayerCharacter(id: string | undefined): PlayerCharacter {
  return PLAYER_CHARACTERS.find((c) => c.id === id) ?? PLAYER_CHARACTERS[0];
}
