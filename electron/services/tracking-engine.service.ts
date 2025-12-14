/**
 * トラッキングエンジン
 * 自動時間記録のメインループ
 * スクリーンショット取得、変化検知、AI判定、エントリー作成を統合
 */

import { BrowserWindow } from 'electron';
import { entryRepository, type Entry, type EntryWithProject } from '../repositories/entry.repository.js';
import { projectRepository } from '../repositories/project.repository.js';
import { getScreenCaptureService } from './screen-capture.service.js';
import { getWindowMonitorService } from './window-monitor.service.js';
import { getChangeDetector } from './change-detector.service.js';
import { aiJudgmentService } from './ai-judgment.service.js';
import { getRuleMatchingService } from './rule-matching.service.js';
import { getNotificationService } from './notification.service.js';
import { getPasswordDetectionService } from './password-detection.service.js';
import { getNetworkMonitor } from './network-monitor.service.js';
import { logger } from './logger.service.js';
import type { ScreenContext, TrackingStatus, ConfirmationRequest } from '../../shared/types/api.js';

// トラッキング設定
export interface TrackingConfig {
  captureInterval: number; // スクリーンショット間隔（ms）デフォルト: 60000
  metadataInterval: number; // メタデータ収集間隔（ms）デフォルト: 5000
  autoConfirmThreshold: number; // 自動確定の信頼度閾値 デフォルト: 85
  minEntryDuration: number; // 最小エントリー時間（ms）デフォルト: 60000
}

const DEFAULT_CONFIG: TrackingConfig = {
  captureInterval: 60000, // 1分
  metadataInterval: 5000, // 5秒
  autoConfirmThreshold: 85,
  minEntryDuration: 60000, // 1分
};

// トラッキング状態
interface TrackingState {
  isRunning: boolean;
  isPaused: boolean;
  startedAt: string | null;
  currentEntry: Entry | null;
  currentProjectId: number | null;
  currentProjectName: string | null;
  lastScreenContext: ScreenContext | null;
  pendingConfirmation: ConfirmationRequest | null;
}

export class TrackingEngine {
  private config: TrackingConfig;
  private state: TrackingState;
  private captureTimer: NodeJS.Timeout | null = null;
  private metadataTimer: NodeJS.Timeout | null = null;
  private mainWindow: BrowserWindow | null = null;

  constructor(config?: Partial<TrackingConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.state = {
      isRunning: false,
      isPaused: false,
      startedAt: null,
      currentEntry: null,
      currentProjectId: null,
      currentProjectName: null,
      lastScreenContext: null,
      pendingConfirmation: null,
    };
  }

  /**
   * メインウィンドウを設定（IPC通知用）
   */
  setMainWindow(window: BrowserWindow): void {
    this.mainWindow = window;
  }

  /**
   * トラッキングを開始
   */
  async start(): Promise<{ success: boolean; status: TrackingStatus }> {
    if (this.state.isRunning) {
      return { success: false, status: this.getStatus() };
    }

    console.log('[TrackingEngine] Starting...');

    this.state.isRunning = true;
    this.state.isPaused = false;
    this.state.startedAt = new Date().toISOString();

    // 最初のエントリーを作成
    await this.createNewEntry();

    // ループを開始
    this.startCaptureLoop();
    this.startMetadataLoop();

    // ウィンドウモニターを開始
    const windowMonitorService = getWindowMonitorService();
    windowMonitorService.startMonitoring(undefined, this.config.metadataInterval);

    console.log('[TrackingEngine] Started');
    return { success: true, status: this.getStatus() };
  }

  /**
   * トラッキングを停止
   */
  async stop(): Promise<{ success: boolean; finalEntry: Entry | null }> {
    if (!this.state.isRunning) {
      return { success: false, finalEntry: null };
    }

    console.log('[TrackingEngine] Stopping...');

    // ループを停止
    this.stopLoops();

    // ウィンドウモニターを停止
    const windowMonitorService = getWindowMonitorService();
    windowMonitorService.stopMonitoring();

    // 変更検出をリセット
    const changeDetector = getChangeDetector();
    changeDetector.reset();

    // 現在のエントリーを終了
    let finalEntry: Entry | null = null;
    if (this.state.currentEntry) {
      finalEntry = entryRepository.endEntry(this.state.currentEntry.id);
    }

    // 状態をリセット
    this.state = {
      isRunning: false,
      isPaused: false,
      startedAt: null,
      currentEntry: null,
      currentProjectId: null,
      currentProjectName: null,
      lastScreenContext: null,
      pendingConfirmation: null,
    };

    console.log('[TrackingEngine] Stopped');
    return { success: true, finalEntry };
  }

