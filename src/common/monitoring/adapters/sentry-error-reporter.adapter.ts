import { Injectable, Logger } from '@nestjs/common';
import * as Sentry from '@sentry/node';
import { ErrorContext, ErrorReporterPort } from '../error-reporter.port';

/**
 * Ships exceptions to Sentry. Constructed ONLY when `SENTRY_DSN` is set.
 *
 * `sendDefaultPii` is explicitly off and a `beforeSend` scrubber strips
 * cookies/auth headers, so a crash report can never leak a session token.
 * Reporting failures are swallowed — monitoring must never take the API down.
 */
@Injectable()
export class SentryErrorReporter implements ErrorReporterPort {
  readonly name = 'sentry';
  private readonly logger = new Logger('Monitoring:Sentry');

  constructor(dsn: string, environment: string, release?: string) {
    Sentry.init({
      dsn,
      environment,
      release,
      sendDefaultPii: false,
      tracesSampleRate: 0,
      beforeSend(event) {
        if (event.request?.headers) {
          delete event.request.headers.cookie;
          delete event.request.headers.authorization;
        }
        delete event.request?.cookies;
        return event;
      },
    });
    this.logger.log(`Sentry error reporting enabled (${environment}).`);
  }

  captureException(error: unknown, context?: ErrorContext): void {
    try {
      Sentry.withScope((scope) => {
        if (context?.requestId) scope.setTag('request_id', context.requestId);
        if (context?.code) scope.setTag('error_code', context.code);
        if (context?.path) scope.setTag('path', context.path);
        if (context?.userId) scope.setUser({ id: context.userId });
        Sentry.captureException(error);
      });
    } catch (reportingError) {
      this.logger.warn(
        `Failed to report an exception to Sentry: ${String(reportingError)}`,
      );
    }
  }
}
