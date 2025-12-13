import { getSettingsService } from './settings.service.js';
import type { WindowMetadata } from './window-monitor.service.js';

/**
 * パスワード画面検出結果
 */
export interface PasswordDetectionResult {
  isPasswordScreen: boolean;
  matchedPattern: string | null;
  matchType: 'title' | 'url' | 'keyword' | 'ocr' | null;
  confidence: number; // 0-1
}

/**
 * パスワード画面検出パターン
 */
interface DetectionPattern {
  pattern: RegExp;
  type: 'title' | 'url' | 'keyword';
  weight: number; // 検出時のconfidence重み
}

// タイトルベースの検出パターン
const TITLE_PATTERNS: DetectionPattern[] = [
  // 英語パターン
  { pattern: /\bpassword\b/i, type: 'title', weight: 0.9 },
  { pattern: /\blogin\b/i, type: 'title', weight: 0.8 },
  { pattern: /\bsign\s*in\b/i, type: 'title', weight: 0.8 },
  { pattern: /\bsign\s*up\b/i, type: 'title', weight: 0.7 },
  { pattern: /\bauthentication\b/i, type: 'title', weight: 0.9 },
  { pattern: /\bauthenticate\b/i, type: 'title', weight: 0.9 },
  { pattern: /\b2fa\b/i, type: 'title', weight: 0.9 },
  { pattern: /\btwo.?factor\b/i, type: 'title', weight: 0.9 },
  { pattern: /\bverification\s*code\b/i, type: 'title', weight: 0.85 },
  { pattern: /\bverify\s*(your)?\s*(identity|account)\b/i, type: 'title', weight: 0.85 },
  { pattern: /\bsecurity\s*question\b/i, type: 'title', weight: 0.9 },
  { pattern: /\benter\s*(your)?\s*pin\b/i, type: 'title', weight: 0.9 },
  { pattern: /\bunlock\b/i, type: 'title', weight: 0.6 },
  { pattern: /\bcredentials\b/i, type: 'title', weight: 0.85 },
  
  // 日本語パターン
  { pattern: /ログイン/i, type: 'title', weight: 0.8 },
  { pattern: /ログオン/i, type: 'title', weight: 0.8 },
  { pattern: /サインイン/i, type: 'title', weight: 0.8 },
  { pattern: /パスワード/i, type: 'title', weight: 0.9 },
  { pattern: /認証/i, type: 'title', weight: 0.85 },
  { pattern: /二段階認証/i, type: 'title', weight: 0.95 },
  { pattern: /二要素認証/i, type: 'title', weight: 0.95 },
  { pattern: /確認コード/i, type: 'title', weight: 0.85 },
  { pattern: /暗証番号/i, type: 'title', weight: 0.95 },
  { pattern: /セキュリティコード/i, type: 'title', weight: 0.9 },
  { pattern: /本人確認/i, type: 'title', weight: 0.85 },
];

// URLベースの検出パターン
const URL_PATTERNS: DetectionPattern[] = [
  { pattern: /\/login\b/i, type: 'url', weight: 0.85 },
  { pattern: /\/signin\b/i, type: 'url', weight: 0.85 },
  { pattern: /\/sign-in\b/i, type: 'url', weight: 0.85 },
  { pattern: /\/auth\b/i, type: 'url', weight: 0.8 },
  { pattern: /\/authenticate\b/i, type: 'url', weight: 0.85 },
  { pattern: /\/password\b/i, type: 'url', weight: 0.9 },
  { pattern: /\/2fa\b/i, type: 'url', weight: 0.95 },
  { pattern: /\/mfa\b/i, type: 'url', weight: 0.95 },
  { pattern: /\/verify\b/i, type: 'url', weight: 0.7 },
  { pattern: /\/security\b/i, type: 'url', weight: 0.6 },
  { pattern: /\/oauth\b/i, type: 'url', weight: 0.75 },
  { pattern: /\/sso\b/i, type: 'url', weight: 0.8 },
  { pattern: /accounts\.google\.com/i, type: 'url', weight: 0.85 },
  { pattern: /login\.microsoft\.com/i, type: 'url', weight: 0.85 },
  { pattern: /appleid\.apple\.com/i, type: 'url', weight: 0.85 },
  { pattern: /id\.apple\.com/i, type: 'url', weight: 0.85 },
  { pattern: /login\.yahoo\.com/i, type: 'url', weight: 0.85 },
  { pattern: /signin\.aws\.amazon\.com/i, type: 'url', weight: 0.9 },
  { pattern: /github\.com\/login/i, type: 'url', weight: 0.85 },
  { pattern: /gitlab\.com\/users\/sign_in/i, type: 'url', weight: 0.85 },
];

