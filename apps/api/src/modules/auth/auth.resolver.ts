import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { AuthService } from './auth.service';
import { AuthResponse } from './dto/auth-response.dto';
import { LoginInput } from './dto/login.input';

@Resolver()
export class AuthResolver {
  constructor(private authService: AuthService) {}

  @Query(() => String, { description: 'Generate nonce for SIWE authentication' })
  async getNonce(): Promise<string> {
    return this.authService.generateNonce();
  }

  @Mutation(() => AuthResponse, { description: 'Login with SIWE message and signature' })
  async login(@Args({ name: 'input', type: () => LoginInput }) input: LoginInput): Promise<AuthResponse> {
    const result = await this.authService.verifySiweAndLogin(
      input.message,
      input.signature,
    );

    return {
      accessToken: result.accessToken,
      user: result.user,
    };
  }
}
