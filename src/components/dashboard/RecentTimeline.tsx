import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { EntryWithProject } from '../../../shared/types/api';

interface RecentTimelineProps {
  entries: EntryWithProject[];
  currentEntryId?: number | null;
}

function formatTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
}

function formatDuration(startTime: string, endTime: string | null): string {
  const start = new Date(startTime);
  const end = endTime ? new Date(endTime) : new Date();
  const diffMs = end.getTime() - start.getTime();
  const diffMinutes = Math.round(diffMs / 60000);

  if (diffMinutes < 60) {
    return `${diffMinutes}分`;
  }
  const hours = Math.floor(diffMinutes / 60);
  const minutes = diffMinutes % 60;
  return `${hours}時間${minutes > 0 ? `${minutes}分` : ''}`;
}

function getConfidenceBadge(confidence: number, isManual: boolean) {
  if (isManual) {
    return <Badge variant="secondary">手動</Badge>;
  }
  if (confidence >= 85) {
    return <Badge variant="success">{confidence}%</Badge>;
  } else if (confidence >= 50) {
    return <Badge variant="warning">{confidence}%</Badge>;
  } else {
    return <Badge variant="destructive">{confidence}%</Badge>;
  }
}

export function RecentTimeline({ entries, currentEntryId }: RecentTimelineProps) {
  if (entries.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            今日のタイムライン
          </CardTitle>
          <CardDescription>今日の作業記録</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-text-secondary">
            <Clock className="h-12 w-12 opacity-30 mb-4" />
            <p>まだ今日のエントリーがありません</p>
            <p className="text-sm mt-1">トラッキングを開始して作業を記録しましょう</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              今日のタイムライン
            </CardTitle>
            <CardDescription>{entries.length}件のエントリー</CardDescription>
          </div>
          <Link
            to="/timeline"
            className="text-sm text-primary hover:text-primary/80 flex items-center gap-1"
          >
            すべて表示
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {entries.slice(0, 5).map((entry) => {
            const isCurrent = entry.id === currentEntryId;
            const projectColor = entry.projectColor ?? '#E5C890';

            return (
              <div
                key={entry.id}
                className={`flex items-center gap-4 p-3 rounded-lg transition-colors ${
                  isCurrent ? 'bg-primary/10 border border-primary/30' : 'bg-background hover:bg-surface'
                }`}
              >
                {/* カラーバー */}
                <div
                  className="w-1 h-12 rounded-full"
                  style={{ backgroundColor: projectColor }}
                />

                {/* コンテンツ */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-white truncate">
                      {entry.projectName ?? '未分類'}
                    </span>
                    {isCurrent && <Badge variant="success">進行中</Badge>}
                  </div>
                  <p className="text-sm text-text-secondary mt-1">
                    {formatTime(entry.startTime)} - {entry.endTime ? formatTime(entry.endTime) : '現在'}{' '}
                    • {formatDuration(entry.startTime, entry.endTime)}
                  </p>
                  {entry.subtask && (
                    <p className="text-sm text-text-secondary truncate mt-0.5">{entry.subtask}</p>
                  )}
                </div>

                {/* 信頼度バッジ */}
                {getConfidenceBadge(entry.confidence, entry.isManual)}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

