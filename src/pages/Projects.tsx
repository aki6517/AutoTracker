import { useState, useEffect, useCallback } from 'react';
import { Plus, Archive, MoreVertical, Pencil, Trash2, RotateCcw, Folder } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // プロジェクト一覧を取得
  const fetchProjects = useCallback(async () => {
    try {
      setLoading(true);
      const result = await window.api.projects.getAll({ includeArchived: showArchived });
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
      await window.api.projects.create(data);
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
      await window.api.projects.update(editingProject.id, data);
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
      await window.api.projects.delete(deleteTarget.id);
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
        await window.api.projects.restore(project.id);
      } else {
        await window.api.projects.archive(project.id);
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
            <Card
              key={project.id}
              className={project.isArchived ? 'opacity-60' : ''}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: project.color }}
                    />
                    <div>
                      <CardTitle className="text-lg">{project.name}</CardTitle>
                      {project.clientName && (
                        <p className="text-sm text-text-secondary mt-0.5">
                          {project.clientName}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="relative">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        setActiveMenu(activeMenu === project.id ? null : project.id)
                      }
                    >
                      <MoreVertical size={18} />
                    </Button>
                    {activeMenu === project.id && (
                      <div className="absolute right-0 top-10 z-10 bg-surface border border-gray-700 rounded-lg shadow-lg py-1 min-w-[160px]">
                        <button
                          className="w-full px-4 py-2 text-left text-sm hover:bg-gray-800 flex items-center gap-2"
                          onClick={() => {
                            setEditingProject(project);
                            setActiveMenu(null);
                          }}
                        >
                          <Pencil size={16} />
                          編集
                        </button>
                        <button
                          className="w-full px-4 py-2 text-left text-sm hover:bg-gray-800 flex items-center gap-2"
                          onClick={() => {
                            handleArchive(project);
                            setActiveMenu(null);
                          }}
                        >
                          {project.isArchived ? (
                            <>
                              <RotateCcw size={16} />
                              復元
                            </>
                          ) : (
                            <>
                              <Archive size={16} />
                              アーカイブ
                            </>
                          )}
                        </button>
                        <button
                          className="w-full px-4 py-2 text-left text-sm hover:bg-gray-800 flex items-center gap-2 text-red-400"
                          onClick={() => {
                            setDeleteTarget(project);
                            setActiveMenu(null);
                          }}
                        >
                          <Trash2 size={16} />
                          削除
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {project.isArchived && <Badge variant="secondary">アーカイブ</Badge>}
                  {project.hourlyRate && (
                    <Badge variant="outline">¥{project.hourlyRate.toLocaleString()}/h</Badge>
                  )}
                  {project.budgetHours && (
                    <Badge variant="outline">{project.budgetHours}h予算</Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 作成/編集フォームダイアログ */}
      <Dialog open={showForm || !!editingProject} onOpenChange={(open) => {
        if (!open) {
          setShowForm(false);
          setEditingProject(null);
        }
      }}>
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
    </div>
  );
}

export default Projects;


