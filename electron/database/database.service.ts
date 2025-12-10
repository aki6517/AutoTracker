import Database from 'better-sqlite3';
import { app } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class DatabaseService {
  private db: Database.Database | null = null;
  private dbPath: string;

  constructor() {
    // userDataディレクトリにDBファイルを作成
    const userDataPath = app.getPath('userData');
    this.dbPath = path.join(userDataPath, 'autotracker.db');
  }

  /**
   * データベースに接続
   */
  connect(): Database.Database {
    if (this.db) {
      return this.db;
    }

    console.log(`Connecting to database: ${this.dbPath}`);
    this.db = new Database(this.dbPath);

    // WALモードを有効化（読み書き並行性向上）
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('synchronous = NORMAL');
    this.db.pragma('cache_size = -64000'); // 64MB cache

    return this.db;
  }

  /**
   * データベース接続を取得
   */
  getDatabase(): Database.Database {
    if (!this.db) {
      return this.connect();
    }
    return this.db;
  }

  /**
   * データベースを閉じる
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  /**
   * データベースの整合性チェック
   */
  checkIntegrity(): boolean {
    const db = this.getDatabase();
    const result = db.pragma('integrity_check') as Array<{ integrity_check: string }>;
    return result[0]?.integrity_check === 'ok';
  }
}

// シングルトンインスタンス
let databaseService: DatabaseService | null = null;

export function getDatabaseService(): DatabaseService {
  if (!databaseService) {
    databaseService = new DatabaseService();
  }
  return databaseService;
}

