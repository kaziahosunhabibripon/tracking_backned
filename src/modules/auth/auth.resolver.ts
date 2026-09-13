import { Args, Context, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Throttle } from '@nestjs/throttler';
import { Response } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { UnauthorizedException } from '../../common/errors/app.exception';
import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { AUTH_THROTTLE, REFRESH_TOKEN_COOKIE } from './auth.constants';
import { AuthService } from './auth.service';
import { CookieService } from './cookie.service';
import { RegisterAffiliateInput } from './dto/register-affiliate.input';
import { SignInInput } from './dto/sign-in.input';
import type { AuthenticatedUser } from './interfaces/authenticated-user.interface';
import { AuthPayload } from './models/auth-payload.model';

type GqlContext = {
  req: {
    cookies?: Record<string, string | undefined>;
    headers?: Record<string, string | string[] | undefined>;
    ip?: string;
  };
  res: Response;
};

/** Capture the calling device so a session can be shown/labelled later. */
function sessionMeta(ctx: GqlContext) {
  const ua = ctx.req.headers?.['user-agent'];
  return {
    userAgent: (Array.isArray(ua) ? ua[0] : ua) ?? null,
    ipAddress: ctx.req.ip ?? null,
  };
}

@Resolver()
export class AuthResolver {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
    private readonly cookieService: CookieService,
  ) {}

  @Public()
  @Throttle(AUTH_THROTTLE)
  @Mutation(() => AuthPayload, {
    description: 'Affiliate self-registration ("Apply Now" on /sign-up).',
  })
  async registerAffiliate(
    @Args('input') input: RegisterAffiliateInput,
    @Context() ctx: GqlContext,
  ) {
    const payload = await this.authService.registerAffiliate(
      input,
      sessionMeta(ctx),
    );
    this.cookieService.setAuthCookies(ctx.res, payload);
    return payload;
  }

  @Public()
  @Throttle(AUTH_THROTTLE)
  @Mutation(() => AuthPayload)
  async signIn(@Args('input') input: SignInInput, @Context() ctx: GqlContext) {
    const payload = await this.authService.signIn(input, sessionMeta(ctx));
    this.cookieService.setAuthCookies(ctx.res, payload);
    return payload;
  }

  @Public()
  @Throttle(AUTH_THROTTLE)
  @Mutation(() => AuthPayload, {
    description:
      'Rotate the refresh session (reads the httpOnly refresh cookie).',
  })
  async refreshSession(@Context() ctx: GqlContext) {
    const raw = ctx.req.cookies?.[REFRESH_TOKEN_COOKIE];
    if (!raw) {
      throw new UnauthorizedException('No session to refresh.');
    }
    const payload = await this.authService.refreshSession(raw);
    this.cookieService.setAuthCookies(ctx.res, payload);
    return payload;
  }

  @Public()
  @Throttle(AUTH_THROTTLE)
  @Mutation(() => Boolean, {
    description: 'Revoke the current session and clear auth cookies.',
  })
  async logout(@Context() ctx: GqlContext) {
    await this.authService.logout(ctx.req.cookies?.[REFRESH_TOKEN_COOKIE]);
    this.cookieService.clearAuthCookies(ctx.res);
    return true;
  }

  @Query(() => User)
  async me(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.findById(user.sub);
  }
}
