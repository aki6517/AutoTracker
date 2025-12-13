import { useState, useEffect, useCallback } from 'react';
import { ConfirmationDialog } from './ConfirmationDialog';
import type { ConfirmationRequest, Project } from '../../../shared/types/api';

/**
 * 確認ダイアログの管理コンポーネント
 * App.tsxで使用し、グローバルに確認要求を処理する
 */
export function ConfirmationManager() {
  const [request, setRequest] = useState<ConfirmationRequest | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  // プロジェクト一覧を取得
  const fetchProjects = useCallback(async () => {
    try {
      const result = await window.api.projects.getAll();
      setProjects(result);
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // 確認要求イベントを購読
  useEffect(() => {
    const cleanup = window.api.tracking.onConfirmationNeeded((req) => {
      setRequest(req);
      setIsOpen(true);
    });

    return cleanup;
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    setRequest(null);
  };

  const handleConfirm = async (entryId: number) => {
    await window.api.tracking.respondConfirmation({
      entryId,
      action: 'confirm',
    });
  };

  const handleChange = async (entryId: number, newProjectId: number) => {
    await window.api.tracking.respondConfirmation({
      entryId,
      action: 'change',
      newProjectId,
    });
  };

  const handleSplit = async (entryId: number, splitTime: string) => {
    await window.api.tracking.respondConfirmation({
      entryId,
      action: 'split',
      splitTime,
    });
  };

  return (
    <ConfirmationDialog
      request={request}
      projects={projects}
      isOpen={isOpen}
      onClose={handleClose}
      onConfirm={handleConfirm}
      onChange={handleChange}
      onSplit={handleSplit}
    />
  );
}

