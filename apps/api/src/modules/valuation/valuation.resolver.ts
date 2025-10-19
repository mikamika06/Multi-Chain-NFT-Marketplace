import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Valuation } from './entities/valuation.entity';
import { ValuationService } from './valuation.service';
import { RequestValuationInput } from './dto/request-valuation.input';

@Resolver(() => Valuation)
export class ValuationResolver {
  constructor(private readonly valuationService: ValuationService) {}

  @Query(() => Valuation, { name: 'valuation', nullable: true })
  async getValuation(
    @Args({ name: 'tokenPk', type: () => String }) tokenPk: string,
  ): Promise<Valuation | null> {
    return this.valuationService.getValuation(tokenPk);
  }

  @Mutation(() => Valuation, { name: 'requestValuation' })
  async requestValuation(
    @Args({ name: 'input', type: () => RequestValuationInput }) input: RequestValuationInput,
  ): Promise<Valuation> {
    return this.valuationService.requestValuation(input);
  }
}
