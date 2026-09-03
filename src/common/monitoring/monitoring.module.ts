import { Global, Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { resolveAppEnvironment } from '../../config/env-paths';
import { NoopErrorReporter } from './adapters/noop-error-reporter.adapter';
import { SentryErrorReporter } from './adapters/sentry-error-reporter.adapter';
import { ERROR_REPORTER_PORT } from './error-reporter.port';

/**
 * Crash reporting behind a port. Sentry when `SENTRY_DSN` is set, otherwise a
 * silent no-op — a missing DSN is never a boot failure, and monitoring is never
 * a runtime dependency of the API. Global so the exception filter can inject it.
 */
@Global()
@Module({
  providers: [
    NoopErrorReporter,
    {
      provide: ERROR_REPORTER_PORT,
      inject: [ConfigService, NoopErrorReporter],
      useFactory: (config: ConfigService, noop: NoopErrorReporter) => {
        const dsn = config.get<string>('SENTRY_DSN');
        if (!dsn) {
          new Logger('MonitoringModule').log(
            'SENTRY_DSN not set — error reporting is a no-op.',
          );
          return noop;
        }
        return new SentryErrorReporter(
          dsn,
          resolveAppEnvironment(),
          process.env.npm_package_version,
        );
      },
    },
  ],
  exports: [ERROR_REPORTER_PORT],
})
export class MonitoringModule {}
