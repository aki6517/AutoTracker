import crypto from 'crypto';
import { getDatabase } from '../database/index.js';
import type { DbRule } from '../database/types.js';

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

// DBの行データをRuleオブジェクトに変換
function rowToRule(row: DbRule): Rule {
  return {
    id: String(row.id),
    projectId: String(row.project_id),
    ruleType: row.type as Rule['ruleType'],
    pattern: row.pattern,
    priority: row.priority,
    isActive: row.is_enabled === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class RuleRepository {
  /**
   * プロジェクトに紐づくルールを取得（優先度順）
   */
  findByProject(projectId: string, activeOnly = false): Rule[] {
    const db = getDatabase();
    const query = activeOnly
      ? 'SELECT * FROM rules WHERE project_id = ? AND is_enabled = 1 ORDER BY priority DESC'
      : 'SELECT * FROM rules WHERE project_id = ? ORDER BY priority DESC';
    const rows = db.prepare(query).all(parseInt(projectId, 10)) as DbRule[];
    return rows.map(rowToRule);
  }

  /**
   * 全ルールを取得（優先度順）
   */
  findAll(activeOnly = false): Rule[] {
    const db = getDatabase();
    const query = activeOnly
      ? 'SELECT * FROM rules WHERE is_enabled = 1 ORDER BY priority DESC'
      : 'SELECT * FROM rules ORDER BY priority DESC';
    const rows = db.prepare(query).all() as DbRule[];
    return rows.map(rowToRule);
  }

  /**
   * IDでルールを取得
   */
  findById(id: string): Rule | null {
    const db = getDatabase();
    const row = db.prepare('SELECT * FROM rules WHERE id = ?').get(parseInt(id, 10)) as DbRule | undefined;
    return row ? rowToRule(row) : null;
  }

  /**
   * ルールを作成
   */
  create(data: {
    projectId: string;
    ruleType: Rule['ruleType'];
    pattern: string;
    priority?: number;
    isActive?: boolean;
  }): Rule {
    const db = getDatabase();
    const now = new Date().toISOString();
    
    // 優先度が指定されていない場合は、プロジェクト内の最大優先度+1
    let priority = data.priority;
    if (priority === undefined) {
      const maxPriority = db.prepare(
        'SELECT MAX(priority) as max_priority FROM rules WHERE project_id = ?'
      ).get(data.projectId) as { max_priority: number | null };
      priority = (maxPriority.max_priority ?? 0) + 1;
    }

    const result = db.prepare(
      `INSERT INTO rules (project_id, type, pattern, priority, is_enabled, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(
      parseInt(data.projectId, 10),
      data.ruleType,
      data.pattern,
      priority,
      (data.isActive ?? true) ? 1 : 0,
      now,
      now
    );

    return this.findById(String(result.lastInsertRowid))!;
  }

  /**
   * ルールを更新
   */
  update(
    id: string,
    data: {
      ruleType?: Rule['ruleType'];
      pattern?: string;
      priority?: number;
      isActive?: boolean;
    }
  ): Rule | null {
    const db = getDatabase();
    const existing = this.findById(id);
    if (!existing) return null;

    const updates: string[] = [];
    const values: (string | number)[] = [];

    if (data.ruleType !== undefined) {
      updates.push('type = ?');
      values.push(data.ruleType);
    }
    if (data.pattern !== undefined) {
      updates.push('pattern = ?');
      values.push(data.pattern);
    }
    if (data.priority !== undefined) {
      updates.push('priority = ?');
      values.push(data.priority);
    }
    if (data.isActive !== undefined) {
      updates.push('is_enabled = ?');
      values.push(data.isActive ? 1 : 0);
    }

    if (updates.length === 0) return existing;

    values.push(parseInt(id, 10));
    db.prepare(`UPDATE rules SET ${updates.join(', ')} WHERE id = ?`).run(...values);

    return this.findById(id);
  }

  /**
   * ルールを削除
   */
  delete(id: string): boolean {
    const db = getDatabase();
    const result = db.prepare('DELETE FROM rules WHERE id = ?').run(parseInt(id, 10));
    return result.changes > 0;
  }

  /**
   * ルールの有効/無効を切り替え
   */
  toggleActive(id: string): Rule | null {
    const existing = this.findById(id);
    if (!existing) return null;
    return this.update(id, { isActive: !existing.isActive });
  }

  /**
   * プロジェクトのルール数を取得
   */
  countByProject(projectId: string): number {
    const db = getDatabase();
    const result = db.prepare(
      'SELECT COUNT(*) as count FROM rules WHERE project_id = ?'
    ).get(parseInt(projectId, 10)) as { count: number };
    return result.count;
  }

  /**
   * ルールの優先度を並び替え
   */
  reorder(ruleIds: string[]): void {
    const db = getDatabase();
    const stmt = db.prepare('UPDATE rules SET priority = ? WHERE id = ?');
    
    // 高い優先度から順に設定
    const transaction = db.transaction(() => {
      ruleIds.forEach((id, index) => {
        stmt.run(ruleIds.length - index, parseInt(id, 10));
      });
    });
    
    transaction();
  }
}

// シングルトンインスタンス
export const ruleRepository = new RuleRepository();

