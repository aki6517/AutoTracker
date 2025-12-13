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

- [x] ChangeDetectorクラスの実装（detectメソッド、ScreenContext入力）
- [x] Layer 1: ウィンドウタイトル・URL変化検知（文字列比較）
- [x] Layer 2: OCR処理（Tesseract.js）でテキスト抽出・比較
- [x] Layer 3: 画像ハッシュ比較（pHash等でピクセル変化検知）
- [x] Layer 4: ルールマッチングとの統合（RuleMatchingService呼び出し）
- [x] Layer 5: AI判定との統合（AIJudgmentService呼び出し）

### テスト観点

- ユニットテスト: 各Layer個別テスト
- 統合テスト: 5層通した変化検知フロー
- 検証方法: 画面変更時に検知されることを確認

検証方法:
1. 同一画面で変化なし→スキップされることを確認
2. アプリ切り替え→Layer 1で検知されることを確認
3. 同一アプリ内でコンテンツ変化→Layer 2または3で検知されることを確認

要確認事項:
- ~~Tesseract.jsの言語データ（日本語対応）~~ → 日本語・英語対応済み
- ~~OCR処理のパフォーマンス（処理時間目標2秒以内）~~ → タイムアウト設定5秒

---

## 実装レポート

### 実装日時
2024年12月13日

### 実装内容

#### 5層変化検知エンジン (`electron/services/change-detector.service.ts`)

効率的な変化検知のため、5つのレイヤーで段階的に処理を行います。

```
┌─────────────────────────────────────────────────────────────┐
│  Layer 1: タイトル/URL変化検知（即座に検知、コスト0）        │
│    ↓ 変化なし                                               │
│  Layer 2: OCRテキスト比較（Tesseract.js、軽量）              │
│    ↓ 変化なし                                               │
│  Layer 3: 画像ハッシュ比較（pHash、高精度）                  │
│    ↓ 変化なし                                               │
│  Layer 4: ルールマッチング（事前定義ルール）                 │
│    ↓ 変化なし                                               │
│  Layer 5: AI判定（OpenAI API、最終手段）                     │
└─────────────────────────────────────────────────────────────┘
```

#### Layer 1: タイトル/URL変化検知

```typescript
// 検知対象
- アプリ名の変更
- ウィンドウタイトルの大幅な変更（軽微な変化は無視）
- URLドメインの変更
- URLパスの大幅な変更

// 軽微な変化の判定
- 数字のみの変化（タイムスタンプ、カウンター等）
- ページネーションの変化
```

#### Layer 2: OCRテキスト比較

```typescript
// Tesseract.js設定
- 言語: 日本語 + 英語
- タイムアウト: 5秒
- 進捗ログ出力

// 変化判定
- 単語単位のJaccard類似度を計算
- 80%未満の類似度で変化ありと判定
```

#### Layer 3: 画像ハッシュ比較（pHash）

```typescript
// パーセプチュアルハッシュ
- 8x8ピクセルにリサイズ
- グレースケール変換
- 平均値との比較でハッシュ生成
- ハミング距離で類似度判定

// 閾値
- 距離5以上で変化ありと判定
```

#### Layer 4: ルールマッチング

既存の`RuleMatchingService`を呼び出し、定義済みルールとのマッチングを行います。

#### Layer 5: AI判定

既存の`AIJudgmentService`を呼び出し、AI判定で変化を検知します。予算超過時はスキップされます。

### IPC API

```typescript
// 変更検出
await window.api.changeDetector.detect({
  context: {
    windowTitle: 'Visual Studio Code',
    appName: 'Code',
    url: null,
    timestamp: new Date().toISOString(),
  },
  imageBase64: '...', // オプション: スクリーンショットのBase64
});

// 状態リセット
await window.api.changeDetector.reset();

// オプション取得
const options = await window.api.changeDetector.getOptions();

// オプション設定
await window.api.changeDetector.setOptions({
  enableOcr: false, // OCRを無効化
});
```

### 戻り値の型

```typescript
interface ChangeDetectorResult {
  hasChange: boolean;          // 変化があったか
  changeType: 'none' | 'title' | 'url' | 'ocr' | 'image' | 'rule' | 'ai';
  layer: number;               // 検知したレイヤー（0-5）
  confidence: number;          // 信頼度（0-100）
  details: {
    previousContext?: ScreenContext;
    currentContext: ScreenContext;
    ocrText?: string;
    imageHash?: string;
    matchedRule?: { projectId, projectName, confidence };
    aiJudgment?: { projectId, projectName, confidence, reasoning };
  };
  processingTime: number;      // 処理時間（ms）
}
```

### 設定オプション

```typescript
interface ChangeDetectorOptions {
  enableOcr: boolean;          // OCR有効化（デフォルト: true）
  enableImageHash: boolean;    // 画像ハッシュ有効化（デフォルト: true）
  enableRuleMatching: boolean; // ルールマッチング有効化（デフォルト: true）
  enableAiJudgment: boolean;   // AI判定有効化（デフォルト: true）
}
```

### パフォーマンス最適化

1. **早期リターン**: 上位レイヤーで変化を検知したら即座に返却
2. **Tesseract Worker再利用**: 初期化コストを削減
3. **軽微な変化のフィルタリング**: 不要な処理をスキップ
4. **pHashの高速実装**: sharpを使用した効率的な画像処理

### 作成・更新ファイル一覧

| ファイル | 操作 | 説明 |
|---------|------|------|
| `electron/services/change-detector.service.ts` | 新規 | 5層変化検知エンジン |
| `electron/ipc/index.ts` | 更新 | ChangeDetectorハンドラー追加 |
| `electron/preload.ts` | 更新 | changeDetector API公開 |
| `shared/types/api.ts` | 更新 | ChangeDetectorResult, ChangeDetectorOptions型追加 |
| `shared/types/ipc.ts` | 更新 | changeDetector API型定義追加 |

### 使用例

```typescript
// 基本的な使用方法
const result = await window.api.changeDetector.detect({
  context: {
    windowTitle: document.title,
    appName: 'Browser',
    url: window.location.href,
    timestamp: new Date().toISOString(),
  },
});

if (result.hasChange) {
  console.log(`変化検知: Layer ${result.layer} (${result.changeType})`);
  console.log(`信頼度: ${result.confidence}%`);
  console.log(`処理時間: ${result.processingTime}ms`);
}
```
