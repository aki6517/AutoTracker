import { useEffect, useState, useCallback } from 'react';
import { CurrentTask } from '@/components/dashboard/CurrentTask';
import { TodayStats } from '@/components/dashboard/TodayStats';
import { RecentTimeline } from '@/components/dashboard/RecentTimeline';
import type { TrackingStatus, EntryWithProject } from '../../shared/types/api';

function Dashboard() {
  const [trackingStatus, setTrackingStatus] = useState<TrackingStatus | null>(null);
  const [todayEntries, setTodayEntries] = useState<EntryWithProject[]>([]);
  const [stats, setStats] = useState({
    totalHours: 0,
    billableHours: 0,
    projectCount: 0,
    aiAccuracy: 0,
  });

  // データを取得
  const fetchData = useCallback(async () => {
    try {
      // トラッキングステータス
      const status = await window.electronAPI.tracking.getStatus();
      setTrackingStatus(status);

      // 今日のエントリー
      const entries = await window.electronAPI.entries.getToday();
      setTodayEntries(entries);

      // 統計を計算
      const totalMinutes = entries.reduce((acc, entry) => {
        const start = new Date(entry.startTime);
        const end = entry.endTime ? new Date(entry.endTime) : new Date();
        return acc + (end.getTime() - start.getTime()) / 60000;
      }, 0);

      const totalHours = totalMinutes / 60;
      const billableHours = entries
        .filter((e) => e.isWork && e.projectId)
        .reduce((acc, entry) => {
          const start = new Date(entry.startTime);
          const end = entry.endTime ? new Date(entry.endTime) : new Date();
          return acc + (end.getTime() - start.getTime()) / 3600000;
        }, 0);

      const projectIds = new Set(entries.filter((e) => e.projectId).map((e) => e.projectId));
      const avgConfidence = entries.length > 0
        ? entries.reduce((acc, e) => acc + e.confidence, 0) / entries.length
        : 0;

      setStats({
        totalHours,
        billableHours,
        projectCount: projectIds.size,
        aiAccuracy: Math.round(avgConfidence),
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  }, []);

  // 初回ロード
  useEffect(() => {
    fetchData();

    // 定期更新（30秒ごと）
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // イベントリスナー
  useEffect(() => {
    // エントリー作成時
    const unsubscribeCreated = window.electronAPI.tracking.onEntryCreated((entry) => {
      console.log('Entry created:', entry);
      setTodayEntries((prev) => [entry, ...prev]);
      fetchData();
    });

    // エントリー更新時
    const unsubscribeUpdated = window.electronAPI.tracking.onEntryUpdated((entry) => {
      console.log('Entry updated:', entry);
      setTodayEntries((prev) =>
        prev.map((e) => (e.id === entry.id ? entry : e))
      );
      fetchData();
    });

    return () => {
      unsubscribeCreated();
      unsubscribeUpdated();
    };
  }, [fetchData]);

  // トラッキング制御
  const handleStart = async () => {
    try {
      const result = await window.electronAPI.tracking.start();
      if (result.success) {
        setTrackingStatus(result.status);
        fetchData();
      }
    } catch (error) {
      console.error('Error starting tracking:', error);
    }
  };

  const handleStop = async () => {
    try {
      const result = await window.electronAPI.tracking.stop();
      if (result.success) {
        setTrackingStatus({
          isRunning: false,
          isPaused: false,
          startedAt: null,
          currentEntryId: null,
          currentProjectId: null,
          currentProjectName: null,
          elapsedSeconds: 0,
          confidence: 0,
        });
        fetchData();
      }
    } catch (error) {
      console.error('Error stopping tracking:', error);
    }
  };

  const handlePause = async () => {
    try {
      const result = await window.electronAPI.tracking.pause();
      if (result.success) {
        setTrackingStatus(result.status);
      }
    } catch (error) {
      console.error('Error pausing tracking:', error);
    }
  };

  const handleResume = async () => {
    try {
      const result = await window.electronAPI.tracking.resume();
      if (result.success) {
        setTrackingStatus(result.status);
      }
    } catch (error) {
      console.error('Error resuming tracking:', error);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* ヘッダー */}
      <div>
        <h1 className="text-2xl font-bold text-white">ダッシュボード</h1>
        <p className="text-text-secondary mt-1">今日の作業状況</p>
      </div>

      {/* 今日の統計 */}
      <TodayStats
        totalHours={stats.totalHours}
        billableHours={stats.billableHours}
        projectCount={stats.projectCount}
        aiAccuracy={stats.aiAccuracy}
      />

      {/* 現在の作業 */}
      <CurrentTask
        status={trackingStatus}
        onStart={handleStart}
        onStop={handleStop}
        onPause={handlePause}
        onResume={handleResume}
      />

      {/* 今日のタイムライン */}
      <RecentTimeline
        entries={todayEntries}
        currentEntryId={trackingStatus?.currentEntryId}
      />
    </div>
  );
}

export default Dashboard;
