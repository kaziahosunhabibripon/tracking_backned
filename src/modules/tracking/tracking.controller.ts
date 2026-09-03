import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Logger,
  Param,
  Req,
  Res,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import { ClickNotFoundError, ClickService } from './click.service';

/**
 * Browser-facing click redirect. Two responsibilities:
 *  1. Set a `_tk_click` httpOnly cookie so a same-origin landing page
 *     can identify the visitor across pages.
 *  2. 302 redirect to the campaign's previewLink.
 *
 * `Throttle({ default: { ttl: 1000, limit: 30 } })` caps each IP at 30
 * redirects / second — high enough for ad networks bursting many clicks
 * concurrently, low enough that a script kiddie can't OOM the DB.
 */
@Controller('r')
export class TrackingController {
  private readonly logger = new Logger(TrackingController.name);

  constructor(private readonly clickService: ClickService) {}

  @Public()
  @Throttle({ default: { ttl: 1000, limit: 30 } })
  @Get(':slug')
  async redirect(
    @Param('slug') slug: string,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    if (!/^[a-z0-9-]{1,80}$/.test(slug)) {
      throw new HttpException('Invalid slug', HttpStatus.BAD_REQUEST);
    }
    const ip = (req.ip ?? req.socket.remoteAddress ?? '0.0.0.0').toString();
    const ua = (req.headers['user-agent'] ?? '').toString();
    const referrer = this.headerString(req.headers['referer']);
    const source = this.headerString(req.headers['x-source']);

    try {
      const result = await this.clickService.record({
        campaignSlug: slug,
        ip,
        userAgent: ua,
        referrer,
        source,
      });
      res.setHeader(
        'Set-Cookie',
        `_tk_click=${result.clickId}; Path=/; Max-Age=2592000; HttpOnly; SameSite=Lax`,
      );
      res.redirect(302, result.redirectUrl);
    } catch (err) {
      if (err instanceof ClickNotFoundError) {
        // Don't leak which slug is wrong — same 404 either way.
        res.status(404).json({ message: 'Not found' });
        return;
      }
      this.logger.error(
        `Click record failed for slug="${slug}" ip=${ip}: ${(err as Error).message}`,
      );
      res.status(500).json({ message: 'Tracking error' });
    }
  }

  private headerString(value: string | string[] | undefined): string | null {
    if (value === undefined) return null;
    if (Array.isArray(value)) return value[0] ?? null;
    return value;
  }
}
