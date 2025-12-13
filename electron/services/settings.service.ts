import Store from 'electron-store';
import type { Settings } from '../../shared/types/api.js';

// デフォルト設定
const DEFAULT_SETTINGS: Settings = {
  tracking: {
    captureInterval: 60, // 秒
    metadataInterval: 5, // 秒
    aiJudgmentMode: 'standard',
    autoStartOnBoot: false,
    breakDetectionThreshold: 300, // 5分
  },
  notifications: {
    confirmationMode: 'low-confidence',
    anomalyAlerts: true,
    reportReminders: false,
    reportReminderTime: '18:00',
  },
  privacy: {
    screenshotStorage: 'local',
    screenshotRetention: 7, // 日
    passwordDetection: true,
    excludeKeywords: ['password', 'secret', 'private', 'confidential'],
  },
  appearance: {
    theme: 'dark',
    accentColor: 'amber',
    fontSize: 'medium',
  },
  ai: {
    monthlyBudget: 5.0, // ドル
    batchMode: false,
  },
};

export class SettingsService {
  private store: Store<{ settings: Settings }>;

  constructor() {
    this.store = new Store<{ settings: Settings }>({
      name: 'settings',
      defaults: {
        settings: DEFAULT_SETTINGS,
      },
    });
  }

  /**
   * 全設定を取得
   */
  get(): Settings {
    return this.store.get('settings');
  }

  /**
   * 設定を更新
   */
  update(updates: Partial<Settings>): Settings {
    const current = this.get();
    
    // 深いマージを行う
    const updated: Settings = {
      tracking: { ...current.tracking, ...updates.tracking },
      notifications: { ...current.notifications, ...updates.notifications },
      privacy: { ...current.privacy, ...updates.privacy },
      appearance: { ...current.appearance, ...updates.appearance },
      ai: { ...current.ai, ...updates.ai },
    };

    this.store.set('settings', updated);
    return updated;
  }

  /**
   * 特定のセクションを更新
   */
  updateSection<K extends keyof Settings>(
    section: K,
    updates: Partial<Settings[K]>
  ): Settings {
    const current = this.get();
    const updatedSection = { ...current[section], ...updates };
    
    this.store.set(`settings.${section}`, updatedSection);
    return this.get();
  }

  /**
   * デフォルト設定にリセット
   */
  reset(): Settings {
    this.store.set('settings', DEFAULT_SETTINGS);
    return DEFAULT_SETTINGS;
  }

  /**
   * 特定セクションをリセット
   */
  resetSection<K extends keyof Settings>(section: K): Settings {
    this.store.set(`settings.${section}`, DEFAULT_SETTINGS[section]);
    return this.get();
  }

  /**
   * デフォルト設定を取得
   */
  getDefaults(): Settings {
    return DEFAULT_SETTINGS;
  }
}

// シングルトンインスタンス
let settingsService: SettingsService | null = null;

export function getSettingsService(): SettingsService {
  if (!settingsService) {
    settingsService = new SettingsService();
  }
  return settingsService;
}

export { DEFAULT_SETTINGS };
