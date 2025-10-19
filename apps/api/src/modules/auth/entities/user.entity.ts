import { ObjectType, Field, ID, registerEnumType } from '@nestjs/graphql';
import { UserRole } from '@prisma/client';

registerEnumType(UserRole, {
  name: 'UserRole',
  description: 'User role in the system',
});

@ObjectType()
export class User {
  @Field(() => ID)
  id: string;

  @Field(() => String, { description: 'Wallet address' })
  wallet: string;

  @Field(() => String, { nullable: true, description: 'Email address' })
  email?: string;

  @Field(() => UserRole, { description: 'User role' })
  role: UserRole;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;
}
