import { Field, Float, InputType, Int } from '@nestjs/graphql';
import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Min,
} from 'class-validator';
import { FraudEntityEnum } from '../fraud.enums';

@InputType()
export class RequestFraudScoreInput {
  @Field(() => FraudEntityEnum)
  @IsEnum(FraudEntityEnum)
  entityType!: FraudEntityEnum;

  @Field(() => String)
  @IsString()
  entityId!: string;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsPositive()
  collectionAgeDays?: number;

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  suspiciousMetadata?: boolean;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @Min(0)
  duplicateTxCount?: number;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  clientRequestId?: string;
}
