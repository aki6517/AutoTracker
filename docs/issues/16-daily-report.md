### 背景 / 目的

日次レポート機能を実装し、ユーザーが1日の作業成果を確認・エクスポートできるようにする。プロジェクト別の時間集計とグラフ表示を提供する。

- 依存: #2, #4, #12
- ラベル: backend, frontend, feature

### スコープ / 作業項目

1. ReportRepositoryの実装
2. IPC Handlerの実装
3. Reportsページコンポーネントの作成
4. グラフ表示（Recharts）
5. 日付選択機能

### ゴール / 完了条件（Acceptance Criteria）

- [x] ReportRepositoryの実装（getDailySummary, getAggregatedReportメソッド）
- [x] IPC Handler実装（report:generate-daily）
- [x] Reportsページコンポーネントの作成（/reportsルート）
- [x] 日次サマリー表示（総稼働時間、請求可能時間、売上計算）
- [x] プロジェクト別内訳表示（時間、割合、売上）
- [x] Rechartsを使用したグラフ表示（PieChart: プロジェクト比率）
- [x] 日付選択機能（DateNavigator）

### テスト観点

- ユニットテスト: 集計クエリ、売上計算
- E2Eテスト: レポート表示、日付切替
- 検証方法: 手動計算との照合

検証方法:
1. レポート画面を開く
2. 今日の日付で日次レポートが表示されることを確認
3. 総時間がタイムラインの合計と一致することを確認
4. グラフがプロジェクト比率を正しく表示していることを確認

要確認事項:
- ~~PDF/CSVエクスポート機能はPhase 2で実装~~ → Phase 2へ
- ~~週次・月次レポートはPhase 2で実装~~ → Phase 2へ

---

## 実装レポート

### 実装日時
2024年12月13日

### 実装内容

#### 1. ReportRepository (`electron/repositories/report.repository.ts`)

レポート生成用のリポジトリ。

```typescript
export class ReportRepository {
  // 日次サマリーを取得
  getDailySummary(date: string): DailySummary

  // プロジェクト別内訳を取得
  getProjectBreakdown(date: string): ProjectBreakdown[]

  // 日次レポートを生成
  generateDailyReport(date: string): DailyReport

  // 期間別集計を取得
  getAggregatedReport(startDate: string, endDate: string): AggregatedReport
}
```

**サマリー計算:**
- 総稼働時間: 全エントリーの合計
- 請求可能時間: プロジェクトに紐づいたエントリーの合計
- 売上: 時間 × 時間単価

#### 2. IPC Handler

```typescript
// 日次レポート生成
'report:generate-daily' -> { date, totalHours, totalRevenue, projectBreakdown }

// 期間別集計（追加）
'report:get-aggregated' -> { totalHours, billableHours, totalRevenue, projectBreakdown }
```

#### 3. Reports ページ (`src/pages/Reports.tsx`)

日次レポート表示ページ。

**機能:**
- 日付ナビゲーション（DateNavigator再利用）
- サマリーカード（総稼働時間、売上、プロジェクト数）
- 円グラフ（Recharts PieChart）
- プロジェクト別内訳リスト（進捗バー付き）

#### 4. Recharts統合

```bash
npm install recharts
```

**使用コンポーネント:**
- PieChart: ドーナツチャート
- Cell: 色分けセル
- Legend: 凡例
- Tooltip: ホバー時の詳細表示

### 作成・更新ファイル一覧

| ファイル | 操作 | 説明 |
|---------|------|------|
| `electron/repositories/report.repository.ts` | 新規 | レポート集計 |
| `electron/ipc/index.ts` | 更新 | レポートハンドラー |
| `src/pages/Reports.tsx` | 新規 | レポートページ |
| `src/App.tsx` | 更新 | ルーティング追加 |
| `package.json` | 更新 | recharts追加 |

### 使用方法

```
/reports           - 今日の日次レポート

日付ナビゲーション
  - 前日/翌日: 日付を移動
  - 今日: 今日に戻る

サマリー表示
  - 総稼働時間: その日の全作業時間
  - 売上: 時間単価 × 作業時間
  - プロジェクト数: 作業したプロジェクトの数

グラフ
  - 円グラフ: プロジェクト別の時間比率
  - 進捗バー: 各プロジェクトの割合
```

### UI/UX特徴

1. **ドーナツチャート**: 中央が空いた見やすいグラフ
2. **ダークテーマ対応**: Tooltip、Legendもダークに
3. **進捗バー**: プロジェクトカラーで色分け
4. **売上表示**: 時間単価が設定されている場合のみ表示
