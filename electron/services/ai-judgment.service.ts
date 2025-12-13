/**
 * AI判定サービス
 * 2段階判定（変化検知→プロジェクト判定）でコストを最適化
 */

import { openaiClient, type ChatMessage } from './openai-client.service.js';
import { aiUsageRepository } from '../repositories/ai-usage.repository.js';
import type { Project } from '../../shared/types/api.js';

// 変化検知の結果
export interface ChangeDetectionResult {
  hasChange: boolean;
  confidence: number;
  reasoning: string;
  tokensUsed: number;
  cost: number;
}

// プロジェクト判定の結果
export interface ProjectJudgmentResult {
  projectId: string | null;
  projectName: string | null;
  confidence: number; // 0-100
  reasoning: string;
  alternatives: { projectId: string; projectName: string; score: number }[];
  isWork: boolean;
  tokensUsed: number;
  cost: number;
}

// スクリーンコンテキスト（判定に使用する情報）
export interface ScreenContext {
  windowTitle: string | null;
  appName: string | null;
  url: string | null;
  ocrText?: string | null;
  timestamp: string;
}

// 前回のスクリーンコンテキスト（変化検知用）
interface ScreenContextHistory {
  previous: ScreenContext | null;
  current: ScreenContext | null;
}

export class AIJudgmentService {
  private contextHistory: ScreenContextHistory = {
    previous: null,
    current: null,
  };

  private monthlyBudget = 2.0; // $2.00

  /**
   * 月間予算を設定
   */
  setMonthlyBudget(budget: number): void {
    this.monthlyBudget = budget;
  }

  /**
   * 予算内かチェック
   */
  isWithinBudget(): boolean {
    return aiUsageRepository.isWithinBudget(this.monthlyBudget);
  }

  /**
   * 予算ステータスを取得
   */
  getBudgetStatus() {
    return aiUsageRepository.getBudgetStatus(this.monthlyBudget);
  }

  /**
   * スクリーンコンテキストを更新
   */
  updateContext(context: ScreenContext): void {
    this.contextHistory.previous = this.contextHistory.current;
    this.contextHistory.current = context;
  }

  /**
   * 1次判定: 変化検知
   * 前回のコンテキストと比較して変化があるか判定
   */
  async detectChange(
    currentContext: ScreenContext,
    previousContext?: ScreenContext
  ): Promise<ChangeDetectionResult> {
    const prev = previousContext ?? this.contextHistory.previous;

    // 前回のコンテキストがない場合は変化ありとみなす
    if (!prev) {
      return {
        hasChange: true,
        confidence: 100,
        reasoning: '初回判定（前回のコンテキストなし）',
        tokensUsed: 0,
        cost: 0,
      };
    }

    // 明らかに変化がある場合はAPI呼び出しをスキップ（コスト削減）
    if (this.hasObviousChange(prev, currentContext)) {
      return {
        hasChange: true,
        confidence: 100,
        reasoning: 'アプリケーションまたはウィンドウの明確な変更',
        tokensUsed: 0,
        cost: 0,
      };
    }

    // 明らかに変化がない場合もスキップ
    if (this.isIdentical(prev, currentContext)) {
      return {
        hasChange: false,
        confidence: 100,
        reasoning: 'コンテキストに変化なし',
        tokensUsed: 0,
        cost: 0,
      };
    }

    // 予算チェック
    if (!this.isWithinBudget()) {
      console.warn('[AIJudgment] 予算超過のためAI判定をスキップ');
      return {
        hasChange: false,
        confidence: 0,
        reasoning: '予算超過のため判定スキップ',
        tokensUsed: 0,
        cost: 0,
      };
    }

    // AI判定
    const messages = this.buildChangeDetectionPrompt(prev, currentContext);
    const models = openaiClient.getModels();

    try {
      const result = await openaiClient.chatCompletion(messages, {
        model: models.changeDetection,
        temperature: 0.1,
        maxTokens: 100,
        requestType: 'change_detection',
      });

      const parsed = this.parseChangeDetectionResponse(result.content);

      return {
        hasChange: parsed.hasChange,
        confidence: parsed.confidence,
        reasoning: parsed.reasoning,
        tokensUsed: result.tokensIn + result.tokensOut,
        cost: result.cost,
      };
    } catch (error) {
      console.error('[AIJudgment] 変化検知エラー:', error);
      return {
        hasChange: false,
        confidence: 0,
        reasoning: `エラー: ${(error as Error).message}`,
        tokensUsed: 0,
        cost: 0,
      };
    }
  }

