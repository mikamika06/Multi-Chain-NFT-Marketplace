import { Field, Float, ObjectType } from '@nestjs/graphql';
import { Token } from '../../tokens/entities/token.entity';
import { FraudEntityEnum } from '../fraud.enums';

@ObjectType()
export class FraudFlagEntity {
  @Field(() => String)
  id!: string;

  @Field(() => FraudEntityEnum)
  entityType!: FraudEntityEnum;

  @Field(() => String)
  entityId!: string;

  @Field(() => String)
  flag!: string;

  @Field(() => Float)
  score!: number;

  @Field(() => String)
  reason!: string;

  @Field(() => Boolean)
  resolved!: boolean;

  @Field(() => String)
  createdAt!: string;

  @Field(() => String, { nullable: true })
  reviewerId?: string | null;

  @Field(() => String, { nullable: true })
  resolutionNote?: string | null;

  @Field(() => String, { nullable: true })
  resolvedAt?: string | null;

  @Field(() => Token, { nullable: true })
  token?: Token;
}
