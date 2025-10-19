import { Field, InputType } from '@nestjs/graphql';
import { IsISO8601, IsOptional, IsString } from 'class-validator';

@InputType()
export class CreateEnglishAuctionInput {
  @Field(() => String)
  @IsString()
  tokenPk!: string;

  @Field(() => String)
  @IsString()
  startPrice!: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  reservePrice?: string | null;

  @Field(() => String)
  @IsISO8601()
  startTs!: string;

  @Field(() => String)
  @IsISO8601()
  endTs!: string;
}
