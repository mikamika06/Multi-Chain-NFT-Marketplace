import {
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { FraudEntity } from '@prisma/client';
import { PrismaService } from '../../common/database/prisma.service';
import { AiClientService } from '../ai/ai-client.service';
import { RequestFraudScoreInput } from './dto/request-fraud-score.input';
import { FraudFlagEntity } from './entities/fraud-flag.entity';
import { mapFraudFlag } from '../../common/mappers/graphql-mappers';
import { FraudEntityEnum } from './fraud.enums';

type FraudQueryFilters = {
  entityType?: FraudEntityEnum;
  entityId?: string;
  resolved?: boolean;
};

@Injectable()
export class FraudService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiClient: AiClientService,
  ) {}

  async listFlags(filters: FraudQueryFilters): Promise<FraudFlagEntity[]> {
    const flags = await this.prisma.fraudFlag.findMany({
      where: {
        ...(filters.entityType ? { entityType: this.toPrismaEntity(filters.entityType) } : {}),
        ...(filters.entityId ? { entityId: filters.entityId } : {}),
        ...(typeof filters.resolved === 'boolean' ? { resolved: filters.resolved } : {}),
      },
      include: {
        token: {
          include: {
            collection: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return flags.map(mapFraudFlag);
  }

  async requestFraudScore(input: RequestFraudScoreInput): Promise<FraudFlagEntity> {
    const snapshot = await this.buildSnapshot(input);

    try {
      const aiResponse = await this.aiClient.fetchFraudScore(
        {
          entityType: snapshot.entityType,
          entityId: snapshot.entityId,
          price: snapshot.price,
          collectionAgeDays: snapshot.collectionAgeDays,
          suspiciousMetadata: snapshot.suspiciousMetadata,
          duplicateTxCount: snapshot.duplicateTxCount,
        },
        input.clientRequestId,
      );

      const flag = await this.prisma.fraudFlag.create({
        data: {
          entityType: this.toPrismaEntity(input.entityType),
          entityId: snapshot.entityId,
          flag: aiResponse.flag,
          score: aiResponse.score,
          reason: aiResponse.reason,
          resolved: false,
          tokenPk: snapshot.tokenPk ?? null,
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
          action: 'FRAUD_SCORE_RECORDED',
          metadata: {
            entityType: input.entityType,
            entityId: snapshot.entityId,
            flag: aiResponse.flag,
            score: aiResponse.score,
            tokenPk: snapshot.tokenPk,
          },
        },
      });

      return mapFraudFlag(flag);
    } catch (error) {
      throw new ServiceUnavailableException('Fraud scoring service failed', {
        cause: error as Error,
      });
    }
  }

  async resolveFlag(id: string, reviewerId: string, resolutionNote?: string): Promise<FraudFlagEntity> {
    const flag = await this.prisma.fraudFlag.update({
      where: { id },
      data: {
        resolved: true,
        reviewerId,
        resolutionNote: resolutionNote ?? null,
        resolvedAt: new Date(),
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
        actor: reviewerId,
        action: 'FRAUD_FLAG_RESOLVED',
        metadata: {
          flagId: id,
          resolutionNote,
        },
      },
    });

    return mapFraudFlag(flag);
  }

  private async buildSnapshot(
    input: RequestFraudScoreInput,
  ): Promise<{
    entityType: string;
    entityId: string;
    price: number;
    collectionAgeDays: number;
    suspiciousMetadata: boolean;
    duplicateTxCount: number;
    tokenPk?: string;
  }> {
    switch (input.entityType) {
      case FraudEntityEnum.TOKEN:
        return this.buildTokenSnapshot(input);
      case FraudEntityEnum.LISTING:
        return this.buildListingSnapshot(input);
      case FraudEntityEnum.COLLECTION:
        return this.buildCollectionSnapshot(input);
      case FraudEntityEnum.USER:
      default:
        return {
          entityType: 'user',
          entityId: input.entityId,
          price: input.price ?? 0,
          collectionAgeDays: input.collectionAgeDays ?? 0,
          suspiciousMetadata: input.suspiciousMetadata ?? false,
          duplicateTxCount: input.duplicateTxCount ?? 0,
          tokenPk: undefined,
        };
    }
  }

  private async buildTokenSnapshot(
    input: RequestFraudScoreInput,
  ): Promise<{
    entityType: string;
    entityId: string;
    price: number;
    collectionAgeDays: number;
    suspiciousMetadata: boolean;
    duplicateTxCount: number;
    tokenPk?: string;
  }> {
    const token = await this.prisma.token.findUnique({
      where: { id: input.entityId },
      include: {
        collection: true,
      },
    });

    if (!token) {
      throw new NotFoundException(`Token ${input.entityId} not found`);
    }

    const lastSale = await this.prisma.sale.findFirst({
      where: { tokenPk: token.id },
      orderBy: { ts: 'desc' },
    });

    const duplicateTxCount = await this.prisma.sale.count({
      where: {
        tokenPk: token.id,
        buyer: lastSale?.buyer ?? undefined,
      },
    });

    const metadataString = JSON.stringify(token.attributesJson ?? {});
    const suspiciousMetadata = input.suspiciousMetadata ?? metadataString.length < 12;

    const mintedDays = Math.floor(
      (Date.now() - token.mintedAt.getTime()) / (24 * 60 * 60 * 1000),
    );

    return {
      entityType: 'token',
      entityId: token.id,
      price: input.price ?? Number(lastSale?.price ?? 0),
      collectionAgeDays: input.collectionAgeDays ?? mintedDays,
      suspiciousMetadata,
      duplicateTxCount: input.duplicateTxCount ?? duplicateTxCount,
      tokenPk: token.id,
    };
  }

  private async buildListingSnapshot(
    input: RequestFraudScoreInput,
  ): Promise<{
    entityType: string;
    entityId: string;
    price: number;
    collectionAgeDays: number;
    suspiciousMetadata: boolean;
    duplicateTxCount: number;
    tokenPk?: string;
  }> {
    const listing = await this.prisma.listing.findUnique({
      where: { id: input.entityId },
      include: {
        token: {
          include: {
            collection: true,
          },
        },
      },
    });

    if (!listing?.token) {
      throw new NotFoundException(`Listing ${input.entityId} not found`);
    }

    const collectionAgeDays = Math.floor(
      (Date.now() - listing.token.mintedAt.getTime()) / (24 * 60 * 60 * 1000),
    );

    const duplicateTxCount = await this.prisma.sale.count({
      where: {
        tokenPk: listing.tokenPk,
        buyer: listing.token.owner,
      },
    });

    return {
      entityType: 'listing',
      entityId: listing.id,
      price: input.price ?? Number(listing.price),
      collectionAgeDays: input.collectionAgeDays ?? collectionAgeDays,
      suspiciousMetadata: input.suspiciousMetadata ?? !listing.token.imageUrl,
      duplicateTxCount: input.duplicateTxCount ?? duplicateTxCount,
      tokenPk: listing.tokenPk,
    };
  }

  private async buildCollectionSnapshot(
    input: RequestFraudScoreInput,
  ): Promise<{
    entityType: string;
    entityId: string;
    price: number;
    collectionAgeDays: number;
    suspiciousMetadata: boolean;
    duplicateTxCount: number;
    tokenPk?: string;
  }> {
    const collection = await this.prisma.collection.findUnique({
      where: { id: input.entityId },
    });

    if (!collection) {
      throw new NotFoundException(`Collection ${input.entityId} not found`);
    }

    const oldestToken = await this.prisma.token.findFirst({
      where: { collectionId: collection.id },
      orderBy: { mintedAt: 'asc' },
    });

    const collectionAgeDays =
      oldestToken?.mintedAt
        ? Math.floor((Date.now() - oldestToken.mintedAt.getTime()) / (24 * 60 * 60 * 1000))
        : input.collectionAgeDays ?? 0;

    const duplicateTxCount = await this.prisma.sale.count({
      where: {
        token: {
          collectionId: collection.id,
        },
      },
    });

    return {
      entityType: 'collection',
      entityId: collection.id,
      price: input.price ?? 0,
      collectionAgeDays,
      suspiciousMetadata: input.suspiciousMetadata ?? false,
      duplicateTxCount: input.duplicateTxCount ?? duplicateTxCount,
    };
  }

  private toPrismaEntity(entity: FraudEntityEnum): FraudEntity {
    return FraudEntity[entity as keyof typeof FraudEntity];
  }
}
