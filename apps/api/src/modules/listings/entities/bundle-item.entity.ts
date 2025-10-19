import { Field, ID, Int, ObjectType } from '@nestjs/graphql';
import { Token } from '../../tokens/entities/token.entity';

@ObjectType()
export class BundleItem {
  @Field(() => ID)
  id!: string;

  @Field(() => String)
  listingId!: string;

  @Field(() => String)
  tokenPk!: string;

  @Field(() => Int)
  quantity!: number;

  @Field(() => Token, { nullable: true })
  token?: Token;
}
