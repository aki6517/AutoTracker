import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Check, ArrowRight, Scissors, AlertCircle } from 'lucide-react';
import type { ConfirmationRequest, Project } from '../../../shared/types/api';

interface ConfirmationDialogProps {
  request: ConfirmationRequest | null;
  projects: Project[];
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (entryId: number) => Promise<void>;
  onChange: (entryId: number, newProjectId: number) => Promise<void>;
  onSplit: (entryId: number, splitTime: string) => Promise<void>;
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

export function ConfirmationDialog({
  request,
  projects,
  isOpen,
  onClose,
  onConfirm,
  onChange,
  onSplit,
}: ConfirmationDialogProps) {
  const [selectedAction, setSelectedAction] = useState<'confirm' | 'change' | 'split'>('confirm');
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [splitTime, setSplitTime] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // リクエストが変わったらリセット
  useEffect(() => {
    if (request) {
      setSelectedAction('confirm');
      setSelectedProjectId(request.suggestedProject.id);
      setSplitTime('');
    }
  }, [request]);

  if (!request) return null;

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      switch (selectedAction) {
        case 'confirm':
          await onConfirm(request.entryId);
          break;
        case 'change':
          if (selectedProjectId !== null) {
            await onChange(request.entryId, selectedProjectId);
          }
          break;
        case 'split':
          if (splitTime) {
            await onSplit(request.entryId, splitTime);
          }
          break;
      }
      onClose();
    } catch (error) {
      console.error('Error handling confirmation:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-yellow-400" />
            プロジェクトの確認
          </DialogTitle>
          <DialogDescription>
            AI判定の信頼度が低いため、確認をお願いします
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* 提案されたプロジェクト */}
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-text-secondary mb-1">提案されたプロジェクト</div>
                  <div className="text-lg font-medium text-white">
                    {request.suggestedProject.name}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-text-secondary mb-1">信頼度</div>
                  {getConfidenceBadge(request.confidence)}
                </div>
              </div>
              {request.reasoning && (
                <p className="text-sm text-text-secondary mt-2">
                  理由: {request.reasoning}
                </p>
              )}
            </CardContent>
          </Card>

          {/* アクション選択 */}
          <div className="space-y-2">
            {/* 確認 */}
            <button
              className={`w-full p-3 rounded-lg border transition-colors text-left ${
                selectedAction === 'confirm'
                  ? 'border-primary bg-primary/10'
                  : 'border-gray-700 hover:border-gray-600'
              }`}
              onClick={() => setSelectedAction('confirm')}
            >
              <div className="flex items-center gap-3">
                <Check className="h-5 w-5 text-green-400" />
                <div>
                  <div className="font-medium text-white">このまま確認</div>
                  <div className="text-sm text-text-secondary">
                    「{request.suggestedProject.name}」で記録を確定します
                  </div>
                </div>
              </div>
            </button>

            {/* 変更 */}
            <button
              className={`w-full p-3 rounded-lg border transition-colors text-left ${
                selectedAction === 'change'
                  ? 'border-primary bg-primary/10'
                  : 'border-gray-700 hover:border-gray-600'
              }`}
              onClick={() => setSelectedAction('change')}
            >
              <div className="flex items-center gap-3">
                <ArrowRight className="h-5 w-5 text-blue-400" />
                <div className="flex-1">
                  <div className="font-medium text-white">別のプロジェクトに変更</div>
                  <div className="text-sm text-text-secondary">
                    正しいプロジェクトを選択します
                  </div>
                </div>
              </div>
            </button>

            {selectedAction === 'change' && (
              <div className="ml-8 mt-2">
                <select
                  value={selectedProjectId ?? ''}
                  onChange={(e) => setSelectedProjectId(e.target.value ? parseInt(e.target.value, 10) : null)}
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
            )}

            {/* 分割 */}
            <button
              className={`w-full p-3 rounded-lg border transition-colors text-left ${
                selectedAction === 'split'
                  ? 'border-primary bg-primary/10'
                  : 'border-gray-700 hover:border-gray-600'
              }`}
              onClick={() => setSelectedAction('split')}
            >
              <div className="flex items-center gap-3">
                <Scissors className="h-5 w-5 text-purple-400" />
                <div>
                  <div className="font-medium text-white">エントリーを分割</div>
                  <div className="text-sm text-text-secondary">
                    途中でプロジェクトが変わった場合
                  </div>
                </div>
              </div>
            </button>

            {selectedAction === 'split' && (
              <div className="ml-8 mt-2">
                <input
                  type="time"
                  value={splitTime}
                  onChange={(e) => setSplitTime(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <p className="text-xs text-text-secondary mt-1">
                  この時刻でエントリーを2つに分割します
                </p>
              </div>
            )}
          </div>

          {/* 代替候補 */}
          {request.alternatives.length > 0 && (
            <div>
              <div className="text-sm text-text-secondary mb-2">他の候補:</div>
              <div className="flex flex-wrap gap-2">
                {request.alternatives.map((alt) => (
                  <Button
                    key={alt.id}
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedAction('change');
                      setSelectedProjectId(alt.id);
                    }}
                  >
                    {alt.name}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            後で確認
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? '処理中...' : '確定'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


