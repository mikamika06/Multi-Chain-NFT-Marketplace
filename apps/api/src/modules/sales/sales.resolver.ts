import { Args, Int, Query, Resolver } from '@nestjs/graphql';
import { Sale } from './entities/sale.entity';
import { SalesService } from './sales.service';

@Resolver(() => Sale)
export class SalesResolver {
  constructor(private readonly salesService: SalesService) {}

  @Query(() => [Sale], { name: 'recentSales' })
  async getRecentSales(
    @Args({ name: 'limit', type: () => Int, nullable: true }) limit?: number,
  ): Promise<Sale[]> {
    return this.salesService.findRecent(limit ?? 10);
  }
}
