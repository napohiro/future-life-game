# イベント画像フォルダ

イベントパネル（EventModal）に表示するイメージ画像を置く場所です。
`image` が設定されているイベントだけ画像が表示され、未設定のイベントは今まで通りテキストのみで表示されます。

## 1. イベント画像の配置ルール

画像は以下のフォルダに、時代・分類ごとに配置する。

- `public/assets/events/showa/` … 昭和編のイベント画像
- `public/assets/events/modern/` … 現代編のイベント画像
- `public/assets/events/future/` … 近未来編のイベント画像
- `public/assets/events/common/` … 時代共通イベント（結婚・就職・ピンチイベント等）の画像

ファイル名は、イベント内容が分かる英語ケバブケース（例：`group-employment.webp`）にする。

## 2. 画像形式

- 形式：基本は `.webp`
- 比率：横長 16:9 推奨（4:3も可）
- サイズ目安：1枚あたり100KB〜300KB程度
- スマホ表示で重くなりすぎないよう圧縮してから配置する
- 直接的すぎる事故・病気・死亡表現は避ける（象徴的・落ち着いた表現にする）
- 史実イベントは、象徴的で上品な画像にする（実在の人物・事件を写実的に再現しない）

## 3. 最初に作る画像候補

### 昭和編（`showa/`）
| ファイル名 | イベント |
| --- | --- |
| `group-employment.webp` | 集団就職 |
| `three-sacred-treasures.webp` | 家電三種の神器 |
| `my-home.webp` | 昭和のマイホーム |

### 現代編（`modern/`）
| ファイル名 | イベント |
| --- | --- |
| `generative-ai-work.webp` | 生成AIを使った仕事 |
| `sns-trouble.webp` | SNSトラブル |
| `caregiving.webp` | 介護 |

### 近未来編（`future/`）
| ファイル名 | イベント |
| --- | --- |
| `ai-medical.webp` | AI医療 |
| `autonomous-driving.webp` | 自動運転 |
| `personality-data.webp` | 人格データ |

### 共通（`common/`）
| ファイル名 | イベント |
| --- | --- |
| `marriage.webp` | 結婚 |
| `job-start.webp` | 就職 |
| `pinch.webp` | ピンチイベント |

## 4. イベントデータへの追加方法

画像ファイルを配置したら、対象イベントのデータ（`src/data/*.ts`）に以下のように追記する。

```ts
image: '/assets/events/showa/group-employment.webp',
imageAlt: '昭和の集団就職をイメージした画像',
```

- `image` を追加したイベントだけ、イベントパネル上部に画像が表示される（`src/components/EventModal.tsx`）。
- `image` を追加しなければ、これまで通りテキストのみの表示になる。
- `imageAlt` は画像の内容を簡潔に説明する文にする。省略した場合はイベントタイトルが代わりに使われる。

## 5. 注意

- 画像ファイルがまだ存在しない段階では、イベントデータに `image` を追加しない。
- 存在しないパスを `image` に入れると broken image の原因になるため、**必ず実画像をこのフォルダに配置してから**イベントデータへ追加すること。
