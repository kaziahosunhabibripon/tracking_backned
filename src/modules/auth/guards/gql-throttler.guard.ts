import { ExecutionContext, Injectable } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { ThrottlerGuard } from '@nestjs/throttler';

type RequestLike = {
  headers: Record<string, string | string[] | undefined>;
  ip?: string;
};

type ResponseLike = {
  header: (name: string, value: string | number) => void;
};

@Injectable()
export class GqlThrottlerGuard extends ThrottlerGuard {
  private createFallbackRequest(): RequestLike {
    return {
      headers: {},
      ip: '127.0.0.1',
    };
  }

  private createFallbackResponse(): ResponseLike {
    return {
      header: () => undefined,
    };
  }

  protected shouldSkip(context: ExecutionContext): Promise<boolean> {
    if (context.getType<'http' | 'graphql'>() !== 'http') {
      return Promise.resolve(false);
    }

    const http = context.switchToHttp();
    const req = http.getRequest<{
      method?: string;
      path?: string;
      url?: string;
    }>();
    const requestPath = req?.path ?? req?.url ?? '';

    if (req?.method === 'GET' && requestPath.startsWith('/graphql')) {
      return Promise.resolve(true);
    }

    if (req?.method === 'OPTIONS') {
      return Promise.resolve(true);
    }

    return Promise.resolve(false);
  }

  getRequestResponse(context: ExecutionContext) {
    if (context.getType<'http' | 'graphql'>() === 'http') {
      const http = context.switchToHttp();
      const req = http.getRequest<RequestLike>();
      const res = http.getResponse<ResponseLike>();

      return {
        req: req ?? this.createFallbackRequest(),
        res: res ?? this.createFallbackResponse(),
      };
    }

    const ctx = GqlExecutionContext.create(context).getContext<{
      req?: RequestLike;
      request?: RequestLike;
      res?: ResponseLike;
    }>();
    const req = ctx.req ?? ctx.request;
    const res = ctx.res;

    return {
      req: req ?? this.createFallbackRequest(),
      res: res ?? this.createFallbackResponse(),
    };
  }
}
