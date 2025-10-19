import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { BridgeQuote } from './entities/bridge-quote.entity';
import { BridgeService } from './bridge.service';
import { BridgeQuoteInput } from './dto/bridge-quote.input';
import { BridgeEvent } from './entities/bridge-event.entity';
import { TransferCrossChainInput } from './dto/transfer-cross-chain.input';

@Resolver()
export class BridgeResolver {
  constructor(private readonly bridgeService: BridgeService) {}

  @Query(() => BridgeQuote, { name: 'bridgeQuote' })
  async getBridgeQuote(
    @Args({ name: 'input', type: () => BridgeQuoteInput }) input: BridgeQuoteInput,
  ): Promise<BridgeQuote> {
    return this.bridgeService.quote(input);
  }

  @Query(() => [BridgeEvent], { name: 'bridgeEvents' })
  async getBridgeEvents(): Promise<BridgeEvent[]> {
    return this.bridgeService.getEvents();
  }

  @Query(() => [BridgeEvent], { name: 'bridgeEventsByToken' })
  async getBridgeEventsByToken(
    @Args({ name: 'tokenPk', type: () => String }) tokenPk: string,
  ): Promise<BridgeEvent[]> {
    return this.bridgeService.getEventsByToken(tokenPk);
  }

  @Mutation(() => BridgeEvent, { name: 'transferCrossChain' })
  async transferCrossChain(
    @Args({ name: 'input', type: () => TransferCrossChainInput }) input: TransferCrossChainInput,
  ): Promise<BridgeEvent> {
    return this.bridgeService.registerTransfer(input);
  }
}
