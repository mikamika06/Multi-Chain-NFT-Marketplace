import { Field, InputType } from '@nestjs/graphql';
import { IsISO8601, IsString } from 'class-validator';

@InputType()
export class CreateDutchAuctionInput {
  @Field(() => String)
  @IsString()
  tokenPk!: string;

  @Field(() => String)
  @IsString()
  startPrice!: string;

  @Field(() => String)
  @IsString()
  endPrice!: string;

  @Field(() => String)
  @IsISO8601()
  startTs!: string;

  @Field(() => String)
  @IsISO8601()
  endTs!: string;
}
