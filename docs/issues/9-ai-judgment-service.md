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

- [x] OpenAI APIクライアントの実装（openaiパッケージ使用）
- [x] 1次判定の実装（gpt-4o-mini、変化ありなしのYes/No判定）※gpt-5-nanoが利用可能になるまで代替
- [x] 2次判定の実装（gpt-4o-mini、プロジェクト判定＋信頼度スコア）※gpt-5-miniが利用可能になるまで代替
- [x] レート制限対応（60req/min、RequestQueueクラス）
- [x] リトライロジック（指数バックオフ：1s, 2s, 4s、最大3回）
- [x] AI使用ログ記録（ai_usage_logsテーブル：model, tokens_in, tokens_out, cost）
- [x] コスト計算機能（getMonthlyUsage, isWithinBudgetメソッド）

### テスト観点

- ユニットテスト: プロンプト生成、レスポンスパース
- 統合テスト: API呼び出し→ログ記録
- 検証方法: テストリクエストで応答確認

検証方法:
1. テスト用のスクリーンコンテキストでdetectChange呼び出し
2. judgeProject呼び出しでプロジェクト判定結果を確認
3. ai_usage_logsテーブルにログが記録されていることを確認

要確認事項:
- ~~gpt-5-nano/gpt-5-miniが利用可能になるまでの代替モデル（gpt-4o-mini等）~~ → gpt-4o-miniを使用
- ~~APIキーの安全な保存方法（electron-store暗号化）~~ → electron-storeの暗号化オプションを使用

---

## 実装レポート

### 実装日時
2024年12月13日

### 実装内容

#### 1. AI使用ログリポジトリ (`electron/repositories/ai-usage.repository.ts`)

AI使用ログのCRUD操作を行うリポジトリを実装しました。

```typescript
export class AIUsageRepository {
  // 使用ログを記録
  create(data: { model, tokensIn, tokensOut, cost, requestType }): AIUsageLog

  // 月別使用状況を取得
  getMonthlyUsage(yearMonth?: string): MonthlyUsage

  // 今月のコストが予算内かチェック
  isWithinBudget(monthlyBudget: number): boolean

  // 予算ステータスを取得
  getBudgetStatus(monthlyBudget: number): BudgetStatus

  // 日別使用状況を取得
  getDailyUsage(date: string): DailyUsage
}
```

#### 2. リクエストキュー (`electron/services/request-queue.service.ts`)

OpenAI APIのレート制限（60req/min）に対応するためのキュー管理システムを実装しました。

**主な機能:**
- レート制限監視（60リクエスト/分）
- 指数バックオフによるリトライ（1s → 2s → 4s、最大3回）
- リトライ可能なエラーの判定（429、5xx、ネットワークエラー）

```typescript
export class RequestQueue {
  // リクエストをキューに追加
  enqueue<T>(execute: () => Promise<T>, options?: { maxRetries?: number }): Promise<T>

  // キューの状態を取得
  getStatus(): { queueLength, requestsInLastMinute, isProcessing }
}
```

#### 3. OpenAIクライアント (`electron/services/openai-client.service.ts`)

OpenAI APIとの通信を管理するクライアントを実装しました。

**主な機能:**
- APIキーの暗号化保存（electron-store）
- モデル価格設定（コスト自動計算）
- 使用ログの自動記録

```typescript
export class OpenAIClient {
  // APIキー管理
  setApiKey(apiKey: string): void
  hasApiKey(): boolean
  testApiKey(): Promise<{ valid: boolean; error?: string }>

  // チャット補完リクエスト
  async chatCompletion(messages, options): Promise<ChatCompletionResult>

  // コスト計算
  calculateCost(model, tokensIn, tokensOut): number
}
```

**モデル価格設定:**
```typescript
const MODEL_PRICING = {
  'gpt-4o-mini': { input: 0.15, output: 0.60 },  // USD per 1M tokens
  'gpt-4o': { input: 2.5, output: 10.0 },
  'gpt-5-nano': { input: 0.05, output: 0.20 },   // 将来用（仮）
  'gpt-5-mini': { input: 0.10, output: 0.40 },   // 将来用（仮）
};
```

#### 4. AI判定サービス (`electron/services/ai-judgment.service.ts`)

2段階判定を行うメインサービスを実装しました。

