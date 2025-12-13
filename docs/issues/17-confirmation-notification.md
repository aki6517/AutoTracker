### 背景 / 目的

AI判定の信頼度が85%未満の場合、ユーザーに確認を求める機能を実装する。ADHD配慮のため、通知頻度を制限し、邪魔にならない形で確認を促す。

- 依存: #3, #9, #11
- ラベル: backend, frontend, feature

### スコープ / 作業項目

1. IPCイベントの実装
2. ConfirmationDialogコンポーネントの実装
3. 確認応答処理の実装
4. システム通知機能
5. 頻度制限ロジック

### ゴール / 完了条件（Acceptance Criteria）

- [x] IPCイベント（tracking:confirmation-needed）の実装
- [x] ConfirmationDialogコンポーネント（提案プロジェクト、信頼度、スクリーンショットプレビュー、選択肢）
- [x] 確認応答処理（tracking:confirmation-response: confirm/change/split）
- [x] システム通知機能（Electron Notification API使用）
- [x] 1時間に最大3回の通知頻度制限
- [x] 確認応答後のエントリー更新処理

### テスト観点

- 統合テスト: 低信頼度判定→通知→応答→エントリー更新
- E2Eテスト: ダイアログ操作
- 検証方法: 意図的に低信頼度判定を発生させてテスト

検証方法:
1. 新規プロジェクトを作成（ルールなし）
2. そのプロジェクト関連作業を行う
3. AI判定で低信頼度（<85%）の場合、確認ダイアログが表示されることを確認
4. 「確認」を選択し、エントリーが更新されることを確認

要確認事項:
- ~~通知のサウンド有無（設定で切替可能にする）~~ → Issue #18で設定追加
- ~~フォーカスを奪うかどうかの設定~~ → Issue #18で設定追加

---

## 実装レポート

### 実装日時
2024年12月13日

### 実装内容

#### 1. NotificationService (`electron/services/notification.service.ts`)

システム通知を管理するサービス。

```typescript
export class NotificationService {
  // 1時間に最大3回の通知頻度制限
  private rateLimitConfig = {
    maxPerHour: 3,
    windowMs: 60 * 60 * 1000,
  };

  // 通知を送信
  showNotification(options: NotificationOptions): boolean

  // 確認が必要な場合の通知
  showConfirmationNeeded(projectName: string, confidence: number): boolean

  // トラッキング開始/停止通知
  showTrackingStarted(projectName: string): boolean
  showTrackingStopped(): boolean

  // 残り通知可能回数を取得
  getRemainingNotifications(): number
}
```

**通知頻度制限:**
- 1時間あたり最大3回
- 超過時は通知をスキップ
- クリックでメインウィンドウをフォーカス

#### 2. ConfirmationDialog (`src/components/tracking/ConfirmationDialog.tsx`)

確認ダイアログコンポーネント。

**機能:**
- 提案プロジェクトの表示（信頼度バッジ付き）
- 3つのアクション選択:
  - 確認: 提案されたプロジェクトで確定
  - 変更: 別のプロジェクトを選択
  - 分割: エントリーを2つに分割
- 代替候補の表示
- 「後で確認」ボタン

#### 3. ConfirmationManager (`src/components/tracking/ConfirmationManager.tsx`)

グローバルな確認ダイアログ管理コンポーネント。

**機能:**
- `tracking:confirmation-needed` イベントを購読
- ダイアログの表示/非表示を管理
- 確認応答をIPCで送信

#### 4. TrackingEngine統合

TrackingEngineでNotificationServiceを使用。

```typescript
private notifyConfirmationNeeded(request: ConfirmationRequest): void {
  // レンダラープロセスに通知
  this.mainWindow?.webContents.send('tracking:confirmation-needed', request);

  // システム通知も送信（頻度制限付き）
  getNotificationService().showConfirmationNeeded(
    request.suggestedProject.name,
    request.confidence
  );
}
```

### 作成・更新ファイル一覧

| ファイル | 操作 | 説明 |
|---------|------|------|
| `electron/services/notification.service.ts` | 新規 | システム通知 |
| `src/components/tracking/ConfirmationDialog.tsx` | 新規 | 確認ダイアログ |
| `src/components/tracking/ConfirmationManager.tsx` | 新規 | ダイアログ管理 |
| `electron/services/tracking-engine.service.ts` | 更新 | 通知統合 |
| `src/App.tsx` | 更新 | Manager追加 |

### 使用方法

```
信頼度 < 85% の判定時:
  1. システム通知が表示される（頻度制限あり）
  2. 確認ダイアログが表示される
  3. ユーザーがアクションを選択:
     - 確認: そのままエントリー確定
     - 変更: 別プロジェクトに変更
     - 分割: 時刻指定でエントリー分割
  4. 「後で確認」でダイアログを閉じることも可能
```

### UI/UX特徴

1. **非侵入型通知**: 頻度制限で集中を妨げない
2. **アクション選択式**: シンプルな3択
3. **代替候補表示**: ワンクリックで変更可能
4. **分割機能**: 途中でプロジェクトが変わった場合に対応
