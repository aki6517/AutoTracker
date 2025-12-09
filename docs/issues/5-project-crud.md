### 背景 / 目的

ユーザーが複数の案件を管理できるようにするため、プロジェクトのCRUD機能を実装する。これはWalking Skeletonとして、IPC通信とDB操作の垂直統合を確認する重要な機能である。

- 依存: #2, #3, #4
- ラベル: backend, frontend, feature

### スコープ / 作業項目

1. ProjectRepositoryの実装
2. IPC Handlersの実装
3. プロジェクト一覧画面の作成
4. プロジェクトフォームの作成
5. 削除確認ダイアログの実装

### ゴール / 完了条件（Acceptance Criteria）

- [ ] ProjectRepositoryの実装（findAll, findById, create, update, delete, archive, restore）
- [ ] IPC Handler実装（project:get-all, project:get-by-id, project:create, project:update, project:delete, project:archive）
- [ ] プロジェクト一覧画面（/projects）の実装（ProjectCardコンポーネント）
- [ ] プロジェクト作成フォームの実装（name, clientName, color, icon, hourlyRate, budgetHours）
- [ ] プロジェクト編集機能の実装（モーダルまたは専用ページ）
- [ ] 削除確認ダイアログの実装（関連データの影響を警告）

### テスト観点

- ユニットテスト: ProjectRepository各メソッド
- 統合テスト: IPC経由のCRUD操作
- E2Eテスト: UI操作からDB反映確認

検証方法:
1. プロジェクト作成フォームで新規プロジェクト作成
2. 作成したプロジェクトが一覧に表示されることを確認
3. 編集後、変更が反映されることを確認
4. 削除後、一覧から消えることを確認

要確認事項:
- プロジェクト数の上限（Phase 1では5個まで）
- カラーピッカーのUI仕様
