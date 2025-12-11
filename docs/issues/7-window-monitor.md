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

- [x] active-winのインストールとネイティブモジュール設定
- [x] WindowMonitorServiceの実装（getActiveWindow, startMonitoring, stopMonitoringメソッド）
- [x] メタデータ収集（windowTitle, appName, processId）
- [x] 5秒間隔での自動収集機能（setInterval使用）
- [x] ブラウザURL取得機能（Chrome/Edge/Safari対応、AppleScript）
- [x] メタデータの一時保存機能（最新100件をメモリ保持）

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

---

## 実装報告

### ステータス: ✅ 完了

**実装日**: 2025-12-11

### 実装内容

#### 作成したファイル

| ファイル | 説明 |
|---------|------|
| `electron/services/window-monitor.service.ts` | ウィンドウモニターサービス |

#### 更新したファイル

| ファイル | 変更内容 |
|---------|----------|
| `electron/ipc/index.ts` | window-monitor:* IPCハンドラー追加 |
| `electron/preload.ts` | windowMonitor APIメソッド追加 |
| `shared/types/api.ts` | WindowMetadata, WindowMonitorStatus型追加 |
| `shared/types/ipc.ts` | windowMonitor API定義追加 |

#### WindowMonitorService機能

```typescript
class WindowMonitorService {
  // アクティブウィンドウ情報を取得
  getActiveWindow(): Promise<WindowMetadata>
  
  // 定期監視を開始（コールバック付き）
  startMonitoring(
    onMetadata?: (metadata: WindowMetadata) => void,
    intervalMs?: number  // デフォルト: 5000ms
  ): void
  
  // 監視を停止
  stopMonitoring(): void
  
  // 監視中かどうか
  isActive(): boolean
  
  // 最新のメタデータを取得
  getLatestMetadata(): WindowMetadata | null
  
  // メタデータ履歴を取得（最大100件）
  getMetadataHistory(limit?: number): WindowMetadata[]
  
  // 履歴をクリア
  clearHistory(): void
  
  // 監視間隔を変更
  setInterval(intervalMs: number): void
  
  // 最大履歴サイズを変更
  setMaxHistorySize(size: number): void
}
```

#### WindowMetadata型

```typescript
interface WindowMetadata {
  windowTitle: string | null;  // ウィンドウタイトル
  appName: string | null;      // アプリケーション名
  processId: number | null;    // プロセスID
  url: string | null;          // ブラウザの場合のURL
  timestamp: string;           // 取得時刻（ISO 8601）
}
```

#### ブラウザURL取得対応

| ブラウザ | AppleScript対応 |
|---------|-----------------|
| Google Chrome | ✅ |
| Microsoft Edge | ✅ |
| Safari | ✅ |
| Brave Browser | ✅ |
| Arc | ✅ |
| Opera | ✅ |
| Vivaldi | ✅ |
| Firefox | ❌ （AppleScriptサポート限定的） |

**AppleScriptの例（Chrome系）**:
```applescript
tell application "Google Chrome" to get URL of active tab of front window
```

**AppleScriptの例（Safari）**:
```applescript
tell application "Safari" to get URL of front document
```

#### IPC Handlers

| チャンネル | 機能 | 戻り値 |
|-----------|------|--------|
| `window-monitor:get-active` | 現在のアクティブウィンドウ取得 | `WindowMetadata` |
| `window-monitor:start` | 監視開始 | `{ success: boolean }` |
| `window-monitor:stop` | 監視停止 | `{ success: boolean }` |
| `window-monitor:get-status` | 監視状態取得 | `WindowMonitorStatus` |
| `window-monitor:get-history` | メタデータ履歴取得 | `WindowMetadata[]` |

### 発生したエラーと解決方法

このIssueでは重大なエラーは発生しませんでした。

**注意事項**:
- macOSでは「システム環境設定 > セキュリティとプライバシー > アクセシビリティ」でアプリに権限を付与する必要があります
- `active-win`はESMモジュールのため、動的インポートを使用しています

### Git コミット履歴

| コミット | 内容 |
|---------|------|
| `feat: Issue #7 - ウィンドウモニター機能の実装` | 全サービス・IPC実装 |

### 動作確認結果

- [x] active-winでウィンドウ情報が取得できる
- [x] windowTitle, appName, processIdが正しく取得される
- [x] ブラウザでURLが取得される（macOS）
- [x] 5秒間隔で自動収集が動作する
- [x] メタデータ履歴が保持される
- [x] 型チェックが通る

### 今後の拡張ポイント

- Issue #11（トラッキングエンジン）で監視データを活用
- Issue #8（ルールマッチングエンジン）でパターンマッチング
- Windows/Linux対応のURL取得機能
- Firefox対応（拡張機能との連携など）
