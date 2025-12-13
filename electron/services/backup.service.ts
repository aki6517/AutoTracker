import path from 'path';
import fs from 'fs';
import { app } from 'electron';
import { getDatabase } from '../database/index.js';

/**
 * バックアップ情報
 */
export interface BackupInfo {
  id: string;
  filename: string;
  filePath: string;
  createdAt: string;
  size: number;
  isValid: boolean;
}

/**
 * バックアップ設定
 */
export interface BackupConfig {
  backupInterval: number; // バックアップ間隔（ms）デフォルト: 1時間
  maxBackups: number; // 最大保持数 デフォルト: 7
  backupDir: string; // バックアップディレクトリ
}

const DEFAULT_CONFIG: BackupConfig = {
  backupInterval: 60 * 60 * 1000, // 1時間
  maxBackups: 7,
  backupDir: path.join(app.getPath('userData'), 'backups'),
};

/**
 * バックアップサービス
 */
export class BackupService {
  private config: BackupConfig;
  private backupTimer: NodeJS.Timeout | null = null;
  private isRunning = false;

  constructor(config?: Partial<BackupConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.ensureBackupDir();
  }

  /**
   * バックアップディレクトリを作成
   */
  private ensureBackupDir(): void {
    if (!fs.existsSync(this.config.backupDir)) {
      fs.mkdirSync(this.config.backupDir, { recursive: true });
    }
  }

  /**
   * バックアップを作成
   */
  async createBackup(): Promise<BackupInfo> {
    const db = getDatabase();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `autotracker_${timestamp}.db`;
    const filePath = path.join(this.config.backupDir, filename);

    console.log(`[BackupService] Creating backup: ${filename}`);

    try {
      // SQLiteのバックアップ機能を使用
      const backupDb = db.backup(filePath);
      await new Promise<void>((resolve, reject) => {
        const step = () => {
          const more = backupDb.step(100);
          if (more) {
            setImmediate(step);
          } else {
            resolve();
          }
        };
        try {
          step();
        } catch (error) {
          reject(error);
        }
      });

      // バックアップの整合性を確認
      const isValid = await this.verifyBackup(filePath);
      const stats = fs.statSync(filePath);

      const backupInfo: BackupInfo = {
        id: timestamp,
        filename,
        filePath,
        createdAt: new Date().toISOString(),
        size: stats.size,
        isValid,
      };

      console.log(`[BackupService] Backup created: ${filename} (${this.formatSize(stats.size)})`);

      // 古いバックアップを削除
      await this.cleanupOldBackups();

      return backupInfo;
    } catch (error) {
      console.error('[BackupService] Backup failed:', error);
      throw error;
    }
  }

  /**
   * バックアップから復元
   */
  async restore(backupPath: string): Promise<boolean> {
    console.log(`[BackupService] Restoring from: ${backupPath}`);

    // バックアップの存在確認
    if (!fs.existsSync(backupPath)) {
      throw new Error(`Backup file not found: ${backupPath}`);
    }

    // バックアップの整合性を確認
    const isValid = await this.verifyBackup(backupPath);
    if (!isValid) {
      throw new Error('Backup file is corrupted');
    }

    try {
      // 現在のDBファイルのパスを取得
      const currentDbPath = path.join(app.getPath('userData'), 'autotracker.db');

      // 現在のDBを閉じる（better-sqlite3は明示的にcloseする必要がある）
      // 注意: これはDBServiceを再初期化する必要がある
      
      // バックアップを現在のDBにコピー
      fs.copyFileSync(backupPath, currentDbPath);

      console.log('[BackupService] Restore completed. Please restart the application.');
      return true;
    } catch (error) {
      console.error('[BackupService] Restore failed:', error);
      throw error;
    }
  }

  /**
   * バックアップ一覧を取得
   */
  async listBackups(): Promise<BackupInfo[]> {
    const backups: BackupInfo[] = [];

    if (!fs.existsSync(this.config.backupDir)) {
      return backups;
    }

    const files = fs.readdirSync(this.config.backupDir);
    const dbFiles = files.filter((f) => f.startsWith('autotracker_') && f.endsWith('.db'));

    for (const filename of dbFiles) {
      const filePath = path.join(this.config.backupDir, filename);
      const stats = fs.statSync(filePath);

      // ファイル名からタイムスタンプを抽出
      const match = filename.match(/autotracker_(.+)\.db$/);
      const id = match ? match[1] : filename;

      backups.push({
        id,
        filename,
        filePath,
        createdAt: stats.mtime.toISOString(),
        size: stats.size,
        isValid: true, // 一覧取得時は検証しない（パフォーマンスのため）
      });
    }

    // 日付の降順でソート
    backups.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return backups;
  }

