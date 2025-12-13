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
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Trash2, TestTube, GripVertical, ToggleLeft, ToggleRight } from 'lucide-react';
import type { Project, Rule, RuleType } from '../../../shared/types/api';

interface RuleEditorProps {
  project: Project | null;
  isOpen: boolean;
  onClose: () => void;
}

const RULE_TYPE_LABELS: Record<RuleType, string> = {
  app_name: 'アプリ名',
  window_title: 'ウィンドウタイトル',
  url: 'URL',
  keyword: 'キーワード',
};

const RULE_TYPE_DESCRIPTIONS: Record<RuleType, string> = {
  app_name: 'アプリケーション名でマッチ（例: Code, Chrome）',
  window_title: 'ウィンドウタイトルでマッチ（正規表現可）',
  url: 'URLでマッチ（正規表現可）',
  keyword: 'キーワードを含むかマッチ',
};

export function RuleEditor({ project, isOpen, onClose }: RuleEditorProps) {
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newRuleType, setNewRuleType] = useState<RuleType>('window_title');
  const [newRulePattern, setNewRulePattern] = useState('');
  const [testResult, setTestResult] = useState<{ matched: boolean; matchedText?: string } | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  // ルール一覧を取得
  useEffect(() => {
    if (project && isOpen) {
      fetchRules();
    }
  }, [project, isOpen]);

  const fetchRules = async () => {
    if (!project) return;
    setLoading(true);
    try {
      const fetchedRules = await window.api.rules.getByProject(project.id);
      setRules(fetchedRules);
    } catch (error) {
      console.error('Failed to fetch rules:', error);
    } finally {
      setLoading(false);
    }
  };

  // ルール追加
  const handleAddRule = async () => {
    if (!project || !newRulePattern.trim()) return;

    try {
      await window.api.rules.create({
        projectId: project.id,
        type: newRuleType,
        pattern: newRulePattern.trim(),
      });
      setNewRulePattern('');
      setShowAddForm(false);
      fetchRules();
    } catch (error) {
      console.error('Failed to create rule:', error);
      alert('ルールの作成に失敗しました');
    }
  };

  // ルール削除
  const handleDeleteRule = async (ruleId: string) => {
    if (!confirm('このルールを削除しますか？')) return;

    try {
      await window.api.rules.delete(ruleId);
      fetchRules();
    } catch (error) {
      console.error('Failed to delete rule:', error);
    }
  };

  // ルール有効/無効切替
  const handleToggleRule = async (rule: Rule) => {
    try {
      await window.api.rules.toggleActive(rule.id);
      fetchRules();
    } catch (error) {
      console.error('Failed to toggle rule:', error);
    }
  };

  // ルールテスト
  const handleTestRule = async () => {
    if (!newRulePattern.trim()) return;

    setIsTesting(true);
    try {
      // 現在のウィンドウ情報を取得
      const windowInfo = await window.api.windowMonitor.getActiveWindow();

      const result = await window.api.rules.test({
        ruleType: newRuleType,
        pattern: newRulePattern.trim(),
        testData: {
          windowTitle: windowInfo.windowTitle ?? undefined,
          url: windowInfo.url ?? undefined,
          appName: windowInfo.appName ?? undefined,
        },
      });

      setTestResult(result);
    } catch (error) {
      console.error('Failed to test rule:', error);
      setTestResult({ matched: false });
    } finally {
      setIsTesting(false);
    }
  };

  if (!project) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: project.color }}
            />
            {project.name} - ルール設定
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* 説明 */}
          <p className="text-sm text-text-secondary">
            ルールを設定すると、条件にマッチした作業が自動的にこのプロジェクトに紐付けられます。
          </p>

          {/* ルール一覧 */}
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          ) : rules.length === 0 && !showAddForm ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8">
                <p className="text-text-secondary mb-4">
                  まだルールがありません
                </p>
                <Button onClick={() => setShowAddForm(true)} className="gap-2">
                  <Plus size={16} />
                  ルールを追加
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {rules.map((rule) => (
                <Card key={rule.id} className={!rule.isActive ? 'opacity-50' : ''}>
                  <CardContent className="py-3">
                    <div className="flex items-center gap-3">
                      <GripVertical size={16} className="text-gray-600 cursor-grab" />
                      
                      <Badge variant="outline" className="min-w-[100px] justify-center">
                        {RULE_TYPE_LABELS[rule.type]}
                      </Badge>
                      
                      <code className="flex-1 text-sm bg-background px-2 py-1 rounded font-mono">
                        {rule.pattern}
                      </code>
                      
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleToggleRule(rule)}
                        title={rule.isActive ? '無効化' : '有効化'}
                      >
                        {rule.isActive ? (
                          <ToggleRight size={20} className="text-green-400" />
                        ) : (
                          <ToggleLeft size={20} className="text-gray-400" />
                        )}
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteRule(rule.id)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* ルール追加フォーム */}
          {showAddForm && (
            <Card className="border-primary/50">
              <CardContent className="py-4 space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text-secondary">
                    ルールタイプ
                  </label>
                  <select
                    value={newRuleType}
                    onChange={(e) => setNewRuleType(e.target.value as RuleType)}
                    className="w-full px-3 py-2 bg-background border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {Object.entries(RULE_TYPE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-text-secondary">
                    {RULE_TYPE_DESCRIPTIONS[newRuleType]}
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-text-secondary">
                    パターン
                  </label>
                  <div className="flex gap-2">
                    <Input
                      value={newRulePattern}
                      onChange={(e) => setNewRulePattern(e.target.value)}
                      placeholder={
                        newRuleType === 'app_name'
                          ? 'Code'
                          : newRuleType === 'url'
                            ? 'github\\.com'
                            : newRuleType === 'keyword'
                              ? 'AutoTracker'
                              : '.*プロジェクト名.*'
                      }
                      className="flex-1"
                    />
                    <Button
                      variant="outline"
                      onClick={handleTestRule}
                      disabled={!newRulePattern.trim() || isTesting}
                      className="gap-2"
                    >
                      <TestTube size={16} />
                      テスト
                    </Button>
                  </div>
                </div>

                {/* テスト結果 */}
                {testResult && (
                  <div
                    className={`p-3 rounded-lg ${
                      testResult.matched
                        ? 'bg-green-500/20 border border-green-500/50'
                        : 'bg-red-500/20 border border-red-500/50'
                    }`}
                  >
                    <p className={testResult.matched ? 'text-green-400' : 'text-red-400'}>
                      {testResult.matched ? '✓ マッチしました' : '✗ マッチしませんでした'}
                    </p>
                    {testResult.matchedText && (
                      <p className="text-sm text-text-secondary mt-1">
                        マッチ箇所: {testResult.matchedText}
                      </p>
                    )}
                  </div>
                )}

                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowAddForm(false);
                      setNewRulePattern('');
                      setTestResult(null);
                    }}
                  >
                    キャンセル
                  </Button>
                  <Button
                    onClick={handleAddRule}
                    disabled={!newRulePattern.trim()}
                  >
                    追加
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 追加ボタン */}
          {!showAddForm && rules.length > 0 && (
            <Button
              variant="outline"
              onClick={() => setShowAddForm(true)}
              className="w-full gap-2"
            >
              <Plus size={16} />
              ルールを追加
            </Button>
          )}
        </div>

        <DialogFooter>
          <Button onClick={onClose}>閉じる</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

