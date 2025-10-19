import { Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/database/prisma.service';
import { Valuation } from './entities/valuation.entity';
import { mapValuation } from '../../common/mappers/graphql-mappers';
import { AiClientService } from '../ai/ai-client.service';
import { RequestValuationInput } from './dto/request-valuation.input';

@Injectable()
export class ValuationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiClient: AiClientService,
  ) {}

  async getValuation(tokenPk: string): Promise<Valuation | null> {
    const valuation = await this.prisma.aIValuation.findUnique({
      where: { tokenPk },
      include: {
        token: {
          include: {
            collection: true,
          },
        },
      },
    });

    return valuation ? mapValuation(valuation) : null;
  }

  async requestValuation(input: RequestValuationInput): Promise<Valuation> {
    const token = await this.prisma.token.findUnique({
      where: { id: input.tokenPk },
      include: {
        collection: true,
      },
    });

    if (!token) {
      throw new NotFoundException(`Token ${input.tokenPk} not found`);
    }

    const existing = await this.prisma.aIValuation.findUnique({
      where: { tokenPk: input.tokenPk },
      include: {
        token: {
          include: {
            collection: true,
          },
        },
      },
    });

    if (!input.forceRefresh && existing?.expiresAt) {
      const now = Date.now();
      if (existing.expiresAt.getTime() > now) {
        return mapValuation(existing);
      }
    }

    const modelVersion = await this.prisma.aIModelVersion.findFirst({
      where: {
        modelType: 'valuation',
        active: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const ttlSeconds = modelVersion?.ttlSeconds ?? 15 * 60;

    const lastSale = await this.prisma.sale.findFirst({
      where: { tokenPk: input.tokenPk },
      orderBy: {
        ts: 'desc',
      },
    });

    const rarityScore = this.estimateRarityScore(token.attributesJson);
    const volume24h = await this.estimateCollectionVolume(token.collectionId);

    try {
      const aiResponse = await this.aiClient.fetchValuation(
        {
          tokenPk: input.tokenPk,
          lastSalePrice: lastSale ? Number(lastSale.price) : null,
          rarityScore,
          volume24h,
          socialMentions: 0,
        },
        input.clientRequestId,
      );

      const expiresAt = ttlSeconds ? new Date(Date.now() + ttlSeconds * 1000) : null;
      const payload = {
        fairPrice: new Prisma.Decimal(aiResponse.fairPrice),
        confidence: aiResponse.confidence,
        featuresJson: aiResponse.features as Prisma.JsonValue,
        modelVersion: modelVersion?.version ?? 'baseline-v1',
        expiresAt,
      };

      const valuation = await this.prisma.aIValuation.upsert({
        where: { tokenPk: input.tokenPk },
        update: payload,
        create: {
          tokenPk: input.tokenPk,
          ...payload,
        },
        include: {
          token: {
            include: {
              collection: true,
            },
          },
        },
      });

      await this.prisma.activityLog.create({
        data: {
          actor: 'ai-service',
          action: 'VALUATION_UPDATED',
          metadata: {
            tokenPk: input.tokenPk,
            modelVersion: payload.modelVersion,
            fairPrice: aiResponse.fairPrice,
          },
        },
      });

      return mapValuation(valuation);
    } catch (error) {
      throw new ServiceUnavailableException(
        'AI valuation service is currently unavailable. Please retry shortly.',
        {
          cause: error as Error,
        },
      );
    }
  }

  private estimateRarityScore(attributesJson: Prisma.JsonValue | null): number {
    if (!attributesJson || typeof attributesJson !== 'object') {
      return 50;
    }

    const attributeCount = Object.keys(attributesJson as Record<string, unknown>).length;
    return Math.min(95, Math.max(30, 40 + attributeCount * 10));
  }

  private async estimateCollectionVolume(collectionId: string): Promise<number> {
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const sales = await this.prisma.sale.findMany({
      where: {
        token: {
          collectionId,
        },
        ts: {
          gte: dayAgo,
        },
      },
      select: {
        price: true,
      },
    });

    return sales.reduce((acc, sale) => acc + Number(sale.price), 0);
  }
}
