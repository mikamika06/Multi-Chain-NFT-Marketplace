import { Field, Float, ID, ObjectType } from '@nestjs/graphql';
import { Token } from '../../tokens/entities/token.entity';

@ObjectType()
export class BridgeEvent {
  @Field(() => ID)
  id!: string;

  @Field(() => String)
  tokenPk!: string;

  @Field(() => String)
  srcChain!: string;

  @Field(() => String)
  dstChain!: string;

  @Field(() => String)
  protocol!: string;

  @Field(() => String)
  messageId!: string;

  @Field(() => String)
  status!: string;

  @Field(() => Float)
  fee!: number;

  @Field(() => String)
  createdAt!: string;

  @Field(() => Token, { nullable: true })
  token?: Token;
}
