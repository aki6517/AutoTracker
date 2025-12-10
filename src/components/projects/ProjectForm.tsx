import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { Project } from '../../../shared/types/api';

interface ProjectFormProps {
  project?: Project | null;
  colors: string[];
  onSubmit: (data: {
    name: string;
    clientName?: string;
    color: string;
    icon?: string;
    hourlyRate?: number;
    budgetHours?: number;
  }) => Promise<void>;
  onCancel: () => void;
}

function ProjectForm({ project, colors, onSubmit, onCancel }: ProjectFormProps) {
  const [name, setName] = useState(project?.name ?? '');
  const [clientName, setClientName] = useState(project?.clientName ?? '');
  const [color, setColor] = useState(project?.color ?? colors[0]);
  const [hourlyRate, setHourlyRate] = useState(project?.hourlyRate?.toString() ?? '');
  const [budgetHours, setBudgetHours] = useState(project?.budgetHours?.toString() ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('プロジェクト名を入力してください');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await onSubmit({
        name: name.trim(),
        clientName: clientName.trim() || undefined,
        color,
        hourlyRate: hourlyRate ? parseFloat(hourlyRate) : undefined,
        budgetHours: budgetHours ? parseFloat(budgetHours) : undefined,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存に失敗しました');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* プロジェクト名 */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-white">
          プロジェクト名 <span className="text-red-400">*</span>
        </label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="例: Webサイトリニューアル"
          required
        />
      </div>

      {/* クライアント名 */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-white">クライアント名</label>
        <Input
          value={clientName}
          onChange={(e) => setClientName(e.target.value)}
          placeholder="例: 株式会社ABC"
        />
      </div>

      {/* カラー選択 */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-white">カラー</label>
        <div className="flex flex-wrap gap-2">
          {colors.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              className={`w-8 h-8 rounded-full transition-all ${
                color === c ? 'ring-2 ring-white ring-offset-2 ring-offset-surface' : ''
              }`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>

      {/* 時給 */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-white">時給（円）</label>
        <Input
          type="number"
          value={hourlyRate}
          onChange={(e) => setHourlyRate(e.target.value)}
          placeholder="例: 5000"
          min="0"
        />
      </div>

      {/* 予算時間 */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-white">予算時間</label>
        <Input
          type="number"
          value={budgetHours}
          onChange={(e) => setBudgetHours(e.target.value)}
          placeholder="例: 40"
          min="0"
        />
      </div>

      {/* ボタン */}
      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
          キャンセル
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? '保存中...' : project ? '更新' : '作成'}
        </Button>
      </div>
    </form>
  );
}

export default ProjectForm;

