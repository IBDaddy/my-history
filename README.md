# 強くてニューゲーム

レトロゲーム好きの人生遍歴を管理するReactアプリケーション。自分が遊んだゲーム機ごとに好きなゲームをランキング形式で登録し、人生の中でそのゲームの時代をビジュアル化できます。

## 特徴

- **ピクセルアート風UI**: レトログゲーム的なデザイン
- **複数ハード対応**: FC, SFC, GB, N64, PS, PS2など13種類のゲーム機に対応
- **人生ゲーム年表**: ゲームの発売年をベースに、人生のタイムラインを表示
- **Firebase統合**: データをクラウドに保存（オフラインモードにも対応）
- **CSVデータベース連携**: ゲーム情報をCSVから自動読み込み（250種類以上のゲーム）

## セットアップ

1. 依存関係のインストール:
```bash
npm install
```

2. 開発サーバーの起動:
```bash
npm run dev
```

3. ブラウザで `http://localhost:5173` を開く

## ビルド

本番用にビルドする場合:

```bash
npm run build
```

## CSVデータベースについて

`csv/名作ゲームデータベース - csv用.csv` に以下の形式でゲーム情報が格納されています：

```
Hardware,Title,Year,Publisher,Genre,Description
GB,ポケットモンスター 赤・緑,1996,任天堂,RPG,151匹の衝撃。...
```

`npm run dev` または `npm run build` を実行すると、CSVが自動的に `src/gameDatabase.js` に変換されます。

## 技術スタック

- **React** 18.x
- **Vite** 5.x
- **Tailwind CSS** 3.x
- **Firebase** 10.x
- **lucide-react** (アイコン)

## Firebase設定

Firebaseを使用する場合は、環境変数に以下を設定してください:

```javascript
// グローバル変数として設定
__firebase_config = JSON.stringify({
  apiKey: "YOUR_API_KEY",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
});

__app_id = "your-app-id";
__initial_auth_token = "your-token"; // optional
```

設定がない場合、アプリはオフラインモードで動作します。

## 機能

### ホーム画面
- 登録済みのゲーム機ランキング表示
- 新しいハードのランキング作成

### 編集画面
- ゲームタイトルの入力
- 思い出コメントの追加
- データベースから名作ゲーム候補を選択
- Google検索リンク

### 人生ゲーム年表
- ゲーム発売年をベースに年表を表示
- 各ゲームの年齢を自動計算（生まれ年から）

### 設定
- ユーザーの生まれ年設定（年齢計算用）