  /**
   * トラッキングを一時停止
   */
  pause(): { success: boolean; status: TrackingStatus } {
    if (!this.state.isRunning || this.state.isPaused) {
      return { success: false, status: this.getStatus() };
    }

    console.log('[TrackingEngine] Pausing...');
    this.state.isPaused = true;
    this.stopLoops();

    return { success: true, status: this.getStatus() };
  }

  /**
   * トラッキングを再開
   */
  resume(): { success: boolean; status: TrackingStatus } {
    if (!this.state.isRunning || !this.state.isPaused) {
      return { success: false, status: this.getStatus() };
    }

    console.log('[TrackingEngine] Resuming...');
    this.state.isPaused = false;
    this.startCaptureLoop();
    this.startMetadataLoop();

    return { success: true, status: this.getStatus() };
  }

  /**
   * ステータスを取得
   */
  getStatus(): TrackingStatus {
    const elapsedSeconds = this.state.startedAt
      ? Math.floor((Date.now() - new Date(this.state.startedAt).getTime()) / 1000)
      : 0;

    return {
      isRunning: this.state.isRunning,
      isPaused: this.state.isPaused,
      startedAt: this.state.startedAt,
      currentEntryId: this.state.currentEntry?.id ?? null,
      currentProjectId: this.state.currentProjectId,
      currentProjectName: this.state.currentProjectName,
      elapsedSeconds,
      confidence: this.state.currentEntry?.confidence ?? 0,
    };
  }

  /**
   * 確認レスポンスを処理
   */
  async handleConfirmationResponse(response: {
    entryId: number;
    action: 'confirm' | 'change' | 'split';
    newProjectId?: number;
    splitTime?: string;
  }): Promise<{ success: boolean }> {
    const { entryId, action, newProjectId, splitTime } = response;

    switch (action) {
      case 'confirm':
        // そのまま確定
        entryRepository.update(entryId, { confidence: 100 });
        break;

      case 'change':
        // プロジェクトを変更
        if (newProjectId !== undefined) {
          entryRepository.update(entryId, { projectId: newProjectId, confidence: 100 });
          // 現在のエントリーの場合、状態も更新
          if (this.state.currentEntry?.id === entryId) {
            const project = projectRepository.findById(String(newProjectId));
            this.state.currentProjectId = newProjectId;
            this.state.currentProjectName = project?.name ?? null;
          }
        }
        break;

      case 'split':
        // エントリーを分割
        if (splitTime) {
          entryRepository.split(entryId, splitTime);
        }
        break;
    }

    this.state.pendingConfirmation = null;
    return { success: true };
  }

  /**
   * 設定を更新
   */
  updateConfig(config: Partial<TrackingConfig>): void {
    this.config = { ...this.config, ...config };

    // 実行中の場合はループを再起動
    if (this.state.isRunning && !this.state.isPaused) {
      this.stopLoops();
      this.startCaptureLoop();
      this.startMetadataLoop();
    }
  }

  /**
   * スクリーンショットキャプチャループを開始
   */
  private startCaptureLoop(): void {
    this.captureTimer = setInterval(async () => {
      if (this.state.isPaused) return;
      await this.captureAndAnalyze();
    }, this.config.captureInterval);

    // 最初のキャプチャを即座に実行
    this.captureAndAnalyze();
  }

  /**
   * メタデータ収集ループを開始
   */
  private startMetadataLoop(): void {
    this.metadataTimer = setInterval(async () => {
      if (this.state.isPaused) return;
      await this.collectMetadata();
    }, this.config.metadataInterval);
  }

  /**
   * ループを停止
   */
  private stopLoops(): void {
    if (this.captureTimer) {
      clearInterval(this.captureTimer);
      this.captureTimer = null;
    }
    if (this.metadataTimer) {
      clearInterval(this.metadataTimer);
      this.metadataTimer = null;
    }
  }