// OCRベースの検出パターン（スクリーンショットのテキストから検出）
const OCR_PATTERNS: RegExp[] = [
  /type\s*=\s*["']password["']/i,
  /●{4,}/,                    // マスク文字（●●●●）
  /\*{4,}/,                   // マスク文字（****）
  /•{4,}/,                    // マスク文字（••••）
  /パスワードを入力/i,
  /enter\s*(your)?\s*password/i,
  /forgot\s*(your)?\s*password/i,
  /パスワードを忘れた/i,
  /remember\s*me/i,
  /ログイン状態を保持/i,
  /stay\s*signed\s*in/i,
];

/**
 * パスワード画面検出サービス
 */
export class PasswordDetectionService {
  private customExcludeKeywords: string[] = [];
  private isEnabled: boolean = true;

  constructor() {
    this.loadSettings();
  }

  /**
   * 設定を読み込み
   */
  private loadSettings(): void {
    try {
      const settingsService = getSettingsService();
      const settings = settingsService.getAll();
      
      // プライバシー設定から除外キーワードを取得
      this.customExcludeKeywords = settings.privacy?.excludeKeywords ?? [];
      this.isEnabled = settings.privacy?.passwordDetection ?? true;
    } catch (error) {
      console.warn('Failed to load password detection settings:', error);
    }
  }

  /**
   * 設定を更新
   */
  updateSettings(excludeKeywords?: string[], enabled?: boolean): void {
    if (excludeKeywords !== undefined) {
      this.customExcludeKeywords = excludeKeywords;
    }
    if (enabled !== undefined) {
      this.isEnabled = enabled;
    }
  }

  /**
   * パスワード画面かどうかを検出
   */
  detect(metadata: WindowMetadata, ocrText?: string): PasswordDetectionResult {
    // 機能が無効の場合はスキップ
    if (!this.isEnabled) {
      return {
        isPasswordScreen: false,
        matchedPattern: null,
        matchType: null,
        confidence: 0,
      };
    }

    const results: PasswordDetectionResult[] = [];

    // 1. カスタム除外キーワードをチェック
    const customResult = this.checkCustomKeywords(metadata, ocrText);
    if (customResult.isPasswordScreen) {
      results.push(customResult);
    }

    // 2. タイトルパターンをチェック
    if (metadata.windowTitle) {
      const titleResult = this.checkPatterns(
        metadata.windowTitle,
        TITLE_PATTERNS.filter(p => p.type === 'title')
      );
      if (titleResult.isPasswordScreen) {
        results.push(titleResult);
      }
    }

    // 3. URLパターンをチェック
    if (metadata.url) {
      const urlResult = this.checkPatterns(
        metadata.url,
        URL_PATTERNS
      );
      if (urlResult.isPasswordScreen) {
        results.push(urlResult);
      }
    }

    // 4. OCRパターンをチェック
    if (ocrText) {
      const ocrResult = this.checkOcrPatterns(ocrText);
      if (ocrResult.isPasswordScreen) {
        results.push(ocrResult);
      }
    }

    // 結果がない場合
    if (results.length === 0) {
      return {
        isPasswordScreen: false,
        matchedPattern: null,
        matchType: null,
        confidence: 0,
      };
    }

    // 最も信頼度が高い結果を返す
    const bestResult = results.reduce((best, current) => 
      current.confidence > best.confidence ? current : best
    );

    // 複数のパターンがマッチした場合は信頼度を上げる
    if (results.length > 1) {
      bestResult.confidence = Math.min(1, bestResult.confidence + 0.1 * (results.length - 1));
    }

    return bestResult;
  }

  /**
   * カスタム除外キーワードをチェック
   */
  private checkCustomKeywords(
    metadata: WindowMetadata,
    ocrText?: string
  ): PasswordDetectionResult {
    for (const keyword of this.customExcludeKeywords) {
      if (!keyword.trim()) continue;

      const lowerKeyword = keyword.toLowerCase();
      
      // タイトルをチェック
      if (metadata.windowTitle?.toLowerCase().includes(lowerKeyword)) {
        return {
          isPasswordScreen: true,
          matchedPattern: keyword,
          matchType: 'keyword',
          confidence: 1.0, // カスタムキーワードは100%信頼
        };
      }

      // URLをチェック
      if (metadata.url?.toLowerCase().includes(lowerKeyword)) {
        return {
          isPasswordScreen: true,
          matchedPattern: keyword,
          matchType: 'keyword',
          confidence: 1.0,
        };
      }

      // OCRテキストをチェック
      if (ocrText?.toLowerCase().includes(lowerKeyword)) {
        return {
          isPasswordScreen: true,
          matchedPattern: keyword,
          matchType: 'keyword',
          confidence: 1.0,
        };
      }
    }

    return {
      isPasswordScreen: false,
      matchedPattern: null,
      matchType: null,
      confidence: 0,
    };
  }

  /**
   * パターンをチェック
   */
  private checkPatterns(
    text: string,
    patterns: DetectionPattern[]
  ): PasswordDetectionResult {
    for (const { pattern, type, weight } of patterns) {
      if (pattern.test(text)) {
        return {
          isPasswordScreen: true,
          matchedPattern: pattern.source,
          matchType: type,
          confidence: weight,
        };
      }
    }

    return {
      isPasswordScreen: false,
      matchedPattern: null,
      matchType: null,
      confidence: 0,
    };
  }

  /**
   * OCRパターンをチェック
   */
  private checkOcrPatterns(ocrText: string): PasswordDetectionResult {
    for (const pattern of OCR_PATTERNS) {
      if (pattern.test(ocrText)) {
        return {
          isPasswordScreen: true,
          matchedPattern: pattern.source,
          matchType: 'ocr',
          confidence: 0.85, // OCRは若干低めの信頼度
        };
      }
    }

    return {
      isPasswordScreen: false,
      matchedPattern: null,
      matchType: null,
      confidence: 0,
    };
  }

  /**
   * 簡易チェック（OCRなし）
   */
  quickCheck(metadata: WindowMetadata): boolean {
    if (!this.isEnabled) {
      return false;
    }

    const result = this.detect(metadata);
    return result.isPasswordScreen;
  }

  /**
   * 現在の除外キーワードを取得
   */
  getExcludeKeywords(): string[] {
    return [...this.customExcludeKeywords];
  }

  /**
   * 除外キーワードを追加
   */
  addExcludeKeyword(keyword: string): void {
    if (!this.customExcludeKeywords.includes(keyword)) {
      this.customExcludeKeywords.push(keyword);
      this.saveSettings();
    }
  }

  /**
   * 除外キーワードを削除
   */
  removeExcludeKeyword(keyword: string): void {
    const index = this.customExcludeKeywords.indexOf(keyword);
    if (index > -1) {
      this.customExcludeKeywords.splice(index, 1);
      this.saveSettings();
    }
  }

  /**
   * 設定を保存
   */
  private saveSettings(): void {
    try {
      const settingsService = getSettingsService();
      settingsService.set('privacy.excludeKeywords', this.customExcludeKeywords);
    } catch (error) {
      console.error('Failed to save password detection settings:', error);
    }
  }

  /**
   * パスワード検出を有効/無効にする
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    try {
      const settingsService = getSettingsService();
      settingsService.set('privacy.passwordDetection', enabled);
    } catch (error) {
      console.error('Failed to save password detection enabled state:', error);
    }
  }

  /**
   * 有効かどうかを取得
   */
  isDetectionEnabled(): boolean {
    return this.isEnabled;
  }
}

// シングルトンインスタンス
let passwordDetectionService: PasswordDetectionService | null = null;

export function getPasswordDetectionService(): PasswordDetectionService {
  if (!passwordDetectionService) {
    passwordDetectionService = new PasswordDetectionService();
  }
  return passwordDetectionService;
}

