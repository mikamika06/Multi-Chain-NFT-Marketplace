import { Field, InputType } from '@nestjs/graphql';
import { IsEthereumAddress, IsNotEmpty, IsNumberString, IsString } from 'class-validator';

@InputType()
export class BuyNowInput {
  @Field(() => String)
  @IsString()
  @IsNotEmpty()
  listingId!: string;

  @Field(() => String)
  @IsEthereumAddress()
  buyer!: string;

  @Field(() => String, { description: 'Paid amount in ETH string representation' })
  @IsNumberString()
  amount!: string;

  @Field(() => String, { description: 'Chain identifier (e.g. 1, 137, 42161)' })
  @IsString()
  chainId!: string;
}
