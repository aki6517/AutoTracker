/**
 * 変更検出サービス
 * 5層検知エンジンで効率的に作業変化を検知
 *
 * Layer 1: タイトル/URL変化検知（文字列比較）
 * Layer 2: OCRテキスト比較（Tesseract.js）
 * Layer 3: 画像ハッシュ比較（pHash）
 * Layer 4: ルールマッチング
 * Layer 5: AI判定
 */

import Tesseract from 'tesseract.js';
import sharp from 'sharp';
import { getRuleMatchingService } from './rule-matching.service.js';
import { aiJudgmentService } from './ai-judgment.service.js';
import type { ScreenContext } from '../../shared/types/api.js';

// 検知結果
export interface ChangeDetectionResult {
  hasChange: boolean;
  changeType: 'none' | 'title' | 'url' | 'ocr' | 'image' | 'rule' | 'ai';
  layer: number; // 検知したレイヤー（0=変化なし、1-5=検知レイヤー）
  confidence: number; // 信頼度 0-100
  details: {
    previousContext?: ScreenContext;
    currentContext: ScreenContext;
    ocrText?: string;
    imageHash?: string;
    matchedRule?: {
      projectId: string;
      projectName: string;
      confidence: number;
    };
    aiJudgment?: {
      projectId: string | null;
      projectName: string | null;
      confidence: number;
      reasoning: string;
    };
  };
  processingTime: number; // 処理時間（ms）
}

// 画像ハッシュ設定
interface ImageHashOptions {
  size: number; // ハッシュサイズ（デフォルト: 8）
  threshold: number; // 変化閾値（デフォルト: 5）
}

// OCR設定
interface OcrOptions {
  languages: string[]; // 言語（デフォルト: ['jpn', 'eng']）
  timeout: number; // タイムアウト（ms）
}

// 変化検知設定
export interface ChangeDetectorOptions {
  enableOcr: boolean;
  enableImageHash: boolean;
  enableRuleMatching: boolean;
  enableAiJudgment: boolean;
  imageHash: ImageHashOptions;
  ocr: OcrOptions;
}

const DEFAULT_OPTIONS: ChangeDetectorOptions = {
  enableOcr: true,
  enableImageHash: true,
  enableRuleMatching: true,
  enableAiJudgment: true,
  imageHash: {
    size: 8,
    threshold: 5, // ハミング距離の閾値
  },
  ocr: {
    languages: ['jpn', 'eng'],
    timeout: 5000, // 5秒
  },
};

export class ChangeDetector {
  private options: ChangeDetectorOptions;
  private previousContext: ScreenContext | null = null;
  private previousOcrText: string | null = null;
  private previousImageHash: string | null = null;
  private tesseractWorker: Tesseract.Worker | null = null;
  private isInitializing = false;

