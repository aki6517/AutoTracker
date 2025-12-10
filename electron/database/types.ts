import type Database from 'better-sqlite3';

export interface Migration {
  version: number;
  name: string;
  up: (db: Database.Database) => void;
  down: (db: Database.Database) => void;
}

export interface DatabaseConfig {
  path: string;
}

// ========================================
// Database Row Types (snake_case)
// ========================================

export interface DbProject {
  id: string;
  name: string;
  client_name: string | null;
  color: string;
  icon: string | null;
  hourly_rate: number | null;
  budget_hours: number | null;
  is_archived: number; // SQLite boolean (0 or 1)
  created_at: string;
  updated_at: string;
}

export interface DbEntry {
  id: string;
  project_id: string;
  start_time: string;
  end_time: string | null;
  duration_seconds: number;
  description: string | null;
  source: string;
  confidence: number;
  is_confirmed: number;
  is_billed: number;
  manual_override: number;
  created_at: string;
  updated_at: string;
}

export interface DbRule {
  id: string;
  project_id: string;
  rule_type: string;
  pattern: string;
  priority: number;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface DbScreenshot {
  id: string;
  entry_id: string;
  file_path: string;
  thumbnail_path: string | null;
  is_blurred: number;
  captured_at: string;
  metadata: string | null;
}

export interface DbSetting {
  key: string;
  value: string;
  updated_at: string;
}

// ========================================
// Application Types (camelCase)
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

export interface Entry {
  id: string;
  projectId: string;
  startTime: string;
  endTime: string | null;
  durationSeconds: number;
  description: string | null;
  source: 'auto' | 'manual';
  confidence: number;
  isConfirmed: boolean;
  isBilled: boolean;
  manualOverride: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Rule {
  id: string;
  projectId: string;
  ruleType: 'app_name' | 'window_title' | 'url' | 'keyword';
  pattern: string;
  priority: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Screenshot {
  id: string;
  entryId: string;
  filePath: string;
  thumbnailPath: string | null;
  isBlurred: boolean;
  capturedAt: string;
  metadata: Record<string, unknown> | null;
}

