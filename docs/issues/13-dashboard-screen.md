### 背景 / 目的

ユーザーが現在の作業状況と今日の進捗を一目で把握できるダッシュボード画面を実装する。ADHD配慮のため、情報を厳選し認知負荷を最小化する。

- 依存: #4, #11, #12
- ラベル: frontend, ui

### スコープ / 作業項目

1. Dashboardページコンポーネントの作成
2. CurrentTaskコンポーネントの実装
3. TodayStatsコンポーネントの実装
4. RecentTimelineコンポーネントの実装
5. リアルタイム更新機能

### ゴール / 完了条件（Acceptance Criteria）

- [x] Dashboardページコンポーネントの作成（/dashboardルート）
- [x] CurrentTaskコンポーネント（現在のプロジェクト名、経過時間、信頼度表示）
- [x] TodayStatsコンポーネント（総稼働時間、請求可能時間、作業プロジェクト数）
- [x] RecentTimelineコンポーネント（直近5-10件のエントリー表示）
- [x] リアルタイム更新機能（tracking:entry-created/updatedイベント受信）
- [x] トラッキング開始/停止ボタンの実装

### テスト観点

- E2Eテスト: 画面表示、ボタン操作
- ビジュアルテスト: レイアウト確認
- 検証方法: トラッキング中に画面が更新されることを確認

検証方法:
1. ダッシュボード画面を開く
2. トラッキング開始ボタンをクリック
3. CurrentTaskに現在の作業が表示されることを確認
4. 時間経過で経過時間が更新されることを確認

要確認事項:
- ~~経過時間の更新間隔（1秒ごとを想定）~~ → 1秒ごとに更新
- ~~デザインプレビューHTML（autotracker-preview.html）との整合性~~ → ダークテーマで統一

---

## 実装レポート

### 実装日時
2024年12月13日

### 実装内容

#### 1. CurrentTask コンポーネント (`src/components/dashboard/CurrentTask.tsx`)

現在の作業状況を表示し、トラッキングを制御するコンポーネント。

**機能:**
- トラッキング停止時: 開始ボタンを表示
- トラッキング中: プロジェクト名、経過時間、信頼度を表示
- 一時停止/再開/停止ボタン
- 1秒ごとの経過時間更新
- 信頼度に応じた色分けバッジ

```typescript
interface CurrentTaskProps {
  status: TrackingStatus | null;
  onStart: () => void;
  onStop: () => void;
  onPause: () => void;
  onResume: () => void;
}
```

#### 2. TodayStats コンポーネント (`src/components/dashboard/TodayStats.tsx`)

今日の統計を4つのカードで表示。

**表示項目:**
- 今日の作業時間
- 請求可能時間（プロジェクトに紐づいた作業時間）
- プロジェクト数
- AI判定精度（平均信頼度）

```typescript
interface TodayStatsProps {
  totalHours: number;
  billableHours: number;
  projectCount: number;
  aiAccuracy: number;
}
```

#### 3. RecentTimeline コンポーネント (`src/components/dashboard/RecentTimeline.tsx`)

今日のエントリーをタイムライン形式で表示。

**機能:**
- 直近5件のエントリーを表示
- プロジェクトカラーバーで視覚的区別
- 進行中のエントリーをハイライト
- 信頼度バッジ（手動入力は「手動」と表示）
- タイムラインページへのリンク

```typescript
interface RecentTimelineProps {
  entries: EntryWithProject[];
  currentEntryId?: number | null;
}
```

#### 4. Dashboard ページ (`src/pages/Dashboard.tsx`)

各コンポーネントを統合したメインページ。

**機能:**
- 初回ロード時にデータ取得
- 30秒ごとの自動更新
- IPC経由でのトラッキング制御
- エントリー作成/更新イベントのリアルタイム受信

### UI/UX特徴

1. **ダークテーマ**: 目に優しいダークカラーベース
2. **グラデーション**: トラッキング中は微妙なグラデーションで状態を強調
3. **アニメーション**: 記録中はパルスアニメーションで視覚的フィードバック
4. **色分け**: 信頼度に応じた色分け（緑/黄/赤）

### 作成・更新ファイル一覧

| ファイル | 操作 | 説明 |
|---------|------|------|
| `src/components/dashboard/CurrentTask.tsx` | 新規 | 現在の作業コンポーネント |
| `src/components/dashboard/TodayStats.tsx` | 新規 | 今日の統計コンポーネント |
| `src/components/dashboard/RecentTimeline.tsx` | 新規 | タイムラインコンポーネント |
| `src/pages/Dashboard.tsx` | 更新 | ダッシュボードページ |

### 使用方法

ダッシュボードページ（`/`または`/dashboard`）にアクセスすると、現在の作業状況と今日の進捗が表示されます。

```typescript
// トラッキング開始
// 「トラッキング開始」ボタンをクリック

// トラッキング中の操作
// - 「一時停止」: 記録を一時停止
// - 「再開」: 一時停止を解除
// - 「停止」: トラッキングを終了
```
