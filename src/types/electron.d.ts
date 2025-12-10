// Electron APIの型定義
// 詳細な型定義は shared/types/ipc.ts を参照
import type { ElectronAPI } from '../../shared/types/ipc';

declare global {
  interface Window {
    api: ElectronAPI;
  }
}

export type { ElectronAPI };

