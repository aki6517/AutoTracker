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

- [ ] better-sqlite3のインストールとDatabaseServiceクラスの実装
- [ ] Migratorクラスの実装（up/down対応、バージョン管理）
- [ ] 初期マイグレーション（001_initial.ts）でテーブル作成（projects, entries, rules, screenshots, settings, ai_usage_logs, schema_migrations）
- [ ] インデックス作成（idx_entries_start_time, idx_entries_project_id等）
- [ ] トリガー作成（updated_at自動更新）
- [ ] デフォルト設定データの挿入（tracking, notifications, privacy, appearance, ai設定）
- [ ] DBファイルが{userData}/autotracker.dbに作成されることを確認

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
