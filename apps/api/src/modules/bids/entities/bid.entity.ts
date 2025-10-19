import { Field, ID, ObjectType } from '@nestjs/graphql';
import { Listing } from '../../listings/entities/listing.entity';

@ObjectType()
export class Bid {
  @Field(() => ID)
  id!: string;

  @Field(() => String)
  listingId!: string;

  @Field(() => String)
  bidder!: string;

  @Field(() => String)
  amount!: string;

  @Field(() => String)
  chainId!: string;

  @Field(() => String)
  createdAt!: string;

  @Field(() => String)
  status!: string;

  @Field(() => Listing, { nullable: true })
  listing?: Listing;
}
