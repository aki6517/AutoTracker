import type Database from 'better-sqlite3';
import type { Migration } from '../types.js';

export const migration001: Migration = {
  version: 1,
  name: 'initial_schema',
  up: (db: Database.Database) => {
    db.exec(`
      -- projects
      CREATE TABLE projects (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        name          TEXT NOT NULL,
        client_name   TEXT,
        color         TEXT NOT NULL DEFAULT '#E5C890',
        icon          TEXT DEFAULT '📁',
        hourly_rate   REAL,
        budget_hours  REAL,
        is_archived   INTEGER NOT NULL DEFAULT 0,
        created_at    TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
      );

      -- entries
      CREATE TABLE entries (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id    INTEGER,
        start_time    TEXT NOT NULL,
        end_time      TEXT,
        confidence    INTEGER NOT NULL DEFAULT 0,
        ai_reasoning  TEXT,
        subtask       TEXT,
        is_manual     INTEGER NOT NULL DEFAULT 0,
        is_work       INTEGER NOT NULL DEFAULT 1,
        created_at    TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at    TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
      );

      -- rules
      CREATE TABLE rules (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id    INTEGER NOT NULL,
        type          TEXT NOT NULL,
        pattern       TEXT NOT NULL,
        priority      INTEGER NOT NULL DEFAULT 0,
        is_enabled    INTEGER NOT NULL DEFAULT 1,
        created_at    TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at    TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
      );

      -- screenshots
      CREATE TABLE screenshots (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        entry_id      INTEGER,
        file_path     TEXT NOT NULL,
        timestamp     TEXT NOT NULL,
        window_title  TEXT,
        url           TEXT,
        app_name      TEXT,
        ocr_text      TEXT,
        created_at    TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (entry_id) REFERENCES entries(id) ON DELETE SET NULL
      );

      -- settings
      CREATE TABLE settings (
        key           TEXT PRIMARY KEY,
        value         TEXT,
        updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
      );

      -- ai_usage_logs
      CREATE TABLE ai_usage_logs (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        model         TEXT NOT NULL,
        tokens_in     INTEGER NOT NULL DEFAULT 0,
        tokens_out    INTEGER NOT NULL DEFAULT 0,
        cost          REAL NOT NULL DEFAULT 0,
        request_type  TEXT,
        created_at    TEXT NOT NULL DEFAULT (datetime('now'))
      );

      -- schema_migrations
      CREATE TABLE schema_migrations (
        version       INTEGER PRIMARY KEY,
        name          TEXT NOT NULL,
        applied_at    TEXT NOT NULL DEFAULT (datetime('now'))
      );

      -- Indexes
      CREATE INDEX idx_entries_start_time ON entries(start_time);
      CREATE INDEX idx_entries_end_time ON entries(end_time);
      CREATE INDEX idx_entries_project_id ON entries(project_id);
      CREATE INDEX idx_entries_project_date ON entries(project_id, start_time);
      CREATE INDEX idx_screenshots_entry_id ON screenshots(entry_id);
      CREATE INDEX idx_screenshots_timestamp ON screenshots(timestamp);
      CREATE INDEX idx_rules_project_id ON rules(project_id);
      CREATE INDEX idx_rules_enabled ON rules(is_enabled, project_id) WHERE is_enabled = 1;
      CREATE INDEX idx_ai_usage_created ON ai_usage_logs(created_at);

      -- Triggers
      CREATE TRIGGER update_projects_timestamp 
      AFTER UPDATE ON projects
      BEGIN
        UPDATE projects SET updated_at = datetime('now') WHERE id = NEW.id;
      END;

      CREATE TRIGGER update_entries_timestamp 
      AFTER UPDATE ON entries
      BEGIN
        UPDATE entries SET updated_at = datetime('now') WHERE id = NEW.id;
      END;

      CREATE TRIGGER update_rules_timestamp 
      AFTER UPDATE ON rules
      BEGIN
        UPDATE rules SET updated_at = datetime('now') WHERE id = NEW.id;
      END;

      CREATE TRIGGER update_settings_timestamp 
      AFTER UPDATE ON settings
      BEGIN
        UPDATE settings SET updated_at = datetime('now') WHERE key = NEW.key;
      END;

      -- Default settings
      INSERT INTO settings (key, value) VALUES
        ('tracking.captureInterval', '60000'),
        ('tracking.metadataInterval', '5000'),
        ('tracking.aiJudgmentMode', '"standard"'),
        ('tracking.autoStartOnBoot', 'true'),
        ('notifications.confirmationMode', '"low-confidence"'),
        ('notifications.anomalyAlerts', 'true'),
        ('privacy.screenshotRetention', '7'),
        ('privacy.passwordDetection', 'true'),
        ('privacy.excludeKeywords', '["password", "秘密", "機密"]'),
        ('appearance.theme', '"dark"'),
        ('appearance.fontSize', '"medium"'),
        ('ai.monthlyBudget', '2.00');
    `);
  },
  down: (db: Database.Database) => {
    db.exec(`
      DROP TRIGGER IF EXISTS update_settings_timestamp;
      DROP TRIGGER IF EXISTS update_rules_timestamp;
      DROP TRIGGER IF EXISTS update_entries_timestamp;
      DROP TRIGGER IF EXISTS update_projects_timestamp;
      DROP INDEX IF EXISTS idx_ai_usage_created;
      DROP INDEX IF EXISTS idx_rules_project_id;
      DROP INDEX IF EXISTS idx_screenshots_timestamp;
      DROP INDEX IF EXISTS idx_screenshots_entry_id;
      DROP INDEX IF EXISTS idx_entries_project_date;
      DROP INDEX IF EXISTS idx_entries_project_id;
      DROP INDEX IF EXISTS idx_entries_end_time;
      DROP INDEX IF EXISTS idx_entries_start_time;
      DROP TABLE IF EXISTS ai_usage_logs;
      DROP TABLE IF EXISTS screenshots;
      DROP TABLE IF EXISTS rules;
      DROP TABLE IF EXISTS entries;
      DROP TABLE IF EXISTS projects;
      DROP TABLE IF EXISTS settings;
      DROP TABLE IF EXISTS schema_migrations;
    `);
  },
};

