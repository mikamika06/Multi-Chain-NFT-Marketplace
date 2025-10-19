import { Field, Float, ObjectType } from '@nestjs/graphql';
import { Token } from '../../tokens/entities/token.entity';

@ObjectType()
export class Valuation {
  @Field(() => String)
  tokenPk!: string;

  @Field(() => String)
  fairPrice!: string;

  @Field(() => Float)
  confidence!: number;

  @Field(() => String)
  updatedAt!: string;

  @Field(() => String)
  modelVersion!: string;

  @Field(() => String, { nullable: true })
  features!: string | null;

  @Field(() => String, { nullable: true })
  expiresAt?: string | null;

  @Field(() => Token, { nullable: true })
  token?: Token;
}
