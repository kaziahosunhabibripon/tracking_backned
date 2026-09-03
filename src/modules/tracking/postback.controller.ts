import {
  BadRequestException,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import { PostbackService } from './postback.service';

/**
 * S2S postback ingest. Form-encoded body (Everflow/Cake/HasOffers
 * convention) with HMAC-SHA256 signature in `X-Signature`.
 *
 * - `Public` because affiliate networks don't carry a JWT.
 * - `Throttle` per IP to limit replay floods.
 * - Raw body is captured for HMAC verification BEFORE body-parser
 *   mutates the payload (see main.ts `rawBody: true`).
 */
@Controller('postback')
export class PostbackController {
  private readonly logger = new Logger(PostbackController.name);

  constructor(private readonly postbackService: PostbackService) {}

  @Public()
  @Throttle({ default: { ttl: 1000, limit: 60 } })
  @Post(':campaignId')
  @HttpCode(HttpStatus.OK)
  async ingest(
    @Param('campaignId') campaignId: string,
    @Headers('x-signature') signature: string | undefined,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    if (!/^[0-9a-f-]{36}$/i.test(campaignId)) {
      throw new BadRequestException('Invalid campaignId.');
    }
    // Express captures the raw body via `verify` in bodyParser (main.ts).
    const rawBody =
      (req as unknown as { rawBody?: string }).rawBody ??
      (typeof req.body === 'string'
        ? req.body
        : JSON.stringify(req.body ?? {}));
    const params = this.flatten(req.body ?? {});

    const result = await this.postbackService.ingest({
      campaignId,
      rawBody,
      signature: signature ?? null,
      params,
    });

    if (!result.ok) {
      const statusByReason: Record<typeof result.reason, number> = {
        invalid_signature: 401,
        missing_txn_id: 400,
        click_not_found: 404,
        cap_blocked: 409,
        click_too_old: 410,
        campaign_mismatch: 400,
      };
      res
        .status(statusByReason[result.reason])
        .json({ ok: false, reason: result.reason });
      return;
    }

    res.status(200).json({
      ok: true,
      conversionId: result.conversionId,
      deduplicated: result.deduplicated,
    });
  }

  private flatten(body: unknown): Record<string, string> {
    if (body === null || body === undefined) return {};
    if (typeof body === 'string') {
      // Parse `key=value&key=value` form-encoded by hand because we read
      // the raw body as a string for HMAC verification.
      const out: Record<string, string> = {};
      for (const part of body.split('&')) {
        const [k, v = ''] = part.split('=');
        if (!k) continue;
        out[decodeURIComponent(k)] = decodeURIComponent(v);
      }
      return out;
    }
    if (typeof body === 'object') {
      const out: Record<string, string> = {};
      for (const [k, v] of Object.entries(body as Record<string, unknown>)) {
        // Positive typeof checks so `v` narrows away from `unknown` at the
        // String() call — a negated `typeof v === 'object'` guard does not.
        if (
          typeof v === 'string' ||
          typeof v === 'number' ||
          typeof v === 'boolean' ||
          typeof v === 'bigint'
        ) {
          out[k] = String(v);
        }
      }
      return out;
    }
    return {};
  }
}
