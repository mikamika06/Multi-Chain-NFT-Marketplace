import { Args, Int, Query, Resolver } from '@nestjs/graphql';
import { SimilarityResult } from './entities/similarity-result.entity';
import { SimilarityService } from './similarity.service';

@Resolver(() => SimilarityResult)
export class SimilarityResolver {
  constructor(private readonly similarityService: SimilarityService) {}

  @Query(() => [SimilarityResult], { name: 'similarTokens' })
  async getSimilarTokens(
    @Args({ name: 'tokenPk', type: () => String }) tokenPk: string,
    @Args({ name: 'topK', type: () => Int, nullable: true, defaultValue: 5 }) topK = 5,
  ): Promise<SimilarityResult[]> {
    return this.similarityService.getSimilarTokens(tokenPk, topK);
  }
}
