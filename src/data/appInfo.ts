export const APP_VERSION = '1.0.0';

export interface ReleaseNote {
  version: string;
  date: string;
  changes: string[];
}

// 新しいバージョンをリリースする際は、この配列の先頭に追加する。
// 表記ルール：Ver.1.0.1｜2026/07/06 の形式（PATCH=修正のみ／MINOR=機能追加／MAJOR=大規模な仕様変更）
export const RELEASE_NOTES: ReleaseNote[] = [
  {
    version: '1.0.0',
    date: '2026/07/05',
    changes: [
      'プレイヤーキャラクター選択機能を追加',
      '選択キャラに連動したゲームコマを追加',
      '昭和編・現代編2026・近未来編2050の背景を追加',
      '盤面アイコンを画像素材へ刷新',
      '時代別の寿命リスクと人生の終幕演出を追加',
      'ファーストビューで開始UIを2秒後に表示する演出を追加',
    ],
  },
];
