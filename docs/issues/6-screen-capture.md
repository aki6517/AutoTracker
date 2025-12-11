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

- [x] screenshot-desktopのインストールとネイティブモジュール設定
- [x] ScreenCaptureServiceの実装（capture, compress, encrypt, saveメソッド）
- [x] Sharpを使用した画像圧縮（1280x720リサイズ、JPEG 80%品質、200KB以下目標）
- [x] AES-256-GCM暗号化処理の実装（EncryptionService）
- [x] スクリーンショット保存先の設定（{userData}/screenshots/YYYY-MM-DD/）
- [x] screenshotsテーブルへのメタデータ保存（file_path, timestamp, window_title, url, app_name）

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

---

## 実装報告

### ステータス: ✅ 完了

**実装日**: 2025-12-11

### 実装内容

#### 作成したファイル

| ファイル | 説明 |
|---------|------|
| `electron/services/encryption.service.ts` | AES-256-GCM暗号化サービス |
| `electron/services/screen-capture.service.ts` | スクリーンキャプチャサービス |
| `electron/repositories/screenshot.repository.ts` | スクリーンショットDB操作 |

#### 更新したファイル

| ファイル | 変更内容 |
|---------|----------|
| `electron/ipc/index.ts` | screenshot:* IPCハンドラー追加 |
| `electron/preload.ts` | screenshots APIメソッド追加 |
| `shared/types/api.ts` | ScreenshotMeta.idをstring型に修正 |
| `shared/types/ipc.ts` | screenshots APIに新規メソッド追加 |

#### EncryptionService機能

```typescript
class EncryptionService {
  encrypt(data: Buffer): Buffer      // データを暗号化
  decrypt(encryptedData: Buffer): Buffer  // データを復号化
  encryptFile(inputPath, outputPath): Promise<void>  // ファイルを暗号化
  decryptFile(encryptedPath): Promise<Buffer>  // ファイルを復号化
  encryptBufferToFile(buffer, outputPath): Promise<void>  // バッファを暗号化保存
}
```

**暗号化仕様**:
- アルゴリズム: AES-256-GCM
- キー長: 256ビット（32バイト）
- IV長: 96ビット（12バイト）- GCM推奨
- 認証タグ: 128ビット（16バイト）
- キー保存: `{userData}/.encryption_key`（パーミッション 600）

**暗号化データフォーマット**:
```
[IV (12 bytes)] [Auth Tag (16 bytes)] [Encrypted Data]
```

#### ScreenCaptureService機能

```typescript
class ScreenCaptureService {
  capture(entryId, metadata?): Promise<CaptureResult>  // キャプチャ実行
  getScreenshot(id): Promise<{ data: Buffer; mimeType: string }>
  getThumbnail(id): Promise<{ data: Buffer; mimeType: string }>
  getByEntryId(entryId): DbScreenshot[]
  delete(id): Promise<boolean>
  cleanup(retentionDays): Promise<number>  // 古いファイルを削除
}
```

**圧縮設定**:
| 設定項目 | メイン画像 | サムネイル |
|---------|-----------|-----------|
| サイズ | 1280x720 | 320x180 |
| フォーマット | JPEG | JPEG |
| 品質 | 80% | 60% |
| 目標サイズ | 200KB以下 | - |

**保存パス**:
```
{userData}/screenshots/
  └── YYYY-MM-DD/
      ├── {uuid}.enc        (暗号化されたメイン画像)
      └── {uuid}_thumb.enc  (暗号化されたサムネイル)
```

#### IPC Handlers

| チャンネル | 機能 | 戻り値 |
|-----------|------|--------|
| `screenshot:get-by-entry` | エントリーのスクリーンショット一覧 | `ScreenshotMeta[]` |
| `screenshot:get-image` | フルサイズ画像取得 | `{ data: string, mimeType: string }` |
| `screenshot:get-thumbnail` | サムネイル取得 | `{ data: string, mimeType: string }` |
| `screenshot:capture` | 手動キャプチャ実行 | `ScreenshotMeta` |
| `screenshot:delete` | スクリーンショット削除 | `{ success: boolean }` |

#### ScreenshotRepository機能

```typescript
class ScreenshotRepository {
  findByEntryId(entryId): Screenshot[]
  findById(id): Screenshot | null
  findByDateRange(startDate, endDate): Screenshot[]
  delete(id): boolean
  deleteByEntryId(entryId): number
  findExpired(cutoffDate): Screenshot[]
  deleteExpired(cutoffDate): number
  count(): number
  countByEntryId(entryId): number
}
```

### 発生したエラーと解決方法

このIssueでは重大なエラーは発生しませんでした。

**注意事項**:
- macOSでは「システム環境設定 > セキュリティとプライバシー > 画面収録」でアプリに権限を付与する必要があります
- 権限がない場合、`capture`メソッドは例外をスローします

### Git コミット履歴

| コミット | 内容 |
|---------|------|
| `feat: Issue #6 - スクリーンキャプチャ機能の実装` | 全サービス・リポジトリ・IPC実装 |

### 動作確認結果

- [x] EncryptionServiceの暗号化/復号化が正常に動作
- [x] ScreenCaptureServiceの圧縮処理が正常に動作
- [x] 暗号化キーが`{userData}/.encryption_key`に保存される
- [x] スクリーンショットが`{userData}/screenshots/YYYY-MM-DD/`に保存される
- [x] DBにメタデータが正しく保存される
- [x] 型チェックが通る

### セキュリティ考慮事項

1. **暗号化キー管理**: キーは`{userData}/.encryption_key`にパーミッション600で保存
2. **メモリ内キー**: 暗号化キーはアプリ起動時にメモリにロード
3. **認証付き暗号化**: GCMモードにより改ざん検知が可能
4. **ファイル拡張子**: `.enc`で暗号化ファイルであることを明示

### 今後の拡張ポイント

- Issue #11（トラッキングエンジン）で定期キャプチャを実装
- Issue #19（パスワード画面検出）でスクリーンショットのブラー処理を追加
- 設定画面から保持期間の変更を可能にする
