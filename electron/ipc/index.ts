import { ipcMain, shell, app } from 'electron';
import { projectRepository } from '../repositories/project.repository.js';
import { screenshotRepository } from '../repositories/screenshot.repository.js';
import { ruleRepository, type Rule } from '../repositories/rule.repository.js';
import { aiUsageRepository } from '../repositories/ai-usage.repository.js';
import { entryRepository } from '../repositories/entry.repository.js';
import { reportRepository } from '../repositories/report.repository.js';
import { getScreenCaptureService } from '../services/screen-capture.service.js';
import { getWindowMonitorService } from '../services/window-monitor.service.js';
import { getRuleMatchingService } from '../services/rule-matching.service.js';
import { aiJudgmentService } from '../services/ai-judgment.service.js';
import { getChangeDetector } from '../services/change-detector.service.js';
import { getTrackingEngine } from '../services/tracking-engine.service.js';
import { getSettingsService } from '../services/settings.service.js';
import type { ScreenContext, ConfirmationResponse, Settings } from '../../shared/types/api.js';

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
  // トラッキング
  // ========================================
  ipcMain.handle('tracking:start', async () => {
    try {
      const trackingEngine = getTrackingEngine();
      return await trackingEngine.start();
    } catch (error) {
      console.error('Error starting tracking:', error);
      throw error;
    }
  });

  ipcMain.handle('tracking:stop', async () => {
    try {
      const trackingEngine = getTrackingEngine();
      return await trackingEngine.stop();
    } catch (error) {
      console.error('Error stopping tracking:', error);
      throw error;
    }
  });

  ipcMain.handle('tracking:pause', async () => {
    try {
      const trackingEngine = getTrackingEngine();
      return trackingEngine.pause();
    } catch (error) {
      console.error('Error pausing tracking:', error);
      throw error;
    }
  });

  ipcMain.handle('tracking:resume', async () => {
    try {
      const trackingEngine = getTrackingEngine();
      return trackingEngine.resume();
    } catch (error) {
      console.error('Error resuming tracking:', error);
      throw error;
    }
  });

  ipcMain.handle('tracking:get-status', async () => {
    try {
      const trackingEngine = getTrackingEngine();
      return trackingEngine.getStatus();
    } catch (error) {
      console.error('Error getting tracking status:', error);
      throw error;
    }
  });

  ipcMain.handle('tracking:confirmation-response', async (_event, response: ConfirmationResponse) => {
    try {
      const trackingEngine = getTrackingEngine();
      return await trackingEngine.handleConfirmationResponse({
        entryId: response.entryId,
        action: response.action,
        newProjectId: response.newProjectId,
        splitTime: response.splitTime,
      });
    } catch (error) {
      console.error('Error handling confirmation response:', error);
      throw error;
    }
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
  // エントリー
  // ========================================
  ipcMain.handle('entry:get-by-date-range', async (_event, params: {
    startDate: string;
    endDate: string;
    projectId?: number;
    includeNonWork?: boolean;
  }) => {
    try {
      return entryRepository.findByDateRange(params.startDate, params.endDate, {
        projectId: params.projectId,
        includeNonWork: params.includeNonWork,
      });
    } catch (error) {
      console.error('Error getting entries by date range:', error);
      throw error;
    }
  });

  ipcMain.handle('entry:get-today', async () => {
    try {
      return entryRepository.findToday();
    } catch (error) {
      console.error('Error getting today entries:', error);
      throw error;
    }
  });

  ipcMain.handle('entry:get-current', async () => {
    try {
      return entryRepository.findCurrent();
    } catch (error) {
      console.error('Error getting current entry:', error);
      throw error;
    }
  });

  ipcMain.handle('entry:create', async (_event, data: {
    projectId?: number;
    startTime: string;
    endTime?: string;
    subtask?: string;
    isWork?: boolean;
  }) => {
    try {
      return entryRepository.create(data);
    } catch (error) {
      console.error('Error creating entry:', error);
      throw error;
    }
  });

  ipcMain.handle('entry:update', async (_event, id: number, data: {
    projectId?: number | null;
    startTime?: string;
    endTime?: string | null;
    subtask?: string | null;
    isWork?: boolean;
  }) => {
    try {
      const updated = entryRepository.update(id, data);
      if (!updated) {
        throw new Error('Entry not found');
      }
      return updated;
    } catch (error) {
      console.error('Error updating entry:', error);
      throw error;
    }
  });

  ipcMain.handle('entry:delete', async (_event, id: number) => {
    try {
      const success = entryRepository.delete(id);
      return { success };
    } catch (error) {
      console.error('Error deleting entry:', error);
      throw error;
    }
  });

  ipcMain.handle('entry:split', async (_event, params: { entryId: number; splitTime: string }) => {
    try {
      const result = entryRepository.split(params.entryId, params.splitTime);
      if (!result) {
        throw new Error('Entry not found');
      }
      return result;
    } catch (error) {
      console.error('Error splitting entry:', error);
      throw error;
    }
  });

  ipcMain.handle('entry:merge', async (_event, params: { entryIds: number[]; projectId?: number }) => {
    try {
      const result = entryRepository.merge(params.entryIds, params.projectId);
      if (!result) {
        throw new Error('Failed to merge entries');
      }
      return result;
    } catch (error) {
      console.error('Error merging entries:', error);
      throw error;
    }
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
  // レポート
  // ========================================
  ipcMain.handle('report:generate-daily', async (_event, params: { date: string }) => {
    try {
      const report = reportRepository.generateDailyReport(params.date);
      // API形式に変換
      return {
        date: report.date,
        totalHours: report.summary.totalHours,
        totalRevenue: report.summary.totalRevenue,
        projectBreakdown: report.projectBreakdown.map((p) => ({
          projectId: p.projectId,
          projectName: p.projectName,
          projectColor: p.projectColor,
          hours: p.hours,
          percentage: p.percentage,
          revenue: p.revenue,
        })),
        entries: [], // エントリー一覧は別途取得
      };
    } catch (error) {
      console.error('Error generating daily report:', error);
      throw error;
    }
  });

  ipcMain.handle('report:get-aggregated', async (_event, params: { startDate: string; endDate: string }) => {
    try {
      return reportRepository.getAggregatedReport(params.startDate, params.endDate);
    } catch (error) {
      console.error('Error getting aggregated report:', error);
      throw error;
    }
  });

  // ========================================
  // 設定
  // ========================================
  ipcMain.handle('settings:get', async () => {
    try {
      const settingsService = getSettingsService();
      return settingsService.get();
    } catch (error) {
      console.error('Error getting settings:', error);
      throw error;
    }
  });

  ipcMain.handle('settings:update', async (_event, updates: Partial<Settings>) => {
    try {
      const settingsService = getSettingsService();
      return settingsService.update(updates);
    } catch (error) {
      console.error('Error updating settings:', error);
      throw error;
    }
  });

  ipcMain.handle('settings:reset', async () => {
    try {
      const settingsService = getSettingsService();
      return settingsService.reset();
    } catch (error) {
      console.error('Error resetting settings:', error);
      throw error;
    }
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
  // AI使用状況
  // ========================================
  ipcMain.handle('ai-usage:get-monthly', async () => {
    try {
      const usage = aiUsageRepository.getMonthlyUsage();
      return {
        month: usage.month,
        totalTokens: usage.totalTokensIn + usage.totalTokensOut,
        totalCost: usage.totalCost,
        byModel: usage.byModel.map((m) => ({
          model: m.model,
          tokens: m.tokensIn + m.tokensOut,
          cost: m.cost,
          requestCount: m.requestCount,
        })),
      };
    } catch (error) {
      console.error('Error getting monthly AI usage:', error);
      throw error;
    }
  });

  ipcMain.handle('ai-usage:get-budget-status', async () => {
    try {
      return aiJudgmentService.getBudgetStatus();
    } catch (error) {
      console.error('Error getting AI budget status:', error);
      throw error;
    }
  });

  // ========================================
  // AI判定
  // ========================================
  ipcMain.handle('ai:set-api-key', async (_event, apiKey: string) => {
    try {
      aiJudgmentService.setApiKey(apiKey);
      return { success: true };
    } catch (error) {
      console.error('Error setting API key:', error);
      throw error;
    }
  });

  ipcMain.handle('ai:has-api-key', async () => {
    return aiJudgmentService.hasApiKey();
  });

  ipcMain.handle('ai:test-api-key', async () => {
    try {
      return await aiJudgmentService.testApiKey();
    } catch (error) {
      console.error('Error testing API key:', error);
      throw error;
    }
  });

  ipcMain.handle('ai:detect-change', async (_event, params: {
    current: {
      windowTitle: string | null;
      appName: string | null;
      url: string | null;
      ocrText?: string | null;
      timestamp: string;
    };
    previous?: {
      windowTitle: string | null;
      appName: string | null;
      url: string | null;
      ocrText?: string | null;
      timestamp: string;
    };
  }) => {
    try {
      return await aiJudgmentService.detectChange(params.current, params.previous);
    } catch (error) {
      console.error('Error detecting change:', error);
      throw error;
    }
  });

  ipcMain.handle('ai:judge-project', async (_event, params: {
    context: {
      windowTitle: string | null;
      appName: string | null;
      url: string | null;
      ocrText?: string | null;
      timestamp: string;
    };
  }) => {
    try {
      // プロジェクト一覧を取得
      const projects = projectRepository.findAll(false);
      return await aiJudgmentService.judgeProject(params.context, projects);
    } catch (error) {
      console.error('Error judging project:', error);
      throw error;
    }
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
  // 変更検出
  // ========================================
  ipcMain.handle('change-detector:detect', async (_event, params: {
    context: ScreenContext;
    imageBase64?: string;
  }) => {
    try {
      const changeDetector = getChangeDetector();
      const imageBuffer = params.imageBase64
        ? Buffer.from(params.imageBase64, 'base64')
        : undefined;
      return await changeDetector.detect(params.context, imageBuffer);
    } catch (error) {
      console.error('Error detecting change:', error);
      throw error;
    }
  });

  ipcMain.handle('change-detector:reset', async () => {
    try {
      const changeDetector = getChangeDetector();
      changeDetector.reset();
      return { success: true };
    } catch (error) {
      console.error('Error resetting change detector:', error);
      throw error;
    }
  });

  ipcMain.handle('change-detector:get-options', async () => {
    try {
      const changeDetector = getChangeDetector();
      return changeDetector.getOptions();
    } catch (error) {
      console.error('Error getting change detector options:', error);
      throw error;
    }
  });

  ipcMain.handle('change-detector:set-options', async (_event, options: {
    enableOcr?: boolean;
    enableImageHash?: boolean;
    enableRuleMatching?: boolean;
    enableAiJudgment?: boolean;
  }) => {
    try {
      const changeDetector = getChangeDetector();
      changeDetector.setOptions(options);
      return { success: true };
    } catch (error) {
      console.error('Error setting change detector options:', error);
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
