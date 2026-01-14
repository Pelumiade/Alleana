import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { User } from '../users/entities/user.entity';
import { AuthResponseDto } from './dto/auth-response.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async validateUser(email: string, password: string): Promise<User | null> {
    return await this.usersService.validateUser(email, password);
  }

  async login(user: User): Promise<AuthResponseDto> {
    const payload = { email: user.email, sub: user.id, type: 'access' };
    const refreshPayload = { email: user.email, sub: user.id, type: 'refresh' };

    const accessTokenExpiresIn = this.configService.get<string>('JWT_EXPIRES_IN') || '24h';
    const refreshTokenExpiresIn = this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') || '7d';

    return {
      access_token: this.jwtService.sign(payload, {
        expiresIn: accessTokenExpiresIn as any,
      }),
      refresh_token: this.jwtService.sign(refreshPayload, {
        expiresIn: refreshTokenExpiresIn as any,
      }),
      user: {
        uuid: user.uuid,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
      },
    };
  }

  async refreshToken(refreshToken: string): Promise<{ access_token: string; refresh_token: string }> {
    try {
      const payload = this.jwtService.verify(refreshToken);
      
      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('Invalid token type');
      }

      const user = await this.usersService.findById(payload.sub);
      if (!user || !user.is_active) {
        throw new UnauthorizedException('User not found or inactive');
      }

      const accessPayload = { email: user.email, sub: user.id, type: 'access' };
      const refreshPayload = { email: user.email, sub: user.id, type: 'refresh' };

      const accessTokenExpiresIn = this.configService.get<string>('JWT_EXPIRES_IN') || '24h';
      const refreshTokenExpiresIn = this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') || '7d';

      return {
        access_token: this.jwtService.sign(accessPayload, {
          expiresIn: accessTokenExpiresIn as any,
        }),
        refresh_token: this.jwtService.sign(refreshPayload, {
          expiresIn: refreshTokenExpiresIn as any,
        }),
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }
}
