import { InputType, Field } from '@nestjs/graphql';
import { IsNotEmpty, IsString } from 'class-validator';

@InputType()
export class LoginInput {
  @Field(() => String, { description: 'SIWE message' })
  @IsString()
  @IsNotEmpty()
  message: string;

  @Field(() => String, { description: 'Signature of the SIWE message' })
  @IsString()
  @IsNotEmpty()
  signature: string;
}
