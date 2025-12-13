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

- [x] TrackingEngineクラスの実装（start, stop, pause, resumeメソッド）
- [x] スクリーンショット取得ループ（設定可能な30秒〜2分間隔）
- [x] メタデータ収集ループ（5秒間隔、WindowMonitorService連携）
- [x] 変化検知との統合（ChangeDetector呼び出し）
- [x] エントリー作成ロジック（信頼度85%以上で自動保存、未満はユーザー確認）
- [x] トラッキング状態管理（isRunning, isPaused, currentEntry）
- [x] IPC Handler実装（tracking:start, tracking:stop, tracking:pause, tracking:resume, tracking:get-status）

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
- ~~CPU使用率の監視（アイドル時1%以下目標）~~ → 設定可能な間隔で制御
- ~~バッテリー消費への影響~~ → キャプチャ間隔のカスタマイズで対応可能

---

## 実装レポート

### 実装日時
2024年12月13日

### 実装内容

#### 1. EntryRepository (`electron/repositories/entry.repository.ts`)

エントリー（時間記録）のCRUD操作を行うリポジトリを実装しました。

```typescript
export class EntryRepository {
  // 日付範囲でエントリーを取得
  findByDateRange(startDate, endDate, options?): EntryWithProject[]

  // 今日のエントリーを取得
  findToday(): EntryWithProject[]

  // 現在進行中のエントリーを取得
  findCurrent(): EntryWithProject | null

  // エントリー作成・更新・削除
  create(data): Entry
  update(id, data): Entry | null
  delete(id): boolean

  // エントリーを終了
  endEntry(id, endTime?): Entry | null

  // エントリーを分割・マージ
  split(id, splitTime): { before: Entry; after: Entry } | null
  merge(entryIds, projectId?): Entry | null

  // 統計
  getTotalHoursByProject(startDate, endDate): ProjectHours[]
  getTodayTotalHours(): number
}
```

#### 2. TrackingEngine (`electron/services/tracking-engine.service.ts`)

自動時間記録のメインループを実装しました。

**主な機能:**

1. **デュアルループアーキテクチャ**
   - キャプチャループ: スクリーンショット取得・変化検知（60秒間隔）
   - メタデータループ: ウィンドウ情報収集・軽量変化検知（5秒間隔）

2. **状態管理**
   - isRunning: トラッキング実行中
   - isPaused: 一時停止中
   - currentEntry: 現在のエントリー
   - lastScreenContext: 最後のスクリーンコンテキスト

3. **プロジェクト判定フロー**
   ```
   変化検知 → ルールマッチング → AI判定 → エントリー更新
   ```

4. **自動確認/ユーザー確認**
   - 信頼度85%以上: 自動確定
   - 信頼度85%未満: ユーザーに確認を要求

```typescript
export class TrackingEngine {
  // トラッキング制御
  async start(): Promise<{ success, status }>
  async stop(): Promise<{ success, finalEntry }>
  pause(): { success, status }
  resume(): { success, status }

  // ステータス取得
  getStatus(): TrackingStatus

  // 確認レスポンス処理
  async handleConfirmationResponse(response): Promise<{ success }>

  // 設定更新
  updateConfig(config: Partial<TrackingConfig>): void
}
```

#### 3. 設定オプション

```typescript
interface TrackingConfig {
  captureInterval: number;      // スクリーンショット間隔（デフォルト: 60000ms）
  metadataInterval: number;     // メタデータ収集間隔（デフォルト: 5000ms）
  autoConfirmThreshold: number; // 自動確定の信頼度閾値（デフォルト: 85）
  minEntryDuration: number;     // 最小エントリー時間（デフォルト: 60000ms）
}
```

#### 4. IPC通知

トラッキングエンジンはRendererプロセスに以下のイベントを送信します：

```typescript
// エントリー作成時
'tracking:entry-created' -> EntryWithProject

// エントリー更新時
'tracking:entry-updated' -> EntryWithProject

// 確認が必要な時
'tracking:confirmation-needed' -> ConfirmationRequest
```

