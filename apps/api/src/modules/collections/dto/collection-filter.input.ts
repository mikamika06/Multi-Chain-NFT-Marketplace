import { Field, InputType } from '@nestjs/graphql';
import { IsOptional, IsString } from 'class-validator';

@InputType()
export class CollectionFilterInput {
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  chainId?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  search?: string;
}
