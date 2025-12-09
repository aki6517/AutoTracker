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

- [ ] React Router設定（react-router-dom）とルート定義（/, /dashboard, /timeline, /projects, /reports, /settings）
- [ ] Layoutコンポーネントの作成（サイドバー + メインコンテンツ構造）
- [ ] Sidebarコンポーネントの作成（ナビゲーションメニュー、折りたたみ対応）
- [ ] shadcn/uiのセットアップと基本コンポーネント追加（Button, Card, Input, Select, Dialog）
- [ ] Tailwind CSS設定とカラーパレット定義（--ink-dark, --paper, --highlight-yellow等）
- [ ] ダークテーマの適用（body背景 #0D0D0D）

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
