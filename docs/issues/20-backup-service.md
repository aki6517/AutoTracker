### 背景 / 目的

データ損失を防ぐため、データベースの自動バックアップ機能を実装する。1時間ごとに自動バックアップを作成し、7世代を保持する。障害時の復元機能も提供する。

- 依存: #2
- ラベル: backend, infra

### スコープ / 作業項目

1. BackupServiceの実装
2. 自動バックアップスケジューラー
3. バックアップファイル管理
4. 復元機能の実装
5. 起動時リカバリ

### ゴール / 完了条件（Acceptance Criteria）

- [x] BackupServiceの実装（createBackup, restore, listBackups, verifyBackupメソッド）
- [x] 1時間ごとの自動バックアップ機能（setInterval使用）
- [x] バックアップファイルの保存（{userData}/backups/autotracker_{timestamp}.db）
- [x] 古いバックアップの自動削除（7世代保持、cleanupOldBackupsメソッド）
- [x] バックアップ整合性チェック機能（PRAGMA integrity_check）
- [x] 起動時のリカバリ機能（DB破損時に最新の正常バックアップから復元）
- [x] 手動復元機能の実装（IPC経由でバックアップを選択）

### テスト観点

- ユニットテスト: バックアップ作成、整合性チェック
- 統合テスト: 自動バックアップ→削除→復元フロー
- 検証方法: 意図的にDB破損させて復元テスト

検証方法:
1. アプリを1時間以上起動
2. backupsディレクトリにファイルが作成されていることを確認
3. 手動でDBファイルを削除
4. アプリ再起動時に自動復元されることを確認

要確認事項:
- バックアップファイルの暗号化要否
- クラウドバックアップ機能（Phase 3で検討）

---

## 実装レポート

### 実装日: 2024-12-13

### 実装内容

#### 1. BackupService (`electron/services/backup.service.ts`)

データベースの自動バックアップと復元を管理するサービス：

**主要メソッド:**
- `createBackup()`: SQLiteのバックアップ機能を使用してDBをコピー
- `restore(backupPath)`: 指定されたバックアップファイルからDBを復元
- `listBackups()`: バックアップ一覧を取得（日付降順）
- `verifyBackup(backupPath)`: PRAGMA integrity_checkでバックアップの整合性を確認
- `cleanupOldBackups()`: 7世代を超える古いバックアップを自動削除
- `startAutoBackup()`: 1時間ごとの自動バックアップを開始
- `stopAutoBackup()`: 自動バックアップを停止
- `performStartupRecovery()`: 起動時にDBの整合性をチェックし、破損時は自動復元

**設定:**
- デフォルトバックアップ間隔: 1時間
- 最大保持世代: 7
- バックアップ先: `{userData}/backups/autotracker_{timestamp}.db`

#### 2. メインプロセスへの統合

`electron/main.ts`を更新:
- アプリ起動時に`performStartupRecovery()`を実行
- DB初期化後に`startAutoBackup()`を開始
- アプリ終了時に`stopAutoBackup()`で停止

#### 3. IPC API

バックアップ関連のIPCハンドラーを追加:
- `backup:list`: バックアップ一覧を取得
- `backup:create`: 手動バックアップを作成
- `backup:restore`: 指定されたバックアップから復元
- `backup:verify`: バックアップの整合性を検証
- `backup:get-status`: バックアップステータスを取得

#### 4. 型定義

`shared/types/ipc.ts`にバックアップ関連の型を追加:
- `BackupInfo`: バックアップファイル情報
- `BackupStatus`: バックアップサービスのステータス

### 技術的な特徴

1. **SQLiteネイティブバックアップ**: better-sqlite3のbackup()メソッドを使用した安全なバックアップ
2. **非同期バックアップ**: step()メソッドで段階的にバックアップを実行（ブロッキングを回避）
3. **整合性チェック**: PRAGMA integrity_checkによる破損検出
4. **自動リカバリ**: 起動時のDB整合性チェックと自動復元
5. **世代管理**: 7世代を保持し、古いバックアップを自動削除

### 今後の改善点

- 設定画面にバックアップ管理UIを追加
- バックアップファイルの暗号化
- クラウドバックアップ対応（Google Drive, iCloud等）