  /**
   * 2次判定: プロジェクト判定
   * スクリーンコンテキストからプロジェクトを判定
   */
  async judgeProject(
    context: ScreenContext,
    projects: Project[]
  ): Promise<ProjectJudgmentResult> {
    // 予算チェック
    if (!this.isWithinBudget()) {
      console.warn('[AIJudgment] 予算超過のためAI判定をスキップ');
      return {
        projectId: null,
        projectName: null,
        confidence: 0,
        reasoning: '予算超過のため判定スキップ',
        alternatives: [],
        isWork: true,
        tokensUsed: 0,
        cost: 0,
      };
    }

    // プロジェクトがない場合
    if (projects.length === 0) {
      return {
        projectId: null,
        projectName: null,
        confidence: 100,
        reasoning: 'プロジェクトが登録されていません',
        alternatives: [],
        isWork: true,
        tokensUsed: 0,
        cost: 0,
      };
    }

    const messages = this.buildProjectJudgmentPrompt(context, projects);
    const models = openaiClient.getModels();

    try {
      const result = await openaiClient.chatCompletion(messages, {
        model: models.projectJudgment,
        temperature: 0.3,
        maxTokens: 500,
        requestType: 'project_judgment',
      });

      const parsed = this.parseProjectJudgmentResponse(result.content, projects);

      return {
        ...parsed,
        tokensUsed: result.tokensIn + result.tokensOut,
        cost: result.cost,
      };
    } catch (error) {
      console.error('[AIJudgment] プロジェクト判定エラー:', error);
      return {
        projectId: null,
        projectName: null,
        confidence: 0,
        reasoning: `エラー: ${(error as Error).message}`,
        alternatives: [],
        isWork: true,
        tokensUsed: 0,
        cost: 0,
      };
    }
  }

  /**
   * 明らかな変化があるかチェック（API呼び出し不要）
   */
  private hasObviousChange(prev: ScreenContext, current: ScreenContext): boolean {
    // アプリが変わった
    if (prev.appName !== current.appName) {
      return true;
    }
    // URLのドメインが変わった
    if (prev.url && current.url) {
      try {
        const prevDomain = new URL(prev.url).hostname;
        const currentDomain = new URL(current.url).hostname;
        if (prevDomain !== currentDomain) {
          return true;
        }
      } catch {
        // URL解析失敗は無視
      }
    }
    return false;
  }

  /**
   * コンテキストが同一かチェック
   */
  private isIdentical(prev: ScreenContext, current: ScreenContext): boolean {
    return (
      prev.windowTitle === current.windowTitle &&
      prev.appName === current.appName &&
      prev.url === current.url
    );
  }

  /**
   * 変化検知用プロンプトを構築
   */
  private buildChangeDetectionPrompt(
    prev: ScreenContext,
    current: ScreenContext
  ): ChatMessage[] {
    const systemPrompt = `あなたは作業コンテキストの変化を検知するアシスタントです。
2つの作業状態を比較し、作業内容に意味のある変化があるかを判定してください。

回答形式（JSON）:
{
  "hasChange": true/false,
  "confidence": 0-100の数値,
  "reasoning": "判定理由（短く）"
}

変化ありと判定する例:
- 別のプロジェクトファイルを開いた
- 別のWebサイトを閲覧し始めた
- 異なるタスクに切り替えた

変化なしと判定する例:
- 同じドキュメント内のスクロール
- 同じサイト内のページ遷移
- ウィンドウのタイトルが微妙に変わっただけ`;

    const userPrompt = `前回の状態:
- アプリ: ${prev.appName ?? '不明'}
- ウィンドウ: ${prev.windowTitle ?? '不明'}
- URL: ${prev.url ?? 'なし'}

現在の状態:
- アプリ: ${current.appName ?? '不明'}
- ウィンドウ: ${current.windowTitle ?? '不明'}
- URL: ${current.url ?? 'なし'}

作業内容に意味のある変化がありますか？`;

    return [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ];
  }

