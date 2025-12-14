import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DateNavigator } from '@/components/timeline/DateNavigator';
import { TimelineEntry } from '@/components/timeline/TimelineEntry';
import { EntryEditModal } from '@/components/timeline/EntryEditModal';
import { Clock, Plus, Filter } from 'lucide-react';
import type { EntryWithProject, Project, TrackingStatus } from '../../shared/types/api';

function Timeline() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [entries, setEntries] = useState<EntryWithProject[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [trackingStatus, setTrackingStatus] = useState<TrackingStatus | null>(null);
  const [editingEntry, setEditingEntry] = useState<EntryWithProject | null>(null);
  const [showNonWork, setShowNonWork] = useState(false);
  const [filterProjectId, setFilterProjectId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // データを取得
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      // 日付範囲を計算
      const startOfDay = new Date(currentDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(currentDate);
      endOfDay.setHours(23, 59, 59, 999);

      // エントリーを取得
      const fetchedEntries = await window.electronAPI.entries.getByDateRange({
        startDate: startOfDay.toISOString(),
        endDate: endOfDay.toISOString(),
        projectId: filterProjectId ? parseInt(filterProjectId, 10) : undefined,
        includeNonWork: showNonWork,
      });
      setEntries(fetchedEntries);

      // プロジェクトを取得
      const fetchedProjects = await window.electronAPI.projects.getAll();
      setProjects(fetchedProjects);

      // トラッキングステータスを取得
      const status = await window.electronAPI.tracking.getStatus();
      setTrackingStatus(status);
    } catch (error) {
      console.error('Error fetching timeline data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentDate, filterProjectId, showNonWork]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // エントリー編集
  const handleEdit = (entry: EntryWithProject) => {
    setEditingEntry(entry);
  };

  const handleSaveEdit = async (
    id: number,
    data: {
      projectId?: number | null;
      subtask?: string | null;
      startTime?: string;
      endTime?: string | null;
    }
  ) => {
    await window.electronAPI.entries.update(id, data);
    fetchData();
  };

  // エントリー削除
  const handleDelete = async (entry: EntryWithProject) => {
    if (confirm(`「${entry.projectName ?? '未分類'}」のエントリーを削除しますか？`)) {
      await window.electronAPI.entries.delete(entry.id);
      fetchData();
    }
  };

  // エントリー分割
  const handleSplit = async (entry: EntryWithProject) => {
    const startTime = new Date(entry.startTime);
    const endTime = entry.endTime ? new Date(entry.endTime) : new Date();
    const midTime = new Date((startTime.getTime() + endTime.getTime()) / 2);

    const splitTimeStr = prompt(
      'エントリーを分割する時刻を入力してください（HH:MM）',
      midTime.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
    );

    if (splitTimeStr) {
      const [hours, minutes] = splitTimeStr.split(':').map(Number);
      const splitDate = new Date(entry.startTime);
      splitDate.setHours(hours, minutes, 0, 0);

      if (splitDate > startTime && splitDate < endTime) {
        await window.electronAPI.entries.split({
          entryId: entry.id,
          splitTime: splitDate.toISOString(),
        });
        fetchData();
      } else {
        alert('分割時刻は開始時刻と終了時刻の間である必要があります');
      }
    }
  };

  // 手動エントリー追加
  const handleAddManual = async () => {
    const now = new Date();
    const startTime = new Date(currentDate);
    startTime.setHours(now.getHours(), 0, 0, 0);
    const endTime = new Date(startTime);
    endTime.setHours(endTime.getHours() + 1);

    const entry = await window.electronAPI.entries.create({
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      isWork: true,
    });

    // 新しいエントリーを編集モーダルで開く
    const entryWithProject: EntryWithProject = {
      ...entry,
      projectName: null,
      projectColor: null,
    };
    setEditingEntry(entryWithProject);
    fetchData();
  };

  // 合計時間を計算
  const totalMinutes = entries.reduce((acc, entry) => {
    const start = new Date(entry.startTime);
    const end = entry.endTime ? new Date(entry.endTime) : new Date();
    return acc + (end.getTime() - start.getTime()) / 60000;
  }, 0);

  const totalHours = Math.floor(totalMinutes / 60);
  const totalMins = Math.round(totalMinutes % 60);

  return (
    <div className="p-6 space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">タイムライン</h1>
          <p className="text-text-secondary mt-1">作業記録の確認・編集</p>
        </div>

        <Button onClick={handleAddManual} className="gap-2">
          <Plus className="h-4 w-4" />
          手動追加
        </Button>
      </div>

      {/* 日付ナビゲーション */}
      <div className="flex items-center justify-between">
        <DateNavigator currentDate={currentDate} onDateChange={setCurrentDate} />

        {/* フィルター */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-text-secondary" />
            <select
              value={filterProjectId ?? ''}
              onChange={(e) => setFilterProjectId(e.target.value || null)}
              className="px-3 py-1.5 bg-surface border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">すべてのプロジェクト</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>

          <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
            <input
              type="checkbox"
              checked={showNonWork}
              onChange={(e) => setShowNonWork(e.target.checked)}
              className="rounded border-gray-600"
            />
            非業務を表示
          </label>
        </div>
      </div>

      {/* サマリー */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Clock className="h-5 w-5 text-primary" />
            サマリー
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            <div>
              <div className="text-2xl font-bold text-white">
                {totalHours}時間{totalMins}分
              </div>
              <div className="text-sm text-text-secondary">合計作業時間</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{entries.length}</div>
              <div className="text-sm text-text-secondary">エントリー数</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-white">
                {new Set(entries.filter((e) => e.projectId).map((e) => e.projectId)).size}
              </div>
              <div className="text-sm text-text-secondary">プロジェクト数</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* タイムライン */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>エントリー一覧</span>
            {trackingStatus?.isRunning && (
              <Badge variant="success">トラッキング中</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-text-secondary">読み込み中...</div>
            </div>
          ) : entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-text-secondary">
              <Clock className="h-12 w-12 opacity-30 mb-4" />
              <p>この日のエントリーはありません</p>
              <Button variant="outline" className="mt-4" onClick={handleAddManual}>
                <Plus className="h-4 w-4 mr-2" />
                エントリーを追加
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {entries.map((entry) => (
                <TimelineEntry
                  key={entry.id}
                  entry={entry}
                  isCurrent={entry.id === trackingStatus?.currentEntryId}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onSplit={handleSplit}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 編集モーダル */}
      <EntryEditModal
        entry={editingEntry}
        projects={projects}
        isOpen={!!editingEntry}
        onClose={() => setEditingEntry(null)}
        onSave={handleSaveEdit}
      />
    </div>
  );
}

export default Timeline;


