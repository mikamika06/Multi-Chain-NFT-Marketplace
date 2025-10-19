import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty, IsNumberString, IsOptional, IsString } from 'class-validator';

@InputType()
export class TransferCrossChainInput {
  @Field(() => String)
  @IsString()
  @IsNotEmpty()
  // Note: In production, use @IsUUID() and ensure tokens have UUID primary keys
  // Currently accepting string IDs for development (e.g., "token-cool-cats-1")
  tokenPk!: string;

  @Field(() => String)
  @IsString()
  @IsNotEmpty()
  dstChain!: string;

  @Field(() => String, { defaultValue: 'LAYERZERO' })
  @IsString()
  protocol: string = 'LAYERZERO';

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsNumberString()
  feeEstimate?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  clientRequestId?: string;
}
