import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// active-winはESMモジュールなので動的インポートを使用
let activeWinModule: typeof import('active-win') | null = null;

async function getActiveWinModule() {
  if (!activeWinModule) {
    activeWinModule = await import('active-win');
  }
  return activeWinModule;
}

export interface WindowMetadata {
  windowTitle: string | null;
  appName: string | null;
  processId: number | null;
  url: string | null;
  timestamp: string;
}

// ブラウザアプリ名のリスト
const BROWSER_APPS = [
  'Google Chrome',
  'Chrome',
  'Microsoft Edge',
  'Edge',
  'Safari',
  'Firefox',
  'Brave Browser',
  'Brave',
  'Arc',
  'Opera',
  'Vivaldi',
];

/**
 * ウィンドウモニターサービス
 */
export class WindowMonitorService {
  private isMonitoring = false;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private metadataHistory: WindowMetadata[] = [];
  private maxHistorySize = 100; // 最大履歴数
  private intervalMs = 5000; // 5秒間隔

  // コールバック関数
  private onMetadataCallback: ((metadata: WindowMetadata) => void) | null = null;

  /**
   * 現在のアクティブウィンドウ情報を取得
   */
  async getActiveWindow(): Promise<WindowMetadata> {
    const timestamp = new Date().toISOString();

    try {
      const activeWin = await getActiveWinModule();
      const window = await activeWin.default();

      if (!window) {
        return {
          windowTitle: null,
          appName: null,
          processId: null,
          url: null,
          timestamp,
        };
      }

      const appName = window.owner?.name ?? null;
      const windowTitle = window.title ?? null;
      const processId = window.owner?.processId ?? null;

      // ブラウザの場合はURLを取得
      let url: string | null = null;
      if (appName && this.isBrowser(appName)) {
        url = await this.getBrowserUrl(appName);
      }

      return {
        windowTitle,
        appName,
        processId,
        url,
        timestamp,
      };
    } catch (error) {
      console.error('Failed to get active window:', error);
      return {
        windowTitle: null,
        appName: null,
        processId: null,
        url: null,
        timestamp,
      };
    }
  }

  /**
   * アプリがブラウザかどうかを判定
   */
  private isBrowser(appName: string): boolean {
    return BROWSER_APPS.some(
      (browser) => appName.toLowerCase().includes(browser.toLowerCase())
    );
  }

  /**
   * ブラウザのURLを取得（macOS）
   */
  private async getBrowserUrl(appName: string): Promise<string | null> {
    if (process.platform !== 'darwin') {
      // TODO: Windows/Linux対応
      return null;
    }

    try {
      // アプリ名に基づいてAppleScriptを実行
      const normalizedAppName = this.normalizeAppName(appName);
      const script = this.getAppleScriptForBrowser(normalizedAppName);

      if (!script) {
        return null;
      }

      const { stdout } = await execAsync(`osascript -e '${script}'`);
      const url = stdout.trim();
      return url || null;
    } catch (error) {
      // AppleScriptが失敗した場合は無視（権限がない場合など）
      return null;
    }
  }

  /**
   * アプリ名を正規化
   */
  private normalizeAppName(appName: string): string {
    const lowerName = appName.toLowerCase();
    if (lowerName.includes('chrome')) return 'Google Chrome';
    if (lowerName.includes('edge')) return 'Microsoft Edge';
    if (lowerName.includes('safari')) return 'Safari';
    if (lowerName.includes('firefox')) return 'Firefox';
    if (lowerName.includes('brave')) return 'Brave Browser';
    if (lowerName.includes('arc')) return 'Arc';
    if (lowerName.includes('opera')) return 'Opera';
    if (lowerName.includes('vivaldi')) return 'Vivaldi';
    return appName;
  }

  /**
   * ブラウザ用のAppleScriptを取得
   */
  private getAppleScriptForBrowser(appName: string): string | null {
    // Chrome系ブラウザ
    if (['Google Chrome', 'Microsoft Edge', 'Brave Browser', 'Opera', 'Vivaldi', 'Arc'].includes(appName)) {
      return `tell application "${appName}" to get URL of active tab of front window`;
    }

    // Safari
    if (appName === 'Safari') {
      return `tell application "Safari" to get URL of front document`;
    }

    // Firefox
    if (appName === 'Firefox') {
      // FirefoxはAppleScriptサポートが限定的
      return null;
    }

    return null;
  }

  /**
   * 監視を開始
   */
  startMonitoring(
    onMetadata?: (metadata: WindowMetadata) => void,
    intervalMs?: number
  ): void {
    if (this.isMonitoring) {
      console.log('Window monitoring is already running');
      return;
    }

    this.isMonitoring = true;
    this.onMetadataCallback = onMetadata ?? null;

    if (intervalMs) {
      this.intervalMs = intervalMs;
    }

    console.log(`Starting window monitoring (interval: ${this.intervalMs}ms)`);

    // 即座に1回実行
    this.collectMetadata();

    // 定期的に収集
    this.monitoringInterval = setInterval(() => {
      this.collectMetadata();
    }, this.intervalMs);
  }

  /**
   * 監視を停止
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) {
      return;
    }

    this.isMonitoring = false;
    this.onMetadataCallback = null;

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    console.log('Window monitoring stopped');
  }

  /**
   * メタデータを収集
   */
  private async collectMetadata(): Promise<void> {
    try {
      const metadata = await this.getActiveWindow();

      // 履歴に追加
      this.metadataHistory.push(metadata);

      // 最大件数を超えたら古いものを削除
      if (this.metadataHistory.length > this.maxHistorySize) {
        this.metadataHistory.shift();
      }

      // コールバックがあれば呼び出し
      if (this.onMetadataCallback) {
        this.onMetadataCallback(metadata);
      }
    } catch (error) {
      console.error('Failed to collect window metadata:', error);
    }
  }

  /**
   * 監視中かどうかを取得
   */
  isActive(): boolean {
    return this.isMonitoring;
  }

  /**
   * 最新のメタデータを取得
   */
  getLatestMetadata(): WindowMetadata | null {
    if (this.metadataHistory.length === 0) {
      return null;
    }
    return this.metadataHistory[this.metadataHistory.length - 1];
  }

  /**
   * メタデータ履歴を取得
   */
  getMetadataHistory(limit?: number): WindowMetadata[] {
    if (limit && limit > 0) {
      return this.metadataHistory.slice(-limit);
    }
    return [...this.metadataHistory];
  }

  /**
   * 履歴をクリア
   */
  clearHistory(): void {
    this.metadataHistory = [];
  }

  /**
   * 監視間隔を変更
   */
  setInterval(intervalMs: number): void {
    this.intervalMs = intervalMs;

    // 監視中なら再起動
    if (this.isMonitoring) {
      const callback = this.onMetadataCallback;
      this.stopMonitoring();
      this.startMonitoring(callback ?? undefined, intervalMs);
    }
  }

  /**
   * 最大履歴サイズを変更
   */
  setMaxHistorySize(size: number): void {
    this.maxHistorySize = size;

    // 履歴が超過していたら削除
    while (this.metadataHistory.length > size) {
      this.metadataHistory.shift();
    }
  }
}

// シングルトンインスタンス
let windowMonitorService: WindowMonitorService | null = null;

export function getWindowMonitorService(): WindowMonitorService {
  if (!windowMonitorService) {
    windowMonitorService = new WindowMonitorService();
  }
  return windowMonitorService;
}

