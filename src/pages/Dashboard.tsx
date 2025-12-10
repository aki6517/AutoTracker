import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, FolderKanban, TrendingUp, Zap } from 'lucide-react';

function Dashboard() {
  const [todayHours, setTodayHours] = useState(0);
  const [projectCount, setProjectCount] = useState(0);

  useEffect(() => {
    // IPC通信のテスト
    if (window.api?.test?.ping) {
      window.api.test
        .ping()
        .then((response: string) => {
          console.log('IPC Test Response:', response);
        })
        .catch((error: unknown) => {
          console.error('IPC Test Error:', error);
        });
    }

    // デモデータ
    setTodayHours(4.5);
    setProjectCount(3);
  }, []);

  const stats = [
    {
      title: '今日の作業時間',
      value: `${todayHours.toFixed(1)}h`,
      icon: Clock,
      change: '+0.5h from yesterday',
      changeType: 'positive' as const,
    },
    {
      title: 'アクティブプロジェクト',
      value: projectCount.toString(),
      icon: FolderKanban,
      change: '3 tasks pending',
      changeType: 'neutral' as const,
    },
    {
      title: '今週の生産性',
      value: '87%',
      icon: TrendingUp,
      change: '+12% from last week',
      changeType: 'positive' as const,
    },
    {
      title: 'AI判定精度',
      value: '94%',
      icon: Zap,
      change: 'High confidence',
      changeType: 'positive' as const,
    },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* ウェルカムセクション */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-2">おかえりなさい 👋</h1>
        <p className="text-text-secondary">今日の作業状況を確認しましょう</p>
      </div>

      {/* 統計カード */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-text-secondary">
                  {stat.title}
                </CardTitle>
                <Icon className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{stat.value}</div>
                <p className="text-xs text-text-secondary mt-1">
                  {stat.changeType === 'positive' && (
                    <span className="text-green-400">{stat.change}</span>
                  )}
                  {stat.changeType === 'neutral' && <span>{stat.change}</span>}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* 現在の作業 */}
      <Card>
        <CardHeader>
          <CardTitle>現在の作業</CardTitle>
          <CardDescription>トラッキングを開始すると、ここに現在の作業が表示されます</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8 text-text-secondary">
            <div className="text-center">
              <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>トラッキングが停止しています</p>
              <p className="text-sm mt-1">右上の「トラッキング開始」ボタンを押して開始してください</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 直近のタイムライン */}
      <Card>
        <CardHeader>
          <CardTitle>今日のタイムライン</CardTitle>
          <CardDescription>今日の作業記録</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* デモデータ */}
            <div className="flex items-center gap-4 p-3 rounded-lg bg-background">
              <div className="w-1 h-12 rounded-full bg-primary" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-white">AutoTracker開発</span>
                  <Badge>進行中</Badge>
                </div>
                <p className="text-sm text-text-secondary mt-1">10:00 - 現在 • 2時間30分</p>
              </div>
              <Badge variant="success">95%</Badge>
            </div>
            <div className="flex items-center gap-4 p-3 rounded-lg bg-background">
              <div className="w-1 h-12 rounded-full bg-secondary" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-white">メールチェック</span>
                </div>
                <p className="text-sm text-text-secondary mt-1">09:30 - 10:00 • 30分</p>
              </div>
              <Badge variant="secondary">手動</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default Dashboard;

