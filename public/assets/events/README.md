# イベント画像フォルダ

イベントパネルに表示するイメージ画像を置く場所です。

## 配置ルール

- `showa/` … 昭和編のイベント画像
- `modern/` … 現代編のイベント画像
- `future/` … 近未来編のイベント画像
- `common/` … 時代共通イベント（結婚・就職・ピンチイベント等）の画像

## 推奨フォーマット

- 形式：`.webp`
- 比率：16:9 または 4:3（横長）
- サイズ目安：1枚あたり100KB〜300KB程度

## 使い方

1. 上記フォルダに画像ファイルを配置する（例：`showa/group-employment.webp`）。
2. 対象イベントのデータ（`src/data/*.ts`）に以下を追加する。

```ts
image: '/assets/events/showa/group-employment.webp',
imageAlt: '昭和の集団就職をイメージした画像',
```

`image` を追加したイベントだけ、イベントパネル上部に画像が表示されます（`src/components/EventModal.tsx`）。
`image` を追加しなければ、これまで通りテキストのみの表示になります。
