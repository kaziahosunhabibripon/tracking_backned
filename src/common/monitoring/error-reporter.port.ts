/** Injection token for the active error reporter (Ports & Adapters). */
export const ERROR_REPORTER_PORT = 'ERROR_REPORTER_PORT';

/** Safe context attached to a report — never secrets or PII. */
export interface ErrorContext {
  requestId?: string;
  userId?: string;
  path?: string;
  code?: string;
}

/**
 * Vendor-agnostic crash reporting. The global exception filter depends ONLY on
 * this. With no `SENTRY_DSN` the no-op adapter is used, so the app never depends
 * on an external service being reachable — monitoring is observability, not a
 * runtime dependency.
 */
export interface ErrorReporterPort {
  readonly name: string;
  captureException(error: unknown, context?: ErrorContext): void;
}
