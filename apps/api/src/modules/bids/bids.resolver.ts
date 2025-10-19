import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Bid } from './entities/bid.entity';
import { BidsService } from './bids.service';
import { PlaceBidInput } from './dto/place-bid.input';
import { WithdrawBidInput } from './dto/withdraw-bid.input';

@Resolver(() => Bid)
export class BidsResolver {
  constructor(private readonly bidsService: BidsService) {}

  @Query(() => [Bid], { name: 'bids' })
  async getBids(
    @Args({ name: 'listingId', type: () => String }) listingId: string,
  ): Promise<Bid[]> {
    return this.bidsService.findAllByListing(listingId);
  }

  @Mutation(() => Bid)
  async placeBid(
    @Args({ name: 'input', type: () => PlaceBidInput }) input: PlaceBidInput,
  ): Promise<Bid> {
    return this.bidsService.placeBid(input);
  }

  @Mutation(() => String)
  async withdrawOverbid(
    @Args({ name: 'input', type: () => WithdrawBidInput }) input: WithdrawBidInput,
  ): Promise<string> {
    return this.bidsService.withdrawOverbid(input.listingId, input.bidder);
  }
}
