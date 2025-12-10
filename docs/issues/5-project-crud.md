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

- [x] ProjectRepositoryの実装（findAll, findById, create, update, delete, archive, restore）
- [x] IPC Handler実装（project:get-all, project:get-by-id, project:create, project:update, project:delete, project:archive）
- [x] プロジェクト一覧画面（/projects）の実装（ProjectCardコンポーネント）
- [x] プロジェクト作成フォームの実装（name, clientName, color, icon, hourlyRate, budgetHours）
- [x] プロジェクト編集機能の実装（モーダルダイアログ）
- [x] 削除確認ダイアログの実装（関連データの影響を警告）

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

---

## 実装報告

### ステータス: ✅ 完了

**実装日**: 2025-12-10

### 実装内容

#### 作成したファイル

| ファイル | 説明 |
|---------|------|
| `electron/repositories/project.repository.ts` | ProjectRepositoryクラス（CRUD操作） |
| `src/pages/Projects.tsx` | プロジェクト一覧画面 |
| `src/components/projects/ProjectForm.tsx` | プロジェクト作成/編集フォーム |

#### 更新したファイル

| ファイル | 変更内容 |
|---------|----------|
| `electron/database/types.ts` | DbProject, Project型定義を追加 |
| `electron/database/index.ts` | getDatabase()関数をエクスポート |
| `electron/ipc/index.ts` | project:* IPCハンドラーを実装 |
| `shared/types/api.ts` | Project.idをstring型に修正 |
| `shared/types/ipc.ts` | プロジェクトAPIのID型をstringに修正 |
| `src/App.tsx` | Projectsページをインポート |

#### ProjectRepository機能

```typescript
class ProjectRepository {
  findAll(includeArchived?: boolean): Project[]
  findById(id: string): Project | null
  create(data: CreateProjectDTO): Project
  update(id: string, data: UpdateProjectDTO): Project | null
  delete(id: string): boolean  // 関連エントリーがあると例外
  archive(id: string): Project | null
  restore(id: string): Project | null
  count(includeArchived?: boolean): number  // 上限チェック用
}
```

#### IPC Handlers

| チャンネル | 機能 |
|-----------|------|
| `project:get-all` | プロジェクト一覧取得（アーカイブ含む/除外オプション） |
| `project:get-by-id` | ID指定でプロジェクト取得 |
| `project:create` | 新規作成（上限5個チェック） |
| `project:update` | 更新 |
| `project:delete` | 削除（関連エントリーがあるとエラー） |
| `project:archive` | アーカイブ |
| `project:restore` | アーカイブ解除 |

#### プロジェクト画面機能

- **一覧表示**: カード形式でプロジェクト一覧を表示
- **新規作成**: モーダルダイアログでフォーム表示
- **編集**: 一覧からメニュー→編集でモーダル表示
- **削除確認**: 削除前に確認ダイアログを表示
- **アーカイブ**: 削除の代わりにアーカイブ可能
- **カラーピッカー**: 8色のパレットから選択

#### カラーパレット

```javascript
const PROJECT_COLORS = [
  '#E5C890', // Gold
  '#81C784', // Green
  '#64B5F6', // Blue
  '#BA68C8', // Purple
  '#FF8A65', // Orange
  '#4DB6AC', // Teal
  '#F06292', // Pink
  '#FFD54F', // Yellow
];
```

### 発生したエラーと解決方法

#### 1. getDatabase未エクスポートエラー

**エラー内容**:
```
"getDatabase" is not exported by "electron/database/index.ts"
```

**原因**: ProjectRepositoryで使用する`getDatabase()`関数が未定義

**解決方法**:
`electron/database/index.ts`に`getDatabase()`関数を追加してエクスポート

#### 2. Project.id型の不一致

**エラー内容**:
```
Argument of type 'string' is not assignable to parameter of type 'number'
```

**原因**: 共有型定義でProject.idが`number`だったが、実際はUUIDで`string`

**解決方法**:
- `shared/types/api.ts`のProject.idを`string`に変更
- `shared/types/ipc.ts`のプロジェクトAPI引数を`string`に変更

### Git コミット履歴

| コミット | 内容 |
|---------|------|
| `feat: Issue #5 - プロジェクトCRUD機能の実装` | バックエンド・フロントエンド一括実装 |

### 動作確認結果

- [x] プロジェクト作成フォームで新規プロジェクト作成
- [x] 作成したプロジェクトが一覧に表示される
- [x] 編集後、変更が反映される
- [x] 削除後、一覧から消える
- [x] プロジェクト数上限（5個）のチェック動作
- [x] アーカイブ/復元機能
- [x] カラーピッカーでの色選択

### Walking Skeleton確認

このIssueはWalking Skeletonとして、以下の垂直統合を確認:

```
[UI: Projects.tsx]
       ↓ window.api.projects.*
[Preload: preload.ts]
       ↓ ipcRenderer.invoke
[Main: ipc/index.ts]
       ↓ projectRepository.*
[Repository: project.repository.ts]
       ↓ db.prepare().run()
[SQLite: autotracker.db]
```

全レイヤーが正常に連携していることを確認。
