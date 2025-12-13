import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { EntryWithProject, Project } from '../../../shared/types/api';

interface EntryEditModalProps {
  entry: EntryWithProject | null;
  projects: Project[];
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: number, data: {
    projectId?: number | null;
    subtask?: string | null;
    startTime?: string;
    endTime?: string | null;
  }) => Promise<void>;
}

function formatDateTimeLocal(isoString: string): string {
  const date = new Date(isoString);
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60 * 1000);
  return localDate.toISOString().slice(0, 16);
}

export function EntryEditModal({
  entry,
  projects,
  isOpen,
  onClose,
  onSave,
}: EntryEditModalProps) {
  const [projectId, setProjectId] = useState<number | null>(null);
  const [subtask, setSubtask] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (entry) {
      setProjectId(entry.projectId);
      setSubtask(entry.subtask ?? '');
      setStartTime(formatDateTimeLocal(entry.startTime));
      setEndTime(entry.endTime ? formatDateTimeLocal(entry.endTime) : '');
    }
  }, [entry]);

  const handleSave = async () => {
    if (!entry) return;

    setIsSaving(true);
    try {
      await onSave(entry.id, {
        projectId,
        subtask: subtask || null,
        startTime: new Date(startTime).toISOString(),
        endTime: endTime ? new Date(endTime).toISOString() : null,
      });
      onClose();
    } catch (error) {
      console.error('Error saving entry:', error);
    } finally {
      setIsSaving(false);
    }
  };

  if (!entry) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>エントリーを編集</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* プロジェクト選択 */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-text-secondary">
              プロジェクト
            </label>
            <select
              value={projectId ?? ''}
              onChange={(e) => setProjectId(e.target.value ? parseInt(e.target.value, 10) : null)}
              className="w-full px-3 py-2 bg-background border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">未分類</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>

          {/* サブタスク */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-text-secondary">
              サブタスク（任意）
            </label>
            <Input
              value={subtask}
              onChange={(e) => setSubtask(e.target.value)}
              placeholder="作業内容の詳細"
            />
          </div>

          {/* 開始時刻 */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-text-secondary">
              開始時刻
            </label>
            <Input
              type="datetime-local"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
          </div>

          {/* 終了時刻 */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-text-secondary">
              終了時刻
            </label>
            <Input
              type="datetime-local"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              placeholder="進行中の場合は空欄"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            キャンセル
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? '保存中...' : '保存'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


