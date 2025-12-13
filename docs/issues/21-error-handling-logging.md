### 背景 / 目的

アプリケーションの安定性向上のため、エラーハンドリングとログ機能を実装する。エラー分類、リトライ処理、オフラインモード対応を行い、ユーザー体験を損なわない堅牢なアプリを目指す。

- 依存: #1, #2
- ラベル: backend, infra

### スコープ / 作業項目

1. Loggerクラスの実装
2. ログローテーション
3. エラー分類・ハンドリング
4. リトライポリシー
5. オフラインモード

### ゴール / 完了条件（Acceptance Criteria）

- [x] Loggerクラスの実装（error, warn, info, debugメソッド、ファイル＋コンソール出力）
- [x] ログローテーション機能（日次、最大10MB/ファイル、{userData}/logs/autotracker_{date}.log）
- [x] エラー分類（Fatal: アプリ停止、Critical: 機能停止、Warning: 通知、Info: ログのみ）
- [x] リトライポリシー実装（OpenAI API: 指数バックオフ最大3回 - request-queue.serviceで実装済み）
- [x] オフラインモード実装（ネット未接続時はAI判定スキップ、ルールマッチングのみ）
- [ ] クラッシュレポート機能（Phase 3で検討）

### テスト観点

- ユニットテスト: Logger各メソッド、リトライロジック
- 統合テスト: オフラインモード切替
- 検証方法: ネット切断状態でアプリ動作確認

検証方法:
1. ネットワークを切断してアプリを起動
2. トラッキングが動作し、ルールマッチングでプロジェクト判定されることを確認
3. ネットワーク復旧後、AI判定が再開されることを確認
4. logsディレクトリにログファイルが出力されていることを確認

要確認事項:
- クラッシュレポート送信先（Phase 3でSentry等導入検討）
- ログの保持期間（30日を想定）

---

## 実装レポート

### 実装日: 2024-12-13

### 実装内容

#### 1. LoggerService (`electron/services/logger.service.ts`)

構造化ログ出力を提供するサービス：

**主要メソッド:**
- `debug(category, message, data?)`: デバッグログ
- `info(category, message, data?)`: 情報ログ
- `warn(category, message, data?)`: 警告ログ
- `error(category, message, error?, data?)`: エラーログ
- `fatal(category, message, error?, data?)`: 致命的エラーログ
- `logError(category, severity, message, error?, data?)`: エラー分類に基づくログ

**機能:**
- コンソール出力とファイル出力の両対応
- JSON形式での構造化ログ
- 日次ログローテーション
- ファイルサイズ制限（10MB/ファイル）
- 古いログの自動削除（30日分保持）

**エラー分類:**
- `INFO`: ログのみ
- `WARNING`: 警告として通知
- `CRITICAL`: 機能停止レベル
- `FATAL`: アプリ停止レベル

#### 2. NetworkMonitorService (`electron/services/network-monitor.service.ts`)

ネットワーク接続状態を監視するサービス：

**主要メソッド:**
- `checkConnection()`: ネットワーク接続をチェック
- `startMonitoring(intervalMs?)`: 定期的な監視を開始（デフォルト30秒）
- `stopMonitoring()`: 監視を停止
- `getIsOnline()`: オンライン状態を取得
- `getStatus()`: ネットワーク状態を取得
- `onStatusChange(callback)`: 状態変更時のコールバックを登録
- `runOnlineOnly(operation, fallback?)`: オフライン時に操作をスキップ

**機能:**
- Electronのnet.isOnline()を使用
- ネットワークエラーの自動検出
- オンライン/オフライン切り替え時のコールバック通知

#### 3. オフラインモード対応

TrackingEngineを更新:
- オフライン時はAI判定をスキップ
- ルールマッチングのみで動作
- ネットワーク復旧時は自動的にAI判定を再開

#### 4. メインプロセスへの統合

`electron/main.ts`を更新:
- アプリ起動時にLoggerServiceとNetworkMonitorServiceを初期化
- アプリ終了時に適切にシャットダウン

### 技術的な特徴

1. **構造化ログ**: JSON形式で機械可読なログ出力
2. **カテゴリ分類**: モジュール別のログ追跡が可能
3. **自動ローテーション**: 日次およびサイズベースのログローテーション
4. **グレースフルデグレード**: オフライン時もルールマッチングで動作継続
5. **ネットワークエラー検出**: API呼び出し失敗時に自動でオフラインモードに切り替え

### 今後の改善点

- クラッシュレポート機能（Sentry統合）
- リモートログ送信（オプトイン）
- ログビューアーUI
