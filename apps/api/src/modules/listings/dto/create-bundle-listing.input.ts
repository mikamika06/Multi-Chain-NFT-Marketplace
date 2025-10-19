import { Field, InputType } from '@nestjs/graphql';
import { IsISO8601, IsString, ValidateNested, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';
import { BundleListingItemInput } from './bundle-listing-item.input';

@InputType()
export class CreateBundleListingInput {
  @Field(() => String)
  @IsString()
  bundleTokenPk!: string;

  @Field(() => String)
  @IsString()
  price!: string;

  @Field(() => String)
  @IsISO8601()
  startTs!: string;

  @Field(() => String)
  @IsISO8601()
  endTs!: string;

  @Field(() => [BundleListingItemInput])
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => BundleListingItemInput)
  items!: BundleListingItemInput[];
}
