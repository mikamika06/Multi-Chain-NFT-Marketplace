import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Token } from './entities/token.entity';
import { TokenFilterInput } from './dto/token-filter.input';
import { PrismaService } from '../../common/database/prisma.service';
import { mapToken } from '../../common/mappers/graphql-mappers';

@Injectable()
export class TokensService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(filter?: TokenFilterInput): Promise<Token[]> {
    const where: Prisma.TokenWhereInput = {};

    if (filter?.collectionId) {
      where.collectionId = filter.collectionId;
    }

    if (filter?.owner) {
      where.owner = filter.owner.toLowerCase();
    }

    const tokens = await this.prisma.token.findMany({
      where,
      include: {
        collection: true,
      },
      orderBy: {
        mintedAt: 'desc',
      },
    });

    return tokens.map(mapToken);
  }

  async findById(id: string): Promise<Token | null> {
    const token = await this.prisma.token.findUnique({
      where: { id },
      include: {
        collection: true,
      },
    });

    return token ? mapToken(token) : null;
  }
}
