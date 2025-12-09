### 背景 / 目的

ユーザーが現在どのアプリケーションで作業しているかを把握するため、アクティブウィンドウの監視機能を実装する。5秒間隔でウィンドウ情報を収集し、プロジェクト判定の基礎データとする。

- 依存: #2, #6
- ラベル: backend, core

### スコープ / 作業項目

1. active-winの導入
2. WindowMonitorServiceの実装
3. メタデータ収集ロジック
4. ブラウザURL取得機能
5. 定期収集スケジューラー

### ゴール / 完了条件（Acceptance Criteria）

- [ ] active-winのインストールとネイティブモジュール設定
- [ ] WindowMonitorServiceの実装（getActiveWindow, startMonitoring, stopMonitoringメソッド）
- [ ] メタデータ収集（windowTitle, appName, processId）
- [ ] 5秒間隔での自動収集機能（node-cron使用）
- [ ] ブラウザURL取得機能（Chrome/Edge/Safari対応、AppleScript/Win32 API）
- [ ] メタデータの一時保存機能（最新N件をメモリ保持）

### テスト観点

- ユニットテスト: getActiveWindowの戻り値検証
- 統合テスト: 5秒間隔収集の動作確認
- 検証方法: 複数アプリ切り替えでデータ変化を確認

検証方法:
1. 監視開始後、異なるアプリケーションに切り替え
2. 収集されたメタデータがアプリ切り替えを反映していることを確認
3. ブラウザでウェブサイトを開き、URLが取得されることを確認

要確認事項:
- macOSのアクセシビリティ権限の取得方法
- 一部アプリでURL取得ができない場合の対応