  /**
   * プロジェクト判定用プロンプトを構築
   */
  private buildProjectJudgmentPrompt(
    context: ScreenContext,
    projects: Project[]
  ): ChatMessage[] {
    const projectList = projects
      .map((p) => `- ID: ${p.id}, 名前: "${p.name}", クライアント: "${p.clientName ?? '不明'}"`)
      .join('\n');

    const systemPrompt = `あなたは時間管理アシスタントです。
ユーザーの現在の作業状態から、どのプロジェクトで作業しているかを判定してください。

登録されているプロジェクト:
${projectList}

回答形式（JSON）:
{
  "projectId": "マッチしたプロジェクトのID（該当なしはnull）",
  "confidence": 0-100の信頼度スコア,
  "reasoning": "判定理由（1-2文で簡潔に）",
  "isWork": true/false（仕事関連かどうか）,
  "alternatives": [
    {"projectId": "代替候補のID", "score": 0-100}
  ]
}

判定のヒント:
- ウィンドウタイトルにプロジェクト名やクライアント名が含まれる場合は高信頼度
- URLからプロジェクトを推測できる場合がある
- 開発ツール、デザインツール等のアプリから作業内容を推測
- YouTubeやSNS等は仕事関連でない可能性が高い`;

    const userPrompt = `現在の作業状態:
- アプリ: ${context.appName ?? '不明'}
- ウィンドウ: ${context.windowTitle ?? '不明'}
- URL: ${context.url ?? 'なし'}
${context.ocrText ? `- 画面のテキスト: ${context.ocrText.substring(0, 500)}` : ''}

どのプロジェクトで作業していますか？`;

    return [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ];
  }

  /**
   * 変化検知レスポンスをパース
   */
  private parseChangeDetectionResponse(content: string): {
    hasChange: boolean;
    confidence: number;
    reasoning: string;
  } {
    try {
      // JSONブロックを抽出
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('JSON not found in response');
      }
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        hasChange: Boolean(parsed.hasChange),
        confidence: Number(parsed.confidence) || 50,
        reasoning: String(parsed.reasoning || ''),
      };
    } catch {
      console.warn('[AIJudgment] 変化検知レスポンスのパースに失敗:', content);
      return {
        hasChange: false,
        confidence: 0,
        reasoning: 'レスポンスのパースに失敗',
      };
    }
  }

  /**
   * プロジェクト判定レスポンスをパース
   */
  private parseProjectJudgmentResponse(
    content: string,
    projects: Project[]
  ): Omit<ProjectJudgmentResult, 'tokensUsed' | 'cost'> {
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('JSON not found in response');
      }
      const parsed = JSON.parse(jsonMatch[0]);

      // プロジェクトIDを検証
      const projectId = parsed.projectId ? String(parsed.projectId) : null;
      const matchedProject = projectId
        ? projects.find((p) => p.id === projectId)
        : null;

      // 代替候補を処理
      const alternatives = Array.isArray(parsed.alternatives)
        ? parsed.alternatives
            .map((alt: { projectId: string; score: number }) => {
              const project = projects.find((p) => p.id === String(alt.projectId));
              if (!project) return null;
              return {
                projectId: project.id,
                projectName: project.name,
                score: Number(alt.score) || 0,
              };
            })
            .filter(Boolean)
        : [];

      return {
        projectId: matchedProject?.id ?? null,
        projectName: matchedProject?.name ?? null,
        confidence: Number(parsed.confidence) || 0,
        reasoning: String(parsed.reasoning || ''),
        alternatives,
        isWork: parsed.isWork !== false,
      };
    } catch {
      console.warn('[AIJudgment] プロジェクト判定レスポンスのパースに失敗:', content);
      return {
        projectId: null,
        projectName: null,
        confidence: 0,
        reasoning: 'レスポンスのパースに失敗',
        alternatives: [],
        isWork: true,
      };
    }
  }

  /**
   * APIキーが設定されているか確認
   */
  hasApiKey(): boolean {
    return openaiClient.hasApiKey();
  }

  /**
   * APIキーを設定
   */
  setApiKey(apiKey: string): void {
    openaiClient.setApiKey(apiKey);
  }

  /**
   * APIキーをテスト
   */
  async testApiKey(): Promise<{ valid: boolean; error?: string }> {
    return openaiClient.testApiKey();
  }
}

// シングルトンインスタンス
export const aiJudgmentService = new AIJudgmentService();

