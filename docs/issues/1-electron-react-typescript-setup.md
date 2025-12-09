### 背景 / 目的

AutoTrackerはElectronベースのデスクトップアプリケーションであり、開発の基盤となるプロジェクト構造を構築する必要がある。Electron 28 + React 18 + TypeScript 5の組み合わせで、Viteによる高速ビルド環境を整備する。

- 依存: -
- ラベル: infra, setup

### スコープ / 作業項目

1. Electronプロジェクトの初期化
2. React + TypeScript + Viteの統合設定
3. ディレクトリ構造の作成
4. 開発ツール（ESLint, Prettier）の設定
5. package.jsonスクリプトの整備

### ゴール / 完了条件（Acceptance Criteria）

- [ ] Electron 28のインストールと基本設定（electron/main.ts, electron/preload.ts）
- [ ] React 18 + TypeScript 5のセットアップ（src/main.tsx, src/App.tsx）
- [ ] Vite設定ファイル（vite.config.ts）の作成とElectron統合（vite-plugin-electron）
- [ ] 基本ディレクトリ構造の作成（electron/, src/, shared/, resources/）
- [ ] package.jsonに必要なスクリプト追加（dev, build, start, lint, format）
- [ ] TypeScript設定ファイル（tsconfig.json, tsconfig.node.json）の作成
- [ ] ESLint + Prettier設定の追加（.eslintrc.json, .prettierrc）

### テスト観点

- 開発サーバー起動: `npm run dev`でElectronウィンドウが正常に起動すること
- ビルド確認: `npm run build`がエラーなく完了すること
- 型チェック: TypeScriptの型エラーがないこと
- Lint確認: `npm run lint`でエラーがないこと

検証方法:
1. `npm run dev`を実行し、Electronアプリが起動することを確認
2. React DevToolsでコンポーネントが表示されることを確認
3. `npm run build`を実行し、distディレクトリが生成されることを確認

要確認事項:
- Node.jsバージョンの推奨値（20.x以上）
- vite-plugin-electronの最新バージョン互換性