  /**
   * スクリーンショットをキャプチャして分析
   */
  private async captureAndAnalyze(): Promise<void> {
    try {
      const screenCaptureService = getScreenCaptureService();
      const windowMonitorService = getWindowMonitorService();
      const passwordDetectionService = getPasswordDetectionService();

      // 現在のウィンドウメタデータを取得
      const windowMetadata = await windowMonitorService.getActiveWindow();

      // パスワード画面かどうかをチェック
      const passwordCheck = passwordDetectionService.detect(windowMetadata);
      if (passwordCheck.isPasswordScreen) {
        console.log(
          `[TrackingEngine] Password screen detected (${passwordCheck.matchType}: ${passwordCheck.matchedPattern}). Skipping screenshot.`
        );
        // スクリーンショットはスキップするが、メタデータは更新
        this.state.lastScreenContext = {
          windowTitle: windowMetadata.windowTitle,
          appName: windowMetadata.appName,
          url: windowMetadata.url,
          timestamp: new Date().toISOString(),
        };
        return;
      }

      console.log('[TrackingEngine] Capturing screenshot...');

      // スクリーンコンテキストを作成
      const screenContext: ScreenContext = {
        windowTitle: windowMetadata.windowTitle,
        appName: windowMetadata.appName,
        url: windowMetadata.url,
        timestamp: new Date().toISOString(),
      };

      // スクリーンショットをキャプチャ
      const entryId = this.state.currentEntry?.id
        ? String(this.state.currentEntry.id)
        : 'temp';
      await screenCaptureService.capture(entryId, {
        windowTitle: windowMetadata.windowTitle ?? undefined,
        url: windowMetadata.url ?? undefined,
        appName: windowMetadata.appName ?? undefined,
      });

      // 変化検知
      const changeDetector = getChangeDetector();
      const changeResult = await changeDetector.detect(screenContext);

      console.log(
        `[TrackingEngine] Change detection: ${changeResult.hasChange ? 'Changed' : 'No change'} (Layer ${changeResult.layer})`
      );

      if (changeResult.hasChange) {
        // プロジェクト判定
        await this.judgeAndUpdateProject(screenContext);
      }

      this.state.lastScreenContext = screenContext;
    } catch (error) {
      console.error('[TrackingEngine] Capture error:', error);
    }
  }

  /**
   * メタデータを収集
   */
  private async collectMetadata(): Promise<void> {
    try {
      const windowMonitorService = getWindowMonitorService();
      const windowMetadata = await windowMonitorService.getActiveWindow();

      const screenContext: ScreenContext = {
        windowTitle: windowMetadata.windowTitle,
        appName: windowMetadata.appName,
        url: windowMetadata.url,
        timestamp: new Date().toISOString(),
      };

      // 軽量な変化検知（Layer 1のみ）
      if (this.hasQuickChange(screenContext)) {
        console.log('[TrackingEngine] Quick change detected');
        await this.judgeAndUpdateProject(screenContext);
      }

      this.state.lastScreenContext = screenContext;
    } catch (error) {
      console.error('[TrackingEngine] Metadata collection error:', error);
    }
  }

  /**
   * 軽量な変化検知（アプリ名やドメインの変化のみ）
   */
  private hasQuickChange(currentContext: ScreenContext): boolean {
    const prev = this.state.lastScreenContext;
    if (!prev) return true;

    // アプリが変わった
    if (prev.appName !== currentContext.appName) {
      return true;
    }

    // URLのドメインが変わった
    if (prev.url && currentContext.url) {
      try {
        const prevDomain = new URL(prev.url).hostname;
        const currentDomain = new URL(currentContext.url).hostname;
        if (prevDomain !== currentDomain) {
          return true;
        }
      } catch {
        // URL解析失敗
      }
    }

    return false;
  }

  /**
   * プロジェクトを判定して更新
   */
  private async judgeAndUpdateProject(screenContext: ScreenContext): Promise<void> {
    // まずルールマッチングを試行
    const ruleMatchingService = getRuleMatchingService();
    const ruleResult = ruleMatchingService.match({
      windowTitle: screenContext.windowTitle ?? undefined,
      url: screenContext.url ?? undefined,
      appName: screenContext.appName ?? undefined,
    });

    let projectId: number | null = null;
    let projectName: string | null = null;
    let confidence = 0;
    let reasoning = '';

    if (ruleResult.matched && ruleResult.projectId) {
      // ルールでマッチした
      projectId = parseInt(ruleResult.projectId, 10);
      projectName = ruleResult.projectName;
      confidence = ruleResult.confidence;
      reasoning = 'ルールマッチング';
      console.log('[TrackingEngine] ルールマッチ成功:', { projectId, projectName, confidence });
    } else {
      console.log('[TrackingEngine] ルールマッチなし, AI判定を試行...');
      console.log('[TrackingEngine] APIキー設定済み:', aiJudgmentService.hasApiKey());
      
      if (aiJudgmentService.hasApiKey()) {
        // オフラインモードチェック
        const networkMonitor = getNetworkMonitor();
        const isOnline = networkMonitor.getIsOnline();
        console.log('[TrackingEngine] オンライン状態:', isOnline);
        
        if (!isOnline) {
          logger.info('TrackingEngine', 'Offline mode: Skipping AI judgment, using rule matching only');
        } else {
          // AI判定を使用
          const projects = projectRepository.findAll(false);
          console.log('[TrackingEngine] AI判定開始, プロジェクト数:', projects.length);
          console.log('[TrackingEngine] スクリーンコンテキスト:', screenContext);
          
          const aiResult = await aiJudgmentService.judgeProject(screenContext, projects);
          console.log('[TrackingEngine] AI判定結果:', aiResult);

          if (aiResult.projectId) {
            projectId = parseInt(aiResult.projectId, 10);
            projectName = aiResult.projectName;
            confidence = aiResult.confidence;
            reasoning = aiResult.reasoning;
          }
        }
      } else {
        console.log('[TrackingEngine] APIキーが設定されていないためAI判定をスキップ');
      }
    }

    // プロジェクトが変わった場合
    if (projectId !== this.state.currentProjectId) {
      console.log(
        `[TrackingEngine] Project changed: ${this.state.currentProjectName} -> ${projectName}`
      );

      // 現在のエントリーを終了
      if (this.state.currentEntry) {
        const entryDuration = Date.now() - new Date(this.state.currentEntry.startTime).getTime();
        if (entryDuration >= this.config.minEntryDuration) {
          entryRepository.endEntry(this.state.currentEntry.id);
          this.notifyEntryUpdated(this.state.currentEntry.id);
        } else {
          // 最小時間未満の場合は削除
          entryRepository.delete(this.state.currentEntry.id);
        }
      }

      // 新しいエントリーを作成
      await this.createNewEntry(projectId, confidence, reasoning);

      // 信頼度が閾値未満の場合は確認を要求
      if (confidence < this.config.autoConfirmThreshold && this.state.currentEntry) {
        this.requestConfirmation(projectId, projectName, confidence, reasoning);
      }
    } else {
      // 同じプロジェクトの場合は信頼度と理由を更新
      if (this.state.currentEntry) {
        entryRepository.update(this.state.currentEntry.id, {
          confidence,
          aiReasoning: reasoning,
        });
      }
    }
  }

