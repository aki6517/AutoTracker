### 背景 / 目的

ElectronのRenderer ProcessとMain Process間の安全な通信基盤を構築する。contextBridgeを使用したセキュアなIPC通信により、フロントエンドからバックエンド機能へアクセスできるようにする。

- 依存: #1, #2
- ラベル: backend, frontend, ipc

### スコープ / 作業項目

1. Preload Scriptの作成
2. contextBridgeによるAPI公開
3. IPC Handlers基本構造の実装
4. Renderer側IPCクライアントの作成
5. 型定義の共有

### ゴール / 完了条件（Acceptance Criteria）

- [ ] Preload Script（electron/preload.ts）の作成とcontextBridge設定
- [ ] window.api型定義（shared/types/api.ts）の作成
- [ ] IPC Handlers基本構造（electron/ipc/index.ts）の作成
- [ ] テスト用IPCチャンネル（test:ping → pong応答）の実装
- [ ] Renderer側IPCクライアント（src/lib/ipc.ts）の作成
- [ ] IPCイベントリスナー機能（Main → Renderer）の実装

### テスト観点

- ユニットテスト: IPC Handler個別テスト
- E2Eテスト: Renderer → Main → Renderer の往復通信
- 検証方法: DevToolsコンソールでAPI呼び出し確認

検証方法:
1. DevToolsコンソールで`window.api`が存在することを確認
2. `window.api.test.ping()`で"pong"が返ることを確認
3. IPCイベントがRenderer側で受信できることを確認

要確認事項:
- contextIsolation: trueの設定確認
- nodeIntegration: falseの設定確認
