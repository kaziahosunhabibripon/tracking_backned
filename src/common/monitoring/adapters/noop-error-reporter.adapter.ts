import { Injectable } from '@nestjs/common';
import { ErrorReporterPort } from '../error-reporter.port';

/**
 * Default when no `SENTRY_DSN` is configured: reporting is a silent no-op.
 * Errors are still logged by the global exception filter — we simply do not ship
 * them anywhere. A missing DSN must never be a boot failure or a runtime error.
 */
@Injectable()
export class NoopErrorReporter implements ErrorReporterPort {
  readonly name = 'noop';

  captureException(): void {
    // Intentionally empty — see the class doc.
  }
}
