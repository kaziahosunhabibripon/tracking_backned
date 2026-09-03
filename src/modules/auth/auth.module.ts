import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AffiliatesModule } from '../affiliates/affiliates.module';
import { UsersModule } from '../users/users.module';
import { AuthResolver } from './auth.resolver';
import { AuthService } from './auth.service';
import { CookieService } from './cookie.service';
import { GqlJwtAuthGuard } from './guards/gql-jwt-auth.guard';
import { RefreshTokenService } from './refresh-token.service';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    UsersModule,
    AffiliatesModule,
    PassportModule.register({
      defaultStrategy: 'jwt',
      session: false,
    }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('auth.jwtSecret'),
        signOptions: {
          expiresIn: (configService.get<string>('auth.jwtExpiresIn') ??
            '15m') as never,
        },
      }),
    }),
  ],
  providers: [
    AuthResolver,
    AuthService,
    CookieService,
    RefreshTokenService,
    JwtStrategy,
    GqlJwtAuthGuard,
  ],
  exports: [AuthService, CookieService, RefreshTokenService],
})
export class AuthModule {}
