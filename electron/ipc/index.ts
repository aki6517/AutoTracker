import { ipcMain, shell, app } from 'electron';
import { projectRepository } from '../repositories/project.repository.js';
import { screenshotRepository } from '../repositories/screenshot.repository.js';
import { ruleRepository, type Rule } from '../repositories/rule.repository.js';
import { getScreenCaptureService } from '../services/screen-capture.service.js';
import { getWindowMonitorService } from '../services/window-monitor.service.js';
import { getRuleMatchingService } from '../services/rule-matching.service.js';

// プロジェクト数の上限（Phase 1）
const MAX_PROJECTS = 5;

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
  // プロジェクト
  // ========================================
  ipcMain.handle('project:get-all', async (_event, params?: { includeArchived?: boolean }) => {
    try {
      const projects = projectRepository.findAll(params?.includeArchived ?? false);
      return projects;
    } catch (error) {
      console.error('Error fetching projects:', error);
      throw error;
    }
  });

  ipcMain.handle('project:get-by-id', async (_event, id: string) => {
    try {
      return projectRepository.findById(id);
    } catch (error) {
      console.error('Error fetching project:', error);
      throw error;
    }
  });

  ipcMain.handle('project:create', async (_event, data: {
    name: string;
    clientName?: string;
    color: string;
    icon?: string;
    hourlyRate?: number;
    budgetHours?: number;
  }) => {
    try {
      // プロジェクト数上限チェック
      const currentCount = projectRepository.count(false);
      if (currentCount >= MAX_PROJECTS) {
        throw new Error(`Maximum number of projects (${MAX_PROJECTS}) reached. Archive or delete existing projects first.`);
      }
      return projectRepository.create(data);
    } catch (error) {
      console.error('Error creating project:', error);
      throw error;
    }
  });

  ipcMain.handle('project:update', async (_event, id: string, data: {
    name?: string;
    clientName?: string;
    color?: string;
    icon?: string;
    hourlyRate?: number;
    budgetHours?: number;
  }) => {
    try {
      const updated = projectRepository.update(id, data);
      if (!updated) {
        throw new Error('Project not found');
      }
      return updated;
    } catch (error) {
      console.error('Error updating project:', error);
      throw error;
    }
  });

  ipcMain.handle('project:delete', async (_event, id: string) => {
    try {
      const success = projectRepository.delete(id);
      return { success };
    } catch (error) {
      console.error('Error deleting project:', error);
      throw error;
    }
  });

  ipcMain.handle('project:archive', async (_event, id: string) => {
    try {
      const archived = projectRepository.archive(id);
      if (!archived) {
        throw new Error('Project not found');
      }
      return archived;
    } catch (error) {
      console.error('Error archiving project:', error);
      throw error;
    }
  });

  ipcMain.handle('project:restore', async (_event, id: string) => {
    try {
      const restored = projectRepository.restore(id);
      if (!restored) {
        throw new Error('Project not found');
      }
      return restored;
    } catch (error) {
      console.error('Error restoring project:', error);
      throw error;
    }
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
  // ルール
  // ========================================
  ipcMain.handle('rule:get-by-project', async (_event, projectId: string) => {
    try {
      return ruleRepository.findByProject(projectId);
    } catch (error) {
      console.error('Error fetching rules:', error);
      throw error;
    }
  });

  ipcMain.handle('rule:get-all', async () => {
    try {
      return ruleRepository.findAll();
    } catch (error) {
      console.error('Error fetching all rules:', error);
      throw error;
    }
  });

  ipcMain.handle('rule:create', async (_event, data: {
    projectId: string;
    ruleType: Rule['ruleType'];
    pattern: string;
    priority?: number;
    isActive?: boolean;
  }) => {
    try {
      // パターンの妥当性を検証
      const ruleMatchingService = getRuleMatchingService();
      const validation = ruleMatchingService.validatePattern(data.ruleType, data.pattern);
      if (!validation.valid) {
        throw new Error(validation.error);
      }
      
      // ルール数上限チェック（プロジェクトあたり10個）
      const count = ruleRepository.countByProject(data.projectId);
      if (count >= 10) {
        throw new Error('Maximum number of rules (10) per project reached');
      }
      
      return ruleRepository.create(data);
    } catch (error) {
      console.error('Error creating rule:', error);
      throw error;
    }
  });

  ipcMain.handle('rule:update', async (_event, id: string, data: {
    ruleType?: Rule['ruleType'];
    pattern?: string;
    priority?: number;
    isActive?: boolean;
  }) => {
    try {
      // パターンが更新される場合は妥当性を検証
      if (data.pattern !== undefined && data.ruleType !== undefined) {
        const ruleMatchingService = getRuleMatchingService();
        const validation = ruleMatchingService.validatePattern(data.ruleType, data.pattern);
        if (!validation.valid) {
          throw new Error(validation.error);
        }
      }
      
      const updated = ruleRepository.update(id, data);
      if (!updated) {
        throw new Error('Rule not found');
      }
      return updated;
    } catch (error) {
      console.error('Error updating rule:', error);
      throw error;
    }
  });

  ipcMain.handle('rule:delete', async (_event, id: string) => {
    try {
      const success = ruleRepository.delete(id);
      return { success };
    } catch (error) {
      console.error('Error deleting rule:', error);
      throw error;
    }
  });

  ipcMain.handle('rule:toggle-active', async (_event, id: string) => {
    try {
      const updated = ruleRepository.toggleActive(id);
      if (!updated) {
        throw new Error('Rule not found');
      }
      return updated;
    } catch (error) {
      console.error('Error toggling rule:', error);
      throw error;
    }
  });

  ipcMain.handle('rule:reorder', async (_event, ruleIds: string[]) => {
    try {
      ruleRepository.reorder(ruleIds);
      return { success: true };
    } catch (error) {
      console.error('Error reordering rules:', error);
      throw error;
    }
  });

  ipcMain.handle('rule:test', async (_event, params: {
    ruleType: Rule['ruleType'];
    pattern: string;
    testData: {
      windowTitle?: string;
      url?: string;
      appName?: string;
      keywords?: string[];
    };
  }) => {
    try {
      const ruleMatchingService = getRuleMatchingService();
      return ruleMatchingService.testRule(params.ruleType, params.pattern, params.testData);
    } catch (error) {
      console.error('Error testing rule:', error);
      throw error;
    }
  });

  ipcMain.handle('rule:match', async (_event, testData: {
    windowTitle?: string;
    url?: string;
    appName?: string;
    keywords?: string[];
  }) => {
    try {
      const ruleMatchingService = getRuleMatchingService();
      return ruleMatchingService.match(testData);
    } catch (error) {
      console.error('Error matching rules:', error);
      throw error;
    }
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
  // スクリーンショット
  // ========================================
  ipcMain.handle('screenshot:get-by-entry', async (_event, entryId: string) => {
    try {
      const screenshots = screenshotRepository.findByEntryId(entryId);
      return screenshots.map((s) => ({
        id: s.id,
        entryId: s.entryId,
        timestamp: s.capturedAt,
        windowTitle: s.metadata?.windowTitle ?? null,
        url: s.metadata?.url ?? null,
        appName: s.metadata?.appName ?? null,
      }));
    } catch (error) {
      console.error('Error fetching screenshots:', error);
      throw error;
    }
  });

  ipcMain.handle('screenshot:get-image', async (_event, id: string) => {
    try {
      const screenCaptureService = getScreenCaptureService();
      const result = await screenCaptureService.getScreenshot(id);
      if (!result) {
        throw new Error('Screenshot not found');
      }
      // Base64エンコードして返す
      return {
        data: result.data.toString('base64'),
        mimeType: result.mimeType,
      };
    } catch (error) {
      console.error('Error fetching screenshot image:', error);
      throw error;
    }
  });

  ipcMain.handle('screenshot:get-thumbnail', async (_event, id: string) => {
    try {
      const screenCaptureService = getScreenCaptureService();
      const result = await screenCaptureService.getThumbnail(id);
      if (!result) {
        throw new Error('Thumbnail not found');
      }
      return {
        data: result.data.toString('base64'),
        mimeType: result.mimeType,
      };
    } catch (error) {
      console.error('Error fetching thumbnail:', error);
      throw error;
    }
  });

  ipcMain.handle('screenshot:capture', async (_event, params: {
    entryId: string;
    metadata?: { windowTitle?: string; url?: string; appName?: string };
  }) => {
    try {
      const screenCaptureService = getScreenCaptureService();
      const result = await screenCaptureService.capture(params.entryId, params.metadata);
      return {
        id: result.id,
        entryId: params.entryId,
        timestamp: result.capturedAt,
        windowTitle: result.metadata.windowTitle ?? null,
        url: result.metadata.url ?? null,
        appName: result.metadata.appName ?? null,
      };
    } catch (error) {
      console.error('Error capturing screenshot:', error);
      throw error;
    }
  });

  ipcMain.handle('screenshot:delete', async (_event, id: string) => {
    try {
      const screenCaptureService = getScreenCaptureService();
      const success = await screenCaptureService.delete(id);
      return { success };
    } catch (error) {
      console.error('Error deleting screenshot:', error);
      throw error;
    }
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
  // ウィンドウモニター
  // ========================================
  ipcMain.handle('window-monitor:get-active', async () => {
    try {
      const windowMonitorService = getWindowMonitorService();
      return await windowMonitorService.getActiveWindow();
    } catch (error) {
      console.error('Error getting active window:', error);
      throw error;
    }
  });

  ipcMain.handle('window-monitor:start', async (_event, params?: { intervalMs?: number }) => {
    try {
      const windowMonitorService = getWindowMonitorService();
      windowMonitorService.startMonitoring(undefined, params?.intervalMs);
      return { success: true };
    } catch (error) {
      console.error('Error starting window monitor:', error);
      throw error;
    }
  });

  ipcMain.handle('window-monitor:stop', async () => {
    try {
      const windowMonitorService = getWindowMonitorService();
      windowMonitorService.stopMonitoring();
      return { success: true };
    } catch (error) {
      console.error('Error stopping window monitor:', error);
      throw error;
    }
  });

  ipcMain.handle('window-monitor:get-status', async () => {
    try {
      const windowMonitorService = getWindowMonitorService();
      return {
        isActive: windowMonitorService.isActive(),
        latestMetadata: windowMonitorService.getLatestMetadata(),
      };
    } catch (error) {
      console.error('Error getting window monitor status:', error);
      throw error;
    }
  });

  ipcMain.handle('window-monitor:get-history', async (_event, limit?: number) => {
    try {
      const windowMonitorService = getWindowMonitorService();
      return windowMonitorService.getMetadataHistory(limit);
    } catch (error) {
      console.error('Error getting window metadata history:', error);
      throw error;
    }
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
