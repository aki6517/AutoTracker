### 背景 / 目的

作業内容の変化を検知するための5層検知エンジンを実装する。タイトル変化、OCR、画像ハッシュ、ルール、AIの順で効率的に変化を検知し、不要なAI呼び出しを削減する。

- 依存: #6, #7, #8, #9
- ラベル: backend, core

### スコープ / 作業項目

1. ChangeDetectorクラスの実装
2. Layer 1: タイトル/URL変化検知
3. Layer 2: OCRテキスト比較
4. Layer 3: 画像ハッシュ比較
5. Layer 4-5: ルール/AI統合

### ゴール / 完了条件（Acceptance Criteria）

- [ ] ChangeDetectorクラスの実装（detectメソッド、ScreenContext入力）
- [ ] Layer 1: ウィンドウタイトル・URL変化検知（文字列比較）
- [ ] Layer 2: OCR処理（Tesseract.js）でテキスト抽出・比較
- [ ] Layer 3: 画像ハッシュ比較（pHash等でピクセル変化検知）
- [ ] Layer 4: ルールマッチングとの統合（RuleMatchingService呼び出し）
- [ ] Layer 5: AI判定との統合（AIJudgmentService呼び出し）

### テスト観点

- ユニットテスト: 各Layer個別テスト
- 統合テスト: 5層通した変化検知フロー
- 検証方法: 画面変更時に検知されることを確認

検証方法:
1. 同一画面で変化なし→スキップされることを確認
2. アプリ切り替え→Layer 1で検知されることを確認
3. 同一アプリ内でコンテンツ変化→Layer 2または3で検知されることを確認

要確認事項:
- Tesseract.jsの言語データ（日本語対応）
- OCR処理のパフォーマンス（処理時間目標2秒以内）
