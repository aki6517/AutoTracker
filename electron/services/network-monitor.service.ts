import { net } from 'electron';
import { logger } from './logger.service.js';

/**
 * ネットワーク状態
 */
export interface NetworkStatus {
  isOnline: boolean;
  lastChecked: string;
  lastOnline: string | null;
  lastOffline: string | null;
}

/**
 * ネットワークモニターサービス
 * オフライン時はAI判定をスキップし、ルールマッチングのみで動作
 */
export class NetworkMonitorService {
  private isOnline = true;
  private lastChecked: Date = new Date();
  private lastOnline: Date | null = null;
  private lastOffline: Date | null = null;
  private checkInterval: NodeJS.Timeout | null = null;
  private onStatusChangeCallbacks: ((isOnline: boolean) => void)[] = [];

  constructor() {
    // 初期状態をチェック
    this.checkConnection();
  }

  /**
   * ネットワーク接続をチェック
   */
  async checkConnection(): Promise<boolean> {
    this.lastChecked = new Date();

    try {
      // Electronのnet.isOnline()を使用
      const online = net.isOnline();
      
      if (online !== this.isOnline) {
        const previousState = this.isOnline;
        this.isOnline = online;

        if (online) {
          this.lastOnline = new Date();
          logger.info('NetworkMonitor', 'Network connection restored');
        } else {
          this.lastOffline = new Date();
          logger.warn('NetworkMonitor', 'Network connection lost');
        }

        // コールバックを呼び出し
        this.notifyStatusChange(online);
      }

      return online;
    } catch (error) {
      logger.error('NetworkMonitor', 'Failed to check network status', error as Error);
      return this.isOnline;
    }
  }

  /**
   * 定期的なネットワークチェックを開始
   */
  startMonitoring(intervalMs = 30000): void {
    if (this.checkInterval) {
      return;
    }

    logger.info('NetworkMonitor', `Starting network monitoring (interval: ${intervalMs}ms)`);

    this.checkInterval = setInterval(() => {
      this.checkConnection();
    }, intervalMs);

    // 初回チェック
    this.checkConnection();
  }

  /**
   * ネットワークチェックを停止
   */
  stopMonitoring(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      logger.info('NetworkMonitor', 'Network monitoring stopped');
    }
  }

  /**
   * オンラインかどうか
   */
  getIsOnline(): boolean {
    return this.isOnline;
  }

  /**
   * ネットワーク状態を取得
   */
  getStatus(): NetworkStatus {
    return {
      isOnline: this.isOnline,
      lastChecked: this.lastChecked.toISOString(),
      lastOnline: this.lastOnline?.toISOString() ?? null,
      lastOffline: this.lastOffline?.toISOString() ?? null,
    };
  }

  /**
   * ステータス変更時のコールバックを登録
   */
  onStatusChange(callback: (isOnline: boolean) => void): () => void {
    this.onStatusChangeCallbacks.push(callback);
    
    // クリーンアップ関数を返す
    return () => {
      const index = this.onStatusChangeCallbacks.indexOf(callback);
      if (index > -1) {
        this.onStatusChangeCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * ステータス変更を通知
   */
  private notifyStatusChange(isOnline: boolean): void {
    for (const callback of this.onStatusChangeCallbacks) {
      try {
        callback(isOnline);
      } catch (error) {
        logger.error('NetworkMonitor', 'Error in status change callback', error as Error);
      }
    }
  }

  /**
   * オフライン時に実行を制限するラッパー
   */
  async runOnlineOnly<T>(
    operation: () => Promise<T>,
    offlineFallback?: () => T
  ): Promise<T | null> {
    if (!this.isOnline) {
      logger.debug('NetworkMonitor', 'Skipping operation (offline mode)');
      if (offlineFallback) {
        return offlineFallback();
      }
      return null;
    }

    try {
      return await operation();
    } catch (error) {
      // ネットワークエラーの場合はオフラインとして扱う
      const networkError = this.isNetworkError(error);
      if (networkError) {
        this.isOnline = false;
        this.lastOffline = new Date();
        logger.warn('NetworkMonitor', 'Network error detected, switching to offline mode');
        this.notifyStatusChange(false);

        if (offlineFallback) {
          return offlineFallback();
        }
        return null;
      }

      throw error;
    }
  }

  /**
   * ネットワークエラーかどうかを判定
   */
  private isNetworkError(error: unknown): boolean {
    if (!(error instanceof Error)) {
      return false;
    }

    const networkErrorCodes = [
      'ENOTFOUND',
      'ECONNREFUSED',
      'ETIMEDOUT',
      'ECONNRESET',
      'ENETUNREACH',
      'EHOSTUNREACH',
      'ERR_NETWORK',
      'FETCH_ERROR',
    ];

    const errorMessage = error.message.toLowerCase();
    const errorName = error.name.toLowerCase();

    return (
      networkErrorCodes.some(code => 
        errorMessage.includes(code.toLowerCase()) || 
        (error as NodeJS.ErrnoException).code === code
      ) ||
      errorMessage.includes('network') ||
      errorMessage.includes('internet') ||
      errorMessage.includes('offline') ||
      errorName.includes('network')
    );
  }
}

// シングルトンインスタンス
let networkMonitorService: NetworkMonitorService | null = null;

export function getNetworkMonitor(): NetworkMonitorService {
  if (!networkMonitorService) {
    networkMonitorService = new NetworkMonitorService();
  }
  return networkMonitorService;
}

