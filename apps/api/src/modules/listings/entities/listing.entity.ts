import { Field, ID, ObjectType, registerEnumType } from '@nestjs/graphql';
import { Token } from '../../tokens/entities/token.entity';
import { BundleItem } from './bundle-item.entity';

export enum ListingType {
  FIXED = 'FIXED',
  AUCTION_EN = 'AUCTION_EN',
  AUCTION_DUTCH = 'AUCTION_DUTCH',
  BUNDLE = 'BUNDLE',
}

registerEnumType(ListingType, {
  name: 'ListingType',
});

@ObjectType()
export class Listing {
  @Field(() => ID)
  id!: string;

  @Field(() => String)
  tokenPk!: string;

  @Field(() => ListingType)
  type!: ListingType;

  @Field(() => String)
  price!: string;

  @Field(() => String, { nullable: true })
  startPrice?: string | null;

  @Field(() => String, { nullable: true })
  endPrice?: string | null;

  @Field(() => String)
  startTs!: string;

  @Field(() => String)
  endTs!: string;

  @Field(() => String, { nullable: true })
  reservePrice?: string | null;

  @Field(() => String)
  status!: string;

  @Field(() => Token, { nullable: true })
  token?: Token;

  @Field(() => [BundleItem], { nullable: true })
  bundleItems?: BundleItem[] | null;
}
