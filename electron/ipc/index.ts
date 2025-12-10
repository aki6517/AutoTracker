import { ipcMain } from 'electron';

// IPCハンドラーの初期化
export function initializeIpcHandlers() {
  // テスト用のIPCハンドラー
  ipcMain.handle('test:ping', async () => {
    return 'pong';
  });
}

