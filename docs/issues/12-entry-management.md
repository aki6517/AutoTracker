### 背景 / 目的

自動作成されたエントリーの管理機能を実装する。ユーザーがエントリーを編集、分割、結合できるようにし、正確な時間記録を維持する。

- 依存: #2, #3, #11
- ラベル: backend, frontend, feature

### スコープ / 作業項目

1. EntryRepositoryの実装
2. 分割・結合ロジック
3. IPC Handlersの実装
4. 日付範囲取得機能
5. 現在進行中エントリー機能

### ゴール / 完了条件（Acceptance Criteria）

- [ ] EntryRepositoryの実装（findByDateRange, findCurrent, create, update, delete）
- [ ] エントリー分割機能（splitメソッド：指定時刻で2つに分割）
- [ ] エントリー結合機能（mergeメソッド：複数エントリーを1つに統合）
- [ ] IPC Handler実装（entry:get-by-date-range, entry:get-today, entry:get-current, entry:create, entry:update, entry:delete, entry:split, entry:merge）
- [ ] 日付範囲でのエントリー取得（プロジェクト情報JOIN）
- [ ] 現在進行中エントリー取得（end_time IS NULL）

### テスト観点

- ユニットテスト: Repository各メソッド、split/mergeロジック
- 統合テスト: IPC経由のCRUD操作
- 検証方法: 分割・結合後のデータ整合性確認

検証方法:
1. 2時間のエントリーを1時間で分割→2つのエントリーに分かれることを確認
2. 連続する2つのエントリーを結合→1つになることを確認
3. 結合後のstart_time/end_timeが正しいことを確認

要確認事項:
- 分割時のスクリーンショット紐付けの扱い
- 結合時のconfidence/ai_reasoningの扱い
