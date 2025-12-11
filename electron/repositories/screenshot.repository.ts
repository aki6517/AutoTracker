import { getDatabase } from '../database/index.js';
import type { DbScreenshot } from '../database/types.js';

export interface Screenshot {
  id: string;
  entryId: string;
  filePath: string;
  thumbnailPath: string | null;
  isBlurred: boolean;
  capturedAt: string;
  metadata: Record<string, unknown> | null;
}

// DBの行データをScreenshotオブジェクトに変換
function rowToScreenshot(row: DbScreenshot): Screenshot {
  return {
    id: row.id,
    entryId: row.entry_id,
    filePath: row.file_path,
    thumbnailPath: row.thumbnail_path,
    isBlurred: row.is_blurred === 1,
    capturedAt: row.captured_at,
    metadata: row.metadata ? JSON.parse(row.metadata) : null,
  };
}

export class ScreenshotRepository {
  /**
   * エントリーIDでスクリーンショットを取得
   */
  findByEntryId(entryId: string): Screenshot[] {
    const db = getDatabase();
    const rows = db.prepare(
      'SELECT * FROM screenshots WHERE entry_id = ? ORDER BY captured_at ASC'
    ).all(entryId) as DbScreenshot[];
    return rows.map(rowToScreenshot);
  }

  /**
   * IDでスクリーンショットを取得
   */
  findById(id: string): Screenshot | null {
    const db = getDatabase();
    const row = db.prepare('SELECT * FROM screenshots WHERE id = ?').get(id) as DbScreenshot | undefined;
    return row ? rowToScreenshot(row) : null;
  }

  /**
   * 日付範囲でスクリーンショットを取得
   */
  findByDateRange(startDate: string, endDate: string): Screenshot[] {
    const db = getDatabase();
    const rows = db.prepare(
      'SELECT * FROM screenshots WHERE captured_at >= ? AND captured_at <= ? ORDER BY captured_at ASC'
    ).all(startDate, endDate) as DbScreenshot[];
    return rows.map(rowToScreenshot);
  }

  /**
   * スクリーンショットを削除
   */
  delete(id: string): boolean {
    const db = getDatabase();
    const result = db.prepare('DELETE FROM screenshots WHERE id = ?').run(id);
    return result.changes > 0;
  }

  /**
   * エントリーに紐づくスクリーンショットを全削除
   */
  deleteByEntryId(entryId: string): number {
    const db = getDatabase();
    const result = db.prepare('DELETE FROM screenshots WHERE entry_id = ?').run(entryId);
    return result.changes;
  }

  /**
   * 保持期間を過ぎたスクリーンショットを取得
   */
  findExpired(cutoffDate: string): Screenshot[] {
    const db = getDatabase();
    const rows = db.prepare(
      'SELECT * FROM screenshots WHERE captured_at < ?'
    ).all(cutoffDate) as DbScreenshot[];
    return rows.map(rowToScreenshot);
  }

  /**
   * 保持期間を過ぎたスクリーンショットを削除
   */
  deleteExpired(cutoffDate: string): number {
    const db = getDatabase();
    const result = db.prepare('DELETE FROM screenshots WHERE captured_at < ?').run(cutoffDate);
    return result.changes;
  }

  /**
   * スクリーンショット数を取得
   */
  count(): number {
    const db = getDatabase();
    const result = db.prepare('SELECT COUNT(*) as count FROM screenshots').get() as { count: number };
    return result.count;
  }

  /**
   * エントリーに紐づくスクリーンショット数を取得
   */
  countByEntryId(entryId: string): number {
    const db = getDatabase();
    const result = db.prepare(
      'SELECT COUNT(*) as count FROM screenshots WHERE entry_id = ?'
    ).get(entryId) as { count: number };
    return result.count;
  }
}

// シングルトンインスタンス
export const screenshotRepository = new ScreenshotRepository();

