import crypto from 'crypto';
import { getDatabase } from '../database/index.js';
import type { Project, DbProject } from '../database/types.js';

// DBの行データをProjectオブジェクトに変換
function rowToProject(row: DbProject): Project {
  return {
    id: String(row.id),
    name: row.name,
    clientName: row.client_name ?? undefined,
    color: row.color,
    icon: row.icon ?? undefined,
    hourlyRate: row.hourly_rate ?? undefined,
    budgetHours: row.budget_hours ?? undefined,
    isArchived: row.is_archived === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class ProjectRepository {
  /**
   * 全プロジェクトを取得（アーカイブ含むかどうかを指定可能）
   */
  findAll(includeArchived = false): Project[] {
    const db = getDatabase();
    const query = includeArchived
      ? 'SELECT * FROM projects ORDER BY created_at DESC'
      : 'SELECT * FROM projects WHERE is_archived = 0 ORDER BY created_at DESC';
    const rows = db.prepare(query).all() as DbProject[];
    return rows.map(rowToProject);
  }

  /**
   * IDでプロジェクトを取得
   */
  findById(id: string): Project | null {
    const db = getDatabase();
    const row = db.prepare('SELECT * FROM projects WHERE id = ?').get(id) as DbProject | undefined;
    return row ? rowToProject(row) : null;
  }

  /**
   * プロジェクトを作成
   */
  create(data: {
    name: string;
    clientName?: string;
    color: string;
    icon?: string;
    hourlyRate?: number;
    budgetHours?: number;
  }): Project {
    const db = getDatabase();
    const now = new Date().toISOString();

    const result = db.prepare(
      `INSERT INTO projects (name, client_name, color, icon, hourly_rate, budget_hours, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      data.name,
      data.clientName ?? null,
      data.color,
      data.icon ?? null,
      data.hourlyRate ?? null,
      data.budgetHours ?? null,
      now,
      now
    );

    return this.findById(String(result.lastInsertRowid))!;
  }

  /**
   * プロジェクトを更新
   */
  update(
    id: string,
    data: {
      name?: string;
      clientName?: string;
      color?: string;
      icon?: string;
      hourlyRate?: number;
      budgetHours?: number;
    }
  ): Project | null {
    const db = getDatabase();
    const existing = this.findById(id);
    if (!existing) return null;

    const updates: string[] = [];
    const values: (string | number | null)[] = [];

    if (data.name !== undefined) {
      updates.push('name = ?');
      values.push(data.name);
    }
    if (data.clientName !== undefined) {
      updates.push('client_name = ?');
      values.push(data.clientName || null);
    }
    if (data.color !== undefined) {
      updates.push('color = ?');
      values.push(data.color);
    }
    if (data.icon !== undefined) {
      updates.push('icon = ?');
      values.push(data.icon || null);
    }
    if (data.hourlyRate !== undefined) {
      updates.push('hourly_rate = ?');
      values.push(data.hourlyRate || null);
    }
    if (data.budgetHours !== undefined) {
      updates.push('budget_hours = ?');
      values.push(data.budgetHours || null);
    }

    if (updates.length === 0) return existing;

    values.push(id);
    db.prepare(`UPDATE projects SET ${updates.join(', ')} WHERE id = ?`).run(...values);

    return this.findById(id);
  }

  /**
   * プロジェクトを削除（関連エントリーがある場合はエラー）
   */
  delete(id: string): boolean {
    const db = getDatabase();
    
    // 関連エントリーの存在チェック
    const entryCount = db.prepare('SELECT COUNT(*) as count FROM entries WHERE project_id = ?').get(id) as { count: number };
    if (entryCount.count > 0) {
      throw new Error(`Cannot delete project with ${entryCount.count} related entries. Archive it instead.`);
    }

    const result = db.prepare('DELETE FROM projects WHERE id = ?').run(id);
    return result.changes > 0;
  }

  /**
   * プロジェクトをアーカイブ
   */
  archive(id: string): Project | null {
    const db = getDatabase();
    db.prepare('UPDATE projects SET is_archived = 1 WHERE id = ?').run(id);
    return this.findById(id);
  }

  /**
   * プロジェクトをアーカイブ解除
   */
  restore(id: string): Project | null {
    const db = getDatabase();
    db.prepare('UPDATE projects SET is_archived = 0 WHERE id = ?').run(id);
    return this.findById(id);
  }

  /**
   * プロジェクト数を取得（上限チェック用）
   */
  count(includeArchived = false): number {
    const db = getDatabase();
    const query = includeArchived
      ? 'SELECT COUNT(*) as count FROM projects'
      : 'SELECT COUNT(*) as count FROM projects WHERE is_archived = 0';
    const result = db.prepare(query).get() as { count: number };
    return result.count;
  }
}

// シングルトンインスタンス
export const projectRepository = new ProjectRepository();


