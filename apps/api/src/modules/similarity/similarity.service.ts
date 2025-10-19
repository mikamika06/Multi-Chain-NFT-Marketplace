import { Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { Prisma, Token as TokenModel } from '@prisma/client';
import { PrismaService } from '../../common/database/prisma.service';
import { AiClientService } from '../ai/ai-client.service';
import { SimilarityResult } from './entities/similarity-result.entity';
import { mapToken } from '../../common/mappers/graphql-mappers';

@Injectable()
export class SimilarityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiClient: AiClientService,
  ) {}

  async getSimilarTokens(tokenPk: string, topK: number): Promise<SimilarityResult[]> {
    const token = await this.prisma.token.findUnique({
      where: { id: tokenPk },
      include: {
        collection: true,
      },
    });

    if (!token) {
      throw new NotFoundException(`Token ${tokenPk} not found`);
    }

    const embedding = this.buildEmbedding(token);

    try {
      const similar = await this.aiClient.fetchSimilar(
        {
          tokenPk,
          embedding,
          topK,
        },
        `similarity:${tokenPk}:${topK}`,
      );

      if (!similar.length) {
        return [];
      }

      const tokens = await this.prisma.token.findMany({
        where: {
          id: {
            in: similar.map((item) => item.tokenPk),
          },
        },
        include: {
          collection: true,
        },
      });

      const tokenMap = new Map(tokens.map((item) => [item.id, mapToken(item)]));

      return similar.map((item) => ({
        tokenPk: item.tokenPk,
        score: item.score,
        token: tokenMap.get(item.tokenPk),
      }));
    } catch (error) {
      throw new ServiceUnavailableException('Similarity service is unavailable', {
        cause: error as Error,
      });
    }
  }

  private buildEmbedding(token: TokenModel & { attributesJson: Prisma.JsonValue | null }): number[] {
    const embedding: number[] = [];
    const seed = this.hashString(token.id);
    embedding.push((seed % 97) / 97);
    embedding.push(((Number(token.tokenId) || 0) % 113) / 113);

    if (token.attributesJson && typeof token.attributesJson === 'object') {
      const attributes = token.attributesJson as Record<string, unknown>;
      const keys = Object.keys(attributes)
        .map((key) => this.hashString(`${key}:${attributes[key]}`))
        .slice(0, 6);
      for (const keyHash of keys) {
        embedding.push(((keyHash % 9973) + 9973) % 9973 / 9973);
      }
    }

    while (embedding.length < 8) {
      embedding.push(0);
    }

    return embedding.slice(0, 8);
  }

  private hashString(value: string): number {
    let hash = 0;
    for (let i = 0; i < value.length; i += 1) {
      hash = (hash << 5) - hash + value.charCodeAt(i);
      hash |= 0;
    }
    return hash;
  }
}
