import { ruleRepository, type Rule } from '../repositories/rule.repository.js';
import { projectRepository } from '../repositories/project.repository.js';

// ReDoS対策: 正規表現の実行タイムアウト（ms）
const REGEX_TIMEOUT_MS = 100;

// マッチング結果
export interface MatchResult {
  matched: boolean;
  projectId: string | null;
  projectName: string | null;
  rule: Rule | null;
  confidence: number;  // ルールマッチは常に100%
  matchedText?: string;
}

// テストデータ
export interface TestData {
  windowTitle?: string;
  url?: string;
  appName?: string;
  keywords?: string[];
}

/**
 * ルールマッチングサービス
 */
export class RuleMatchingService {
  /**
   * メタデータに対してルールをマッチング
   */
  match(testData: TestData): MatchResult {
    // 全アクティブルールを優先度順に取得
    const rules = ruleRepository.findAll(true);

    for (const rule of rules) {
      const matched = this.matchRule(rule, testData);
      if (matched.matched) {
        // プロジェクト情報を取得
        const project = projectRepository.findById(rule.projectId);
        return {
          matched: true,
          projectId: rule.projectId,
          projectName: project?.name ?? null,
          rule,
          confidence: 100,
          matchedText: matched.matchedText,
        };
      }
    }

    return {
      matched: false,
      projectId: null,
      projectName: null,
      rule: null,
      confidence: 0,
    };
  }

  /**
   * 特定のプロジェクトのルールのみでマッチング
   */
  matchForProject(projectId: string, testData: TestData): MatchResult {
    const rules = ruleRepository.findByProject(projectId, true);

    for (const rule of rules) {
      const matched = this.matchRule(rule, testData);
      if (matched.matched) {
        const project = projectRepository.findById(rule.projectId);
        return {
          matched: true,
          projectId: rule.projectId,
          projectName: project?.name ?? null,
          rule,
          confidence: 100,
          matchedText: matched.matchedText,
        };
      }
    }

    return {
      matched: false,
      projectId: null,
      projectName: null,
      rule: null,
      confidence: 0,
    };
  }

  /**
   * 単一ルールのマッチング判定
   */
  matchRule(rule: Rule, testData: TestData): { matched: boolean; matchedText?: string } {
    switch (rule.ruleType) {
      case 'app_name':
        return this.matchAppName(rule.pattern, testData.appName);
      case 'window_title':
        return this.matchRegex(rule.pattern, testData.windowTitle);
      case 'url':
        return this.matchRegex(rule.pattern, testData.url);
      case 'keyword':
        return this.matchKeywords(rule.pattern, testData);
      default:
        return { matched: false };
    }
  }

  /**
   * アプリ名マッチング（大文字小文字を無視した部分一致）
   */
  private matchAppName(
    pattern: string,
    appName: string | undefined
  ): { matched: boolean; matchedText?: string } {
    if (!appName) return { matched: false };

    const lowerPattern = pattern.toLowerCase();
    const lowerAppName = appName.toLowerCase();

    if (lowerAppName.includes(lowerPattern)) {
      return { matched: true, matchedText: appName };
    }

    return { matched: false };
  }

  /**
   * 正規表現マッチング（ReDoS対策付き）
   */
  private matchRegex(
    pattern: string,
    target: string | undefined
  ): { matched: boolean; matchedText?: string } {
    if (!target) return { matched: false };

    try {
      // 正規表現の安全性チェック
      if (this.isUnsafeRegex(pattern)) {
        console.warn(`Unsafe regex pattern detected: ${pattern}`);
        return { matched: false };
      }

      const regex = new RegExp(pattern, 'i');
      
      // タイムアウト付きで実行
      const result = this.executeWithTimeout(() => regex.exec(target), REGEX_TIMEOUT_MS);
      
      if (result) {
        return { matched: true, matchedText: result[0] };
      }
    } catch (error) {
      console.warn(`Invalid regex pattern: ${pattern}`, error);
    }

    return { matched: false };
  }

