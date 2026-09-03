import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CookieOptions, Response } from 'express';
import { durationToSeconds } from '../../common/utils/duration.util';
import { resolveAppEnvironment } from '../../config/env-paths';
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from './auth.constants';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

/**
 * Delivers auth tokens as httpOnly + Secure + SameSite=Lax cookies (never
 * readable by JS -> XSS-safe).
 *
 * `COOKIE_DOMAIN` should normally stay blank, giving a host-only cookie bound
 * to the API's own hostname — these cookies are httpOnly so the frontend never
 * reads them, and the browser attaches them by request target, not page
 * origin. Set it only when a session genuinely must span multiple API hostnames.
 */
@Injectable()
export class CookieService {
  private readonly isProduction = resolveAppEnvironment() === 'production';

  constructor(private readonly configService: ConfigService) {}

  setAuthCookies(res: Response, tokens: AuthTokens): void {
    const accessMaxAge =
      durationToSeconds(
        this.configService.get<string>('auth.jwtExpiresIn') ?? '15m',
      ) * 1000;
    const refreshMaxAge =
      durationToSeconds(
        this.configService.get<string>('auth.refreshTokenExpiresIn') ?? '30d',
      ) * 1000;

    res.cookie(ACCESS_TOKEN_COOKIE, tokens.accessToken, {
      ...this.baseOptions(),
      maxAge: accessMaxAge,
    });
    res.cookie(REFRESH_TOKEN_COOKIE, tokens.refreshToken, {
      ...this.baseOptions(),
      maxAge: refreshMaxAge,
    });
  }

  clearAuthCookies(res: Response): void {
    res.clearCookie(ACCESS_TOKEN_COOKIE, this.baseOptions());
    res.clearCookie(REFRESH_TOKEN_COOKIE, this.baseOptions());
  }

  private baseOptions(): CookieOptions {
    const domain = this.configService.get<string>('auth.cookieDomain');
    return {
      httpOnly: true,
      secure: this.isProduction,
      sameSite: 'lax',
      path: '/',
      ...(domain ? { domain } : {}),
    };
  }
}
