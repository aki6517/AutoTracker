/**
 * リクエストキューサービス
 * レート制限（60req/min）に対応するためのキュー管理
 */

interface QueuedRequest<T> {
  id: string;
  execute: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: Error) => void;
  retryCount: number;
  maxRetries: number;
}

export class RequestQueue {
  private queue: QueuedRequest<unknown>[] = [];
  private isProcessing = false;
  private requestTimestamps: number[] = [];
  private readonly maxRequestsPerMinute: number;
  private readonly minIntervalMs: number;

  constructor(options?: { maxRequestsPerMinute?: number }) {
    this.maxRequestsPerMinute = options?.maxRequestsPerMinute ?? 60;
    this.minIntervalMs = (60 * 1000) / this.maxRequestsPerMinute; // 1000ms for 60rpm
  }

  /**
   * リクエストをキューに追加
   */
  enqueue<T>(
    execute: () => Promise<T>,
    options?: { maxRetries?: number }
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const request: QueuedRequest<T> = {
        id: crypto.randomUUID(),
        execute,
        resolve: resolve as (value: unknown) => void,
        reject,
        retryCount: 0,
        maxRetries: options?.maxRetries ?? 3,
      };

      this.queue.push(request as QueuedRequest<unknown>);
      this.processQueue();
    });
  }

  /**
   * キューを処理
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.queue.length > 0) {
      // レート制限チェック
      await this.waitForRateLimit();

      const request = this.queue.shift();
      if (!request) break;

      try {
        this.recordRequest();
        const result = await request.execute();
        request.resolve(result);
      } catch (error) {
        const err = error as Error & { status?: number; code?: string };

        // リトライ可能なエラーかチェック
        if (this.isRetryableError(err) && request.retryCount < request.maxRetries) {
          const delay = this.getBackoffDelay(request.retryCount);
          console.log(
            `[RequestQueue] リトライ ${request.retryCount + 1}/${request.maxRetries} (${delay}ms後)`
          );
          await this.sleep(delay);
          request.retryCount++;
          this.queue.unshift(request); // 先頭に戻す
        } else {
          request.reject(err);
        }
      }
    }

    this.isProcessing = false;
  }

  /**
   * レート制限を待機
   */
  private async waitForRateLimit(): Promise<void> {
    const now = Date.now();
    const oneMinuteAgo = now - 60 * 1000;

    // 1分以上前のタイムスタンプを削除
    this.requestTimestamps = this.requestTimestamps.filter((ts) => ts > oneMinuteAgo);

    // レート制限に達している場合は待機
    if (this.requestTimestamps.length >= this.maxRequestsPerMinute) {
      const oldestTimestamp = this.requestTimestamps[0];
      const waitTime = oldestTimestamp + 60 * 1000 - now + 100; // 100ms余裕
      if (waitTime > 0) {
        console.log(`[RequestQueue] レート制限待機: ${waitTime}ms`);
        await this.sleep(waitTime);
      }
    }

    // 最小間隔を確保
    if (this.requestTimestamps.length > 0) {
      const lastTimestamp = this.requestTimestamps[this.requestTimestamps.length - 1];
      const elapsed = now - lastTimestamp;
      if (elapsed < this.minIntervalMs) {
        await this.sleep(this.minIntervalMs - elapsed);
      }
    }
  }

  /**
   * リクエストを記録
   */
  private recordRequest(): void {
    this.requestTimestamps.push(Date.now());
  }

  /**
   * リトライ可能なエラーかチェック
   */
  private isRetryableError(error: Error & { status?: number; code?: string }): boolean {
    // ネットワークエラー
    if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
      return true;
    }

    // レート制限エラー (429)
    if (error.status === 429) {
      return true;
    }

    // サーバーエラー (5xx)
    if (error.status && error.status >= 500 && error.status < 600) {
      return true;
    }

    return false;
  }

  /**
   * 指数バックオフ遅延を計算
   */
  private getBackoffDelay(retryCount: number): number {
    // 1s, 2s, 4s
    return Math.pow(2, retryCount) * 1000;
  }

  /**
   * スリープ
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * キューの状態を取得
   */
  getStatus(): {
    queueLength: number;
    requestsInLastMinute: number;
    isProcessing: boolean;
  } {
    const oneMinuteAgo = Date.now() - 60 * 1000;
    const requestsInLastMinute = this.requestTimestamps.filter(
      (ts) => ts > oneMinuteAgo
    ).length;

    return {
      queueLength: this.queue.length,
      requestsInLastMinute,
      isProcessing: this.isProcessing,
    };
  }

  /**
   * キューをクリア
   */
  clear(): void {
    const clearedRequests = this.queue.splice(0);
    clearedRequests.forEach((request) => {
      request.reject(new Error('Queue cleared'));
    });
  }
}

// シングルトンインスタンス
export const requestQueue = new RequestQueue({ maxRequestsPerMinute: 60 });

