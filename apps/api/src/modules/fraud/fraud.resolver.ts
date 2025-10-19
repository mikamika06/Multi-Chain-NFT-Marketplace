import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { FraudService } from './fraud.service';
import { FraudFlagEntity } from './entities/fraud-flag.entity';
import { FraudEntityEnum } from './fraud.enums';
import { RequestFraudScoreInput } from './dto/request-fraud-score.input';

@Resolver(() => FraudFlagEntity)
export class FraudResolver {
  constructor(private readonly fraudService: FraudService) {}

  @Query(() => [FraudFlagEntity], { name: 'fraudFlags' })
  async getFraudFlags(
    @Args({ name: 'entityType', type: () => FraudEntityEnum, nullable: true })
    entityType?: FraudEntityEnum,
    @Args({ name: 'entityId', type: () => String, nullable: true }) entityId?: string,
    @Args({ name: 'resolved', type: () => Boolean, nullable: true }) resolved?: boolean,
  ): Promise<FraudFlagEntity[]> {
    return this.fraudService.listFlags({ entityType, entityId, resolved });
  }

  @Mutation(() => FraudFlagEntity, { name: 'requestFraudScore' })
  async requestFraudScore(
    @Args({ name: 'input', type: () => RequestFraudScoreInput }) input: RequestFraudScoreInput,
  ): Promise<FraudFlagEntity> {
    return this.fraudService.requestFraudScore(input);
  }

  @Mutation(() => FraudFlagEntity, { name: 'resolveFraudFlag' })
  async resolveFraudFlag(
    @Args({ name: 'id', type: () => String }) id: string,
    @Args({ name: 'reviewerId', type: () => String }) reviewerId: string,
    @Args({ name: 'resolutionNote', type: () => String, nullable: true }) resolutionNote?: string,
  ): Promise<FraudFlagEntity> {
    return this.fraudService.resolveFlag(id, reviewerId, resolutionNote);
  }
}
