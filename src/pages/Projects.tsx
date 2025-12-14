import { useState, useEffect, useCallback } from 'react';
import { Plus, Archive, Folder } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { Project } from '../../shared/types/api';
import ProjectForm from '@/components/projects/ProjectForm';
import { ProjectCard } from '@/components/projects/ProjectCard';
import { RuleEditor } from '@/components/projects/RuleEditor';

// プロジェクトカラーパレット
const PROJECT_COLORS = [
  '#E5C890', // Gold
  '#81C784', // Green
  '#64B5F6', // Blue
  '#BA68C8', // Purple
  '#FF8A65', // Orange
  '#4DB6AC', // Teal
  '#F06292', // Pink
  '#FFD54F', // Yellow
];

function Projects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showArchived, setShowArchived] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);
  const [ruleEditorProject, setRuleEditorProject] = useState<Project | null>(null);
  const [error, setError] = useState<string | null>(null);

  // プロジェクト一覧を取得
  const fetchProjects = useCallback(async () => {
    try {
      setLoading(true);
      const result = await window.electronAPI.projects.getAll({ includeArchived: showArchived });
      setProjects(result);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch projects:', err);
      setError('プロジェクトの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, [showArchived]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // プロジェクト作成
  const handleCreate = async (data: {
    name: string;
    clientName?: string;
    color: string;
    icon?: string;
    hourlyRate?: number;
    budgetHours?: number;
  }) => {
    try {
      await window.electronAPI.projects.create(data);
      setShowForm(false);
      fetchProjects();
    } catch (err) {
      console.error('Failed to create project:', err);
      throw err;
    }
  };

  // プロジェクト更新
  const handleUpdate = async (data: {
    name?: string;
    clientName?: string;
    color?: string;
    icon?: string;
    hourlyRate?: number;
    budgetHours?: number;
  }) => {
    if (!editingProject) return;
    try {
      await window.electronAPI.projects.update(editingProject.id, data);
      setEditingProject(null);
      fetchProjects();
    } catch (err) {
      console.error('Failed to update project:', err);
      throw err;
    }
  };

  // プロジェクト削除
  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await window.electronAPI.projects.delete(deleteTarget.id);
      setDeleteTarget(null);
      fetchProjects();
    } catch (err) {
      console.error('Failed to delete project:', err);
      setError('関連するエントリーがあるため削除できません。アーカイブしてください。');
    }
  };

  // アーカイブ/復元
  const handleArchive = async (project: Project) => {
    try {
      if (project.isArchived) {
        await window.electronAPI.projects.restore(project.id);
      } else {
        await window.electronAPI.projects.archive(project.id);
      }
      fetchProjects();
    } catch (err) {
      console.error('Failed to archive/restore project:', err);
    }
  };

  // アクティブなプロジェクト数
  const activeCount = projects.filter((p) => !p.isArchived).length;

  return (
    <div className="p-6 space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">プロジェクト</h1>
          <p className="text-text-secondary mt-1">
            {activeCount}/5 プロジェクト使用中
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant={showArchived ? 'secondary' : 'outline'}
            onClick={() => setShowArchived(!showArchived)}
            className="gap-2"
          >
            <Archive size={18} />
            {showArchived ? 'アーカイブを非表示' : 'アーカイブを表示'}
          </Button>
          <Button
            onClick={() => setShowForm(true)}
            disabled={activeCount >= 5}
            className="gap-2"
          >
            <Plus size={18} />
            新規プロジェクト
          </Button>
        </div>
      </div>

      {/* エラー表示 */}
      {error && (
        <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400">
          {error}
          <button onClick={() => setError(null)} className="ml-4 underline">
            閉じる
          </button>
        </div>
      )}

      {/* プロジェクト一覧 */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : projects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Folder className="h-16 w-16 text-gray-600 mb-4" />
            <p className="text-text-secondary text-lg mb-4">
              プロジェクトがありません
            </p>
            <Button onClick={() => setShowForm(true)} className="gap-2">
              <Plus size={18} />
              最初のプロジェクトを作成
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onEdit={setEditingProject}
              onDelete={setDeleteTarget}
              onArchive={handleArchive}
              onManageRules={setRuleEditorProject}
            />
          ))}
        </div>
      )}

      {/* 作成/編集フォームダイアログ */}
      <Dialog
        open={showForm || !!editingProject}
        onOpenChange={(open) => {
          if (!open) {
            setShowForm(false);
            setEditingProject(null);
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingProject ? 'プロジェクトを編集' : '新規プロジェクト'}
            </DialogTitle>
            <DialogDescription>
              {editingProject
                ? 'プロジェクトの情報を更新します'
                : '新しいプロジェクトを作成します（最大5個）'}
            </DialogDescription>
          </DialogHeader>
          <ProjectForm
            project={editingProject}
            colors={PROJECT_COLORS}
            onSubmit={editingProject ? handleUpdate : handleCreate}
            onCancel={() => {
              setShowForm(false);
              setEditingProject(null);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* 削除確認ダイアログ */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>プロジェクトを削除</DialogTitle>
            <DialogDescription>
              「{deleteTarget?.name}」を削除しますか？
              <br />
              関連するエントリーがある場合は削除できません。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              キャンセル
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              削除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ルールエディタ */}
      <RuleEditor
        project={ruleEditorProject}
        isOpen={!!ruleEditorProject}
        onClose={() => setRuleEditorProject(null)}
      />
    </div>
  );
}

export default Projects;
