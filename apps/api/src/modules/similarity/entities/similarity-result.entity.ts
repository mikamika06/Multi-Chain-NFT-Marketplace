import { Field, Float, ObjectType } from '@nestjs/graphql';
import { Token } from '../../tokens/entities/token.entity';

@ObjectType()
export class SimilarityResult {
  @Field(() => String)
  tokenPk!: string;

  @Field(() => Float)
  score!: number;

  @Field(() => Token, { nullable: true })
  token?: Token;
}
