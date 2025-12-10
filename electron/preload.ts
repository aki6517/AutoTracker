import { contextBridge, ipcRenderer } from 'electron';

// 型定義（後でIPC APIが実装されたら拡張）
interface ElectronAPI {
  // テスト用のIPC
  test: {
    ping: () => Promise<string>;
  };
}

// Preload ScriptでAPIを公開
const electronAPI: ElectronAPI = {
  test: {
    ping: () => ipcRenderer.invoke('test:ping'),
  },
};

// contextBridgeで安全にAPIを公開
contextBridge.exposeInMainWorld('api', electronAPI);

// TypeScriptの型定義をグローバルに追加
declare global {
  interface Window {
    api: ElectronAPI;
  }
}

