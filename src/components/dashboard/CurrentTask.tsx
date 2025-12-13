import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, Pause, Square, Clock } from 'lucide-react';
import type { TrackingStatus } from '../../../shared/types/api';

interface CurrentTaskProps {
  status: TrackingStatus | null;
  onStart: () => void;
  onStop: () => void;
  onPause: () => void;
  onResume: () => void;
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${minutes}:${String(secs).padStart(2, '0')}`;
}

function getConfidenceBadge(confidence: number) {
  if (confidence >= 85) {
    return <Badge variant="success">{confidence}%</Badge>;
  } else if (confidence >= 50) {
    return <Badge variant="warning">{confidence}%</Badge>;
  } else {
    return <Badge variant="destructive">{confidence}%</Badge>;
  }
}

export function CurrentTask({ status, onStart, onStop, onPause, onResume }: CurrentTaskProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // 経過時間の更新（1秒ごと）
  useEffect(() => {
    if (status?.isRunning && !status.isPaused) {
      setElapsedSeconds(status.elapsedSeconds);

      const interval = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);

      return () => clearInterval(interval);
    } else {
      setElapsedSeconds(status?.elapsedSeconds ?? 0);
    }
  }, [status?.isRunning, status?.isPaused, status?.elapsedSeconds]);

  // トラッキング停止中
  if (!status?.isRunning) {
    return (
      <Card className="border-2 border-dashed border-surface">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            現在の作業
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8">
            <Clock className="h-16 w-16 text-text-secondary opacity-30 mb-4" />
            <p className="text-text-secondary mb-6">トラッキングが停止しています</p>
            <Button onClick={onStart} size="lg" className="gap-2">
              <Play className="h-5 w-5" />
              トラッキング開始
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // トラッキング中
  return (
    <Card className="border-2 border-primary/50 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <div className="relative">
              <Clock className="h-5 w-5 text-primary" />
              {!status.isPaused && (
                <span className="absolute -top-1 -right-1 h-2 w-2 bg-green-500 rounded-full animate-pulse" />
              )}
            </div>
            現在の作業
          </CardTitle>
          {status.isPaused ? (
            <Badge variant="warning">一時停止中</Badge>
          ) : (
            <Badge variant="success">記録中</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* プロジェクト名と経過時間 */}
          <div className="text-center">
            <h3 className="text-2xl font-bold text-white mb-2">
              {status.currentProjectName ?? '未分類'}
            </h3>
            <div className="text-5xl font-mono font-bold text-primary tracking-wider">
              {formatDuration(elapsedSeconds)}
            </div>
            {status.confidence > 0 && (
              <div className="mt-3 flex items-center justify-center gap-2">
                <span className="text-sm text-text-secondary">信頼度:</span>
                {getConfidenceBadge(status.confidence)}
              </div>
            )}
          </div>

          {/* コントロールボタン */}
          <div className="flex items-center justify-center gap-3">
            {status.isPaused ? (
              <Button onClick={onResume} size="lg" className="gap-2">
                <Play className="h-5 w-5" />
                再開
              </Button>
            ) : (
              <Button onClick={onPause} variant="secondary" size="lg" className="gap-2">
                <Pause className="h-5 w-5" />
                一時停止
              </Button>
            )}
            <Button onClick={onStop} variant="outline" size="lg" className="gap-2">
              <Square className="h-5 w-5" />
              停止
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

