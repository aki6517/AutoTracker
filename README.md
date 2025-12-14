# AutoTracker

AI-Powered Automatic Time Tracking for Freelancers

## 概要

AutoTrackerは、ADHDユーザー向けに設計された自動時間記録デスクトップアプリケーションです。スクリーンショットとAI判定を組み合わせて、作業時間を自動的に記録します。

### 主な特徴

- 🤖 **AI自動判定**: OpenAI APIを使用してアクティブウィンドウからプロジェクトを自動判定
- 📸 **スクリーンショット記録**: 1分ごとにスクリーンショットを取得し暗号化保存
- 📊 **ルールベースマッチング**: カスタムルールでプロジェクトを自動分類
- 🔒 **プライバシー保護**: パスワード画面自動検出、ローカルファースト設計
- 📈 **レポート機能**: 日次・週次レポートで作業時間を可視化
- 💾 **自動バックアップ**: 1時間ごとの自動バックアップと障害時自動復旧

## 技術スタック

- **フロントエンド**: React 18 + TypeScript 5 + Tailwind CSS 3
- **バックエンド**: Electron 28 + Node.js 20
- **データベース**: SQLite (better-sqlite3)
- **AI**: OpenAI API (gpt-5-nano/gpt-5-mini)
- **ビルドツール**: Vite + electron-builder
- **UI**: shadcn/ui + Recharts

## システム要件

- **OS**: macOS 10.15+ / Windows 10+
- **Node.js**: 20.x以上
- **メモリ**: 4GB以上（推奨8GB）
- **ディスク**: 500MB以上の空き容量

## セットアップ

### 前提条件

- Node.js 20.x以上
- npm または yarn
- OpenAI APIキー（AI判定機能を使用する場合）

### インストール

```bash
# リポジトリをクローン
git clone https://github.com/aki6517/AutoTracker.git
cd autotracker

# 依存関係をインストール
npm install

# 開発サーバーを起動
npm run dev
```

### macOSの権限設定

スクリーンキャプチャ機能を使用するには、以下の権限が必要です：

1. **システム環境設定** > **セキュリティとプライバシー** > **プライバシー**
2. **画面収録**を選択し、AutoTrackerを追加
3. **アクセシビリティ**を選択し、AutoTrackerを追加（ウィンドウ情報取得用）

### 開発コマンド

```bash
# 開発サーバー起動（Electron + Vite HMR）
npm run dev

# ビルド（TypeScript + Vite + Electron Builder）
npm run build

# 型チェック
npm run type-check

# Lint実行
npm run lint

# Lint自動修正
npm run lint:fix

# コードフォーマット
npm run format
```

## プロジェクト構造

```
autotracker/
├── electron/                # Electron Main Process
│   ├── main.ts              # エントリーポイント
│   ├── preload.ts           # Preload Script
│   ├── database/            # データベース関連
│   │   ├── database.service.ts
│   │   └── migrations/      # マイグレーション
│   ├── repositories/        # データアクセス層
│   │   ├── project.repository.ts
│   │   ├── entry.repository.ts
│   │   ├── rule.repository.ts
│   │   └── ...
│   ├── services/            # ビジネスロジック
│   │   ├── tracking-engine.service.ts
│   │   ├── screen-capture.service.ts
│   │   ├── ai-judgment.service.ts
│   │   ├── password-detection.service.ts
│   │   ├── backup.service.ts
│   │   ├── logger.service.ts
│   │   └── ...
│   └── ipc/                 # IPC Handlers
├── src/                     # React Renderer Process
│   ├── main.tsx             # Reactエントリーポイント
│   ├── App.tsx              # ルートコンポーネント
│   ├── pages/               # ページコンポーネント
│   │   ├── Dashboard.tsx
│   │   ├── Timeline.tsx
│   │   ├── Projects.tsx
│   │   ├── Reports.tsx
│   │   └── Settings.tsx
│   ├── components/          # UIコンポーネント
│   └── styles/              # スタイル
├── shared/                  # 共有コード
│   └── types/               # 型定義
│       ├── api.ts
│       └── ipc.ts
├── docs/                    # ドキュメント
│   └── issues/              # Issue詳細
├── dist/                    # ビルド出力（Renderer）
├── dist-electron/           # ビルド出力（Main/Preload）
└── release/                 # パッケージ出力
```

## 機能一覧

### Phase 1 MVP（実装完了）

| 機能 | 説明 |
|------|------|
| プロジェクト管理 | 最大5プロジェクトのCRUD操作 |
| 自動トラッキング | スクリーンショット+メタデータ収集 |
| ルールマッチング | URLパターン、アプリ名、キーワードでプロジェクト判定 |
| AI判定 | OpenAI APIによる自動プロジェクト分類 |
| 変化検知 | 5層変化検知エンジン |
| タイムライン | エントリー表示・編集・分割・結合 |
| レポート | 日次サマリー、プロジェクト別集計 |
| パスワード検出 | パスワード画面のスクリーンショット自動スキップ |
| バックアップ | 1時間ごとの自動バックアップ、7世代保持 |
| オフラインモード | ネット未接続時はルールマッチングのみで動作 |

## 設定

### AI設定

設定画面（Settings > AI設定）でOpenAI APIキーを設定：

1. [OpenAI API](https://platform.openai.com/api-keys)でAPIキーを取得
2. 設定画面でAPIキーを入力
3. 月間予算を設定（デフォルト: $5.00）

### プライバシー設定

- **パスワード検出**: パスワード入力画面のスクショをスキップ（デフォルト有効）
- **除外キーワード**: 特定のキーワードを含む画面をスキップ
- **スクリーンショット保存期間**: 1〜365日（デフォルト7日）

## データ保存場所

- **macOS**: `~/Library/Application Support/autotracker/`
- **Windows**: `%APPDATA%/autotracker/`

```
{userData}/
├── autotracker.db      # SQLiteデータベース
├── screenshots/        # 暗号化スクリーンショット
├── backups/           # バックアップファイル
├── logs/              # ログファイル
└── settings.json      # 設定ファイル
```

## トラブルシューティング

### スクリーンショットが取得できない

1. macOSの場合、システム環境設定で「画面収録」の権限を確認
2. アプリを再起動

### AI判定が動作しない

1. 設定画面でAPIキーが正しく設定されているか確認
2. ネットワーク接続を確認
3. 月間予算を超過していないか確認

### データベースエラー

1. アプリを終了
2. `{userData}/backups/`から最新のバックアップをコピー
3. `{userData}/autotracker.db`を置き換え
4. アプリを再起動

## 開発ドキュメント

- [要件定義書](01_requirements.md)
- [アーキテクチャ設計書](02_architecture.md)
- [データベース設計書](03_database.md)
- [API設計書](04_api.md)
- [サイトマップ](05_sitemap.md)
- [実装計画](IMPLEMENTATION-ISSUES.md)

## ライセンス

MIT License

## 貢献

Issue、Pull Requestを歓迎します。

## 注意事項

- このアプリはスクリーンショットを取得します。機密情報を扱う際はパスワード検出機能を有効にしてください
- AI判定機能を使用する場合、OpenAI APIに画面メタデータが送信されます（スクリーンショット画像自体は送信されません）
- すべてのデータはローカルに保存され、クラウドには送信されません
