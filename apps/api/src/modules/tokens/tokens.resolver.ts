import { Args, Query, Resolver } from '@nestjs/graphql';
import { Token } from './entities/token.entity';
import { TokensService } from './tokens.service';
import { TokenFilterInput } from './dto/token-filter.input';

@Resolver(() => Token)
export class TokensResolver {
  constructor(private readonly tokensService: TokensService) {}

  @Query(() => [Token], { name: 'tokens' })
  async getTokens(
    @Args({ name: 'filter', type: () => TokenFilterInput, nullable: true }) filter?: TokenFilterInput,
  ): Promise<Token[]> {
    return this.tokensService.findAll(filter);
  }

  @Query(() => Token, { name: 'token', nullable: true })
  async getToken(@Args({ name: 'id', type: () => String }) id: string): Promise<Token | null> {
    return this.tokensService.findById(id);
  }
}
