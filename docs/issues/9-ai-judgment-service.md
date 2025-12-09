### 背景 / 目的

ルールマッチングで判定できない場合に、OpenAI APIを使用してプロジェクトを判定する機能を実装する。2段階判定（変化検知→詳細判定）でコストを最適化し、月間予算$2.00以内に収める。

- 依存: #2, #6, #7
- ラベル: backend, ai

### スコープ / 作業項目

1. OpenAI APIクライアントの実装
2. 1次判定（変化検知）の実装
3. 2次判定（プロジェクト判定）の実装
4. レート制限・リトライ処理
5. コスト管理機能

### ゴール / 完了条件（Acceptance Criteria）

- [ ] OpenAI APIクライアントの実装（openaiパッケージ使用）
- [ ] 1次判定の実装（gpt-5-nano、変化ありなしのYes/No判定）
- [ ] 2次判定の実装（gpt-5-mini、プロジェクト判定＋信頼度スコア）
- [ ] レート制限対応（60req/min、RequestQueueクラス）
- [ ] リトライロジック（指数バックオフ：1s, 2s, 4s、最大3回）
- [ ] AI使用ログ記録（ai_usage_logsテーブル：model, tokens_in, tokens_out, cost）
- [ ] コスト計算機能（getMonthlyUsage, isWithinBudgetメソッド）

### テスト観点

- ユニットテスト: プロンプト生成、レスポンスパース
- 統合テスト: API呼び出し→ログ記録
- 検証方法: テストリクエストで応答確認

検証方法:
1. テスト用のスクリーンコンテキストでdetectChange呼び出し
2. judgeProject呼び出しでプロジェクト判定結果を確認
3. ai_usage_logsテーブルにログが記録されていることを確認

要確認事項:
- gpt-5-nano/gpt-5-miniが利用可能になるまでの代替モデル（gpt-4o-mini等）
- APIキーの安全な保存方法（electron-store暗号化）
