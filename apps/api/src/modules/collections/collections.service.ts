import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Collection } from './entities/collection.entity';
import { CollectionFilterInput } from './dto/collection-filter.input';
import { PrismaService } from '../../common/database/prisma.service';
import { mapCollection } from '../../common/mappers/graphql-mappers';

@Injectable()
export class CollectionsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(filter?: CollectionFilterInput): Promise<Collection[]> {
    const andFilters: Prisma.CollectionWhereInput[] = [];

    if (filter?.chainId) {
      andFilters.push({
        chainId: filter.chainId,
      });
    }

    if (filter?.search) {
      andFilters.push({
        OR: [
          { name: { contains: filter.search, mode: 'insensitive' } },
          { slug: { contains: filter.search, mode: 'insensitive' } },
        ],
      });
    }

    const collections = await this.prisma.collection.findMany({
      where: andFilters.length ? { AND: andFilters } : undefined,
      orderBy: { name: 'asc' },
    });

    return collections.map(mapCollection);
  }

  async findById(id: string): Promise<Collection | null> {
    const collection = await this.prisma.collection.findUnique({
      where: { id },
    });

    return collection ? mapCollection(collection) : null;
  }
}