**1次判定（変化検知）:**
- 前回のスクリーンコンテキストと比較
- 明らかな変化（アプリ変更、ドメイン変更）はAPI呼び出しをスキップ（コスト削減）
- 予算超過時は判定をスキップ

**2次判定（プロジェクト判定）:**
- スクリーンコンテキストから作業中のプロジェクトを推定
- 信頼度スコア（0-100）を返却
- 代替候補も提示

```typescript
export class AIJudgmentService {
  // 1次判定: 変化検知
  async detectChange(current, previous?): Promise<ChangeDetectionResult>

  // 2次判定: プロジェクト判定
  async judgeProject(context, projects): Promise<ProjectJudgmentResult>

  // 予算管理
  isWithinBudget(): boolean
  getBudgetStatus(): BudgetStatus
}
```

#### 5. IPC統合

以下のIPCハンドラーを追加しました：

```typescript
// AI使用状況
'ai-usage:get-monthly'      // 月別使用状況
'ai-usage:get-budget-status' // 予算ステータス

// AI判定
'ai:set-api-key'            // APIキー設定
'ai:has-api-key'            // APIキー存在確認
'ai:test-api-key'           // APIキーテスト
'ai:detect-change'          // 変化検知
'ai:judge-project'          // プロジェクト判定
```

### 型定義の追加

`shared/types/api.ts` に以下の型を追加：

```typescript
export interface ScreenContext {
  windowTitle: string | null;
  appName: string | null;
  url: string | null;
  ocrText?: string | null;
  timestamp: string;
}

export interface ChangeDetectionResult {
  hasChange: boolean;
  confidence: number;
  reasoning: string;
  tokensUsed: number;
  cost: number;
}

export interface ProjectJudgmentResult {
  projectId: string | null;
  projectName: string | null;
  confidence: number;
  reasoning: string;
  alternatives: { projectId: string; projectName: string; score: number }[];
  isWork: boolean;
  tokensUsed: number;
  cost: number;
}
```

### コスト最適化の工夫

1. **明らかな変化のローカル判定**: アプリ変更やドメイン変更はAPI呼び出しなしで検知
2. **同一コンテキストのスキップ**: 変化がない場合はAPI呼び出しをスキップ
3. **予算超過時のスキップ**: 月間予算を超えた場合は判定を停止
4. **低コストモデルの使用**: gpt-4o-miniを使用（将来的にはgpt-5-nanoに移行予定）

### 作成・更新ファイル一覧

| ファイル | 操作 | 説明 |
|---------|------|------|
| `electron/repositories/ai-usage.repository.ts` | 新規 | AI使用ログリポジトリ |
| `electron/services/request-queue.service.ts` | 新規 | リクエストキュー |
| `electron/services/openai-client.service.ts` | 新規 | OpenAIクライアント |
| `electron/services/ai-judgment.service.ts` | 新規 | AI判定サービス |
| `electron/ipc/index.ts` | 更新 | AI関連ハンドラー追加 |
| `electron/preload.ts` | 更新 | AI API公開 |
| `shared/types/api.ts` | 更新 | AI判定関連型追加 |
| `shared/types/ipc.ts` | 更新 | AI API型定義追加 |

### 使用方法

```typescript
// Rendererプロセスから使用

// 1. APIキーを設定
await window.api.ai.setApiKey('sk-...');

// 2. 変化検知
const changeResult = await window.api.ai.detectChange({
  current: {
    windowTitle: 'Visual Studio Code - project/main.ts',
    appName: 'Code',
    url: null,
    timestamp: new Date().toISOString(),
  },
  previous: {
    windowTitle: 'Visual Studio Code - project/utils.ts',
    appName: 'Code',
    url: null,
    timestamp: new Date().toISOString(),
  },
});

// 3. プロジェクト判定
const projectResult = await window.api.ai.judgeProject({
  context: {
    windowTitle: 'AutoTracker - Visual Studio Code',
    appName: 'Code',
    url: null,
    timestamp: new Date().toISOString(),
  },
});

// 4. 予算確認
const budgetStatus = await window.api.aiUsage.getBudgetStatus();
console.log(`使用率: ${budgetStatus.percentUsed}%`);
```

### 備考

- gpt-5-nano/gpt-5-miniは現時点で利用不可のため、gpt-4o-miniを代替として使用
- モデルが利用可能になった際は `MODEL_PRICING` と `DEFAULT_MODELS` を更新するだけで切り替え可能
- APIキーはelectron-storeの暗号化機能で安全に保存
