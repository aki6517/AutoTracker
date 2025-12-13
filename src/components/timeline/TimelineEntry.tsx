import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Edit2, Trash2, Scissors } from 'lucide-react';
import type { EntryWithProject } from '../../../shared/types/api';

interface TimelineEntryProps {
  entry: EntryWithProject;
  isCurrent: boolean;
  onEdit: (entry: EntryWithProject) => void;
  onDelete: (entry: EntryWithProject) => void;
  onSplit: (entry: EntryWithProject) => void;
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

export function TimelineEntry({
  entry,
  isCurrent,
  onEdit,
  onDelete,
  onSplit,
}: TimelineEntryProps) {
  const projectColor = entry.projectColor ?? '#E5C890';
  const duration = formatDuration(entry.startTime, entry.endTime);

  return (
    <div
      className={`group flex items-stretch gap-4 p-4 rounded-lg transition-all ${
        isCurrent
          ? 'bg-primary/10 border border-primary/30'
          : 'bg-surface hover:bg-surface/80'
      }`}
    >
      {/* タイムラインバー */}
      <div className="flex flex-col items-center">
        <div
          className="w-3 h-3 rounded-full border-2"
          style={{ borderColor: projectColor, backgroundColor: isCurrent ? projectColor : 'transparent' }}
        />
        <div className="w-0.5 flex-1 bg-gray-700 my-1" />
      </div>

      {/* 時間表示 */}
      <div className="w-24 flex-shrink-0">
        <div className="text-sm font-medium text-white">
          {formatTime(entry.startTime)}
        </div>
        <div className="text-sm text-text-secondary">
          {entry.endTime ? formatTime(entry.endTime) : '進行中'}
        </div>
        <div className="text-xs text-text-secondary mt-1">{duration}</div>
      </div>

      {/* コンテンツ */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: projectColor }}
          />
          <span className="font-medium text-white truncate">
            {entry.projectName ?? '未分類'}
          </span>
          {isCurrent && <Badge variant="success">進行中</Badge>}
          {getConfidenceBadge(entry.confidence, entry.isManual)}
        </div>

        {entry.subtask && (
          <p className="text-sm text-text-secondary truncate">{entry.subtask}</p>
        )}

        {entry.aiReasoning && (
          <p className="text-xs text-text-secondary/70 mt-1 truncate">
            AI: {entry.aiReasoning}
          </p>
        )}
      </div>

      {/* アクションボタン */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onEdit(entry)}
          title="編集"
        >
          <Edit2 className="h-4 w-4" />
        </Button>
        {entry.endTime && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onSplit(entry)}
            title="分割"
          >
            <Scissors className="h-4 w-4" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onDelete(entry)}
          title="削除"
          className="text-red-400 hover:text-red-300"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