  /**
   * バックアップの整合性を確認
   */
  async verifyBackup(backupPath: string): Promise<boolean> {
    try {
      // 動的インポートでbetter-sqlite3を読み込み
      const Database = (await import('better-sqlite3')).default;
      const db = new Database(backupPath, { readonly: true });

      try {
        // PRAGMA integrity_checkを実行
        const result = db.pragma('integrity_check') as { integrity_check: string }[];
        const isValid = result.length === 1 && result[0].integrity_check === 'ok';
        db.close();
        return isValid;
      } catch (error) {
        db.close();
        return false;
      }
    } catch (error) {
      console.error('[BackupService] Verification failed:', error);
      return false;
    }
  }

  /**
   * 古いバックアップを削除
   */
  async cleanupOldBackups(): Promise<number> {
    const backups = await this.listBackups();

    if (backups.length <= this.config.maxBackups) {
      return 0;
    }

    // 古いバックアップを削除
    const toDelete = backups.slice(this.config.maxBackups);
    let deletedCount = 0;

    for (const backup of toDelete) {
      try {
        fs.unlinkSync(backup.filePath);
        deletedCount++;
        console.log(`[BackupService] Deleted old backup: ${backup.filename}`);
      } catch (error) {
        console.error(`[BackupService] Failed to delete backup: ${backup.filename}`, error);
      }
    }

    return deletedCount;
  }

  /**
   * 自動バックアップを開始
   */
  startAutoBackup(): void {
    if (this.isRunning) {
      console.log('[BackupService] Auto backup is already running');
      return;
    }

    console.log(`[BackupService] Starting auto backup (interval: ${this.config.backupInterval / 60000} minutes)`);

    this.isRunning = true;

    // 初回バックアップを実行
    this.createBackup().catch((error) => {
      console.error('[BackupService] Initial backup failed:', error);
    });

    // 定期バックアップを開始
    this.backupTimer = setInterval(() => {
      this.createBackup().catch((error) => {
        console.error('[BackupService] Scheduled backup failed:', error);
      });
    }, this.config.backupInterval);
  }

  /**
   * 自動バックアップを停止
   */
  stopAutoBackup(): void {
    if (this.backupTimer) {
      clearInterval(this.backupTimer);
      this.backupTimer = null;
    }
    this.isRunning = false;
    console.log('[BackupService] Auto backup stopped');
  }

  /**
   * 起動時リカバリを実行
   */
  async performStartupRecovery(): Promise<boolean> {
    const currentDbPath = path.join(app.getPath('userData'), 'autotracker.db');

    // DBファイルが存在しない場合
    if (!fs.existsSync(currentDbPath)) {
      console.log('[BackupService] Database not found. Attempting recovery from backup...');
      return await this.recoverFromLatestBackup();
    }

    // DBファイルの整合性を確認
    try {
      const Database = (await import('better-sqlite3')).default;
      const db = new Database(currentDbPath, { readonly: true });

      try {
        const result = db.pragma('integrity_check') as { integrity_check: string }[];
        const isValid = result.length === 1 && result[0].integrity_check === 'ok';
        db.close();

        if (!isValid) {
          console.log('[BackupService] Database is corrupted. Attempting recovery from backup...');
          return await this.recoverFromLatestBackup();
        }

        console.log('[BackupService] Database integrity check passed');
        return true;
      } catch (error) {
        db.close();
        console.log('[BackupService] Database error. Attempting recovery from backup...');
        return await this.recoverFromLatestBackup();
      }
    } catch (error) {
      console.log('[BackupService] Cannot open database. Attempting recovery from backup...');
      return await this.recoverFromLatestBackup();
    }
  }

  /**
   * 最新の正常なバックアップから復元
   */
  private async recoverFromLatestBackup(): Promise<boolean> {
    const backups = await this.listBackups();

    for (const backup of backups) {
      const isValid = await this.verifyBackup(backup.filePath);
      if (isValid) {
        console.log(`[BackupService] Found valid backup: ${backup.filename}`);
        try {
          await this.restore(backup.filePath);
          console.log('[BackupService] Recovery completed successfully');
          return true;
        } catch (error) {
          console.error('[BackupService] Recovery failed:', error);
        }
      }
    }

    console.log('[BackupService] No valid backups found for recovery');
    return false;
  }

  /**
   * ファイルサイズをフォーマット
   */
  private formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  /**
   * 設定を更新
   */
  updateConfig(config: Partial<BackupConfig>): void {
    const wasRunning = this.isRunning;

    if (wasRunning) {
      this.stopAutoBackup();
    }

    this.config = { ...this.config, ...config };

    if (wasRunning) {
      this.startAutoBackup();
    }
  }

  /**
   * 現在の設定を取得
   */
  getConfig(): BackupConfig {
    return { ...this.config };
  }

  /**
   * 自動バックアップが実行中かどうか
   */
  isAutoBackupRunning(): boolean {
    return this.isRunning;
  }
}

// シングルトンインスタンス
let backupService: BackupService | null = null;

export function getBackupService(): BackupService {
  if (!backupService) {
    backupService = new BackupService();
  }
  return backupService;
}

