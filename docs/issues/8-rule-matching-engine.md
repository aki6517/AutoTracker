### 背景 / 目的

ユーザーが設定したルールに基づいてプロジェクトを自動判定する機能を実装する。AI判定の前にルールマッチングで確定できれば、AIコストを削減でき、判定精度も100%となる。

- 依存: #2, #5, #7
- ラベル: backend, core

### スコープ / 作業項目

1. RuleMatchingServiceの実装
2. ルールタイプ別マッチング処理
3. 優先度評価ロジック
4. ルールテスト機能
5. RuleRepositoryの実装

### ゴール / 完了条件（Acceptance Criteria）

- [x] RuleMatchingServiceの実装（matchメソッド）
- [x] ルールタイプ別マッチング（window_title: 正規表現, url: 正規表現, keyword: JSON配列OR条件, app_name: 部分一致）
- [x] 優先度によるルール評価順序の実装（高優先度ルールが先にマッチ）
- [x] キーワードマッチング（JSON配列内のいずれかにマッチでtrue）
- [x] RuleRepositoryの実装（findByProject, create, update, delete, toggleActive）
- [x] ルールテスト機能（rule:test IPC）の実装（テストデータでマッチ判定）

### テスト観点

- ユニットテスト: 各ルールタイプのマッチング処理
- 統合テスト: 複数ルールの優先度評価
- 検証方法: テストデータでマッチ/不一致を確認

検証方法:
1. キーワードルール["TEPCO", "東京電力"]を作成
2. ウィンドウタイトルに"TEPCO"を含む場合にマッチすることを確認
3. 正規表現ルール`.*GitHub.*`を作成し、GitHubページでマッチすることを確認

要確認事項:
- 正規表現の安全性（ReDoS対策）
- ルール数の上限（プロジェクトあたり10個程度を想定）

---

## 実装報告

### ステータス: ✅ 完了

**実装日**: 2025-12-11

### 実装内容

#### 作成したファイル

| ファイル | 説明 |
|---------|------|
| `electron/repositories/rule.repository.ts` | ルールCRUD操作 |
| `electron/services/rule-matching.service.ts` | ルールマッチングロジック |

#### 更新したファイル

| ファイル | 変更内容 |
|---------|----------|
| `electron/ipc/index.ts` | rule:* IPCハンドラー追加 |
| `electron/preload.ts` | rules APIメソッド追加 |
| `shared/types/api.ts` | Rule型をstring IDに変更、isActiveに名称変更 |
| `shared/types/ipc.ts` | rules API拡張 |

#### RuleRepository機能

```typescript
class RuleRepository {
  findByProject(projectId, activeOnly?): Rule[]  // 優先度順で取得
  findAll(activeOnly?): Rule[]
  findById(id): Rule | null
  create(data): Rule  // 自動優先度設定
  update(id, data): Rule | null
  delete(id): boolean
  toggleActive(id): Rule | null  // 有効/無効切り替え
  countByProject(projectId): number  // 上限チェック用
  reorder(ruleIds): void  // 優先度並び替え
}
```

#### RuleMatchingService機能

```typescript
class RuleMatchingService {
  // 全ルールでマッチング（優先度順）
  match(testData): MatchResult
  
  // 特定プロジェクトのルールでマッチング
  matchForProject(projectId, testData): MatchResult
  
  // 単一ルールのマッチング判定
  matchRule(rule, testData): { matched: boolean; matchedText?: string }
  
  // ルールテスト（保存せずにテスト）
  testRule(ruleType, pattern, testData): { matched: boolean; matchedText?: string }
  
  // パターンの妥当性検証
  validatePattern(ruleType, pattern): { valid: boolean; error?: string }
}
```

#### ルールタイプとマッチング方式

| ルールタイプ | マッチング方式 | 例 |
|-------------|---------------|-----|
| `app_name` | 大文字小文字無視の部分一致 | `Chrome` → Google Chrome, chrome.exe |
| `window_title` | 正規表現マッチング | `.*GitHub.*` → GitHubを含むタイトル |
| `url` | 正規表現マッチング | `https://github\.com/.*` → GitHub URL |
| `keyword` | JSON配列のOR条件 | `["TEPCO", "東京電力"]` → いずれかを含む |

#### IPC Handlers

| チャンネル | 機能 |
|-----------|------|
| `rule:get-by-project` | プロジェクト別ルール取得 |
| `rule:get-all` | 全ルール取得 |
| `rule:create` | ルール作成（パターン検証+上限チェック） |
| `rule:update` | ルール更新 |
| `rule:delete` | ルール削除 |
| `rule:toggle-active` | 有効/無効切り替え |
| `rule:reorder` | 優先度並び替え |
| `rule:test` | ルールテスト |
| `rule:match` | 全ルールでマッチング |

### ReDoS対策

**検出パターン**:
- ネストした繰り返し: `(\+|\*)\s*(\+|\*)`
- 危険なパターン: `(.*)+`, `(.+)+`, `(.*)*`, `([...]+)+`
- 過度に長いパターン: 200文字以上

**実行時対策**:
- タイムアウト: 100ms
- 実行時間の警告ログ

```typescript
// 危険パターン検出例
private isUnsafeRegex(pattern: string): boolean {
  const nestedRepetition = /(\+|\*|\{[\d,]+\})\s*(\+|\*|\{[\d,]+\})/;
  if (nestedRepetition.test(pattern)) return true;
  if (pattern.length > 200) return true;
  // ...
}
```

### 発生したエラーと解決方法

このIssueでは重大なエラーは発生しませんでした。

### Git コミット履歴

| コミット | 内容 |
|---------|------|
| `feat: Issue #8 - ルールマッチングエンジンの実装` | 全サービス・リポジトリ・IPC実装 |

### 動作確認結果

- [x] ルール作成でパターン検証が動作
- [x] 優先度順でルールが評価される
- [x] 各ルールタイプのマッチングが正常動作
- [x] ReDoS検出が動作
- [x] プロジェクトあたりのルール数上限（10個）チェック
- [x] 型チェックが通る

### AI判定との連携フロー

```
[WindowMetadata]
       ↓
[RuleMatchingService.match()]
       ↓
  マッチした？
   ├─ Yes → プロジェクト確定（confidence: 100%）
   │
   └─ No → AI判定へ（Issue #9で実装）
```