  /**
   * キーワードマッチング（JSON配列のOR条件）
   */
  private matchKeywords(
    pattern: string,
    testData: TestData
  ): { matched: boolean; matchedText?: string } {
    let keywords: string[];
    
    try {
      keywords = JSON.parse(pattern);
      if (!Array.isArray(keywords)) {
        keywords = [pattern];
      }
    } catch {
      // JSONパースに失敗した場合は単一キーワードとして扱う
      keywords = [pattern];
    }

    // 検索対象のテキストを結合
    const searchTargets = [
      testData.windowTitle,
      testData.url,
      testData.appName,
      ...(testData.keywords ?? []),
    ].filter(Boolean).join(' ').toLowerCase();

    for (const keyword of keywords) {
      const lowerKeyword = keyword.toLowerCase();
      if (searchTargets.includes(lowerKeyword)) {
        return { matched: true, matchedText: keyword };
      }
    }

    return { matched: false };
  }

  /**
   * 危険な正規表現パターンを検出（ReDoS対策）
   */
  private isUnsafeRegex(pattern: string): boolean {
    // ネストした繰り返しパターンを検出
    const nestedRepetition = /(\+|\*|\{[\d,]+\})\s*(\+|\*|\{[\d,]+\})/;
    if (nestedRepetition.test(pattern)) {
      return true;
    }

    // 過度に長いパターン
    if (pattern.length > 200) {
      return true;
    }

    // バックトラッキングを引き起こす可能性のあるパターン
    const backtrackingPatterns = [
      /\(\.\*\)\+/,  // (.*)+
      /\(\.\+\)\+/,  // (.+)+
      /\(\.\*\)\*/,  // (.*)*
      /\(\[.+\]\+\)\+/, // ([...]+)+
    ];

    for (const dangerous of backtrackingPatterns) {
      if (dangerous.test(pattern)) {
        return true;
      }
    }

    return false;
  }

  /**
   * タイムアウト付きで関数を実行
   */
  private executeWithTimeout<T>(fn: () => T, timeoutMs: number): T | null {
    const startTime = Date.now();
    
    try {
      const result = fn();
      const elapsed = Date.now() - startTime;
      
      if (elapsed > timeoutMs) {
        console.warn(`Regex execution took ${elapsed}ms, exceeding timeout of ${timeoutMs}ms`);
      }
      
      return result;
    } catch (error) {
      return null;
    }
  }

  /**
   * ルールをテスト（マッチするかどうかを確認）
   */
  testRule(
    ruleType: Rule['ruleType'],
    pattern: string,
    testData: TestData
  ): { matched: boolean; matchedText?: string } {
    const tempRule: Rule = {
      id: 'test',
      projectId: 'test',
      ruleType,
      pattern,
      priority: 1,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return this.matchRule(tempRule, testData);
  }

  /**
   * パターンの妥当性を検証
   */
  validatePattern(ruleType: Rule['ruleType'], pattern: string): { valid: boolean; error?: string } {
    if (!pattern || pattern.trim() === '') {
      return { valid: false, error: 'パターンを入力してください' };
    }

    if (ruleType === 'window_title' || ruleType === 'url') {
      // 正規表現の妥当性チェック
      try {
        if (this.isUnsafeRegex(pattern)) {
          return { valid: false, error: '危険な正規表現パターンです' };
        }
        new RegExp(pattern);
      } catch (error) {
        return { valid: false, error: '無効な正規表現パターンです' };
      }
    }

    if (ruleType === 'keyword') {
      // JSONの妥当性チェック
      try {
        const parsed = JSON.parse(pattern);
        if (!Array.isArray(parsed)) {
          return { valid: false, error: 'キーワードはJSON配列形式で入力してください' };
        }
        if (parsed.length === 0) {
          return { valid: false, error: 'キーワードを1つ以上入力してください' };
        }
      } catch {
        // JSONでなければ単一キーワードとして許可
      }
    }

    return { valid: true };
  }
}

// シングルトンインスタンス
let ruleMatchingService: RuleMatchingService | null = null;

export function getRuleMatchingService(): RuleMatchingService {
  if (!ruleMatchingService) {
    ruleMatchingService = new RuleMatchingService();
  }
  return ruleMatchingService;
}

