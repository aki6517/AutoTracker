# AutoTracker

AI-Powered Automatic Time Tracking for Freelancers

## 概要

AutoTrackerは、ADHDユーザー向けに設計された自動時間記録デスクトップアプリケーションです。スクリーンショットとAI判定を組み合わせて、作業時間を自動的に記録します。

## 技術スタック

- **フロントエンド**: React 18 + TypeScript 5 + Tailwind CSS 3
- **バックエンド**: Electron 28 + Node.js 20
- **データベース**: SQLite (better-sqlite3)
- **AI**: OpenAI API (gpt-5-nano/gpt-5-mini)
- **ビルドツール**: Vite

## プロジェクト構成

このプロジェクトはsafe-replayとは**別の独立したプロジェクト**です。

```
autotracker/
├── docs/                    # 設計ドキュメント
│   ├── issues/              # GitHub Issue詳細
│   └── GITHUB-APP-INSTALL.md
├── 01_requirements.md      # 要件定義書
├── 02_architecture.md       # アーキテクチャ設計書
├── 03_database.md          # データベース設計書
├── 04_api.md               # API設計書
├── 05_sitemap.md           # サイトマップ
└── IMPLEMENTATION-ISSUES.md # 実装計画
```

## 開発フェーズ

- **Phase 1: Walking Skeleton** - 最小限の動作するアプリケーション構築 (#1〜#5)
- **Phase 2: コア機能実装** - 自動トラッキング機能の実装 (#6〜#12)
- **Phase 3: UI実装** - フロントエンド機能の実装 (#13〜#18)
- **Phase 4: 統合・完成** - 機能統合とMVP完成 (#19〜#22)

詳細は `IMPLEMENTATION-ISSUES.md` を参照してください。

## セットアップ

### 前提条件

- Node.js 20.x以上
- npm または yarn

### インストール

```bash
# リポジトリをクローン
git clone https://github.com/aki6517/autotracker.git
cd autotracker

# 依存関係をインストール
npm install

# 開発サーバーを起動
npm run dev
```

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

# フォーマットチェック
npm run format:check
```

### プロジェクト構造

```
autotracker/
├── electron/          # Electron Main Process
│   ├── main.ts        # エントリーポイント
│   ├── preload.ts     # Preload Script
│   └── ipc/           # IPC Handlers
├── src/               # React Renderer Process
│   ├── main.tsx       # Reactエントリーポイント
│   ├── App.tsx        # ルートコンポーネント
│   ├── pages/         # ページコンポーネント
│   ├── components/    # UIコンポーネント
│   └── styles/        # スタイル
├── shared/            # 共有コード
│   └── types/         # 型定義
├── dist/               # ビルド出力（Renderer）
├── dist-electron/      # ビルド出力（Main/Preload）
└── release/           # パッケージ出力
```

## ドキュメント

- [要件定義書](01_requirements.md)
- [アーキテクチャ設計書](02_architecture.md)
- [データベース設計書](03_database.md)
- [API設計書](04_api.md)
- [サイトマップ](05_sitemap.md)
- [実装計画](IMPLEMENTATION-ISSUES.md)
- [GitHub Appインストールガイド](docs/GITHUB-APP-INSTALL.md)

## ライセンス

（未定）

## 注意事項

- このプロジェクトはsafe-replayとは別の独立したプロジェクトです
- GitHubリポジトリも別に管理してください

