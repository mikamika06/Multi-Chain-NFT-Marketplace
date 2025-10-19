import { Field, InputType } from '@nestjs/graphql';
import { IsEthereumAddress, IsNotEmpty, IsString } from 'class-validator';

@InputType()
export class WithdrawBidInput {
  @Field(() => String)
  @IsString()
  @IsNotEmpty()
  listingId!: string;

  @Field(() => String)
  @IsEthereumAddress()
  bidder!: string;
}
