import { Field, ID, ObjectType } from '@nestjs/graphql';
import { Collection } from '../../collections/entities/collection.entity';

@ObjectType()
export class Token {
  @Field(() => ID)
  id!: string;

  @Field(() => String)
  collectionId!: string;

  @Field(() => String)
  tokenId!: string;

  @Field(() => String)
  chainId!: string;

  @Field(() => String)
  owner!: string;

  @Field(() => String)
  metadataUri!: string;

  @Field(() => String)
  imageUrl!: string;

  @Field(() => String)
  attributesJson!: string;

  @Field(() => String)
  mintedAt!: string;

  @Field(() => Collection, { nullable: true })
  collection?: Collection;
}
