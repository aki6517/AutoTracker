### 背景 / 目的

セキュリティ保護のため、パスワード入力画面を検出してスクリーンショット取得をスキップする機能を実装する。ユーザーのプライバシーを守り、機密情報の漏洩を防止する。

- 依存: #6, #7, #18
- ラベル: backend, security

### スコープ / 作業項目

1. パスワード画面検出ロジックの実装
2. 除外キーワードチェック機能
3. ScreenCaptureServiceとの統合
4. 設定画面連携

### ゴール / 完了条件（Acceptance Criteria）

- [x] パスワード画面検出ロジック（タイトルパターン: /password/i, /ログイン/, /login/i等）
- [x] OCRパターン検出（type="password", ●●●●, ****等）
- [x] 除外キーワードチェック機能（ユーザー定義キーワードでスキップ）
- [x] ScreenCaptureServiceとの統合（isPasswordScreen判定でcaptureスキップ）
- [x] 設定画面での除外キーワード管理機能連携

### テスト観点

- ユニットテスト: 各パターンの検出ロジック
- 統合テスト: パスワード画面表示時のスキップ動作
- 検証方法: ログイン画面でスクリーンショットが保存されないことを確認

検証方法:
1. トラッキングを開始
2. ブラウザでログインページを開く
3. screenshotsディレクトリにその画面のファイルが保存されていないことを確認
4. 別のページに移動後、スクリーンショットが再開されることを確認

要確認事項:
- 検出パターンの網羅性（銀行サイト、SNS等の主要サービス）
- 誤検出時の対応（ホワイトリスト機能の要否）

---

## 実装レポート

### 実装日: 2024-12-13

### 実装内容

#### 1. PasswordDetectionService (`electron/services/password-detection.service.ts`)

パスワード画面を検出するための専用サービスを実装：

**検出パターン:**
- **タイトルベース**: 英語（password, login, sign in, authentication, 2FA等）と日本語（ログイン, パスワード, 認証, 二段階認証等）
- **URLベース**: /login, /signin, /auth, /password, /2fa, 主要サービスのログインURL（Google, Microsoft, Apple, GitHub等）
- **OCRベース**: type="password", マスク文字（●●●●, ****）, パスワード関連テキスト

**機能:**
- `detect(metadata, ocrText?)`: フル検出（タイトル、URL、OCR、カスタムキーワード）
- `quickCheck(metadata)`: 簡易チェック（OCRなし、高速）
- `addExcludeKeyword(keyword)`: カスタム除外キーワードを追加
- `removeExcludeKeyword(keyword)`: カスタム除外キーワードを削除
- `setEnabled(enabled)`: 検出機能の有効/無効切り替え

**信頼度システム:**
- 各パターンに重み（0.6〜1.0）を設定
- 複数パターンがマッチした場合は信頼度を上げる
- カスタムキーワードは100%信頼度

#### 2. TrackingEngineへの統合

`captureAndAnalyze`メソッドでスクリーンショット取得前にパスワード検出を実行：

```typescript
const passwordCheck = passwordDetectionService.detect(windowMetadata);
if (passwordCheck.isPasswordScreen) {
  console.log(`Password screen detected. Skipping screenshot.`);
  return; // スクリーンショットをスキップ
}
```

#### 3. 設定画面との連携

設定画面の「プライバシー」タブで以下の設定が可能：
- パスワード検出の有効/無効トグル
- 除外キーワードのカンマ区切り入力
- デフォルトキーワード: password, secret, private, confidential

### 技術的な特徴

1. **多層検出**: タイトル、URL、OCR、カスタムキーワードの4層で検出
2. **国際化対応**: 英語と日本語の両方のパターンに対応
3. **主要サービス対応**: Google, Microsoft, Apple, GitHub等の認証URLを事前登録
4. **設定連携**: electron-storeによる永続化設定と連携
5. **パフォーマンス考慮**: quickCheckメソッドでOCRなしの高速チェックが可能

### 今後の改善点

- ホワイトリスト機能（誤検出時に特定のサイトを除外）
- 検出パターンの動的追加機能
- 検出ログの保存と分析
