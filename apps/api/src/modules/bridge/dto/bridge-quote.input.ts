import { Field, InputType } from '@nestjs/graphql';
import { IsNumber, IsString, Min } from 'class-validator';

@InputType()
export class BridgeQuoteInput {
  @Field(() => String)
  @IsString()
  tokenId!: string;

  @Field(() => String)
  @IsString()
  dstChain!: string;

  @Field(() => Number, { defaultValue: 0.3 })
  @IsNumber()
  @Min(0)
  priorityMultiplier?: number = 0.3;
}
