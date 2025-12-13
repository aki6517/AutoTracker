### 背景 / 目的

アプリケーションの各種設定を管理する画面を実装する。トラッキング設定、通知設定、プライバシー設定、外観設定、AI設定をタブ形式で提供する。

- 依存: #2, #3, #4
- ラベル: backend, frontend, ui

### スコープ / 作業項目

1. SettingsServiceの実装
2. IPC Handlersの実装
3. Settingsページコンポーネントの作成
4. 各設定タブの実装
5. 設定保存・読み込み機能

### ゴール / 完了条件（Acceptance Criteria）

- [x] SettingsServiceの実装（get, update, resetメソッド、electron-store使用）
- [x] IPC Handler実装（settings:get, settings:update, settings:reset）
- [x] Settingsページコンポーネントの作成（/settingsルート、タブナビゲーション）
- [x] トラッキング設定タブ（キャプチャ間隔、AI判定モード、自動起動、休憩検出）
- [x] 通知設定タブ（確認モード、異常アラート、レポートリマインダー）
- [x] プライバシー設定タブ（スクリーンショット保存期間、パスワード検出、除外キーワード）
- [x] 設定の保存・読み込み動作確認

### テスト観点

- ユニットテスト: SettingsService各メソッド
- E2Eテスト: 設定変更→保存→リロード→反映確認
- 検証方法: 設定変更後にアプリ再起動して永続化確認

検証方法:
1. 設定画面を開く
2. キャプチャ間隔を2分に変更
3. アプリを再起動
4. 設定が保持されていることを確認

要確認事項:
- ~~外観設定（テーマ切替）はPhase 1で必要か~~ → 実装済み
- ~~APIキー設定UIの要否~~ → Phase 2で実装

---

## 実装レポート

### 実装日時
2024年12月13日

### 実装内容

#### 1. SettingsService (`electron/services/settings.service.ts`)

設定管理サービス（electron-store使用）。

```typescript
export class SettingsService {
  // 全設定を取得
  get(): Settings

  // 設定を更新（深いマージ）
  update(updates: Partial<Settings>): Settings

  // 特定セクションを更新
  updateSection<K extends keyof Settings>(section: K, updates): Settings

  // デフォルトにリセット
  reset(): Settings
}
```

**永続化:**
- `electron-store`を使用
- 設定ファイル: `~/.config/autotracker/settings.json`

#### 2. IPC Handler

```typescript
'settings:get' -> Settings
'settings:update' -> Settings（更新後）
'settings:reset' -> Settings（デフォルト）
```

#### 3. Settings ページ (`src/pages/Settings.tsx`)

タブ形式の設定画面。

**タブ:**
- トラッキング: キャプチャ間隔、AI判定モード、休憩検出、自動起動
- 通知: 確認モード、異常アラート、リマインダー
- プライバシー: スクリーンショット保存期間、パスワード検出、除外キーワード
- 外観: テーマ、アクセントカラー、フォントサイズ
- AI: 月間予算、バッチモード

### 作成・更新ファイル一覧

| ファイル | 操作 | 説明 |
|---------|------|------|
| `electron/services/settings.service.ts` | 新規 | 設定管理サービス |
| `electron/ipc/index.ts` | 更新 | 設定ハンドラー |
| `electron/preload.ts` | 更新 | reset追加 |
| `shared/types/ipc.ts` | 更新 | reset型追加 |
| `src/pages/Settings.tsx` | 新規 | 設定ページ |
| `src/App.tsx` | 更新 | ルーティング |

### 使用方法

```
/settings          - 設定画面

操作:
  - タブ切替: 各設定カテゴリを表示
  - 保存: 変更を永続化
  - リセット: デフォルト設定に戻す

設定項目:
  トラッキング:
    - キャプチャ間隔: 30-300秒
    - メタデータ間隔: 1-60秒
    - AI判定モード: 控えめ/標準/積極的
    - 休憩検出閾値: 60-1800秒
    - 起動時自動開始: ON/OFF

  通知:
    - 確認モード: 常に/低信頼度のみ/なし
    - 異常アラート: ON/OFF
    - レポートリマインダー: ON/OFF + 時刻

  プライバシー:
    - スクリーンショット保存期間: 1-365日
    - パスワード検出: ON/OFF
    - 除外キーワード: カンマ区切り

  外観:
    - テーマ: ダーク/ライト/自動
    - アクセントカラー: amber/blue/green/purple
    - フォントサイズ: 小/中/大

  AI:
    - 月間予算: $0-∞
    - バッチモード: ON/OFF
```

### UI/UX特徴

1. **タブナビゲーション**: カテゴリ別に整理
2. **トグルスイッチ**: ON/OFF設定用
3. **未保存警告**: 保存前に変更を通知
4. **リセット確認**: 誤操作防止
