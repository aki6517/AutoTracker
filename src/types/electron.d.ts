// Electron APIの型定義
interface ElectronAPI {
  test: {
    ping: () => Promise<string>;
  };
}

declare global {
  interface Window {
    api: ElectronAPI;
  }
}

export {};

