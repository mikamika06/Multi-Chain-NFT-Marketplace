import { Field, InputType } from '@nestjs/graphql';
import { IsOptional, IsString } from 'class-validator';

@InputType()
export class TokenFilterInput {
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  collectionId?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  owner?: string;
}
