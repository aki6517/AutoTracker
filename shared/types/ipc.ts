// IPC通信の型定義
import type {
  Project,
  CreateProjectDTO,
  UpdateProjectDTO,
  Entry,
  EntryWithProject,
  CreateEntryDTO,
  UpdateEntryDTO,
  Rule,
  CreateRuleDTO,
  UpdateRuleDTO,
  TrackingStatus,
  ConfirmationRequest,
  ConfirmationResponse,
  Settings,
  DailyReport,
  AIUsageMonthly,
  BudgetStatus,
  ScreenshotMeta,
  WindowMetadata,
  WindowMonitorStatus,
} from './api.js';

// ========================================
// Electron API インターフェース
// ========================================

export interface ElectronAPI {
  // テスト
  test: {
    ping: () => Promise<string>;
  };

  // トラッキング
  tracking: {
    start: () => Promise<{ success: boolean; status: TrackingStatus }>;
    stop: () => Promise<{ success: boolean; finalEntry: Entry | null }>;
    pause: () => Promise<{ success: boolean; status: TrackingStatus }>;
    resume: () => Promise<{ success: boolean; status: TrackingStatus }>;
    getStatus: () => Promise<TrackingStatus>;
    respondConfirmation: (response: ConfirmationResponse) => Promise<{ success: boolean }>;
    // イベントリスナー
    onEntryCreated: (callback: (entry: EntryWithProject) => void) => () => void;
    onEntryUpdated: (callback: (entry: EntryWithProject) => void) => () => void;
    onConfirmationNeeded: (callback: (request: ConfirmationRequest) => void) => () => void;
  };

  // プロジェクト
  projects: {
    getAll: (params?: { includeArchived?: boolean }) => Promise<Project[]>;
    getById: (id: string) => Promise<Project | null>;
    create: (data: CreateProjectDTO) => Promise<Project>;
    update: (id: string, data: UpdateProjectDTO) => Promise<Project>;
    delete: (id: string) => Promise<{ success: boolean }>;
    archive: (id: string) => Promise<Project>;
    restore: (id: string) => Promise<Project>;
  };

  // エントリー
  entries: {
    getByDateRange: (params: {
      startDate: string;
      endDate: string;
      projectId?: number;
      includeNonWork?: boolean;
    }) => Promise<EntryWithProject[]>;
    getToday: () => Promise<EntryWithProject[]>;
    getCurrent: () => Promise<EntryWithProject | null>;
    create: (data: CreateEntryDTO) => Promise<Entry>;
    update: (id: number, data: UpdateEntryDTO) => Promise<Entry>;
    delete: (id: number) => Promise<{ success: boolean }>;
    split: (params: { entryId: number; splitTime: string }) => Promise<{ before: Entry; after: Entry }>;
    merge: (params: { entryIds: number[]; projectId?: number }) => Promise<Entry>;
  };

  // ルール
  rules: {
    getByProject: (projectId: string) => Promise<Rule[]>;
    getAll: () => Promise<Rule[]>;
    create: (data: CreateRuleDTO) => Promise<Rule>;
    update: (id: string, data: UpdateRuleDTO) => Promise<Rule>;
    delete: (id: string) => Promise<{ success: boolean }>;
    toggleActive: (id: string) => Promise<Rule>;
    reorder: (ruleIds: string[]) => Promise<{ success: boolean }>;
    test: (params: {
      ruleType: Rule['type'];
      pattern: string;
      testData: {
        windowTitle?: string;
        url?: string;
        appName?: string;
        keywords?: string[];
      };
    }) => Promise<{ matched: boolean; matchedText?: string }>;
    match: (testData: {
      windowTitle?: string;
      url?: string;
      appName?: string;
      keywords?: string[];
    }) => Promise<{
      matched: boolean;
      projectId: string | null;
      projectName: string | null;
      confidence: number;
      matchedText?: string;
    }>;
  };

  // レポート
  reports: {
    generateDaily: (params: { date: string }) => Promise<DailyReport>;
  };

  // 設定
  settings: {
    get: () => Promise<Settings>;
    update: (settings: Partial<Settings>) => Promise<Settings>;
  };

  // スクリーンショット
  screenshots: {
    getByEntry: (entryId: string) => Promise<ScreenshotMeta[]>;
    getImage: (id: string) => Promise<{ data: string; mimeType: string }>;
    getThumbnail: (id: string) => Promise<{ data: string; mimeType: string }>;
    capture: (params: {
      entryId: string;
      metadata?: { windowTitle?: string; url?: string; appName?: string };
    }) => Promise<ScreenshotMeta>;
    delete: (id: string) => Promise<{ success: boolean }>;
  };

  // AI使用状況
  aiUsage: {
    getMonthly: () => Promise<AIUsageMonthly>;
    getBudgetStatus: () => Promise<BudgetStatus>;
    onBudgetWarning: (callback: (status: BudgetStatus) => void) => () => void;
  };

  // ウィンドウモニター
  windowMonitor: {
    getActiveWindow: () => Promise<WindowMetadata>;
    start: (params?: { intervalMs?: number }) => Promise<{ success: boolean }>;
    stop: () => Promise<{ success: boolean }>;
    getStatus: () => Promise<WindowMonitorStatus>;
    getHistory: (limit?: number) => Promise<WindowMetadata[]>;
  };

  // システム
  system: {
    getAppInfo: () => Promise<{ version: string; platform: string }>;
    openExternal: (url: string) => Promise<void>;
  };
}

// グローバル型定義
declare global {
  interface Window {
    api: ElectronAPI;
  }
}

