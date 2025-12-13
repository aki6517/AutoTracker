import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, FolderKanban, DollarSign, Zap } from 'lucide-react';

interface TodayStatsProps {
  totalHours: number;
  billableHours: number;
  projectCount: number;
  aiAccuracy: number;
}

function formatHours(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (h > 0) {
    return `${h}h ${m}m`;
  }
  return `${m}m`;
}

export function TodayStats({
  totalHours,
  billableHours,
  projectCount,
  aiAccuracy,
}: TodayStatsProps) {
  const stats = [
    {
      title: '今日の作業時間',
      value: formatHours(totalHours),
      icon: Clock,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      title: '請求可能時間',
      value: formatHours(billableHours),
      icon: DollarSign,
      color: 'text-green-400',
      bgColor: 'bg-green-400/10',
    },
    {
      title: 'プロジェクト数',
      value: projectCount.toString(),
      icon: FolderKanban,
      color: 'text-blue-400',
      bgColor: 'bg-blue-400/10',
    },
    {
      title: 'AI判定精度',
      value: `${aiAccuracy}%`,
      icon: Zap,
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-400/10',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card key={stat.title}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-text-secondary flex items-center gap-2">
                <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                  <Icon className={`h-4 w-4 ${stat.color}`} />
                </div>
                {stat.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{stat.value}</div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

