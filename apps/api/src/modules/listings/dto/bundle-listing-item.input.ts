import { Field, InputType, Int } from '@nestjs/graphql';
import { IsInt, IsOptional, IsPositive, IsString } from 'class-validator';

@InputType()
export class BundleListingItemInput {
  @Field(() => String)
  @IsString()
  tokenPk!: string;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @IsPositive()
  quantity?: number;
}
