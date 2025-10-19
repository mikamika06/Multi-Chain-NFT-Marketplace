import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type ValuationPayload = {
  tokenPk: string;
  lastSalePrice?: number | null;
  rarityScore: number;
  volume24h: number;
  socialMentions: number;
};

type SimilarityPayload = {
  tokenPk: string;
  embedding: number[];
  topK: number;
};

type FraudPayload = {
  entityType: string;
  entityId: string;
  price: number;
  collectionAgeDays: number;
  suspiciousMetadata: boolean;
  duplicateTxCount: number;
};

export type AiValuationResponse = {
  fairPrice: number;
  confidence: number;
  updatedAt: string;
  features: Record<string, number>;
};

export type AiSimilarityResponse = {
  tokenPk: string;
  score: number;
}[];

export type AiFraudResponse = {
  flag: string;
  score: number;
  reason: string;
};

@Injectable()
export class AiClientService {
  private readonly logger = new Logger(AiClientService.name);
  private readonly baseUrl: string;
  private readonly requestTimeoutMs = 5_000;

  constructor(private readonly configService: ConfigService) {
    this.baseUrl = this.configService.get<string>('AI_SERVICE_URL', 'http://localhost:8500');
  }

  async fetchValuation(
    payload: ValuationPayload,
    idempotencyKey?: string,
  ): Promise<AiValuationResponse> {
    const body = {
      token_pk: payload.tokenPk,
      last_sale_price: payload.lastSalePrice ?? null,
      rarity_score: payload.rarityScore,
      volume_24h: payload.volume24h,
      social_mentions: payload.socialMentions,
    };

    const result = await this.post('/valuation', body, idempotencyKey);
    return {
      fairPrice: result.fair_price,
      confidence: result.confidence,
      updatedAt: result.updated_at,
      features: result.features ?? {},
    };
  }

  async fetchSimilar(
    payload: SimilarityPayload,
    idempotencyKey?: string,
  ): Promise<AiSimilarityResponse> {
    const body = {
      token_pk: payload.tokenPk,
      embedding: payload.embedding,
      top_k: payload.topK,
    };

    const result = await this.post('/similarity', body, idempotencyKey);
    return Array.isArray(result)
      ? result.map((item: { token_pk: string; score: number }) => ({
          tokenPk: item.token_pk,
          score: item.score,
        }))
      : [];
  }

  async fetchFraudScore(
    payload: FraudPayload,
    idempotencyKey?: string,
  ): Promise<AiFraudResponse> {
    const body = {
      entity_type: payload.entityType,
      entity_id: payload.entityId,
      price: payload.price,
      collection_age_days: payload.collectionAgeDays,
      suspicious_metadata: payload.suspiciousMetadata,
      duplicate_tx_count: payload.duplicateTxCount,
    };

    const result = await this.post('/fraud-score', body, idempotencyKey);
    return {
      flag: result.flag,
      score: result.score,
      reason: result.reason,
    };
  }

  private async post(path: string, body: unknown, idempotencyKey?: string): Promise<any> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.requestTimeoutMs);

    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(idempotencyKey ? { 'x-idempotency-key': idempotencyKey } : {}),
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        const message = await this.safeReadError(response);
        this.logger.warn(
          `AI service responded with status ${response.status} (${response.statusText}): ${message}`,
        );
        throw new Error(`AI service error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      this.logger.error(`AI service request to ${path} failed`, error as Error);
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  private async safeReadError(response: Response): Promise<string> {
    try {
      const data = await response.json();
      return typeof data === 'string' ? data : JSON.stringify(data);
    } catch {
      return '';
    }
  }
}
