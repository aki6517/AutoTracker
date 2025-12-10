import { getDatabaseService } from './database.service.js';
import { Migrator } from './migrator.js';
import { migration001 } from './migrations/001_initial.js';

/**
 * データベースを初期化
 */
export async function initializeDatabase(): Promise<void> {
  const dbService = getDatabaseService();
  const db = dbService.connect();

  // 整合性チェック
  if (!dbService.checkIntegrity()) {
    throw new Error('Database integrity check failed');
  }

  // マイグレーターを初期化
  const migrator = new Migrator();
  migrator.register(migration001);

  // マイグレーションを実行
  migrator.migrate(db);

  console.log('Database initialized successfully');
}

