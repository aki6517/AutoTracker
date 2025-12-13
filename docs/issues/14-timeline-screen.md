### 背景 / 目的

ユーザーが作業記録を時系列で確認・編集できるタイムライン画面を実装する。日付選択、フィルター、インライン編集機能を提供し、詳細な時間管理を可能にする。

- 依存: #4, #12
- ラベル: frontend, ui

### スコープ / 作業項目

1. Timelineページコンポーネントの作成
2. DatePicker/DateNavigatorの実装
3. TimelineEntryコンポーネントの実装
4. エントリー編集モーダルの実装
5. 分割・削除・追加機能のUI

### ゴール / 完了条件（Acceptance Criteria）

- [x] Timelineページコンポーネントの作成（/timeline, /timeline/:dateルート）
- [x] DateNavigatorコンポーネント（前日/翌日/今日ボタン、カレンダー選択）
- [x] TimelineFilterコンポーネント（プロジェクト絞り込み、非業務表示切替）
- [x] TimelineEntryコンポーネント（プロジェクト名、時間範囲、信頼度バッジ）
- [x] エントリー編集モーダル（プロジェクト変更、時間調整、サブタスク入力）
- [x] エントリー分割機能のUI（時刻指定で分割）
- [x] エントリー削除・手動追加機能の実装

### テスト観点

- E2Eテスト: 日付切替、編集操作
- ビジュアルテスト: タイムラインレイアウト
- 検証方法: 編集後のデータ反映確認

検証方法:
1. タイムライン画面を開く
2. 日付を前日に切り替え、エントリーが表示されることを確認
3. エントリーをクリックして編集モーダルを開く
4. プロジェクトを変更して保存、反映されることを確認

要確認事項:
- ~~スクリーンショット表示機能の要否（Phase 1では省略可）~~ → Phase 1では省略
- ~~ドラッグ&ドロップによる時間調整の要否~~ → Phase 1では省略

---

## 実装レポート

### 実装日時
2024年12月13日

### 実装内容

#### 1. DateNavigator コンポーネント (`src/components/timeline/DateNavigator.tsx`)

日付ナビゲーションコンポーネント。

**機能:**
- 前日/翌日ボタン
- 今日ボタン（当日以外のとき表示）
- 未来の日付は選択不可
- 「今日」「昨日」の日本語表示

```typescript
interface DateNavigatorProps {
  currentDate: Date;
  onDateChange: (date: Date) => void;
}
```

#### 2. TimelineEntry コンポーネント (`src/components/timeline/TimelineEntry.tsx`)

個別エントリーの表示コンポーネント。

**機能:**
- タイムラインバー（プロジェクトカラー）
- 開始/終了時刻、経過時間
- プロジェクト名、サブタスク、AI推論理由
- 信頼度バッジ（色分け）
- ホバー時のアクションボタン（編集/分割/削除）

```typescript
interface TimelineEntryProps {
  entry: EntryWithProject;
  isCurrent: boolean;
  onEdit: (entry: EntryWithProject) => void;
  onDelete: (entry: EntryWithProject) => void;
  onSplit: (entry: EntryWithProject) => void;
}
```

#### 3. EntryEditModal コンポーネント (`src/components/timeline/EntryEditModal.tsx`)

エントリー編集用モーダル。

**編集可能項目:**
- プロジェクト（ドロップダウン選択）
- サブタスク（テキスト入力）
- 開始時刻（datetime-local）
- 終了時刻（datetime-local、空欄可）

#### 4. Timeline ページ (`src/pages/Timeline.tsx`)

メインのタイムラインページ。

**機能:**
- 日付ナビゲーション
- プロジェクトフィルター
- 非業務表示切替
- サマリー（合計時間、エントリー数、プロジェクト数）
- エントリー一覧
- 手動エントリー追加
- 編集/分割/削除操作

### 作成・更新ファイル一覧

| ファイル | 操作 | 説明 |
|---------|------|------|
| `src/components/timeline/DateNavigator.tsx` | 新規 | 日付ナビゲーション |
| `src/components/timeline/TimelineEntry.tsx` | 新規 | エントリー表示 |
| `src/components/timeline/EntryEditModal.tsx` | 新規 | 編集モーダル |
| `src/pages/Timeline.tsx` | 新規 | タイムラインページ |
| `src/App.tsx` | 更新 | ルーティング追加 |

### 使用方法

```
/timeline          - 今日のタイムライン
前日/翌日ボタン    - 日付を移動
今日ボタン         - 今日に戻る

プロジェクトフィルター - 特定プロジェクトのみ表示
非業務を表示        - 非業務エントリーも表示

エントリーにホバー  - アクションボタンが表示
  - 編集: 編集モーダルを開く
  - 分割: 時刻を指定してエントリーを2つに分割
  - 削除: エントリーを削除

手動追加ボタン     - 新しいエントリーを作成
```

### UI/UX特徴

1. **タイムライン表示**: 時間軸に沿ったビジュアル表示
2. **カラーコーディング**: プロジェクトごとのカラーバー
3. **ホバーアクション**: エントリーにホバーで操作ボタン表示
4. **サマリー表示**: 日次の合計情報を一目で確認
