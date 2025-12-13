import { contextBridge, ipcRenderer } from 'electron';
import type { ElectronAPI } from '../shared/types/ipc.js';

// イベントリスナーを作成するヘルパー関数
function createEventListener<T>(channel: string) {
  return (callback: (data: T) => void): (() => void) => {
    const listener = (_event: unknown, data: T) => callback(data);
    ipcRenderer.on(channel, listener);
    // クリーンアップ関数を返す
    return () => {
      ipcRenderer.removeListener(channel, listener);
    };
  };
}

// Preload ScriptでAPIを公開
const electronAPI: ElectronAPI = {
  // テスト
  test: {
    ping: () => ipcRenderer.invoke('test:ping'),
  },

  // トラッキング
  tracking: {
    start: () => ipcRenderer.invoke('tracking:start'),
    stop: () => ipcRenderer.invoke('tracking:stop'),
    pause: () => ipcRenderer.invoke('tracking:pause'),
    resume: () => ipcRenderer.invoke('tracking:resume'),
    getStatus: () => ipcRenderer.invoke('tracking:get-status'),
    respondConfirmation: (response) => ipcRenderer.invoke('tracking:confirmation-response', response),
    onEntryCreated: createEventListener('tracking:entry-created'),
    onEntryUpdated: createEventListener('tracking:entry-updated'),
    onConfirmationNeeded: createEventListener('tracking:confirmation-needed'),
  },

  // プロジェクト
  projects: {
    getAll: (params) => ipcRenderer.invoke('project:get-all', params),
    getById: (id) => ipcRenderer.invoke('project:get-by-id', id),
    create: (data) => ipcRenderer.invoke('project:create', data),
    update: (id, data) => ipcRenderer.invoke('project:update', id, data),
    delete: (id) => ipcRenderer.invoke('project:delete', id),
    archive: (id) => ipcRenderer.invoke('project:archive', id),
    restore: (id) => ipcRenderer.invoke('project:restore', id),
  },

  // エントリー
  entries: {
    getByDateRange: (params) => ipcRenderer.invoke('entry:get-by-date-range', params),
    getToday: () => ipcRenderer.invoke('entry:get-today'),
    getCurrent: () => ipcRenderer.invoke('entry:get-current'),
    create: (data) => ipcRenderer.invoke('entry:create', data),
    update: (id, data) => ipcRenderer.invoke('entry:update', id, data),
    delete: (id) => ipcRenderer.invoke('entry:delete', id),
    split: (params) => ipcRenderer.invoke('entry:split', params),
    merge: (params) => ipcRenderer.invoke('entry:merge', params),
  },

  // ルール
  rules: {
    getByProject: (projectId) => ipcRenderer.invoke('rule:get-by-project', projectId),
    getAll: () => ipcRenderer.invoke('rule:get-all'),
    create: (data) => ipcRenderer.invoke('rule:create', data),
    update: (id, data) => ipcRenderer.invoke('rule:update', id, data),
    delete: (id) => ipcRenderer.invoke('rule:delete', id),
    toggleActive: (id) => ipcRenderer.invoke('rule:toggle-active', id),
    reorder: (ruleIds) => ipcRenderer.invoke('rule:reorder', ruleIds),
    test: (params) => ipcRenderer.invoke('rule:test', params),
    match: (testData) => ipcRenderer.invoke('rule:match', testData),
  },

  // レポート
  reports: {
    generateDaily: (params) => ipcRenderer.invoke('report:generate-daily', params),
  },

  // 設定
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    update: (settings) => ipcRenderer.invoke('settings:update', settings),
    reset: () => ipcRenderer.invoke('settings:reset'),
  },

  // スクリーンショット
  screenshots: {
    getByEntry: (entryId) => ipcRenderer.invoke('screenshot:get-by-entry', entryId),
    getImage: (id) => ipcRenderer.invoke('screenshot:get-image', id),
    getThumbnail: (id) => ipcRenderer.invoke('screenshot:get-thumbnail', id),
    capture: (params) => ipcRenderer.invoke('screenshot:capture', params),
    delete: (id) => ipcRenderer.invoke('screenshot:delete', id),
  },

  // AI使用状況
  aiUsage: {
    getMonthly: () => ipcRenderer.invoke('ai-usage:get-monthly'),
    getBudgetStatus: () => ipcRenderer.invoke('ai-usage:get-budget-status'),
    onBudgetWarning: createEventListener('ai-usage:budget-warning'),
  },

  // AI判定
  ai: {
    setApiKey: (apiKey) => ipcRenderer.invoke('ai:set-api-key', apiKey),
    hasApiKey: () => ipcRenderer.invoke('ai:has-api-key'),
    testApiKey: () => ipcRenderer.invoke('ai:test-api-key'),
    detectChange: (params) => ipcRenderer.invoke('ai:detect-change', params),
    judgeProject: (params) => ipcRenderer.invoke('ai:judge-project', params),
  },

  // 変更検出
  changeDetector: {
    detect: (params) => ipcRenderer.invoke('change-detector:detect', params),
    reset: () => ipcRenderer.invoke('change-detector:reset'),
    getOptions: () => ipcRenderer.invoke('change-detector:get-options'),
    setOptions: (options) => ipcRenderer.invoke('change-detector:set-options', options),
  },

  // ウィンドウモニター
  windowMonitor: {
    getActiveWindow: () => ipcRenderer.invoke('window-monitor:get-active'),
    start: (params) => ipcRenderer.invoke('window-monitor:start', params),
    stop: () => ipcRenderer.invoke('window-monitor:stop'),
    getStatus: () => ipcRenderer.invoke('window-monitor:get-status'),
    getHistory: (limit) => ipcRenderer.invoke('window-monitor:get-history', limit),
  },

  // バックアップ
  backup: {
    list: () => ipcRenderer.invoke('backup:list'),
    create: () => ipcRenderer.invoke('backup:create'),
    restore: (backupPath) => ipcRenderer.invoke('backup:restore', backupPath),
    verify: (backupPath) => ipcRenderer.invoke('backup:verify', backupPath),
    getStatus: () => ipcRenderer.invoke('backup:get-status'),
  },

  // システム
  system: {
    getAppInfo: () => ipcRenderer.invoke('system:get-app-info'),
    openExternal: (url) => ipcRenderer.invoke('system:open-external', url),
  },
};

// contextBridgeで安全にAPIを公開
contextBridge.exposeInMainWorld('api', electronAPI);
