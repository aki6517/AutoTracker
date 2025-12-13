/**
 * OpenAI APIクライアントサービス
 * APIキーの管理、リクエスト送信、コスト計算を行う
 */

import OpenAI from 'openai';
import Store from 'electron-store';
import { requestQueue } from './request-queue.service.js';
import { aiUsageRepository } from '../repositories/ai-usage.repository.js';

// モデル価格設定（USD per 1M tokens）
// 参考: https://openai.com/pricing
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  // 現行モデル（gpt-5-nano/miniが利用可能になるまでの代替）
  'gpt-4o-mini': { input: 0.15, output: 0.60 },
  'gpt-4o': { input: 2.5, output: 10.0 },
  // 将来のモデル（価格は仮）
  'gpt-5-nano': { input: 0.05, output: 0.20 },
  'gpt-5-mini': { input: 0.10, output: 0.40 },
};

// デフォルトモデル設定
const DEFAULT_MODELS = {
  changeDetection: 'gpt-4o-mini', // 1次判定（変化検知）
  projectJudgment: 'gpt-4o-mini', // 2次判定（プロジェクト判定）
} as const;

// 設定ストア
const store = new Store({
  name: 'openai-config',
  encryptionKey: 'autotracker-secure-key', // 暗号化キー
  defaults: {
    apiKey: '',
    organization: '',
    models: DEFAULT_MODELS,
  },
});

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatCompletionResult {
  content: string;
  tokensIn: number;
  tokensOut: number;
  cost: number;
  model: string;
  finishReason: string;
}

export class OpenAIClient {
  private client: OpenAI | null = null;

  /**
   * APIキーを設定
   */
  setApiKey(apiKey: string): void {
    store.set('apiKey', apiKey);
    this.client = null; // クライアントをリセット
  }

  /**
   * APIキーを取得
   */
  getApiKey(): string {
    return store.get('apiKey') as string;
  }

  /**
   * APIキーが設定されているか確認
   */
  hasApiKey(): boolean {
    const apiKey = this.getApiKey();
    return !!apiKey && apiKey.length > 0;
  }

  /**
   * APIキーを削除
   */
  clearApiKey(): void {
    store.delete('apiKey');
    this.client = null;
  }

  /**
   * 組織IDを設定
   */
  setOrganization(organization: string): void {
    store.set('organization', organization);
    this.client = null;
  }

  /**
   * モデル設定を取得
   */
  getModels(): typeof DEFAULT_MODELS {
    return store.get('models') as typeof DEFAULT_MODELS;
  }

  /**
   * モデル設定を更新
   */
  setModels(models: Partial<typeof DEFAULT_MODELS>): void {
    const current = this.getModels();
    store.set('models', { ...current, ...models });
  }

  /**
   * OpenAIクライアントを取得（遅延初期化）
   */
  private getClient(): OpenAI {
    if (!this.client) {
      const apiKey = this.getApiKey();
      if (!apiKey) {
        throw new Error('OpenAI APIキーが設定されていません');
      }

      const organization = store.get('organization') as string;
      this.client = new OpenAI({
        apiKey,
        organization: organization || undefined,
      });
    }
    return this.client;
  }

  /**
   * チャット補完リクエストを送信
   */
  async chatCompletion(
    messages: ChatMessage[],
    options?: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
      requestType?: string;
    }
  ): Promise<ChatCompletionResult> {
    const model = options?.model ?? this.getModels().projectJudgment;

    return requestQueue.enqueue(async () => {
      const client = this.getClient();

      const response = await client.chat.completions.create({
        model,
        messages,
        temperature: options?.temperature ?? 0.3,
        max_tokens: options?.maxTokens ?? 500,
      });

      const choice = response.choices[0];
      const usage = response.usage;

      const tokensIn = usage?.prompt_tokens ?? 0;
      const tokensOut = usage?.completion_tokens ?? 0;
      const cost = this.calculateCost(model, tokensIn, tokensOut);

      // 使用ログを記録
      aiUsageRepository.create({
        model,
        tokensIn,
        tokensOut,
        cost,
        requestType: options?.requestType,
      });

      return {
        content: choice.message.content ?? '',
        tokensIn,
        tokensOut,
        cost,
        model,
        finishReason: choice.finish_reason ?? 'unknown',
      };
    });
  }

  /**
   * コストを計算
   */
  calculateCost(model: string, tokensIn: number, tokensOut: number): number {
    const pricing = MODEL_PRICING[model] ?? MODEL_PRICING['gpt-4o-mini'];
    const inputCost = (tokensIn / 1_000_000) * pricing.input;
    const outputCost = (tokensOut / 1_000_000) * pricing.output;
    return inputCost + outputCost;
  }

  /**
   * モデルの価格を取得
   */
  getModelPricing(model: string): { input: number; output: number } | null {
    return MODEL_PRICING[model] ?? null;
  }

  /**
   * 利用可能なモデル一覧を取得
   */
  getAvailableModels(): string[] {
    return Object.keys(MODEL_PRICING);
  }

  /**
   * APIキーをテスト（モデル一覧を取得）
   */
  async testApiKey(): Promise<{ valid: boolean; error?: string }> {
    try {
      const client = this.getClient();
      await client.models.list();
      return { valid: true };
    } catch (error) {
      const err = error as Error & { status?: number };
      if (err.status === 401) {
        return { valid: false, error: '無効なAPIキーです' };
      }
      return { valid: false, error: err.message };
    }
  }
}

// シングルトンインスタンス
export const openaiClient = new OpenAIClient();

