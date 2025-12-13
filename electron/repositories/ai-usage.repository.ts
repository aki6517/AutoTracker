import { getDatabase } from '../database/index.js';

export interface AIUsageLog {
  id: number;
  model: string;
  tokensIn: number;
  tokensOut: number;
  cost: number;
  requestType: string | null;
  createdAt: string;
}

export interface DbAIUsageLog {
  id: number;
  model: string;
  tokens_in: number;
  tokens_out: number;
  cost: number;
  request_type: string | null;
  created_at: string;
}

export interface MonthlyUsage {
  month: string;
  totalTokensIn: number;
  totalTokensOut: number;
  totalCost: number;
  requestCount: number;
  byModel: {
    model: string;
    tokensIn: number;
    tokensOut: number;
    cost: number;
    requestCount: number;
  }[];
}

// DBの行データをAIUsageLogオブジェクトに変換
function rowToAIUsageLog(row: DbAIUsageLog): AIUsageLog {
  return {
    id: row.id,
    model: row.model,
    tokensIn: row.tokens_in,
    tokensOut: row.tokens_out,
    cost: row.cost,
    requestType: row.request_type,
    createdAt: row.created_at,
  };
}

export class AIUsageRepository {
  /**
   * 使用ログを記録
   */
  create(data: {
    model: string;
    tokensIn: number;
    tokensOut: number;
    cost: number;
    requestType?: string;
  }): AIUsageLog {
    const db = getDatabase();
    const now = new Date().toISOString();

    const result = db
      .prepare(
        `INSERT INTO ai_usage_logs (model, tokens_in, tokens_out, cost, request_type, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(
        data.model,
        data.tokensIn,
        data.tokensOut,
        data.cost,
        data.requestType ?? null,
        now
      );

    const inserted = db
      .prepare('SELECT * FROM ai_usage_logs WHERE id = ?')
      .get(result.lastInsertRowid) as DbAIUsageLog;

    return rowToAIUsageLog(inserted);
  }

  /**
   * 月別使用状況を取得
   */
  getMonthlyUsage(yearMonth?: string): MonthlyUsage {
    const db = getDatabase();
    const targetMonth = yearMonth ?? this.getCurrentYearMonth();
    const startOfMonth = `${targetMonth}-01T00:00:00.000Z`;
    const endOfMonth = this.getEndOfMonth(targetMonth);

    // 全体集計
    const total = db
      .prepare(
        `SELECT 
        COUNT(*) as request_count,
        COALESCE(SUM(tokens_in), 0) as total_tokens_in,
        COALESCE(SUM(tokens_out), 0) as total_tokens_out,
        COALESCE(SUM(cost), 0) as total_cost
       FROM ai_usage_logs 
       WHERE created_at >= ? AND created_at < ?`
      )
      .get(startOfMonth, endOfMonth) as {
      request_count: number;
      total_tokens_in: number;
      total_tokens_out: number;
      total_cost: number;
    };

    // モデル別集計
    const byModel = db
      .prepare(
        `SELECT 
        model,
        COUNT(*) as request_count,
        COALESCE(SUM(tokens_in), 0) as tokens_in,
        COALESCE(SUM(tokens_out), 0) as tokens_out,
        COALESCE(SUM(cost), 0) as cost
       FROM ai_usage_logs 
       WHERE created_at >= ? AND created_at < ?
       GROUP BY model
       ORDER BY cost DESC`
      )
      .all(startOfMonth, endOfMonth) as {
      model: string;
      request_count: number;
      tokens_in: number;
      tokens_out: number;
      cost: number;
    }[];

    return {
      month: targetMonth,
      totalTokensIn: total.total_tokens_in,
      totalTokensOut: total.total_tokens_out,
      totalCost: total.total_cost,
      requestCount: total.request_count,
      byModel: byModel.map((row) => ({
        model: row.model,
        tokensIn: row.tokens_in,
        tokensOut: row.tokens_out,
        cost: row.cost,
        requestCount: row.request_count,
      })),
    };
  }

  /**
   * 今月のコストが予算内かチェック
   */
  isWithinBudget(monthlyBudget: number): boolean {
    const usage = this.getMonthlyUsage();
    return usage.totalCost < monthlyBudget;
  }

  /**
   * 今月の残り予算を取得
   */
  getRemainingBudget(monthlyBudget: number): number {
    const usage = this.getMonthlyUsage();
    return Math.max(0, monthlyBudget - usage.totalCost);
  }

  /**
   * 予算ステータスを取得
   */
  getBudgetStatus(monthlyBudget: number): {
    monthlyBudget: number;
    currentUsage: number;
    remaining: number;
    percentUsed: number;
    isOverBudget: boolean;
  } {
    const usage = this.getMonthlyUsage();
    return {
      monthlyBudget,
      currentUsage: usage.totalCost,
      remaining: Math.max(0, monthlyBudget - usage.totalCost),
      percentUsed: monthlyBudget > 0 ? (usage.totalCost / monthlyBudget) * 100 : 0,
      isOverBudget: usage.totalCost >= monthlyBudget,
    };
  }

  /**
   * 日別使用状況を取得
   */
  getDailyUsage(date: string): {
    date: string;
    tokensIn: number;
    tokensOut: number;
    cost: number;
    requestCount: number;
  } {
    const db = getDatabase();
    const startOfDay = `${date}T00:00:00.000Z`;
    const endOfDay = `${date}T23:59:59.999Z`;

    const result = db
      .prepare(
        `SELECT 
        COUNT(*) as request_count,
        COALESCE(SUM(tokens_in), 0) as tokens_in,
        COALESCE(SUM(tokens_out), 0) as tokens_out,
        COALESCE(SUM(cost), 0) as cost
       FROM ai_usage_logs 
       WHERE created_at >= ? AND created_at <= ?`
      )
      .get(startOfDay, endOfDay) as {
      request_count: number;
      tokens_in: number;
      tokens_out: number;
      cost: number;
    };

    return {
      date,
      tokensIn: result.tokens_in,
      tokensOut: result.tokens_out,
      cost: result.cost,
      requestCount: result.request_count,
    };
  }

  /**
   * 古いログを削除（保持期間を超えたもの）
   */
  deleteOldLogs(retentionDays: number): number {
    const db = getDatabase();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
    const cutoff = cutoffDate.toISOString();

    const result = db
      .prepare('DELETE FROM ai_usage_logs WHERE created_at < ?')
      .run(cutoff);
    return result.changes;
  }

  /**
   * 現在の年月を取得（YYYY-MM形式）
   */
  private getCurrentYearMonth(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }

  /**
   * 月末のISO文字列を取得
   */
  private getEndOfMonth(yearMonth: string): string {
    const [year, month] = yearMonth.split('-').map(Number);
    const nextMonth = new Date(year, month, 1);
    return nextMonth.toISOString();
  }
}

// シングルトンインスタンス
export const aiUsageRepository = new AIUsageRepository();

