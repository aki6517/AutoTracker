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

export type RuleType = 'window_title' | 'url' | 'keyword' | 'app_name';

export interface Rule {
  id: string;
  projectId: string;
  type: RuleType;
  pattern: string;
  priority: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRuleDTO {
  projectId: string;
  type: RuleType;
  pattern: string;
  priority?: number;
  isActive?: boolean;
}

export interface UpdateRuleDTO {
  type?: RuleType;
  pattern?: string;
  priority?: number;
  isActive?: boolean;
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

// ========================================
// WindowMonitor関連
// ========================================

export interface WindowMetadata {
  windowTitle: string | null;
  appName: string | null;
  processId: number | null;
  url: string | null;
  timestamp: string;
}

export interface WindowMonitorStatus {
  isActive: boolean;
  latestMetadata: WindowMetadata | null;
}

// ========================================
// AI判定関連
// ========================================

export interface ScreenContext {
  windowTitle: string | null;
  appName: string | null;
  url: string | null;
  ocrText?: string | null;
  timestamp: string;
}

export interface ChangeDetectionResult {
  hasChange: boolean;
  confidence: number;
  reasoning: string;
  tokensUsed: number;
  cost: number;
}

export interface ProjectJudgmentResult {
  projectId: string | null;
  projectName: string | null;
  confidence: number;
  reasoning: string;
  alternatives: { projectId: string; projectName: string; score: number }[];
  isWork: boolean;
  tokensUsed: number;
  cost: number;
}

// ========================================
// 変更検出エンジン関連
// ========================================

export type ChangeType = 'none' | 'title' | 'url' | 'ocr' | 'image' | 'rule' | 'ai';

export interface ChangeDetectorResult {
  hasChange: boolean;
  changeType: ChangeType;
  layer: number;
  confidence: number;
  details: {
    previousContext?: ScreenContext;
    currentContext: ScreenContext;
    ocrText?: string;
    imageHash?: string;
    matchedRule?: {
      projectId: string;
      projectName: string;
      confidence: number;
    };
    aiJudgment?: {
      projectId: string | null;
      projectName: string | null;
      confidence: number;
      reasoning: string;
    };
  };
  processingTime: number;
}

export interface ChangeDetectorOptions {
  enableOcr: boolean;
  enableImageHash: boolean;
  enableRuleMatching: boolean;
  enableAiJudgment: boolean;
}

