import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Listing } from './entities/listing.entity';
import { ListingsService } from './listings.service';
import { CreateListingInput } from './dto/create-listing.input';
import { CreateEnglishAuctionInput } from './dto/create-english-auction.input';
import { CreateDutchAuctionInput } from './dto/create-dutch-auction.input';
import { CreateBundleListingInput } from './dto/create-bundle-listing.input';
import { BuyNowInput } from './dto/buy-now.input';
import { Sale } from '../sales/entities/sale.entity';

@Resolver(() => Listing)
export class ListingsResolver {
  constructor(private readonly listingsService: ListingsService) {}

  @Query(() => [Listing], { name: 'listings' })
  async getListings(): Promise<Listing[]> {
    return this.listingsService.findAll();
  }

  @Query(() => Listing, { name: 'listing', nullable: true })
  async getListing(@Args({ name: 'id', type: () => String }) id: string): Promise<Listing | null> {
    return this.listingsService.findById(id);
  }

  @Mutation(() => Listing, { name: 'createFixedListing' })
  async createListing(
    @Args({ name: 'input', type: () => CreateListingInput }) input: CreateListingInput,
  ): Promise<Listing> {
    return this.listingsService.create(input);
  }

  @Mutation(() => Listing, { name: 'createEnglishAuctionListing' })
  async createEnglishAuction(
    @Args({ name: 'input', type: () => CreateEnglishAuctionInput }) input: CreateEnglishAuctionInput,
  ): Promise<Listing> {
    return this.listingsService.createEnglishAuction(input);
  }

  @Mutation(() => Listing, { name: 'createDutchAuctionListing' })
  async createDutchAuction(
    @Args({ name: 'input', type: () => CreateDutchAuctionInput }) input: CreateDutchAuctionInput,
  ): Promise<Listing> {
    return this.listingsService.createDutchAuction(input);
  }

  @Mutation(() => Listing, { name: 'createBundleListing' })
  async createBundleListing(
    @Args({ name: 'input', type: () => CreateBundleListingInput }) input: CreateBundleListingInput,
  ): Promise<Listing> {
    return this.listingsService.createBundleListing(input);
  }

  @Mutation(() => Sale)
  async buyNow(
    @Args({ name: 'input', type: () => BuyNowInput }) input: BuyNowInput,
  ): Promise<Sale> {
    return this.listingsService.buyNow(input);
  }
}
