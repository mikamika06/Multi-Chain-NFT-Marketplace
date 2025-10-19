import { Field, ID, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class Collection {
  @Field(() => ID)
  id!: string;

  @Field(() => String)
  chainId!: string;

  @Field(() => String)
  address!: string;

  @Field(() => String)
  slug!: string;

  @Field(() => String)
  name!: string;

  @Field(() => Boolean)
  verified!: boolean;

  @Field(() => Int)
  royaltyBps!: number;

  @Field(() => String)
  creatorWallet!: string;
}
