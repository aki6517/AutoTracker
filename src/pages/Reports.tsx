import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DateNavigator } from '@/components/timeline/DateNavigator';
import { Clock, DollarSign, FolderKanban, FileText } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import type { DailyReport, ProjectBreakdown } from '../../shared/types/api';

function formatHours(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (h > 0 && m > 0) {
    return `${h}h ${m}m`;
  }
  if (h > 0) {
    return `${h}h`;
  }
  return `${m}m`;
}

function Reports() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [report, setReport] = useState<DailyReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // レポートを取得
  const fetchReport = useCallback(async () => {
    setIsLoading(true);
    try {
      const dateStr = currentDate.toISOString().split('T')[0];
      const result = await window.api.reports.generateDaily({ date: dateStr });
      setReport(result);
    } catch (error) {
      console.error('Error fetching report:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentDate]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  // 円グラフ用データ
  const chartData = report?.projectBreakdown.map((p) => ({
    name: p.projectName,
    value: p.hours,
    color: p.projectColor,
  })) ?? [];

  return (
    <div className="p-6 space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">日次レポート</h1>
          <p className="text-text-secondary mt-1">作業時間と売上の確認</p>
        </div>
      </div>

      {/* 日付ナビゲーション */}
      <DateNavigator currentDate={currentDate} onDateChange={setCurrentDate} />

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : report ? (
        <>
          {/* サマリーカード */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-text-secondary flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Clock className="h-4 w-4 text-primary" />
                  </div>
                  総稼働時間
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-white">
                  {formatHours(report.totalHours)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-text-secondary flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-green-400/10">
                    <DollarSign className="h-4 w-4 text-green-400" />
                  </div>
                  売上
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-white">
                  ¥{report.totalRevenue.toLocaleString()}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-text-secondary flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-blue-400/10">
                    <FolderKanban className="h-4 w-4 text-blue-400" />
                  </div>
                  プロジェクト数
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-white">
                  {report.projectBreakdown.length}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* プロジェクト別内訳 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 円グラフ */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  プロジェクト比率
                </CardTitle>
              </CardHeader>
              <CardContent>
                {chartData.length > 0 ? (
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={chartData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: number) => formatHours(value)}
                          contentStyle={{
                            backgroundColor: '#1A1A1A',
                            border: '1px solid #333',
                            borderRadius: '8px',
                          }}
                        />
                        <Legend
                          formatter={(value) => (
                            <span className="text-text-secondary">{value}</span>
                          )}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-text-secondary">
                    データがありません
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 内訳リスト */}
            <Card>
              <CardHeader>
                <CardTitle>プロジェクト別内訳</CardTitle>
              </CardHeader>
              <CardContent>
                {report.projectBreakdown.length > 0 ? (
                  <div className="space-y-4">
                    {report.projectBreakdown.map((project: ProjectBreakdown) => (
                      <div key={project.projectId ?? 'unassigned'} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: project.projectColor }}
                            />
                            <span className="font-medium text-white">
                              {project.projectName}
                            </span>
                          </div>
                          <div className="text-right">
                            <div className="text-white font-medium">
                              {formatHours(project.hours)}
                            </div>
                            {project.revenue > 0 && (
                              <div className="text-sm text-green-400">
                                ¥{project.revenue.toLocaleString()}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className="h-full transition-all duration-300"
                            style={{
                              width: `${project.percentage}%`,
                              backgroundColor: project.projectColor,
                            }}
                          />
                        </div>
                        <div className="text-xs text-text-secondary text-right">
                          {project.percentage.toFixed(1)}%
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center py-8 text-text-secondary">
                    この日の作業記録がありません
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      ) : (
        <Card>
          <CardContent className="flex items-center justify-center py-12 text-text-secondary">
            レポートの取得に失敗しました
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default Reports;

