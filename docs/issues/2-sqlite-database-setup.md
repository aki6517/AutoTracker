### 背景 / 目的

AutoTrackerはローカルファーストのアプリケーションであり、オフラインで完全動作するためにSQLiteデータベースを使用する。better-sqlite3による同期APIを採用し、マイグレーションシステムで将来のスキーマ変更に対応する。

- 依存: #1
- ラベル: backend, database

### スコープ / 作業項目

1. better-sqlite3のインストールと初期化
2. Migratorクラスの実装
3. 初期スキーママイグレーションの作成
4. インデックスとトリガーの設定
5. デフォルト設定データの挿入

### ゴール / 完了条件（Acceptance Criteria）

- [x] better-sqlite3のインストールとDatabaseServiceクラスの実装
- [x] Migratorクラスの実装（up/down対応、バージョン管理）
- [x] 初期マイグレーション（001_initial.ts）でテーブル作成（projects, entries, rules, screenshots, settings, ai_usage_logs, schema_migrations）
- [x] インデックス作成（idx_entries_start_time, idx_entries_project_id等）
- [x] トリガー作成（updated_at自動更新）
- [x] デフォルト設定データの挿入（tracking, notifications, privacy, appearance, ai設定）
- [x] DBファイルが{userData}/autotracker.dbに作成されることを確認

### テスト観点

- ユニットテスト: Migratorのup/down動作
- 統合テスト: DB接続、テーブル作成確認
- 検証方法: SQLite CLIまたはDB Browserで直接確認

検証方法:
1. アプリ起動時にDBファイルが生成されることを確認
2. `SELECT * FROM sqlite_master WHERE type='table'`で全テーブル確認
3. `SELECT * FROM settings`でデフォルト設定確認

要確認事項:
- better-sqlite3のElectronネイティブモジュールリビルド方法
- SQLCipher暗号化は将来対応（Phase 1ではAES-256ファイル暗号化のみ）

---

## 実装報告

### ステータス: ✅ 完了

**実装日**: 2025-12-10

### 実装内容

#### 作成したファイル

| ファイル | 説明 |
|---------|------|
| `electron/database/types.ts` | データベースエンティティの型定義 |
| `electron/database/database.service.ts` | better-sqlite3ラッパークラス |
| `electron/database/migrator.ts` | マイグレーション管理クラス |
| `electron/database/migrations/001_initial.ts` | 初期スキーマ定義 |
| `electron/database/index.ts` | データベース初期化エントリーポイント |

#### データベーススキーマ

**テーブル一覧**:
- `projects` - プロジェクト管理
- `entries` - 時間エントリー記録
- `rules` - 自動判定ルール
- `screenshots` - スクリーンショット管理
- `settings` - アプリ設定
- `ai_usage_logs` - AI使用量ログ
- `schema_migrations` - マイグレーション履歴

**インデックス**:
- `idx_entries_start_time` - 時間検索用
- `idx_entries_project_id` - プロジェクト別検索用
- `idx_rules_priority` - ルール優先度検索用
- `idx_screenshots_entry_id` - エントリー別スクリーンショット検索用

**トリガー**:
- 各テーブルに`updated_at`自動更新トリガー

#### デフォルト設定データ

```json
{
  "tracking": {
    "screenshotInterval": 60,
    "idleThreshold": 300,
    "autoStart": false
  },
  "notifications": {
    "enabled": true,
    "idleReminder": true
  },
  "privacy": {
    "blurScreenshots": false,
    "excludedApps": []
  },
  "appearance": {
    "theme": "dark",
    "language": "ja"
  },
  "ai": {
    "provider": "openai",
    "model": "gpt-4o-mini"
  }
}
```

### 発生したエラーと解決方法

#### 1. better-sqlite3 ビルドエラー（Python distutils）

**エラー内容**:
```
ModuleNotFoundError: No module named 'distutils'
```

**原因**: Python 3.13で`distutils`モジュールが削除された

**解決方法**:
```bash
pip3 install setuptools
```

#### 2. better-sqlite3 Electronバージョン不一致

**エラー内容**:
```
Error: The module 'better_sqlite3.node' was compiled against a different Node.js version
```

**原因**: better-sqlite3がシステムのNode.jsでビルドされ、Electronのバージョンと不一致

**解決方法**:
1. `electron-rebuild`を`devDependencies`に追加
2. `package.json`に`postinstall`スクリプトを追加:
   ```json
   "postinstall": "electron-rebuild -f -w better-sqlite3"
   ```
3. `npm install`を再実行してネイティブモジュールをリビルド

### DBファイルの場所

```
macOS: ~/Library/Application Support/autotracker/autotracker.db
Windows: %APPDATA%/autotracker/autotracker.db
Linux: ~/.config/autotracker/autotracker.db
```

### Git コミット履歴

| コミット | 内容 |
|---------|------|
| `feat: Issue #2 - SQLiteデータベースセットアップ` | DB初期化とマイグレーション実装 |

### 動作確認結果

- [x] アプリ起動時にDBファイルが自動生成される
- [x] 全テーブルが正常に作成される
- [x] デフォルト設定データが挿入される
- [x] コンソールに「Database initialized successfully」が表示される
