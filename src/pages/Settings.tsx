import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Settings as SettingsIcon,
  Bell,
  Shield,
  Palette,
  Brain,
  RotateCcw,
  Save,
  Clock,
  Volume2,
  Eye,
  DollarSign,
  Key,
  CheckCircle,
  XCircle,
  Loader2,
} from 'lucide-react';
import type { Settings as SettingsType } from '../../shared/types/api';

type TabId = 'tracking' | 'notifications' | 'privacy' | 'appearance' | 'ai';

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'tracking', label: 'トラッキング', icon: <Clock className="h-4 w-4" /> },
  { id: 'notifications', label: '通知', icon: <Bell className="h-4 w-4" /> },
  { id: 'privacy', label: 'プライバシー', icon: <Shield className="h-4 w-4" /> },
  { id: 'appearance', label: '外観', icon: <Palette className="h-4 w-4" /> },
  { id: 'ai', label: 'AI設定', icon: <Brain className="h-4 w-4" /> },
];

// AI設定タブコンポーネント
function AISettingsTab({
  settings,
  updateSetting,
}: {
  settings: SettingsType;
  updateSetting: <K extends keyof SettingsType>(
    section: K,
    key: keyof SettingsType[K],
    value: SettingsType[K][keyof SettingsType[K]]
  ) => void;
}) {
  const [apiKey, setApiKey] = useState('');
  const [hasApiKey, setHasApiKey] = useState(false);
  const [isTestingKey, setIsTestingKey] = useState(false);
  const [testResult, setTestResult] = useState<{ valid: boolean; error?: string } | null>(null);
  const [isSavingKey, setIsSavingKey] = useState(false);

  // APIキーの状態を確認
  useEffect(() => {
    const checkApiKey = async () => {
      try {
        const hasKey = await window.electronAPI.ai.hasApiKey();
        setHasApiKey(hasKey);
      } catch (error) {
        console.error('Error checking API key:', error);
      }
    };
    checkApiKey();
  }, []);

  // APIキーを保存
  const handleSaveApiKey = async () => {
    if (!apiKey.trim()) return;
    
    setIsSavingKey(true);
    try {
      await window.electronAPI.ai.setApiKey(apiKey.trim());
      setHasApiKey(true);
      setApiKey('');
      setTestResult(null);
    } catch (error) {
      console.error('Error saving API key:', error);
    } finally {
      setIsSavingKey(false);
    }
  };

  // APIキーをテスト
  const handleTestApiKey = async () => {
    setIsTestingKey(true);
    setTestResult(null);
    try {
      const result = await window.electronAPI.ai.testApiKey();
      setTestResult(result);
    } catch (error) {
      setTestResult({ valid: false, error: (error as Error).message });
    } finally {
      setIsTestingKey(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          AI設定
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* APIキー設定 */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Key className="h-5 w-5 text-text-secondary" />
            <div>
              <div className="font-medium text-white">OpenAI APIキー</div>
              <div className="text-sm text-text-secondary">
                AI判定機能を使用するために必要
              </div>
            </div>
          </div>

          {/* 現在の状態 */}
          <div className="flex items-center gap-2">
            {hasApiKey ? (
              <>
                <CheckCircle className="h-4 w-4 text-green-400" />
                <span className="text-green-400 text-sm">APIキーが設定されています</span>
              </>
            ) : (
              <>
                <XCircle className="h-4 w-4 text-yellow-400" />
                <span className="text-yellow-400 text-sm">APIキーが設定されていません</span>
              </>
            )}
          </div>

          {/* APIキー入力 */}
          <div className="flex gap-2">
            <Input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={hasApiKey ? '新しいAPIキーを入力...' : 'sk-...'}
              className="flex-1"
            />
            <Button
              onClick={handleSaveApiKey}
              disabled={!apiKey.trim() || isSavingKey}
            >
              {isSavingKey ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                '保存'
              )}
            </Button>
          </div>

          {/* テストボタン */}
          {hasApiKey && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={handleTestApiKey}
                disabled={isTestingKey}
              >
                {isTestingKey ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    テスト中...
                  </>
                ) : (
                  'APIキーをテスト'
                )}
              </Button>
              {testResult && (
                <span className={testResult.valid ? 'text-green-400' : 'text-red-400'}>
                  {testResult.valid ? '✓ 有効' : `✗ ${testResult.error || '無効'}`}
                </span>
              )}
            </div>
          )}

          <p className="text-xs text-text-secondary">
            APIキーは<a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">OpenAI</a>で取得できます
          </p>
        </div>

        <div className="border-t border-gray-700 pt-6" />

        {/* 月間予算 */}
        <div className="flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-green-400" />
          <div>
            <div className="font-medium text-white">月間予算</div>
            <div className="text-sm text-text-secondary">
              AI APIの月間利用上限
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-white">$</span>
          <Input
            type="number"
            value={settings.ai.monthlyBudget}
            onChange={(e) =>
              updateSetting('ai', 'monthlyBudget', parseFloat(e.target.value))
            }
            min={0}
            step={0.5}
            className="w-32"
          />
        </div>

        {/* バッチモード */}
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium text-white">バッチモード</div>
            <div className="text-sm text-text-secondary">
              AI判定をまとめて実行（コスト削減）
            </div>
          </div>
          <button
            onClick={() => updateSetting('ai', 'batchMode', !settings.ai.batchMode)}
            className={`w-12 h-6 rounded-full transition-colors ${
              settings.ai.batchMode ? 'bg-primary' : 'bg-gray-600'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white transition-transform ${
                settings.ai.batchMode ? 'translate-x-6' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>

        {/* 使用モデル */}
        <div className="p-4 bg-surface rounded-lg">
          <div className="text-sm text-text-secondary mb-2">使用モデル</div>
          <div className="flex flex-wrap gap-2">
            <Badge>変更検出: gpt-5-nano</Badge>
            <Badge>プロジェクト判定: gpt-5-mini</Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Settings() {
  const [activeTab, setActiveTab] = useState<TabId>('tracking');
  const [settings, setSettings] = useState<SettingsType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // 設定を取得
  const fetchSettings = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await window.electronAPI.settings.get();
      setSettings(result);
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // 設定を更新
  const updateSetting = <K extends keyof SettingsType>(
    section: K,
    key: keyof SettingsType[K],
    value: SettingsType[K][keyof SettingsType[K]]
  ) => {
    if (!settings) return;
    setSettings({
      ...settings,
      [section]: {
        ...settings[section],
        [key]: value,
      },
    });
    setHasChanges(true);
  };

  // 保存
  const handleSave = async () => {
    if (!settings) return;
    setIsSaving(true);
    try {
      await window.electronAPI.settings.update(settings);
      setHasChanges(false);
    } catch (error) {
      console.error('Error saving settings:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // リセット
  const handleReset = async () => {
    if (!confirm('すべての設定をデフォルトに戻しますか？')) return;
    try {
      const result = await window.electronAPI.settings.reset();
      setSettings(result);
      setHasChanges(false);
    } catch (error) {
      console.error('Error resetting settings:', error);
    }
  };

  if (isLoading || !settings) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <SettingsIcon className="h-6 w-6" />
            設定
          </h1>
          <p className="text-text-secondary mt-1">アプリケーションの設定を管理</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleReset}>
            <RotateCcw className="h-4 w-4 mr-2" />
            リセット
          </Button>
          <Button onClick={handleSave} disabled={!hasChanges || isSaving}>
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? '保存中...' : '保存'}
          </Button>
        </div>
      </div>

      {/* 変更通知 */}
      {hasChanges && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-4 py-2 text-yellow-400 text-sm">
          未保存の変更があります
        </div>
      )}

      {/* タブナビゲーション */}
      <div className="flex gap-2 border-b border-gray-700 pb-2">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              activeTab === tab.id
                ? 'bg-primary text-white'
                : 'text-text-secondary hover:text-white hover:bg-surface'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* タブコンテンツ */}
      <div className="space-y-4">
        {/* トラッキング設定 */}
        {activeTab === 'tracking' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                トラッキング設定
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    キャプチャ間隔（秒）
                  </label>
                  <Input
                    type="number"
                    value={settings.tracking.captureInterval}
                    onChange={(e) =>
                      updateSetting('tracking', 'captureInterval', parseInt(e.target.value, 10))
                    }
                    min={30}
                    max={300}
                  />
                  <p className="text-xs text-text-secondary mt-1">
                    スクリーンショットを取得する間隔
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    メタデータ収集間隔（秒）
                  </label>
                  <Input
                    type="number"
                    value={settings.tracking.metadataInterval}
                    onChange={(e) =>
                      updateSetting('tracking', 'metadataInterval', parseInt(e.target.value, 10))
                    }
                    min={1}
                    max={60}
                  />
                  <p className="text-xs text-text-secondary mt-1">
                    ウィンドウ情報を収集する間隔
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  AI判定モード
                </label>
                <div className="flex gap-2">
                  {(['conservative', 'standard', 'aggressive'] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => updateSetting('tracking', 'aiJudgmentMode', mode)}
                      className={`px-4 py-2 rounded-lg border transition-colors ${
                        settings.tracking.aiJudgmentMode === mode
                          ? 'border-primary bg-primary/10 text-white'
                          : 'border-gray-700 text-text-secondary hover:border-gray-600'
                      }`}
                    >
                      {mode === 'conservative' && '控えめ'}
                      {mode === 'standard' && '標準'}
                      {mode === 'aggressive' && '積極的'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  休憩検出閾値（秒）
                </label>
                <Input
                  type="number"
                  value={settings.tracking.breakDetectionThreshold}
                  onChange={(e) =>
                    updateSetting('tracking', 'breakDetectionThreshold', parseInt(e.target.value, 10))
                  }
                  min={60}
                  max={1800}
                />
                <p className="text-xs text-text-secondary mt-1">
                  この時間操作がないと休憩と判定
                </p>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-white">起動時に自動開始</div>
                  <div className="text-sm text-text-secondary">
                    アプリ起動時にトラッキングを開始
                  </div>
                </div>
                <button
                  onClick={() =>
                    updateSetting('tracking', 'autoStartOnBoot', !settings.tracking.autoStartOnBoot)
                  }
                  className={`w-12 h-6 rounded-full transition-colors ${
                    settings.tracking.autoStartOnBoot ? 'bg-primary' : 'bg-gray-600'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white transition-transform ${
                      settings.tracking.autoStartOnBoot ? 'translate-x-6' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 通知設定 */}
        {activeTab === 'notifications' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-primary" />
                通知設定
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  確認モード
                </label>
                <div className="flex gap-2">
                  {(['always', 'low-confidence', 'never'] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => updateSetting('notifications', 'confirmationMode', mode)}
                      className={`px-4 py-2 rounded-lg border transition-colors ${
                        settings.notifications.confirmationMode === mode
                          ? 'border-primary bg-primary/10 text-white'
                          : 'border-gray-700 text-text-secondary hover:border-gray-600'
                      }`}
                    >
                      {mode === 'always' && '常に確認'}
                      {mode === 'low-confidence' && '低信頼度のみ'}
                      {mode === 'never' && '確認しない'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Volume2 className="h-5 w-5 text-text-secondary" />
                  <div>
                    <div className="font-medium text-white">異常アラート</div>
                    <div className="text-sm text-text-secondary">
                      異常な稼働パターンを検出時に通知
                    </div>
                  </div>
                </div>
                <button
                  onClick={() =>
                    updateSetting('notifications', 'anomalyAlerts', !settings.notifications.anomalyAlerts)
                  }
                  className={`w-12 h-6 rounded-full transition-colors ${
                    settings.notifications.anomalyAlerts ? 'bg-primary' : 'bg-gray-600'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white transition-transform ${
                      settings.notifications.anomalyAlerts ? 'translate-x-6' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-white">日次レポートリマインダー</div>
                  <div className="text-sm text-text-secondary">
                    毎日指定時刻にリマインド
                  </div>
                </div>
                <button
                  onClick={() =>
                    updateSetting('notifications', 'reportReminders', !settings.notifications.reportReminders)
                  }
                  className={`w-12 h-6 rounded-full transition-colors ${
                    settings.notifications.reportReminders ? 'bg-primary' : 'bg-gray-600'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white transition-transform ${
                      settings.notifications.reportReminders ? 'translate-x-6' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>

              {settings.notifications.reportReminders && (
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    リマインダー時刻
                  </label>
                  <Input
                    type="time"
                    value={settings.notifications.reportReminderTime}
                    onChange={(e) =>
                      updateSetting('notifications', 'reportReminderTime', e.target.value)
                    }
                  />
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* プライバシー設定 */}
        {activeTab === 'privacy' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                プライバシー設定
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  スクリーンショット保存期間（日）
                </label>
                <Input
                  type="number"
                  value={settings.privacy.screenshotRetention}
                  onChange={(e) =>
                    updateSetting('privacy', 'screenshotRetention', parseInt(e.target.value, 10))
                  }
                  min={1}
                  max={365}
                />
                <p className="text-xs text-text-secondary mt-1">
                  この期間を過ぎたスクリーンショットは自動削除
                </p>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Eye className="h-5 w-5 text-text-secondary" />
                  <div>
                    <div className="font-medium text-white">パスワード検出</div>
                    <div className="text-sm text-text-secondary">
                      パスワード入力画面のキャプチャをスキップ
                    </div>
                  </div>
                </div>
                <button
                  onClick={() =>
                    updateSetting('privacy', 'passwordDetection', !settings.privacy.passwordDetection)
                  }
                  className={`w-12 h-6 rounded-full transition-colors ${
                    settings.privacy.passwordDetection ? 'bg-primary' : 'bg-gray-600'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white transition-transform ${
                      settings.privacy.passwordDetection ? 'translate-x-6' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  除外キーワード
                </label>
                <Input
                  value={settings.privacy.excludeKeywords.join(', ')}
                  onChange={(e) =>
                    updateSetting(
                      'privacy',
                      'excludeKeywords',
                      e.target.value.split(',').map((s) => s.trim()).filter(Boolean)
                    )
                  }
                  placeholder="password, secret, ..."
                />
                <p className="text-xs text-text-secondary mt-1">
                  これらのキーワードを含む画面はキャプチャをスキップ
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 外観設定 */}
        {activeTab === 'appearance' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5 text-primary" />
                外観設定
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  テーマ
                </label>
                <div className="flex gap-2">
                  {(['dark', 'light', 'auto'] as const).map((theme) => (
                    <button
                      key={theme}
                      onClick={() => updateSetting('appearance', 'theme', theme)}
                      className={`px-4 py-2 rounded-lg border transition-colors ${
                        settings.appearance.theme === theme
                          ? 'border-primary bg-primary/10 text-white'
                          : 'border-gray-700 text-text-secondary hover:border-gray-600'
                      }`}
                    >
                      {theme === 'dark' && 'ダーク'}
                      {theme === 'light' && 'ライト'}
                      {theme === 'auto' && '自動'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  アクセントカラー
                </label>
                <div className="flex gap-2">
                  {(['amber', 'blue', 'green', 'purple'] as const).map((color) => (
                    <button
                      key={color}
                      onClick={() => updateSetting('appearance', 'accentColor', color)}
                      className={`w-10 h-10 rounded-lg border-2 transition-colors ${
                        settings.appearance.accentColor === color
                          ? 'border-white'
                          : 'border-transparent'
                      }`}
                      style={{
                        backgroundColor:
                          color === 'amber'
                            ? '#F59E0B'
                            : color === 'blue'
                            ? '#3B82F6'
                            : color === 'green'
                            ? '#10B981'
                            : '#8B5CF6',
                      }}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  フォントサイズ
                </label>
                <div className="flex gap-2">
                  {(['small', 'medium', 'large'] as const).map((size) => (
                    <button
                      key={size}
                      onClick={() => updateSetting('appearance', 'fontSize', size)}
                      className={`px-4 py-2 rounded-lg border transition-colors ${
                        settings.appearance.fontSize === size
                          ? 'border-primary bg-primary/10 text-white'
                          : 'border-gray-700 text-text-secondary hover:border-gray-600'
                      }`}
                    >
                      {size === 'small' && '小'}
                      {size === 'medium' && '中'}
                      {size === 'large' && '大'}
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* AI設定 */}
        {activeTab === 'ai' && (
          <AISettingsTab settings={settings} updateSetting={updateSetting} />
        )}
      </div>
    </div>
  );
}

export default Settings;


