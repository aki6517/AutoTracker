import { ipcMain, shell, app } from 'electron';

// IPCハンドラーの初期化
export function initializeIpcHandlers() {
  // ========================================
  // テスト
  // ========================================
  ipcMain.handle('test:ping', async () => {
    return 'pong';
  });

  // ========================================
  // トラッキング（プレースホルダー）
  // ========================================
  ipcMain.handle('tracking:start', async () => {
    // TODO: Issue #11で実装
    return { success: true, status: getDefaultTrackingStatus() };
  });

  ipcMain.handle('tracking:stop', async () => {
    // TODO: Issue #11で実装
    return { success: true, finalEntry: null };
  });

  ipcMain.handle('tracking:pause', async () => {
    // TODO: Issue #11で実装
    return { success: true, status: getDefaultTrackingStatus() };
  });

  ipcMain.handle('tracking:resume', async () => {
    // TODO: Issue #11で実装
    return { success: true, status: getDefaultTrackingStatus() };
  });

  ipcMain.handle('tracking:get-status', async () => {
    // TODO: Issue #11で実装
    return getDefaultTrackingStatus();
  });

  ipcMain.handle('tracking:confirmation-response', async (_event, _response) => {
    // TODO: Issue #17で実装
    return { success: true };
  });

  // ========================================
  // プロジェクト（プレースホルダー）
  // ========================================
  ipcMain.handle('project:get-all', async (_event, _params) => {
    // TODO: Issue #5で実装
    return [];
  });

  ipcMain.handle('project:get-by-id', async (_event, _id) => {
    // TODO: Issue #5で実装
    return null;
  });

  ipcMain.handle('project:create', async (_event, _data) => {
    // TODO: Issue #5で実装
    throw new Error('Not implemented');
  });

  ipcMain.handle('project:update', async (_event, _id, _data) => {
    // TODO: Issue #5で実装
    throw new Error('Not implemented');
  });

  ipcMain.handle('project:delete', async (_event, _id) => {
    // TODO: Issue #5で実装
    return { success: false };
  });

  ipcMain.handle('project:archive', async (_event, _id) => {
    // TODO: Issue #5で実装
    throw new Error('Not implemented');
  });

  ipcMain.handle('project:restore', async (_event, _id) => {
    // TODO: Issue #5で実装
    throw new Error('Not implemented');
  });

  // ========================================
  // エントリー（プレースホルダー）
  // ========================================
  ipcMain.handle('entry:get-by-date-range', async (_event, _params) => {
    // TODO: Issue #12で実装
    return [];
  });

  ipcMain.handle('entry:get-today', async () => {
    // TODO: Issue #12で実装
    return [];
  });

  ipcMain.handle('entry:get-current', async () => {
    // TODO: Issue #12で実装
    return null;
  });

  ipcMain.handle('entry:create', async (_event, _data) => {
    // TODO: Issue #12で実装
    throw new Error('Not implemented');
  });

  ipcMain.handle('entry:update', async (_event, _id, _data) => {
    // TODO: Issue #12で実装
    throw new Error('Not implemented');
  });

  ipcMain.handle('entry:delete', async (_event, _id) => {
    // TODO: Issue #12で実装
    return { success: false };
  });

  ipcMain.handle('entry:split', async (_event, _params) => {
    // TODO: Issue #12で実装
    throw new Error('Not implemented');
  });

  ipcMain.handle('entry:merge', async (_event, _params) => {
    // TODO: Issue #12で実装
    throw new Error('Not implemented');
  });

  // ========================================
  // ルール（プレースホルダー）
  // ========================================
  ipcMain.handle('rule:get-by-project', async (_event, _projectId) => {
    // TODO: Issue #8で実装
    return [];
  });

  ipcMain.handle('rule:create', async (_event, _data) => {
    // TODO: Issue #8で実装
    throw new Error('Not implemented');
  });

  ipcMain.handle('rule:update', async (_event, _id, _data) => {
    // TODO: Issue #8で実装
    throw new Error('Not implemented');
  });

  ipcMain.handle('rule:delete', async (_event, _id) => {
    // TODO: Issue #8で実装
    return { success: false };
  });

  ipcMain.handle('rule:test', async (_event, _params) => {
    // TODO: Issue #8で実装
    return { matched: false };
  });

  // ========================================
  // レポート（プレースホルダー）
  // ========================================
  ipcMain.handle('report:generate-daily', async (_event, _params) => {
    // TODO: Issue #16で実装
    return {
      date: new Date().toISOString().split('T')[0],
      totalHours: 0,
      totalRevenue: 0,
      projectBreakdown: [],
      entries: [],
    };
  });

  // ========================================
  // 設定（プレースホルダー）
  // ========================================
  ipcMain.handle('settings:get', async () => {
    // TODO: Issue #18で実装
    return getDefaultSettings();
  });

  ipcMain.handle('settings:update', async (_event, _settings) => {
    // TODO: Issue #18で実装
    return getDefaultSettings();
  });

  // ========================================
  // スクリーンショット（プレースホルダー）
  // ========================================
  ipcMain.handle('screenshot:get-by-entry', async (_event, _entryId) => {
    // TODO: Issue #6で実装
    return [];
  });

  ipcMain.handle('screenshot:get-image', async (_event, _id) => {
    // TODO: Issue #6で実装
    throw new Error('Not implemented');
  });

  // ========================================
  // AI使用状況（プレースホルダー）
  // ========================================
  ipcMain.handle('ai-usage:get-monthly', async () => {
    // TODO: Issue #9で実装
    return {
      month: new Date().toISOString().slice(0, 7),
      totalTokens: 0,
      totalCost: 0,
      byModel: [],
    };
  });

  ipcMain.handle('ai-usage:get-budget-status', async () => {
    // TODO: Issue #9で実装
    return {
      monthlyBudget: 2.0,
      currentUsage: 0,
      remaining: 2.0,
      percentUsed: 0,
      isOverBudget: false,
    };
  });

  // ========================================
  // システム
  // ========================================
  ipcMain.handle('system:get-app-info', async () => {
    return {
      version: app.getVersion(),
      platform: process.platform,
    };
  });

  ipcMain.handle('system:open-external', async (_event, url: string) => {
    await shell.openExternal(url);
  });

  console.log('IPC handlers initialized');
}

// ========================================
// ヘルパー関数
// ========================================

function getDefaultTrackingStatus() {
  return {
    isRunning: false,
    isPaused: false,
    startedAt: null,
    currentEntryId: null,
    currentProjectId: null,
    currentProjectName: null,
    elapsedSeconds: 0,
    confidence: 0,
  };
}

function getDefaultSettings() {
  return {
    tracking: {
      captureInterval: 60000,
      metadataInterval: 5000,
      aiJudgmentMode: 'standard' as const,
      autoStartOnBoot: true,
      breakDetectionThreshold: 600000,
    },
    notifications: {
      confirmationMode: 'low-confidence' as const,
      anomalyAlerts: true,
      reportReminders: true,
      reportReminderTime: '18:00',
    },
    privacy: {
      screenshotStorage: 'local' as const,
      screenshotRetention: 7,
      passwordDetection: true,
      excludeKeywords: ['password', '秘密', '機密'],
    },
    appearance: {
      theme: 'dark' as const,
      accentColor: 'amber' as const,
      fontSize: 'medium' as const,
    },
    ai: {
      monthlyBudget: 2.0,
      batchMode: true,
    },
  };
}