### IPC API

```typescript
// トラッキング開始
await window.api.tracking.start();

// トラッキング停止
await window.api.tracking.stop();

// 一時停止
await window.api.tracking.pause();

// 再開
await window.api.tracking.resume();

// ステータス取得
const status = await window.api.tracking.getStatus();

// 確認レスポンス
await window.api.tracking.respondConfirmation({
  entryId: 1,
  action: 'confirm', // 'confirm' | 'change' | 'split'
  newProjectId: 2,   // action='change'の場合
  splitTime: '...',  // action='split'の場合
});
```

### エントリーAPI

```typescript
// 今日のエントリーを取得
const entries = await window.api.entries.getToday();

// 日付範囲でエントリーを取得
const entries = await window.api.entries.getByDateRange({
  startDate: '2024-12-01',
  endDate: '2024-12-31',
  projectId: 1,        // オプション
  includeNonWork: true // オプション
});

// 現在進行中のエントリーを取得
const current = await window.api.entries.getCurrent();

// エントリー作成
const entry = await window.api.entries.create({
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

### 処理フロー

```
┌─────────────────────────────────────────────────────────────┐
│  TrackingEngine.start()                                     │
│    ├─ createNewEntry()                                      │
│    ├─ startCaptureLoop() ─────────────────────────────────┐ │
│    │    └─ captureAndAnalyze() (60秒ごと)                 │ │
│    │         ├─ getActiveWindow()                         │ │
│    │         ├─ capture() スクリーンショット              │ │
│    │         ├─ changeDetector.detect() 変化検知          │ │
│    │         └─ judgeAndUpdateProject() プロジェクト判定  │ │
│    │                                                       │ │
│    └─ startMetadataLoop() ────────────────────────────────┤ │
│         └─ collectMetadata() (5秒ごと)                    │ │
│              ├─ getActiveWindow()                         │ │
│              ├─ hasQuickChange() 軽量変化検知             │ │
│              └─ judgeAndUpdateProject() (変化時のみ)      │ │
└─────────────────────────────────────────────────────────────┘

  judgeAndUpdateProject()
    ├─ ruleMatchingService.match() ルールマッチング
    │    └─ マッチした場合 → プロジェクト確定
    │
    ├─ aiJudgmentService.judgeProject() AI判定
    │    └─ 信頼度を取得
    │
    └─ プロジェクト変更時
         ├─ 現在のエントリーを終了
         ├─ 新しいエントリーを作成
         └─ 信頼度 < 85% の場合 → 確認を要求
```

### 作成・更新ファイル一覧

| ファイル | 操作 | 説明 |
|---------|------|------|
| `electron/repositories/entry.repository.ts` | 新規 | エントリーCRUD |
| `electron/services/tracking-engine.service.ts` | 新規 | トラッキングエンジン |
| `electron/main.ts` | 更新 | トラッキングエンジン初期化 |
| `electron/ipc/index.ts` | 更新 | tracking/entryハンドラー実装 |

### 使用例

```typescript
// トラッキングを開始
const { success, status } = await window.api.tracking.start();
console.log(`トラッキング開始: ${status.isRunning}`);

// ステータスを定期的に確認
setInterval(async () => {
  const status = await window.api.tracking.getStatus();
  console.log(`経過時間: ${status.elapsedSeconds}秒`);
  console.log(`現在のプロジェクト: ${status.currentProjectName}`);
}, 10000);

// 確認が必要な時のリスナー
window.api.tracking.onConfirmationNeeded((request) => {
  console.log(`確認が必要: ${request.suggestedProject.name} (${request.confidence}%)`);
  // UIで確認ダイアログを表示
});

// トラッキングを停止
const { finalEntry } = await window.api.tracking.stop();
console.log(`最終エントリー: ${finalEntry?.id}`);
```
