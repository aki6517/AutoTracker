import { Notification, BrowserWindow } from 'electron';

interface NotificationOptions {
  title: string;
  body: string;
  silent?: boolean;
  onClick?: () => void;
}

interface RateLimitConfig {
  maxPerHour: number;
  windowMs: number;
}

export class NotificationService {
  private notifications: number[] = [];
  private rateLimitConfig: RateLimitConfig = {
    maxPerHour: 3,
    windowMs: 60 * 60 * 1000, // 1時間
  };

  /**
   * 頻度制限をチェック
   */
  private canSendNotification(): boolean {
    const now = Date.now();
    const windowStart = now - this.rateLimitConfig.windowMs;

    // 期限切れの通知を削除
    this.notifications = this.notifications.filter((t) => t > windowStart);

    // 制限内かチェック
    return this.notifications.length < this.rateLimitConfig.maxPerHour;
  }

  /**
   * 通知を記録
   */
  private recordNotification(): void {
    this.notifications.push(Date.now());
  }

  /**
   * システム通知を送信
   */
  showNotification(options: NotificationOptions): boolean {
    // 頻度制限チェック
    if (!this.canSendNotification()) {
      console.log('Notification rate limit exceeded');
      return false;
    }

    // 通知がサポートされているか確認
    if (!Notification.isSupported()) {
      console.log('Notifications are not supported on this system');
      return false;
    }

    const notification = new Notification({
      title: options.title,
      body: options.body,
      silent: options.silent ?? false,
    });

    if (options.onClick) {
      notification.on('click', options.onClick);
    }

    notification.show();
    this.recordNotification();

    return true;
  }

  /**
   * 確認が必要な場合の通知
   */
  showConfirmationNeeded(projectName: string, confidence: number): boolean {
    return this.showNotification({
      title: 'プロジェクトの確認',
      body: `「${projectName}」で記録中 (${confidence}%)\nクリックして確認`,
      onClick: () => {
        // メインウィンドウをフォーカス
        const windows = BrowserWindow.getAllWindows();
        if (windows.length > 0) {
          const mainWindow = windows[0];
          if (mainWindow.isMinimized()) {
            mainWindow.restore();
          }
          mainWindow.focus();
        }
      },
    });
  }

  /**
   * トラッキング開始通知
   */
  showTrackingStarted(projectName: string): boolean {
    return this.showNotification({
      title: 'トラッキング開始',
      body: `「${projectName}」の記録を開始しました`,
      silent: true,
    });
  }

  /**
   * トラッキング停止通知
   */
  showTrackingStopped(): boolean {
    return this.showNotification({
      title: 'トラッキング停止',
      body: '記録を停止しました',
      silent: true,
    });
  }

  /**
   * 長時間アイドル通知
   */
  showIdleWarning(idleMinutes: number): boolean {
    return this.showNotification({
      title: 'アイドル検出',
      body: `${idleMinutes}分間操作がありません。記録を一時停止しますか？`,
    });
  }

  /**
   * 頻度制限の設定を更新
   */
  updateRateLimit(maxPerHour: number): void {
    this.rateLimitConfig.maxPerHour = maxPerHour;
  }

  /**
   * 残り通知可能回数を取得
   */
  getRemainingNotifications(): number {
    const now = Date.now();
    const windowStart = now - this.rateLimitConfig.windowMs;
    this.notifications = this.notifications.filter((t) => t > windowStart);
    return Math.max(0, this.rateLimitConfig.maxPerHour - this.notifications.length);
  }
}

// シングルトンインスタンス
let notificationService: NotificationService | null = null;

export function getNotificationService(): NotificationService {
  if (!notificationService) {
    notificationService = new NotificationService();
  }
  return notificationService;
}

