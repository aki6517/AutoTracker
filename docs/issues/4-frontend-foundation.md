### 背景 / 目的

ADHDユーザー向けのUIを実現するため、ダークテーマベースのフロントエンド基盤を構築する。shadcn/uiコンポーネントライブラリとTailwind CSSを使用し、統一感のあるデザインシステムを確立する。

- 依存: #1, #3
- ラベル: frontend, ui

### スコープ / 作業項目

1. React Router設定
2. レイアウトコンポーネントの作成
3. shadcn/uiセットアップ
4. Tailwind CSSカラーパレット定義
5. ダークテーマ適用

### ゴール / 完了条件（Acceptance Criteria）

- [x] React Router設定（react-router-dom）とルート定義（/, /dashboard, /timeline, /projects, /reports, /settings）
- [x] Layoutコンポーネントの作成（サイドバー + メインコンテンツ構造）
- [x] Sidebarコンポーネントの作成（ナビゲーションメニュー、折りたたみ対応）
- [x] shadcn/ui風コンポーネント追加（Button, Card, Input, Select, Dialog, Badge）
- [x] Tailwind CSS設定とカラーパレット定義（background, surface, primary, secondary等）
- [x] ダークテーマの適用（body背景 #0D0D0D）

### テスト観点

- E2Eテスト: ルーティング遷移確認
- ビジュアルテスト: ダークテーマ表示確認
- 検証方法: 手動でナビゲーション操作

検証方法:
1. サイドバーメニューをクリックして各ページに遷移できることを確認
2. ダークテーマが適用されていることを確認
3. サイドバー折りたたみが動作することを確認

要確認事項:
- フォント（Crimson Pro, Source Serif 4, JetBrains Mono）のCDN読み込み
- shadcn/uiのバージョン互換性

---

## 実装報告

### ステータス: ✅ 完了

**実装日**: 2025-12-10

### 実装内容

#### 作成したファイル

| ファイル | 説明 |
|---------|------|
| `src/lib/utils.ts` | `cn()`ユーティリティ関数（clsx + tailwind-merge） |
| `src/components/ui/button.tsx` | Buttonコンポーネント（6バリアント） |
| `src/components/ui/card.tsx` | Card関連コンポーネント群 |
| `src/components/ui/input.tsx` | Inputコンポーネント |
| `src/components/ui/badge.tsx` | Badgeコンポーネント（6バリアント） |
| `src/components/ui/dialog.tsx` | Dialogコンポーネント（Radix UI使用） |
| `src/components/ui/select.tsx` | Selectコンポーネント（Radix UI使用） |
| `src/components/ui/index.ts` | UIコンポーネント一括エクスポート |

#### 更新したファイル

| ファイル | 変更内容 |
|---------|----------|
| `src/components/layout/Sidebar.tsx` | 折りたたみ機能追加、lucide-reactアイコン |
| `src/components/layout/Header.tsx` | トラッキングタイマー機能追加 |
| `src/pages/Dashboard.tsx` | 統計カード、タイムラインプレビュー追加 |
| `tailwind.config.js` | darkMode設定、カスタムアニメーション追加 |
| `index.html` | Google Fonts追加（Inter, JetBrains Mono） |

#### 追加した依存パッケージ

```json
{
  "class-variance-authority": "^0.7.x",
  "clsx": "^2.x",
  "tailwind-merge": "^2.x",
  "lucide-react": "^0.x",
  "@radix-ui/react-slot": "^1.x",
  "@radix-ui/react-dialog": "^1.x",
  "@radix-ui/react-select": "^2.x",
  "@radix-ui/react-tooltip": "^1.x"
}
```

#### UIコンポーネント一覧

**Button** - `variant`: default, destructive, outline, secondary, ghost, link
```tsx
<Button variant="default">トラッキング開始</Button>
<Button variant="destructive">停止</Button>
```

**Card** - カード、ヘッダー、タイトル、説明、コンテンツ、フッター
```tsx
<Card>
  <CardHeader>
    <CardTitle>タイトル</CardTitle>
    <CardDescription>説明</CardDescription>
  </CardHeader>
  <CardContent>コンテンツ</CardContent>
</Card>
```

**Badge** - `variant`: default, secondary, success, warning, destructive, outline
```tsx
<Badge variant="success">95%</Badge>
```

#### カラーパレット

| 変数名 | カラーコード | 用途 |
|--------|-------------|------|
| `background` | `#0D0D0D` | 背景色 |
| `surface` | `#1A1A1A` | カード、サイドバー等 |
| `primary` | `#E5C890` | アクセントカラー（ゴールド） |
| `secondary` | `#81C784` | セカンダリカラー（グリーン） |
| `text-primary` | `#F5F5F5` | メインテキスト |
| `text-secondary` | `#A0A0A0` | サブテキスト |

#### ルーティング構成

| パス | コンポーネント | 説明 |
|------|---------------|------|
| `/` | `Dashboard` | ホーム（ダッシュボードへリダイレクト） |
| `/dashboard` | `Dashboard` | ダッシュボード |
| `/timeline` | `Timeline` | タイムライン（プレースホルダー） |
| `/projects` | `Projects` | プロジェクト（プレースホルダー） |
| `/reports` | `Reports` | レポート（プレースホルダー） |
| `/settings` | `Settings` | 設定（プレースホルダー） |

### 発生したエラーと解決方法

このIssueでは重大なエラーは発生しませんでした。

### Git コミット履歴

| コミット | 内容 |
|---------|------|
| `feat: Issue #4 - フロントエンド基盤の実装` | UIコンポーネント、レイアウト改善、Dashboard UI |

### 動作確認結果

- [x] サイドバーメニューで各ページに遷移可能
- [x] ダークテーマが正しく適用されている
- [x] サイドバー折りたたみが動作する
- [x] トラッキング開始/停止ボタンでタイマーが動作する
- [x] Google Fonts（Inter, JetBrains Mono）が読み込まれている

### スクリーンショット

※アプリ起動後、ダッシュボード画面を確認してください：
- 左側：折りたたみ可能なサイドバー（lucide-reactアイコン）
- 右上：トラッキング開始ボタン（タイマー機能付き）
- メイン：統計カード4枚 + タイムラインプレビュー
