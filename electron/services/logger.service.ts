import path from 'path';
import fs from 'fs';
import { app } from 'electron';

/**
 * ログレベル
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4,
}

/**
 * エラー分類
 */
export enum ErrorSeverity {
  INFO = 'info',           // ログのみ
  WARNING = 'warning',     // 通知
  CRITICAL = 'critical',   // 機能停止
  FATAL = 'fatal',         // アプリ停止
}

/**
 * ログ設定
 */
export interface LoggerConfig {
  level: LogLevel;                 // 最小ログレベル
  logDir: string;                  // ログディレクトリ
  maxFileSize: number;             // 最大ファイルサイズ（bytes）
  maxFiles: number;                // 最大ファイル数
  consoleOutput: boolean;          // コンソール出力
  fileOutput: boolean;             // ファイル出力
}

const DEFAULT_CONFIG: LoggerConfig = {
  level: LogLevel.INFO,
  logDir: path.join(app.getPath('userData'), 'logs'),
  maxFileSize: 10 * 1024 * 1024,   // 10MB
  maxFiles: 30,                     // 30日分
  consoleOutput: true,
  fileOutput: true,
};

/**
 * ログエントリ
 */
interface LogEntry {
  timestamp: string;
  level: string;
  category: string;
  message: string;
  data?: Record<string, unknown>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

/**
 * ロガーサービス
 */
export class LoggerService {
  private config: LoggerConfig;
  private currentLogFile: string | null = null;
  private currentLogDate: string | null = null;
  private writeStream: fs.WriteStream | null = null;

  constructor(config?: Partial<LoggerConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.ensureLogDir();
  }

  /**
   * ログディレクトリを作成
   */
  private ensureLogDir(): void {
    if (!fs.existsSync(this.config.logDir)) {
      fs.mkdirSync(this.config.logDir, { recursive: true });
    }
  }

  /**
   * ログファイルを取得（日次ローテーション）
   */
  private getLogFile(): string {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    if (this.currentLogDate !== today) {
      // 日付が変わったらストリームを閉じる
      if (this.writeStream) {
        this.writeStream.end();
        this.writeStream = null;
      }

      this.currentLogDate = today;
      this.currentLogFile = path.join(this.config.logDir, `autotracker_${today}.log`);

      // 古いログファイルをクリーンアップ
      this.cleanupOldLogs();
    }

    return this.currentLogFile!;
  }

  /**
   * ファイルに書き込み
   */
  private writeToFile(entry: LogEntry): void {
    if (!this.config.fileOutput) return;

    try {
      const logFile = this.getLogFile();

      // ファイルサイズチェック
      if (fs.existsSync(logFile)) {
        const stats = fs.statSync(logFile);
        if (stats.size >= this.config.maxFileSize) {
          // ファイルが大きすぎる場合はローテート
          this.rotateCurrentFile(logFile);
        }
      }

      // ストリームを作成（追記モード）
      if (!this.writeStream || this.writeStream.closed) {
        this.writeStream = fs.createWriteStream(logFile, { flags: 'a' });
      }

      const logLine = JSON.stringify(entry) + '\n';
      this.writeStream.write(logLine);
    } catch (error) {
      console.error('Failed to write log:', error);
    }
  }

  /**
   * 現在のログファイルをローテート
   */
  private rotateCurrentFile(logFile: string): void {
    if (this.writeStream) {
      this.writeStream.end();
      this.writeStream = null;
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const rotatedFile = logFile.replace('.log', `_${timestamp}.log`);
    fs.renameSync(logFile, rotatedFile);
  }

  /**
   * 古いログファイルを削除
   */
  private cleanupOldLogs(): void {
    try {
      const files = fs.readdirSync(this.config.logDir)
        .filter(f => f.startsWith('autotracker_') && f.endsWith('.log'))
        .map(f => ({
          name: f,
          path: path.join(this.config.logDir, f),
          mtime: fs.statSync(path.join(this.config.logDir, f)).mtime,
        }))
        .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

      // 最大ファイル数を超えたら削除
      while (files.length > this.config.maxFiles) {
        const oldest = files.pop();
        if (oldest) {
          fs.unlinkSync(oldest.path);
        }
      }
    } catch (error) {
      console.error('Failed to cleanup old logs:', error);
    }
  }

  /**
   * ログを出力
   */
  private log(level: LogLevel, category: string, message: string, data?: Record<string, unknown>, error?: Error): void {
    if (level < this.config.level) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: LogLevel[level],
      category,
      message,
    };

    if (data) {
      entry.data = data;
    }

    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    }

