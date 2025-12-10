import { useLocation } from 'react-router-dom';
import { Play, Pause, Clock } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';

function Header() {
  const location = useLocation();
  const [isTracking, setIsTracking] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);

  // ページタイトルを取得
  const getPageTitle = () => {
    switch (location.pathname) {
      case '/':
      case '/dashboard':
        return 'ダッシュボード';
      case '/timeline':
        return 'タイムライン';
      case '/projects':
        return 'プロジェクト';
      case '/reports':
        return 'レポート';
      case '/settings':
        return '設定';
      default:
        return 'AutoTracker';
    }
  };

  // 経過時間のフォーマット
  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // トラッキング中はタイマーを更新
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (isTracking) {
      interval = setInterval(() => {
        setElapsedTime((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTracking]);

  const handleToggleTracking = () => {
    if (isTracking) {
      setIsTracking(false);
    } else {
      setIsTracking(true);
      setElapsedTime(0);
    }
  };

  return (
    <header className="h-16 bg-surface border-b border-gray-800 flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        <h2 className="text-lg font-semibold text-white">{getPageTitle()}</h2>
      </div>
      <div className="flex items-center gap-4">
        {isTracking && (
          <div className="flex items-center gap-2 text-primary">
            <Clock size={18} className="animate-pulse" />
            <span className="font-mono text-lg">{formatTime(elapsedTime)}</span>
          </div>
        )}
        <Button
          onClick={handleToggleTracking}
          variant={isTracking ? 'destructive' : 'default'}
          className="gap-2"
        >
          {isTracking ? (
            <>
              <Pause size={18} />
              停止
            </>
          ) : (
            <>
              <Play size={18} />
              トラッキング開始
            </>
          )}
        </Button>
      </div>
    </header>
  );
}

export default Header;

