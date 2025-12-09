### 背景 / 目的

自動時間管理の核となるスクリーンキャプチャ機能を実装する。画面を定期的にキャプチャし、プライバシー保護のため暗号化して保存する。画像は圧縮してストレージ消費を抑える。

- 依存: #2
- ラベル: backend, core

### スコープ / 作業項目

1. screenshot-desktopの導入
2. ScreenCaptureServiceの実装
3. 画像圧縮処理（Sharp）
4. AES-256暗号化処理
5. DBへのメタデータ保存

### ゴール / 完了条件（Acceptance Criteria）

- [ ] screenshot-desktopのインストールとネイティブモジュール設定
- [ ] ScreenCaptureServiceの実装（capture, compress, encrypt, saveメソッド）
- [ ] Sharpを使用した画像圧縮（1280x720リサイズ、JPEG 80%品質、200KB以下目標）
- [ ] AES-256-GCM暗号化処理の実装（EncryptionService）
- [ ] スクリーンショット保存先の設定（{userData}/screenshots/YYYY-MM-DD/）
- [ ] screenshotsテーブルへのメタデータ保存（file_path, timestamp, window_title, url, app_name）

### テスト観点

- ユニットテスト: 圧縮処理、暗号化処理
- 統合テスト: キャプチャ→圧縮→暗号化→保存の一連の流れ
- 検証方法: 保存されたファイルを復号して画像確認

検証方法:
1. 手動でcaptureメソッドを呼び出し
2. {userData}/screenshots/配下にファイルが生成されることを確認
3. ファイルサイズが200KB以下であることを確認
4. 復号して正しく画像が表示されることを確認

要確認事項:
- macOSの画面キャプチャ権限（Screen Recording）の取得方法
- Windowsでの権限設定
