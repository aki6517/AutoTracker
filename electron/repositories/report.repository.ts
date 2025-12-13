import { getDatabase } from '../database/index.js';

export interface DailySummary {
  date: string;
  totalHours: number;
  billableHours: number;
  totalRevenue: number;
  entryCount: number;
  projectCount: number;
}

export interface ProjectBreakdown {
  projectId: number | null;
  projectName: string;
  projectColor: string;
  hours: number;
  percentage: number;
  revenue: number;
  entryCount: number;
}

export interface DailyReport {
  date: string;
  summary: DailySummary;
  projectBreakdown: ProjectBreakdown[];
}

export class ReportRepository {
  /**
   * 日次サマリーを取得
   */
  getDailySummary(date: string): DailySummary {
    const db = getDatabase();
    const startOfDay = `${date}T00:00:00.000Z`;
    const endOfDay = `${date}T23:59:59.999Z`;

    const result = db.prepare(`
      SELECT 
        COUNT(*) as entry_count,
        COUNT(DISTINCT e.project_id) as project_count,
        COALESCE(SUM(
          (julianday(COALESCE(e.end_time, datetime('now'))) - julianday(e.start_time)) * 24
        ), 0) as total_hours,
        COALESCE(SUM(
          CASE WHEN e.project_id IS NOT NULL THEN
            (julianday(COALESCE(e.end_time, datetime('now'))) - julianday(e.start_time)) * 24
          ELSE 0 END
        ), 0) as billable_hours,
        COALESCE(SUM(
          CASE WHEN e.project_id IS NOT NULL AND p.hourly_rate IS NOT NULL THEN
            (julianday(COALESCE(e.end_time, datetime('now'))) - julianday(e.start_time)) * 24 * p.hourly_rate
          ELSE 0 END
        ), 0) as total_revenue
      FROM entries e
      LEFT JOIN projects p ON e.project_id = p.id
      WHERE e.start_time >= ? AND e.start_time <= ? AND e.is_work = 1
    `).get(startOfDay, endOfDay) as {
      entry_count: number;
      project_count: number;
      total_hours: number;
      billable_hours: number;
      total_revenue: number;
    };

    return {
      date,
      totalHours: result.total_hours,
      billableHours: result.billable_hours,
      totalRevenue: result.total_revenue,
      entryCount: result.entry_count,
      projectCount: result.project_count,
    };
  }

  /**
   * プロジェクト別内訳を取得
   */
  getProjectBreakdown(date: string): ProjectBreakdown[] {
    const db = getDatabase();
    const startOfDay = `${date}T00:00:00.000Z`;
    const endOfDay = `${date}T23:59:59.999Z`;

    const rows = db.prepare(`
      SELECT 
        e.project_id,
        COALESCE(p.name, '未分類') as project_name,
        COALESCE(p.color, '#808080') as project_color,
        COALESCE(p.hourly_rate, 0) as hourly_rate,
        COUNT(*) as entry_count,
        COALESCE(SUM(
          (julianday(COALESCE(e.end_time, datetime('now'))) - julianday(e.start_time)) * 24
        ), 0) as hours
      FROM entries e
      LEFT JOIN projects p ON e.project_id = p.id
      WHERE e.start_time >= ? AND e.start_time <= ? AND e.is_work = 1
      GROUP BY e.project_id
      ORDER BY hours DESC
    `).all(startOfDay, endOfDay) as {
      project_id: number | null;
      project_name: string;
      project_color: string;
      hourly_rate: number;
      entry_count: number;
      hours: number;
    }[];

    // 合計時間を計算
    const totalHours = rows.reduce((sum, row) => sum + row.hours, 0);

    return rows.map((row) => ({
      projectId: row.project_id,
      projectName: row.project_name,
      projectColor: row.project_color,
      hours: row.hours,
      percentage: totalHours > 0 ? (row.hours / totalHours) * 100 : 0,
      revenue: row.hours * row.hourly_rate,
      entryCount: row.entry_count,
    }));
  }

  /**
   * 日次レポートを生成
   */
  generateDailyReport(date: string): DailyReport {
    return {
      date,
      summary: this.getDailySummary(date),
      projectBreakdown: this.getProjectBreakdown(date),
    };
  }

  /**
   * 期間別集計を取得
   */
  getAggregatedReport(startDate: string, endDate: string): {
    totalHours: number;
    billableHours: number;
    totalRevenue: number;
    projectBreakdown: ProjectBreakdown[];
  } {
    const db = getDatabase();
    const startOfPeriod = `${startDate}T00:00:00.000Z`;
    const endOfPeriod = `${endDate}T23:59:59.999Z`;

    // サマリー
    const summary = db.prepare(`
      SELECT 
        COALESCE(SUM(
          (julianday(COALESCE(e.end_time, datetime('now'))) - julianday(e.start_time)) * 24
        ), 0) as total_hours,
        COALESCE(SUM(
          CASE WHEN e.project_id IS NOT NULL THEN
            (julianday(COALESCE(e.end_time, datetime('now'))) - julianday(e.start_time)) * 24
          ELSE 0 END
        ), 0) as billable_hours,
        COALESCE(SUM(
          CASE WHEN e.project_id IS NOT NULL AND p.hourly_rate IS NOT NULL THEN
            (julianday(COALESCE(e.end_time, datetime('now'))) - julianday(e.start_time)) * 24 * p.hourly_rate
          ELSE 0 END
        ), 0) as total_revenue
      FROM entries e
      LEFT JOIN projects p ON e.project_id = p.id
      WHERE e.start_time >= ? AND e.start_time <= ? AND e.is_work = 1
    `).get(startOfPeriod, endOfPeriod) as {
      total_hours: number;
      billable_hours: number;
      total_revenue: number;
    };

    // プロジェクト別
    const rows = db.prepare(`
      SELECT 
        e.project_id,
        COALESCE(p.name, '未分類') as project_name,
        COALESCE(p.color, '#808080') as project_color,
        COALESCE(p.hourly_rate, 0) as hourly_rate,
        COUNT(*) as entry_count,
        COALESCE(SUM(
          (julianday(COALESCE(e.end_time, datetime('now'))) - julianday(e.start_time)) * 24
        ), 0) as hours
      FROM entries e
      LEFT JOIN projects p ON e.project_id = p.id
      WHERE e.start_time >= ? AND e.start_time <= ? AND e.is_work = 1
      GROUP BY e.project_id
      ORDER BY hours DESC
    `).all(startOfPeriod, endOfPeriod) as {
      project_id: number | null;
      project_name: string;
      project_color: string;
      hourly_rate: number;
      entry_count: number;
      hours: number;
    }[];

    const totalHours = rows.reduce((sum, row) => sum + row.hours, 0);

    return {
      totalHours: summary.total_hours,
      billableHours: summary.billable_hours,
      totalRevenue: summary.total_revenue,
      projectBreakdown: rows.map((row) => ({
        projectId: row.project_id,
        projectName: row.project_name,
        projectColor: row.project_color,
        hours: row.hours,
        percentage: totalHours > 0 ? (row.hours / totalHours) * 100 : 0,
        revenue: row.hours * row.hourly_rate,
        entryCount: row.entry_count,
      })),
    };
  }
}

// シングルトンインスタンス
export const reportRepository = new ReportRepository();


