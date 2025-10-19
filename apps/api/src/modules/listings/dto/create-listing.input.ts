import { Field, InputType } from '@nestjs/graphql';
import { IsEnum, IsISO8601, IsOptional, IsString } from 'class-validator';
import { ListingType } from '../entities/listing.entity';

@InputType()
export class CreateListingInput {
  @Field(() => String)
  @IsString()
  tokenPk!: string;

  @Field(() => ListingType)
  @IsEnum(ListingType)
  type!: ListingType;

  @Field(() => String)
  @IsString()
  price!: string;

  @Field(() => String)
  @IsISO8601()
  startTs!: string;

  @Field(() => String)
  @IsISO8601()
  endTs!: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  reservePrice?: string | null;
}
