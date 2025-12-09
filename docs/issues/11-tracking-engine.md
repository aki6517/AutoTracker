### 背景 / 目的

自動時間記録のメインループであるトラッキングエンジンを実装する。スクリーンショット取得、変化検知、AI判定、エントリー作成を統合し、ユーザー操作なしで時間を自動記録する。

- 依存: #6, #7, #9, #10
- ラベル: backend, core

### スコープ / 作業項目

1. TrackingEngineクラスの実装
2. キャプチャループの実装
3. メタデータ収集ループの実装
4. エントリー作成ロジック
5. IPC Handlersの実装

### ゴール / 完了条件（Acceptance Criteria）

- [ ] TrackingEngineクラスの実装（start, stop, pause, resumeメソッド）
- [ ] スクリーンショット取得ループ（設定可能な30秒〜2分間隔）
- [ ] メタデータ収集ループ（5秒間隔、WindowMonitorService連携）
- [ ] 変化検知との統合（ChangeDetector呼び出し）
- [ ] エントリー作成ロジック（信頼度85%以上で自動保存、未満はユーザー確認）
- [ ] トラッキング状態管理（isRunning, isPaused, currentEntry）
- [ ] IPC Handler実装（tracking:start, tracking:stop, tracking:pause, tracking:resume, tracking:get-status）

### テスト観点

- ユニットテスト: 状態遷移（start→pause→resume→stop）
- 統合テスト: フルトラッキングフロー
- 検証方法: 実際に作業してエントリーが作成されることを確認

検証方法:
1. tracking:startでトラッキング開始
2. 5分間異なるアプリで作業
3. entriesテーブルにエントリーが作成されていることを確認
4. tracking:stopでトラッキング停止

要確認事項:
- CPU使用率の監視（アイドル時1%以下目標）
- バッテリー消費への影響
