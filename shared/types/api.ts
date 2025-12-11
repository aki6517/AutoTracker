// IPC API型定義

// ========================================
// 共通型定義
// ========================================

export interface APIError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export type APIResult<T> = { success: true; data: T } | { success: false; error: APIError };

// ========================================
// Project関連
// ========================================

export interface Project {
  id: string;
  name: string;
  clientName?: string;
  color: string;
  icon?: string;
  hourlyRate?: number;
  budgetHours?: number;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectDTO {
  name: string;
  clientName?: string;
  color?: string;
  icon?: string;
  hourlyRate?: number;
  budgetHours?: number;
}

export interface UpdateProjectDTO {
  name?: string;
  clientName?: string | null;
  color?: string;
  icon?: string;
  hourlyRate?: number | null;
  budgetHours?: number | null;
}

// ========================================
// Entry関連
// ========================================

export interface Entry {
  id: number;
  projectId: number | null;
  startTime: string;
  endTime: string | null;
  confidence: number;
  aiReasoning: string | null;
  subtask: string | null;
  isManual: boolean;
  isWork: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EntryWithProject extends Entry {
  projectName: string | null;
  projectColor: string | null;
}

export interface CreateEntryDTO {
  projectId?: number;
  startTime: string;
  endTime?: string;
  subtask?: string;
  isWork?: boolean;
}

export interface UpdateEntryDTO {
  projectId?: number | null;
  startTime?: string;
  endTime?: string | null;
  subtask?: string | null;
  isWork?: boolean;
}

// ========================================
// Rule関連
// ========================================

export type RuleType = 'window_title' | 'url' | 'keyword' | 'app_name' | 'file_path';

export interface Rule {
  id: number;
  projectId: number;
  type: RuleType;
  pattern: string;
  priority: number;
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRuleDTO {
  projectId: number;
  type: RuleType;
  pattern: string;
  priority?: number;
  isEnabled?: boolean;
}

export interface UpdateRuleDTO {
  type?: RuleType;
  pattern?: string;
  priority?: number;
  isEnabled?: boolean;
}

// ========================================
// Tracking関連
// ========================================

export interface TrackingStatus {
  isRunning: boolean;
  isPaused: boolean;
  startedAt: string | null;
  currentEntryId: number | null;
  currentProjectId: number | null;
  currentProjectName: string | null;
  elapsedSeconds: number;
  confidence: number;
}

export interface ConfirmationRequest {
  entryId: number;
  suggestedProject: { id: number | null; name: string };
  confidence: number;
  reasoning: string;
  alternatives: { id: number; name: string; score: number }[];
}

export interface ConfirmationResponse {
  entryId: number;
  action: 'confirm' | 'change' | 'split';
  newProjectId?: number;
  splitTime?: string;
}

// ========================================
// Settings関連
// ========================================

export interface Settings {
  tracking: {
    captureInterval: number;
    metadataInterval: number;
    aiJudgmentMode: 'aggressive' | 'standard' | 'conservative';
    autoStartOnBoot: boolean;
    breakDetectionThreshold: number;
  };
  notifications: {
    confirmationMode: 'always' | 'low-confidence' | 'never';
    anomalyAlerts: boolean;
    reportReminders: boolean;
    reportReminderTime: string;
  };
  privacy: {
    screenshotStorage: 'local' | 'cloud';
    screenshotRetention: number;
    passwordDetection: boolean;
    excludeKeywords: string[];
  };
  appearance: {
    theme: 'dark' | 'light' | 'auto';
    accentColor: 'amber' | 'blue' | 'green' | 'purple';
    fontSize: 'small' | 'medium' | 'large';
  };
  ai: {
    monthlyBudget: number;
    batchMode: boolean;
  };
}

// ========================================
// Report関連
// ========================================

export interface ProjectBreakdown {
  projectId: number | null;
  projectName: string;
  projectColor: string;
  hours: number;
  percentage: number;
  revenue: number;
}

export interface DailyReport {
  date: string;
  totalHours: number;
  totalRevenue: number;
  projectBreakdown: ProjectBreakdown[];
  entries: EntryWithProject[];
}

// ========================================
// AI Usage関連
// ========================================

export interface AIUsageMonthly {
  month: string;
  totalTokens: number;
  totalCost: number;
  byModel: {
    model: string;
    tokens: number;
    cost: number;
    requestCount: number;
  }[];
}

export interface BudgetStatus {
  monthlyBudget: number;
  currentUsage: number;
  remaining: number;
  percentUsed: number;
  isOverBudget: boolean;
}

// ========================================
// Screenshot関連
// ========================================

export interface ScreenshotMeta {
  id: string;
  entryId: string;
  timestamp: string;
  windowTitle: string | null;
  url: string | null;
  appName: string | null;
}

