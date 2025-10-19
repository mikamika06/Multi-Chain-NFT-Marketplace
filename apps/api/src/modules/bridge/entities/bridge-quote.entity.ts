import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class BridgeQuote {
  @Field(() => String)
  dstChain!: string;

  @Field(() => String)
  estimatedFee!: string;

  @Field(() => Int)
  estimatedTimeSeconds!: number;
}
