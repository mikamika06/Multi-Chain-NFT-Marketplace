import { Field, InputType } from '@nestjs/graphql';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

@InputType()
export class RequestValuationInput {
  @Field(() => String)
  @IsString()
  tokenPk!: string;

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  forceRefresh?: boolean;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  clientRequestId?: string;
}
