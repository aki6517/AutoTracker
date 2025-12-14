import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MoreVertical, Pencil, Trash2, Archive, RotateCcw, Settings, Clock, Sparkles } from 'lucide-react';
import type { Project } from '../../../shared/types/api';

interface ProjectCardProps {
  project: Project;
  onEdit: (project: Project) => void;
  onDelete: (project: Project) => void;
  onArchive: (project: Project) => void;
  onManageRules: (project: Project) => void;
}

export function ProjectCard({
  project,
  onEdit,
  onDelete,
  onArchive,
  onManageRules,
}: ProjectCardProps) {
  const [activeMenu, setActiveMenu] = useState(false);
  const [monthlyHours, setMonthlyHours] = useState(0);

  // 今月の作業時間を取得
  useEffect(() => {
    const fetchMonthlyHours = async () => {
      try {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

        const entries = await window.electronAPI.entries.getByDateRange({
          startDate: startOfMonth.toISOString(),
          endDate: endOfMonth.toISOString(),
          projectId: parseInt(project.id, 10),
        });

        const totalMinutes = entries.reduce((acc, entry) => {
          const start = new Date(entry.startTime);
          const end = entry.endTime ? new Date(entry.endTime) : new Date();
          return acc + (end.getTime() - start.getTime()) / 60000;
        }, 0);

        setMonthlyHours(totalMinutes / 60);
      } catch (error) {
        console.error('Failed to fetch monthly hours:', error);
      }
    };

    fetchMonthlyHours();
  }, [project.id]);

  // 予算進捗率
  const budgetProgress = project.budgetHours
    ? Math.min(100, (monthlyHours / project.budgetHours) * 100)
    : 0;

  // 予算進捗の色
  const getProgressColor = () => {
    if (budgetProgress >= 100) return 'bg-red-500';
    if (budgetProgress >= 80) return 'bg-yellow-500';
    return 'bg-primary';
  };

  return (
    <Card className={project.isArchived ? 'opacity-60' : ''}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: project.color }}
            />
            <div>
              <CardTitle className="text-lg">{project.name}</CardTitle>
              {project.clientName && (
                <p className="text-sm text-text-secondary mt-0.5">
                  {project.clientName}
                </p>
              )}
            </div>
          </div>
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setActiveMenu(!activeMenu)}
            >
              <MoreVertical size={18} />
            </Button>
            {activeMenu && (
              <>
                {/* オーバーレイ */}
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setActiveMenu(false)}
                />
                {/* メニュー */}
                <div className="absolute right-0 top-10 z-20 bg-surface border border-gray-700 rounded-lg shadow-lg py-1 min-w-[160px]">
                  <button
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-800 flex items-center gap-2"
                    onClick={() => {
                      onEdit(project);
                      setActiveMenu(false);
                    }}
                  >
                    <Pencil size={16} />
                    編集
                  </button>
                  <button
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-800 flex items-center gap-2"
                    onClick={() => {
                      onManageRules(project);
                      setActiveMenu(false);
                    }}
                  >
                    <Settings size={16} />
                    ルール設定
                  </button>
                  <button
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-800 flex items-center gap-2 text-amber-400"
                    onClick={async () => {
                      const result = await window.electronAPI.projects.generateRules(project.id);
                      alert(`${result.createdCount}件のルールを自動生成: ${result.keywords.join(', ')}`);
                      setActiveMenu(false);
                    }}
                  >
                    <Sparkles size={16} />
                    自動ルール生成
                  </button>
                  <button
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-800 flex items-center gap-2"
                    onClick={() => {
                      onArchive(project);
                      setActiveMenu(false);
                    }}
                  >
                    {project.isArchived ? (
                      <>
                        <RotateCcw size={16} />
                        復元
                      </>
                    ) : (
                      <>
                        <Archive size={16} />
                        アーカイブ
                      </>
                    )}
                  </button>
                  <button
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-800 flex items-center gap-2 text-red-400"
                    onClick={() => {
                      onDelete(project);
                      setActiveMenu(false);
                    }}
                  >
                    <Trash2 size={16} />
                    削除
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 今月の作業時間 */}
        <div className="flex items-center gap-2 text-sm">
          <Clock size={14} className="text-text-secondary" />
          <span className="text-text-secondary">今月:</span>
          <span className="text-white font-medium">
            {monthlyHours.toFixed(1)}h
          </span>
          {project.budgetHours && (
            <span className="text-text-secondary">
              / {project.budgetHours}h
            </span>
          )}
        </div>

        {/* 予算進捗バー */}
        {project.budgetHours && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-text-secondary">
              <span>予算進捗</span>
              <span>{Math.round(budgetProgress)}%</span>
            </div>
            <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full ${getProgressColor()} transition-all duration-300`}
                style={{ width: `${budgetProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* バッジ */}
        <div className="flex flex-wrap gap-2">
          {project.isArchived && <Badge variant="secondary">アーカイブ</Badge>}
          {project.hourlyRate && (
            <Badge variant="outline">¥{project.hourlyRate.toLocaleString()}/h</Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}


