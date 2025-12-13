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

- [x] EntryRepositoryの実装（findByDateRange, findCurrent, create, update, delete）
- [x] エントリー分割機能（splitメソッド：指定時刻で2つに分割）
- [x] エントリー結合機能（mergeメソッド：複数エントリーを1つに統合）
- [x] IPC Handler実装（entry:get-by-date-range, entry:get-today, entry:get-current, entry:create, entry:update, entry:delete, entry:split, entry:merge）
- [x] 日付範囲でのエントリー取得（プロジェクト情報JOIN）
- [x] 現在進行中エントリー取得（end_time IS NULL）

### テスト観点

- ユニットテスト: Repository各メソッド、split/mergeロジック
- 統合テスト: IPC経由のCRUD操作
- 検証方法: 分割・結合後のデータ整合性確認

検証方法:
1. 2時間のエントリーを1時間で分割→2つのエントリーに分かれることを確認
2. 連続する2つのエントリーを結合→1つになることを確認
3. 結合後のstart_time/end_timeが正しいことを確認

要確認事項:
- ~~分割時のスクリーンショット紐付けの扱い~~ → 元のエントリーに紐付いたまま
- ~~結合時のconfidence/ai_reasoningの扱い~~ → 最初のエントリーの値を保持

---

## 実装レポート

### 実装日時
2024年12月13日（Issue #11と同時に実装）

### 実装内容

Issue #11（トラッキングエンジン）の一部として実装済み。

#### EntryRepository (`electron/repositories/entry.repository.ts`)

```typescript
export class EntryRepository {
  // 検索
  findByDateRange(startDate, endDate, options?): EntryWithProject[]
  findToday(): EntryWithProject[]
  findCurrent(): EntryWithProject | null
  findById(id): Entry | null

  // CRUD
  create(data): Entry
  update(id, data): Entry | null
  delete(id): boolean
  endEntry(id, endTime?): Entry | null

  // 分割・マージ
  split(id, splitTime): { before: Entry; after: Entry } | null
  merge(entryIds, projectId?): Entry | null

  // 統計
  getTotalHoursByProject(startDate, endDate): ProjectHours[]
  getTodayTotalHours(): number
}
```

#### 分割ロジック

```typescript
split(id: number, splitTime: string) {
  // 1. 元のエントリーを取得
  // 2. 元のエントリーのend_timeをsplitTimeに更新
  // 3. 新しいエントリーを作成（start_time=splitTime, end_time=元のend_time）
  // 4. 両方のエントリーを返す
}
```

#### 結合ロジック

```typescript
merge(entryIds: number[], projectId?: number) {
  // 1. 全エントリーを時系列順にソート
  // 2. 最初のエントリーのend_timeを最後のエントリーのend_timeに更新
  // 3. 他のエントリーを削除
  // 4. 更新されたエントリーを返す
}
```

### IPC API

```typescript
// 日付範囲でエントリーを取得
await window.api.entries.getByDateRange({
  startDate: '2024-12-01',
  endDate: '2024-12-31',
  projectId: 1,        // オプション
  includeNonWork: true // オプション
});

// 今日のエントリーを取得
await window.api.entries.getToday();

// 現在進行中のエントリーを取得
await window.api.entries.getCurrent();

// エントリー作成
await window.api.entries.create({
  projectId: 1,
  startTime: new Date().toISOString(),
});

// エントリー更新
await window.api.entries.update(1, { projectId: 2 });

// エントリー削除
await window.api.entries.delete(1);

// エントリー分割
const { before, after } = await window.api.entries.split({
  entryId: 1,
  splitTime: '2024-12-13T12:00:00Z',
});

// エントリーマージ
const merged = await window.api.entries.merge({
  entryIds: [1, 2, 3],
  projectId: 1,
});
```

### 備考

- Issue #11（トラッキングエンジン）と一緒に実装完了
- 分割時、スクリーンショットは元のエントリーに紐付いたまま
- 結合時、confidence/ai_reasoningは最初のエントリーの値を保持