    // コンソール出力
    if (this.config.consoleOutput) {
      const prefix = `[${entry.timestamp}] [${entry.level}] [${category}]`;
      switch (level) {
        case LogLevel.DEBUG:
          console.debug(prefix, message, data ?? '');
          break;
        case LogLevel.INFO:
          console.info(prefix, message, data ?? '');
          break;
        case LogLevel.WARN:
          console.warn(prefix, message, data ?? '');
          break;
        case LogLevel.ERROR:
        case LogLevel.FATAL:
          console.error(prefix, message, error ?? data ?? '');
          break;
      }
    }

    // ファイル出力
    this.writeToFile(entry);
  }

  /**
   * デバッグログ
   */
  debug(category: string, message: string, data?: Record<string, unknown>): void {
    this.log(LogLevel.DEBUG, category, message, data);
  }

  /**
   * 情報ログ
   */
  info(category: string, message: string, data?: Record<string, unknown>): void {
    this.log(LogLevel.INFO, category, message, data);
  }

  /**
   * 警告ログ
   */
  warn(category: string, message: string, data?: Record<string, unknown>): void {
    this.log(LogLevel.WARN, category, message, data);
  }

  /**
   * エラーログ
   */
  error(category: string, message: string, error?: Error, data?: Record<string, unknown>): void {
    this.log(LogLevel.ERROR, category, message, data, error);
  }

  /**
   * 致命的エラーログ
   */
  fatal(category: string, message: string, error?: Error, data?: Record<string, unknown>): void {
    this.log(LogLevel.FATAL, category, message, data, error);
  }

  /**
   * エラーを分類してログ出力
   */
  logError(category: string, severity: ErrorSeverity, message: string, error?: Error, data?: Record<string, unknown>): void {
    switch (severity) {
      case ErrorSeverity.INFO:
        this.info(category, message, data);
        break;
      case ErrorSeverity.WARNING:
        this.warn(category, message, { ...data, errorMessage: error?.message });
        break;
      case ErrorSeverity.CRITICAL:
        this.error(category, message, error, data);
        break;
      case ErrorSeverity.FATAL:
        this.fatal(category, message, error, data);
        break;
    }
  }

  /**
   * ログレベルを設定
   */
  setLevel(level: LogLevel): void {
    this.config.level = level;
  }

  /**
   * ログディレクトリを取得
   */
  getLogDir(): string {
    return this.config.logDir;
  }

  /**
   * ログファイル一覧を取得
   */
  getLogFiles(): { name: string; path: string; size: number; mtime: Date }[] {
    try {
      return fs.readdirSync(this.config.logDir)
        .filter(f => f.startsWith('autotracker_') && f.endsWith('.log'))
        .map(f => {
          const filePath = path.join(this.config.logDir, f);
          const stats = fs.statSync(filePath);
          return {
            name: f,
            path: filePath,
            size: stats.size,
            mtime: stats.mtime,
          };
        })
        .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());
    } catch (error) {
      return [];
    }
  }

  /**
   * ストリームを閉じる
   */
  close(): void {
    if (this.writeStream) {
      this.writeStream.end();
      this.writeStream = null;
    }
  }
}

// シングルトンインスタンス
let loggerService: LoggerService | null = null;

export function getLogger(): LoggerService {
  if (!loggerService) {
    loggerService = new LoggerService();
  }
  return loggerService;
}

// 便利なショートカット関数
export const logger = {
  debug: (category: string, message: string, data?: Record<string, unknown>) =>
    getLogger().debug(category, message, data),
  info: (category: string, message: string, data?: Record<string, unknown>) =>
    getLogger().info(category, message, data),
  warn: (category: string, message: string, data?: Record<string, unknown>) =>
    getLogger().warn(category, message, data),
  error: (category: string, message: string, error?: Error, data?: Record<string, unknown>) =>
    getLogger().error(category, message, error, data),
  fatal: (category: string, message: string, error?: Error, data?: Record<string, unknown>) =>
    getLogger().fatal(category, message, error, data),
};


