import type Database from 'better-sqlite3';
import type { Migration } from './types.js';

export class Migrator {
  private migrations: Migration[] = [];

  /**
   * マイグレーションを登録
   */
  register(migration: Migration): void {
    this.migrations.push(migration);
    // バージョン順にソート
    this.migrations.sort((a, b) => a.version - b.version);
  }

  /**
   * 現在のデータベースバージョンを取得
   */
  private getCurrentVersion(db: Database.Database): number {
    try {
      const result = db
        .prepare('SELECT MAX(version) as version FROM schema_migrations')
        .get() as { version: number | null } | undefined;

      return result?.version ?? 0;
    } catch (error) {
      // schema_migrationsテーブルが存在しない場合は0を返す
      return 0;
    }
  }

  /**
   * マイグレーションを実行
   */
  migrate(db: Database.Database): void {
    const currentVersion = this.getCurrentVersion(db);
    const pendingMigrations = this.migrations.filter((m) => m.version > currentVersion);

    if (pendingMigrations.length === 0) {
      console.log('No pending migrations');
      return;
    }

    console.log(`Current database version: ${currentVersion}`);
    console.log(`Pending migrations: ${pendingMigrations.length}`);

    for (const migration of pendingMigrations) {
      console.log(`Applying migration ${migration.version}: ${migration.name}`);

      // トランザクション内で実行
      const transaction = db.transaction(() => {
        migration.up(db);
        db.prepare('INSERT INTO schema_migrations (version, name) VALUES (?, ?)').run(
          migration.version,
          migration.name
        );
      });

      transaction();
      console.log(`Migration ${migration.version} applied successfully`);
    }

    console.log('All migrations completed');
  }

  /**
   * マイグレーションをロールバック（開発用）
   */
  rollback(db: Database.Database, targetVersion: number): void {
    const currentVersion = this.getCurrentVersion(db);
    const migrationsToRollback = this.migrations
      .filter((m) => m.version > targetVersion && m.version <= currentVersion)
      .sort((a, b) => b.version - a.version); // 新しい順

    for (const migration of migrationsToRollback) {
      console.log(`Rolling back migration ${migration.version}: ${migration.name}`);

      const transaction = db.transaction(() => {
        migration.down(db);
        db.prepare('DELETE FROM schema_migrations WHERE version = ?').run(migration.version);
      });

      transaction();
    }
  }
}

