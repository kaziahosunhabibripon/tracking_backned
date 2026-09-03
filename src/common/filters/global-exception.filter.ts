import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Inject,
  Logger,
  Optional,
} from '@nestjs/common';
import { GqlArgumentsHost, GqlContextType } from '@nestjs/graphql';
import { GraphQLError } from 'graphql';
import { AppException, ErrorDetails } from '../errors/app.exception';
import { ErrorCode } from '../errors/error-codes';
import { ERROR_REPORTER_PORT } from '../monitoring/error-reporter.port';
import type { ErrorReporterPort } from '../monitoring/error-reporter.port';
import { resolveAppEnvironment } from '../../config/env-paths';

interface NormalizedError {
  code: string;
  message: string;
  status: number;
  details?: ErrorDetails;
  logMessage: string;
}

/**
 * Catches every unhandled error and returns a consistent, safe shape:
 * GraphQL -> error.extensions { code, requestId, timestamp, details? }.
 * Internal (5xx) details are logged, never leaked to clients in production.
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);
  private readonly isProduction = resolveAppEnvironment() === 'production';

  constructor(
    // Optional so the filter still works in tests that build it standalone.
    @Optional()
    @Inject(ERROR_REPORTER_PORT)
    private readonly reporter?: ErrorReporterPort,
  ) {}

  catch(exception: unknown, host: ArgumentsHost): GraphQLError | void {
    const requestId = this.resolveRequestId(host);
    const normalized = this.normalize(exception);

    if (normalized.status >= 500) {
      this.logger.error(
        `[${requestId ?? '-'}] ${normalized.code}: ${normalized.logMessage}`,
        exception instanceof Error ? exception.stack : undefined,
      );
      // Only unexpected failures are shipped. A 4xx (validation, unauthorized,
      // conflict...) is normal business flow, not a crash — reporting those
      // would bury real incidents in noise.
      this.reporter?.captureException(exception, {
        requestId,
        code: normalized.code,
      });
    } else {
      this.logger.warn(
        `[${requestId ?? '-'}] ${normalized.code}: ${normalized.logMessage}`,
      );
    }

    const extensions: Record<string, unknown> = {
      code: normalized.code,
      requestId,
      timestamp: new Date().toISOString(),
    };
    if (normalized.details) {
      extensions.details = normalized.details;
    }

    if (host.getType<GqlContextType>() === 'graphql') {
      return new GraphQLError(normalized.message, { extensions });
    }

    // HTTP fallback (REST controllers / webhooks)
    const httpCtx = host.switchToHttp();
    const response = httpCtx.getResponse<{
      status: (code: number) => { json: (body: unknown) => void };
    }>();
    response.status(normalized.status).json({
      error: { message: normalized.message, ...extensions },
    });
  }

  private normalize(exception: unknown): NormalizedError {
    if (exception instanceof AppException) {
      return {
        code: exception.code,
        message: exception.message,
        status: exception.getStatus(),
        details: exception.details,
        logMessage: exception.message,
      };
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const mapped = this.mapHttpException(status, exception.getResponse());
      return { ...mapped, status, logMessage: mapped.message };
    }

    return {
      code: ErrorCode.INTERNAL,
      message: this.isProduction
        ? 'Something went wrong. Please try again later.'
        : this.extractMessage(exception),
      status: 500,
      logMessage: this.extractMessage(exception),
    };
  }

  private mapHttpException(
    status: number,
    response: string | object,
  ): { code: string; message: string; details?: ErrorDetails } {
    const codeByStatus: Record<number, string> = {
      400: ErrorCode.BAD_REQUEST,
      401: ErrorCode.UNAUTHORIZED,
      403: ErrorCode.FORBIDDEN,
      404: ErrorCode.NOT_FOUND,
      409: ErrorCode.CONFLICT,
      429: ErrorCode.RATE_LIMITED,
    };
    let code =
      codeByStatus[status] ??
      (status >= 500 ? ErrorCode.INTERNAL : ErrorCode.BAD_REQUEST);

    if (typeof response === 'string') {
      return { code, message: response };
    }

    const body = response as { message?: unknown };
    if (Array.isArray(body.message)) {
      code = ErrorCode.VALIDATION_FAILED;
      return {
        code,
        message: 'Validation failed.',
        details: { errors: body.message as string[] },
      };
    }
    if (typeof body.message === 'string') {
      return { code, message: body.message };
    }
    return { code, message: 'Request failed.' };
  }

  private resolveRequestId(host: ArgumentsHost): string | undefined {
    try {
      if (host.getType<GqlContextType>() === 'graphql') {
        const ctx = GqlArgumentsHost.create(host).getContext<{
          req?: { id?: string; headers?: Record<string, string | undefined> };
        }>();
        return ctx?.req?.id ?? ctx?.req?.headers?.['x-request-id'];
      }
      const req = host.switchToHttp().getRequest<{ id?: string }>();
      return req?.id;
    } catch {
      return undefined;
    }
  }

  private extractMessage(exception: unknown): string {
    if (exception instanceof Error) {
      return exception.message;
    }
    return typeof exception === 'string' ? exception : 'Unhandled exception';
  }
}
