import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/database/prisma.service';
import { SiweMessage, generateNonce } from 'siwe';
import { User, UserRole } from '@prisma/client';

export interface JwtPayload {
  wallet: string;
  sub: string;
  role: UserRole;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  /**
   * Generate nonce for SIWE authentication
   */
  generateNonce(): string {
    return generateNonce();
  }

  /**
   * Verify SIWE message and signature, create/update user, return JWT
   */
  async verifySiweAndLogin(
    message: string,
    signature: string,
  ): Promise<{ accessToken: string; user: User }> {
    try {
      const siweMessage = new SiweMessage(message);
      
      const domain = this.configService.get<string>('SIWE_DOMAIN', 'localhost:3000');
      
      // Verify the signature
      const fields = await siweMessage.verify({ signature });

      if (!fields.success) {
        throw new UnauthorizedException('Invalid signature');
      }

      // Check domain and URI
      if (siweMessage.domain !== domain) {
        throw new UnauthorizedException('Invalid domain');
      }

      // Check expiration
      if (siweMessage.expirationTime && new Date(siweMessage.expirationTime) < new Date()) {
        throw new UnauthorizedException('Message expired');
      }

      // Check not before
      if (siweMessage.notBefore && new Date(siweMessage.notBefore) > new Date()) {
        throw new UnauthorizedException('Message not yet valid');
      }

      const wallet = siweMessage.address.toLowerCase();

      // Find or create user
      let user = await this.prisma.user.findUnique({
        where: { wallet },
      });

      if (!user) {
        user = await this.prisma.user.create({
          data: {
            wallet,
            role: UserRole.BUYER,
          },
        });
        this.logger.log(`New user created: ${wallet}`);
      }

      // Generate JWT
      const payload: JwtPayload = {
        wallet: user.wallet,
        sub: user.id,
        role: user.role,
      };

      const accessToken = this.jwtService.sign(payload);

      return {
        accessToken,
        user,
      };
    } catch (error) {
      this.logger.error('SIWE verification failed', error);
      throw new UnauthorizedException('Authentication failed');
    }
  }

  /**
   * Validate JWT payload and return user
   */
  async validateUser(payload: JwtPayload): Promise<User> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user;
  }

  /**
   * Get user by wallet address
   */
  async getUserByWallet(wallet: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { wallet: wallet.toLowerCase() },
    });
  }
}
