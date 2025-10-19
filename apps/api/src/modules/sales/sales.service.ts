import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { Sale } from './entities/sale.entity';
import { mapSale } from '../../common/mappers/graphql-mappers';

@Injectable()
export class SalesService {
  constructor(private readonly prisma: PrismaService) {}

  async findRecent(limit = 10): Promise<Sale[]> {
    const sales = await this.prisma.sale.findMany({
      orderBy: {
        ts: 'desc',
      },
      take: limit,
      include: {
        token: {
          include: {
            collection: true,
          },
        },
      },
    });

    return sales.map(mapSale);
  }
}
