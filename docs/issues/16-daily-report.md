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

- [ ] ReportRepositoryの実装（getDailySummary, getAggregatedReportメソッド）
- [ ] IPC Handler実装（report:generate-daily）
- [ ] Reportsページコンポーネントの作成（/reportsルート）
- [ ] 日次サマリー表示（総稼働時間、請求可能時間、売上計算）
- [ ] プロジェクト別内訳表示（時間、割合、売上）
- [ ] Rechartsを使用したグラフ表示（PieChart: プロジェクト比率）
- [ ] 日付選択機能（DateNavigator）

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
- PDF/CSVエクスポート機能はPhase 2で実装
- 週次・月次レポートはPhase 2で実装
