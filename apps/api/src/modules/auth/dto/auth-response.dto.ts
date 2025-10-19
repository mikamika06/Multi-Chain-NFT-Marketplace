import { ObjectType, Field } from '@nestjs/graphql';
import { User } from '../entities/user.entity';

@ObjectType()
export class AuthResponse {
  @Field(() => String, { description: 'JWT access token' })
  accessToken: string;

  @Field(() => User, { description: 'Authenticated user' })
  user: User;
}
