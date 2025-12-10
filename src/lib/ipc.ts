// Renderer側IPCクライアント
// window.apiを通じてElectron APIにアクセスするためのユーティリティ

/**
 * Electron APIが利用可能かどうかを確認
 */
export function isElectron(): boolean {
  return typeof window !== 'undefined' && typeof window.api !== 'undefined';
}

/**
 * Electron APIを取得
 * Electron環境でない場合はエラーをスロー
 */
export function getAPI() {
  if (!isElectron()) {
    throw new Error('Electron API is not available');
  }
  return window.api;
}

/**
 * 安全にElectron APIを取得
 * Electron環境でない場合はnullを返す
 */
export function getAPISafe() {
  if (!isElectron()) {
    return null;
  }
  return window.api;
}

// 型をエクスポート
export type { ElectronAPI } from '../../shared/types/ipc';

