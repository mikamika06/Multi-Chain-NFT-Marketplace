import { Field, ID, ObjectType } from '@nestjs/graphql';
import { Token } from '../../tokens/entities/token.entity';

@ObjectType()
export class Sale {
  @Field(() => ID)
  id!: string;

  @Field(() => String)
  tokenPk!: string;

  @Field(() => String)
  price!: string;

  @Field(() => String)
  seller!: string;

  @Field(() => String)
  buyer!: string;

  @Field(() => String)
  chainId!: string;

  @Field(() => String)
  txHash!: string;

  @Field(() => String)
  ts!: string;

  @Field(() => Token, { nullable: true })
  token?: Token;
}
