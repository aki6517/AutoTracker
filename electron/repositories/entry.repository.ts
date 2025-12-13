import { getDatabase } from '../database/index.js';

// データベースの行データ型
export interface DbEntry {
  id: number;
  project_id: number | null;
  start_time: string;
  end_time: string | null;
  confidence: number;
  ai_reasoning: string | null;
  subtask: string | null;
  is_manual: number;
  is_work: number;
  created_at: string;
  updated_at: string;
}

// アプリケーション用のEntry型
export interface Entry {
  id: number;
  projectId: number | null;
  startTime: string;
  endTime: string | null;
  confidence: number;
  aiReasoning: string | null;
  subtask: string | null;
  isManual: boolean;
  isWork: boolean;
  createdAt: string;
  updatedAt: string;
}

// プロジェクト情報付きエントリー
export interface EntryWithProject extends Entry {
  projectName: string | null;
  projectColor: string | null;
}

// DBの行データをEntryオブジェクトに変換
function rowToEntry(row: DbEntry): Entry {
  return {
    id: row.id,
    projectId: row.project_id,
    startTime: row.start_time,
    endTime: row.end_time,
    confidence: row.confidence,
    aiReasoning: row.ai_reasoning,
    subtask: row.subtask,
    isManual: row.is_manual === 1,
    isWork: row.is_work === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// プロジェクト情報付きの行データ
interface DbEntryWithProject extends DbEntry {
  project_name: string | null;
  project_color: string | null;
}

function rowToEntryWithProject(row: DbEntryWithProject): EntryWithProject {
  return {
    ...rowToEntry(row),
    projectName: row.project_name,
    projectColor: row.project_color,
  };
}

export class EntryRepository {
  /**
   * 日付範囲でエントリーを取得
   */
  findByDateRange(
    startDate: string,
    endDate: string,
    options?: {
      projectId?: number;
      includeNonWork?: boolean;
    }
  ): EntryWithProject[] {
    const db = getDatabase();
    let query = `
      SELECT e.*, p.name as project_name, p.color as project_color
      FROM entries e
      LEFT JOIN projects p ON e.project_id = p.id
      WHERE e.start_time >= ? AND e.start_time < ?
    `;
    const params: (string | number)[] = [startDate, endDate];

    if (options?.projectId !== undefined) {
      query += ' AND e.project_id = ?';
      params.push(options.projectId);
    }

    if (!options?.includeNonWork) {
      query += ' AND e.is_work = 1';
    }

    query += ' ORDER BY e.start_time DESC';

    const rows = db.prepare(query).all(...params) as DbEntryWithProject[];
    return rows.map(rowToEntryWithProject);
  }

  /**
   * 今日のエントリーを取得
   */
  findToday(): EntryWithProject[] {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

    return this.findByDateRange(
      startOfDay.toISOString(),
      endOfDay.toISOString(),
      { includeNonWork: true }
    );
  }

  /**
   * 現在進行中のエントリーを取得（end_timeがnull）
   */
  findCurrent(): EntryWithProject | null {
    const db = getDatabase();
    const row = db.prepare(`
      SELECT e.*, p.name as project_name, p.color as project_color
      FROM entries e
      LEFT JOIN projects p ON e.project_id = p.id
      WHERE e.end_time IS NULL
      ORDER BY e.start_time DESC
      LIMIT 1
    `).get() as DbEntryWithProject | undefined;

    return row ? rowToEntryWithProject(row) : null;
  }

  /**
   * IDでエントリーを取得
   */
  findById(id: number): Entry | null {
    const db = getDatabase();
    const row = db.prepare('SELECT * FROM entries WHERE id = ?').get(id) as DbEntry | undefined;
    return row ? rowToEntry(row) : null;
  }

  /**
   * エントリーを作成
   */
  create(data: {
    projectId?: number;
    startTime: string;
    endTime?: string;
    confidence?: number;
    aiReasoning?: string;
    subtask?: string;
    isManual?: boolean;
    isWork?: boolean;
  }): Entry {
    const db = getDatabase();
    const now = new Date().toISOString();

    const result = db.prepare(`
      INSERT INTO entries (
        project_id, start_time, end_time, confidence, ai_reasoning,
        subtask, is_manual, is_work, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      data.projectId ?? null,
      data.startTime,
      data.endTime ?? null,
      data.confidence ?? 0,
      data.aiReasoning ?? null,
      data.subtask ?? null,
      (data.isManual ?? false) ? 1 : 0,
      (data.isWork ?? true) ? 1 : 0,
      now,
      now
    );

    return this.findById(result.lastInsertRowid as number)!;
  }

  /**
   * エントリーを更新
   */
  update(
    id: number,
    data: {
      projectId?: number | null;
      startTime?: string;
      endTime?: string | null;
      confidence?: number;
      aiReasoning?: string | null;
      subtask?: string | null;
      isManual?: boolean;
      isWork?: boolean;
    }
  ): Entry | null {
    const db = getDatabase();
    const existing = this.findById(id);
    if (!existing) return null;

    const updates: string[] = [];
    const values: (string | number | null)[] = [];

    if (data.projectId !== undefined) {
      updates.push('project_id = ?');
      values.push(data.projectId);
    }
    if (data.startTime !== undefined) {
      updates.push('start_time = ?');
      values.push(data.startTime);
    }
    if (data.endTime !== undefined) {
      updates.push('end_time = ?');
      values.push(data.endTime);
    }
    if (data.confidence !== undefined) {
      updates.push('confidence = ?');
      values.push(data.confidence);
    }
    if (data.aiReasoning !== undefined) {
      updates.push('ai_reasoning = ?');
      values.push(data.aiReasoning);
    }
    if (data.subtask !== undefined) {
      updates.push('subtask = ?');
      values.push(data.subtask);
    }
    if (data.isManual !== undefined) {
      updates.push('is_manual = ?');
      values.push(data.isManual ? 1 : 0);
    }
    if (data.isWork !== undefined) {
      updates.push('is_work = ?');
      values.push(data.isWork ? 1 : 0);
    }

    if (updates.length === 0) return existing;

    values.push(id);
    db.prepare(`UPDATE entries SET ${updates.join(', ')} WHERE id = ?`).run(...values);

    return this.findById(id);
  }

  /**
   * エントリーを削除
   */
  delete(id: number): boolean {
    const db = getDatabase();
    const result = db.prepare('DELETE FROM entries WHERE id = ?').run(id);
    return result.changes > 0;
  }

  /**
   * エントリーを終了（end_timeを設定）
   */
  endEntry(id: number, endTime?: string): Entry | null {
    return this.update(id, { endTime: endTime ?? new Date().toISOString() });
  }

  /**
   * エントリーを分割
   */
  split(id: number, splitTime: string): { before: Entry; after: Entry } | null {
    const db = getDatabase();
    const existing = this.findById(id);
    if (!existing) return null;

    // トランザクションで処理
    const transaction = db.transaction(() => {
      // 元のエントリーを更新（splitTimeで終了）
      this.update(id, { endTime: splitTime });

      // 新しいエントリーを作成（splitTimeから開始）
      const newEntry = this.create({
        projectId: existing.projectId ?? undefined,
        startTime: splitTime,
        endTime: existing.endTime ?? undefined,
        confidence: existing.confidence,
        subtask: existing.subtask ?? undefined,
        isWork: existing.isWork,
      });

      return {
        before: this.findById(id)!,
        after: newEntry,
      };
    });

    return transaction();
  }

  /**
   * エントリーをマージ
   */
  merge(entryIds: number[], projectId?: number): Entry | null {
    if (entryIds.length < 2) return null;

    const db = getDatabase();
    const entries = entryIds
      .map((id) => this.findById(id))
      .filter((e): e is Entry => e !== null)
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

    if (entries.length < 2) return null;

    const transaction = db.transaction(() => {
      const firstEntry = entries[0];
      const lastEntry = entries[entries.length - 1];

      // 最初のエントリーを更新
      this.update(firstEntry.id, {
        projectId: projectId ?? firstEntry.projectId,
        endTime: lastEntry.endTime,
      });

      // 他のエントリーを削除
      for (let i = 1; i < entries.length; i++) {
        this.delete(entries[i].id);
      }

      return this.findById(firstEntry.id);
    });

    return transaction();
  }

  /**
   * プロジェクト別の合計時間を取得
   */
  getTotalHoursByProject(
    startDate: string,
    endDate: string
  ): { projectId: number | null; projectName: string; totalHours: number }[] {
    const db = getDatabase();
    const rows = db.prepare(`
      SELECT 
        e.project_id,
        COALESCE(p.name, '未分類') as project_name,
        SUM(
          (julianday(COALESCE(e.end_time, datetime('now'))) - julianday(e.start_time)) * 24
        ) as total_hours
      FROM entries e
      LEFT JOIN projects p ON e.project_id = p.id
      WHERE e.start_time >= ? AND e.start_time < ? AND e.is_work = 1
      GROUP BY e.project_id
      ORDER BY total_hours DESC
    `).all(startDate, endDate) as {
      project_id: number | null;
      project_name: string;
      total_hours: number;
    }[];

    return rows.map((row) => ({
      projectId: row.project_id,
      projectName: row.project_name,
      totalHours: row.total_hours,
    }));
  }

  /**
   * 今日の合計作業時間を取得
   */
  getTodayTotalHours(): number {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

    const db = getDatabase();
    const result = db.prepare(`
      SELECT SUM(
        (julianday(COALESCE(end_time, datetime('now'))) - julianday(start_time)) * 24
      ) as total_hours
      FROM entries
      WHERE start_time >= ? AND start_time < ? AND is_work = 1
    `).get(startOfDay.toISOString(), endOfDay.toISOString()) as { total_hours: number | null };

    return result.total_hours ?? 0;
  }
}

// シングルトンインスタンス
export const entryRepository = new EntryRepository();