  constructor(options?: Partial<ChangeDetectorOptions>) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Tesseract Workerを初期化
   */
  private async initTesseractWorker(): Promise<Tesseract.Worker> {
    if (this.tesseractWorker) {
      return this.tesseractWorker;
    }

    if (this.isInitializing) {
      // 初期化中は待機
      while (this.isInitializing) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      if (this.tesseractWorker) {
        return this.tesseractWorker;
      }
    }

    this.isInitializing = true;
    try {
      const worker = await Tesseract.createWorker(this.options.ocr.languages, 1, {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            console.log(`[OCR] Progress: ${Math.round(m.progress * 100)}%`);
          }
        },
      });
      this.tesseractWorker = worker;
      return worker;
    } finally {
      this.isInitializing = false;
    }
  }

  /**
   * Tesseract Workerを終了
   */
  async terminate(): Promise<void> {
    if (this.tesseractWorker) {
      await this.tesseractWorker.terminate();
      this.tesseractWorker = null;
    }
  }

  /**
   * 変化を検知（メインメソッド）
   */
  async detect(
    currentContext: ScreenContext,
    imageBuffer?: Buffer
  ): Promise<ChangeDetectionResult> {
    const startTime = Date.now();
    const result: ChangeDetectionResult = {
      hasChange: false,
      changeType: 'none',
      layer: 0,
      confidence: 100,
      details: {
        previousContext: this.previousContext ?? undefined,
        currentContext,
      },
      processingTime: 0,
    };

    try {
      // 初回は変化ありとみなす
      if (!this.previousContext) {
        result.hasChange = true;
        result.changeType = 'title';
        result.layer = 1;
        result.confidence = 100;
        this.updatePreviousState(currentContext);
        return this.finalizeResult(result, startTime);
      }

      // Layer 1: タイトル/URL変化検知
      const layer1Result = this.detectTitleUrlChange(currentContext);
      if (layer1Result.hasChange) {
        result.hasChange = true;
        result.changeType = layer1Result.changeType;
        result.layer = 1;
        result.confidence = 100;
        this.updatePreviousState(currentContext);
        return this.finalizeResult(result, startTime);
      }

      // Layer 2: OCRテキスト比較（画像がある場合のみ）
      if (this.options.enableOcr && imageBuffer) {
        const layer2Result = await this.detectOcrChange(imageBuffer);
        result.details.ocrText = layer2Result.ocrText;
        if (layer2Result.hasChange) {
          result.hasChange = true;
          result.changeType = 'ocr';
          result.layer = 2;
          result.confidence = layer2Result.confidence;
          this.updatePreviousState(currentContext, layer2Result.ocrText);
          return this.finalizeResult(result, startTime);
        }
      }

      // Layer 3: 画像ハッシュ比較
      if (this.options.enableImageHash && imageBuffer) {
        const layer3Result = await this.detectImageHashChange(imageBuffer);
        result.details.imageHash = layer3Result.hash;
        if (layer3Result.hasChange) {
          result.hasChange = true;
          result.changeType = 'image';
          result.layer = 3;
          result.confidence = layer3Result.confidence;
          this.updatePreviousState(currentContext, undefined, layer3Result.hash);
          return this.finalizeResult(result, startTime);
        }
      }

      // Layer 4: ルールマッチング
      if (this.options.enableRuleMatching) {
        const layer4Result = await this.detectRuleChange(currentContext);
        if (layer4Result.hasChange) {
          result.hasChange = true;
          result.changeType = 'rule';
          result.layer = 4;
          result.confidence = layer4Result.confidence;
          result.details.matchedRule = layer4Result.matchedRule;
          this.updatePreviousState(currentContext);
          return this.finalizeResult(result, startTime);
        }
      }

      // Layer 5: AI判定
      if (this.options.enableAiJudgment && aiJudgmentService.hasApiKey()) {
        const layer5Result = await this.detectAiChange(currentContext);
        if (layer5Result.hasChange) {
          result.hasChange = true;
          result.changeType = 'ai';
          result.layer = 5;
          result.confidence = layer5Result.confidence;
          result.details.aiJudgment = layer5Result.aiJudgment;
          this.updatePreviousState(currentContext);
          return this.finalizeResult(result, startTime);
        }
      }

      // 変化なし
      this.updatePreviousState(currentContext);
      return this.finalizeResult(result, startTime);
    } catch (error) {
      console.error('[ChangeDetector] Error:', error);
      result.processingTime = Date.now() - startTime;
      return result;
    }
  }

  /**
   * Layer 1: タイトル/URL変化検知
   */
  private detectTitleUrlChange(currentContext: ScreenContext): {
    hasChange: boolean;
    changeType: 'title' | 'url' | 'none';
  } {
    if (!this.previousContext) {
      return { hasChange: true, changeType: 'title' };
    }

    // アプリ名が変わった
    if (this.previousContext.appName !== currentContext.appName) {
      return { hasChange: true, changeType: 'title' };
    }

    // ウィンドウタイトルが大きく変わった
    if (this.previousContext.windowTitle !== currentContext.windowTitle) {
      // 軽微な変化（数字やタイムスタンプのみ）は無視
      if (!this.isMinorTitleChange(this.previousContext.windowTitle, currentContext.windowTitle)) {
        return { hasChange: true, changeType: 'title' };
      }
    }

    // URLのドメインが変わった
    if (this.previousContext.url && currentContext.url) {
      try {
        const prevDomain = new URL(this.previousContext.url).hostname;
        const currentDomain = new URL(currentContext.url).hostname;
        if (prevDomain !== currentDomain) {
          return { hasChange: true, changeType: 'url' };
        }
        // パスが大きく変わった
        const prevPath = new URL(this.previousContext.url).pathname;
        const currentPath = new URL(currentContext.url).pathname;
        if (prevPath !== currentPath && !this.isMinorPathChange(prevPath, currentPath)) {
          return { hasChange: true, changeType: 'url' };
        }
      } catch {
        // URL解析失敗
      }
    } else if (this.previousContext.url !== currentContext.url) {
      // 一方がnullの場合
      return { hasChange: true, changeType: 'url' };
    }

    return { hasChange: false, changeType: 'none' };
  }

  /**
   * 軽微なタイトル変化かチェック
   */
  private isMinorTitleChange(prev: string | null, current: string | null): boolean {
    if (!prev || !current) return false;

    // 数字のみの変化（タイムスタンプ、カウンター等）
    const prevNormalized = prev.replace(/\d+/g, '#');
    const currentNormalized = current.replace(/\d+/g, '#');
    return prevNormalized === currentNormalized;
  }

  /**
   * 軽微なパス変化かチェック
   */
  private isMinorPathChange(prev: string, current: string): boolean {
    // ページネーション等の軽微な変化
    const prevNormalized = prev.replace(/\/\d+$/g, '/#');
    const currentNormalized = current.replace(/\/\d+$/g, '/#');
    return prevNormalized === currentNormalized;
  }

  /**
   * Layer 2: OCRテキスト変化検知
   */
  private async detectOcrChange(imageBuffer: Buffer): Promise<{
    hasChange: boolean;
    ocrText: string;
    confidence: number;
  }> {
    try {
      const worker = await this.initTesseractWorker();
      const { data } = await worker.recognize(imageBuffer);
      const ocrText = data.text.trim();

      if (!this.previousOcrText) {
        return { hasChange: false, ocrText, confidence: 100 };
      }

      // テキストの類似度を計算
      const similarity = this.calculateTextSimilarity(this.previousOcrText, ocrText);
      const hasChange = similarity < 0.8; // 80%未満は変化あり

      return {
        hasChange,
        ocrText,
        confidence: Math.round((1 - similarity) * 100),
      };
    } catch (error) {
      console.error('[ChangeDetector] OCR error:', error);
      return { hasChange: false, ocrText: '', confidence: 0 };
    }
  }

  /**
   * テキスト類似度を計算（レーベンシュタイン距離ベース）
   */
  private calculateTextSimilarity(text1: string, text2: string): number {
    if (text1 === text2) return 1;
    if (!text1 || !text2) return 0;

    // 単語単位で比較（高速化のため）
    const words1 = new Set(text1.toLowerCase().split(/\s+/));
    const words2 = new Set(text2.toLowerCase().split(/\s+/));

    const intersection = new Set([...words1].filter((w) => words2.has(w)));
    const union = new Set([...words1, ...words2]);

    return intersection.size / union.size;
  }

  /**
   * Layer 3: 画像ハッシュ変化検知（pHash）
   */
  private async detectImageHashChange(imageBuffer: Buffer): Promise<{
    hasChange: boolean;
    hash: string;
    confidence: number;
  }> {
    try {
      const hash = await this.calculateImageHash(imageBuffer);

      if (!this.previousImageHash) {
        return { hasChange: false, hash, confidence: 100 };
      }

      const distance = this.hammingDistance(this.previousImageHash, hash);
      const hasChange = distance > this.options.imageHash.threshold;

      // 距離を信頼度に変換（距離が大きいほど信頼度が高い）
      const maxDistance = this.options.imageHash.size * this.options.imageHash.size;
      const confidence = Math.round((distance / maxDistance) * 100);

      return { hasChange, hash, confidence };
    } catch (error) {
      console.error('[ChangeDetector] Image hash error:', error);
      return { hasChange: false, hash: '', confidence: 0 };
    }
  }

  /**
   * pHash（パーセプチュアルハッシュ）を計算
   */
  private async calculateImageHash(imageBuffer: Buffer): Promise<string> {
    const size = this.options.imageHash.size;

    // グレースケール・リサイズ
    const { data } = await sharp(imageBuffer)
      .greyscale()
      .resize(size, size, { fit: 'fill' })
      .raw()
      .toBuffer({ resolveWithObject: true });

    // 平均値を計算
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      sum += data[i];
    }
    const avg = sum / data.length;

    // ハッシュを生成
    let hash = '';
    for (let i = 0; i < data.length; i++) {
      hash += data[i] >= avg ? '1' : '0';
    }

    return hash;
  }

  /**
   * ハミング距離を計算
   */
  private hammingDistance(hash1: string, hash2: string): number {
    if (hash1.length !== hash2.length) {
      return Math.max(hash1.length, hash2.length);
    }

    let distance = 0;
    for (let i = 0; i < hash1.length; i++) {
      if (hash1[i] !== hash2[i]) {
        distance++;
      }
    }
    return distance;
  }

  /**
   * Layer 4: ルールマッチング変化検知
   */
  private async detectRuleChange(currentContext: ScreenContext): Promise<{
    hasChange: boolean;
    confidence: number;
    matchedRule?: {
      projectId: string;
      projectName: string;
      confidence: number;
    };
  }> {
    try {
      const ruleMatchingService = getRuleMatchingService();
      const result = ruleMatchingService.match({
        windowTitle: currentContext.windowTitle ?? undefined,
        url: currentContext.url ?? undefined,
        appName: currentContext.appName ?? undefined,
      });

      if (result.matched && result.projectId) {
        return {
          hasChange: true,
          confidence: result.confidence,
          matchedRule: {
            projectId: result.projectId,
            projectName: result.projectName ?? 'Unknown',
            confidence: result.confidence,
          },
        };
      }

      return { hasChange: false, confidence: 0 };
    } catch (error) {
      console.error('[ChangeDetector] Rule matching error:', error);
      return { hasChange: false, confidence: 0 };
    }
  }

  /**
   * Layer 5: AI判定変化検知
   */
  private async detectAiChange(currentContext: ScreenContext): Promise<{
    hasChange: boolean;
    confidence: number;
    aiJudgment?: {
      projectId: string | null;
      projectName: string | null;
      confidence: number;
      reasoning: string;
    };
  }> {
    try {
      const result = await aiJudgmentService.detectChange(
        currentContext,
        this.previousContext ?? undefined
      );

      if (result.hasChange) {
        return {
          hasChange: true,
          confidence: result.confidence,
          aiJudgment: {
            projectId: null, // detectChangeはプロジェクトを返さない
            projectName: null,
            confidence: result.confidence,
            reasoning: result.reasoning,
          },
        };
      }

      return { hasChange: false, confidence: 0 };
    } catch (error) {
      console.error('[ChangeDetector] AI judgment error:', error);
      return { hasChange: false, confidence: 0 };
    }
  }

  /**
   * 前回の状態を更新
   */
  private updatePreviousState(
    context: ScreenContext,
    ocrText?: string,
    imageHash?: string
  ): void {
    this.previousContext = { ...context };
    if (ocrText !== undefined) {
      this.previousOcrText = ocrText;
    }
    if (imageHash !== undefined) {
      this.previousImageHash = imageHash;
    }
  }

  /**
   * 結果を確定
   */
  private finalizeResult(
    result: ChangeDetectionResult,
    startTime: number
  ): ChangeDetectionResult {
    result.processingTime = Date.now() - startTime;
    return result;
  }

  /**
   * 状態をリセット
   */
  reset(): void {
    this.previousContext = null;
    this.previousOcrText = null;
    this.previousImageHash = null;
  }

  /**
   * 現在の設定を取得
   */
  getOptions(): ChangeDetectorOptions {
    return { ...this.options };
  }

  /**
   * 設定を更新
   */
  setOptions(options: Partial<ChangeDetectorOptions>): void {
    this.options = { ...this.options, ...options };
  }
}

// シングルトンインスタンス
let changeDetectorInstance: ChangeDetector | null = null;

export function getChangeDetector(): ChangeDetector {
  if (!changeDetectorInstance) {
    changeDetectorInstance = new ChangeDetector();
  }
  return changeDetectorInstance;
}

export function resetChangeDetector(): void {
  if (changeDetectorInstance) {
    changeDetectorInstance.terminate();
    changeDetectorInstance = null;
  }
}