  /**
   * 新しいエントリーを作成
   */
  private async createNewEntry(
    projectId?: number | null,
    confidence = 0,
    reasoning = ''
  ): Promise<void> {
    const entry = entryRepository.create({
      projectId: projectId ?? undefined,
      startTime: new Date().toISOString(),
      confidence,
      aiReasoning: reasoning || undefined,
      isWork: true,
    });

    this.state.currentEntry = entry;
    this.state.currentProjectId = projectId ?? null;

    if (projectId) {
      const project = projectRepository.findById(String(projectId));
      this.state.currentProjectName = project?.name ?? null;
    } else {
      this.state.currentProjectName = null;
    }

    this.notifyEntryCreated(entry);
  }

  /**
   * 確認を要求
   */
  private requestConfirmation(
    projectId: number | null,
    projectName: string | null,
    confidence: number,
    reasoning: string
  ): void {
    if (!this.state.currentEntry) return;

    // 代替候補を取得
    const projects = projectRepository.findAll(false);
    const alternatives = projects
      .filter((p) => parseInt(p.id, 10) !== projectId)
      .slice(0, 3)
      .map((p) => ({
        id: parseInt(p.id, 10),
        name: p.name,
        score: 0,
      }));

    const confirmationRequest: ConfirmationRequest = {
      entryId: this.state.currentEntry.id,
      suggestedProject: {
        id: projectId,
        name: projectName ?? '未分類',
      },
      confidence,
      reasoning,
      alternatives,
    };

    this.state.pendingConfirmation = confirmationRequest;
    this.notifyConfirmationNeeded(confirmationRequest);
  }

  /**
   * エントリー作成を通知
   */
  private notifyEntryCreated(entry: Entry): void {
    if (!this.mainWindow) return;

    const entryWithProject: EntryWithProject = {
      ...entry,
      projectName: this.state.currentProjectName,
      projectColor: null, // TODO: プロジェクトの色を取得
    };

    this.mainWindow.webContents.send('tracking:entry-created', entryWithProject);
  }

  /**
   * エントリー更新を通知
   */
  private notifyEntryUpdated(entryId: number): void {
    if (!this.mainWindow) return;

    const entry = entryRepository.findById(entryId);
    if (!entry) return;

    const project = entry.projectId
      ? projectRepository.findById(String(entry.projectId))
      : null;

    const entryWithProject: EntryWithProject = {
      ...entry,
      projectName: project?.name ?? null,
      projectColor: project?.color ?? null,
    };

    this.mainWindow.webContents.send('tracking:entry-updated', entryWithProject);
  }

  /**
   * 確認要求を通知
   */
  private notifyConfirmationNeeded(request: ConfirmationRequest): void {
    // レンダラープロセスに通知
    if (this.mainWindow) {
      this.mainWindow.webContents.send('tracking:confirmation-needed', request);
    }

    // システム通知も送信（頻度制限付き）
    const notificationService = getNotificationService();
    notificationService.showConfirmationNeeded(
      request.suggestedProject.name,
      request.confidence
    );
  }
}

// シングルトンインスタンス
let trackingEngineInstance: TrackingEngine | null = null;

export function getTrackingEngine(): TrackingEngine {
  if (!trackingEngineInstance) {
    trackingEngineInstance = new TrackingEngine();
  }
  return trackingEngineInstance;
}

export function setTrackingEngineMainWindow(window: BrowserWindow): void {
  getTrackingEngine().setMainWindow(window);
}

