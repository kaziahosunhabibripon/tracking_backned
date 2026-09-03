import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorCode } from './error-codes';

export type ErrorDetails = Record<string, unknown>;

/**
 * Base application exception. Carries a stable `code` and optional safe
 * `details`. Extends HttpException so Nest's pipeline handles it, while the
 * GlobalExceptionFilter shapes the final client-facing response.
 */
export class AppException extends HttpException {
  readonly code: string;
  readonly details?: ErrorDetails;

  constructor(
    code: string,
    message: string,
    httpStatus: HttpStatus,
    details?: ErrorDetails,
  ) {
    super({ code, message, details }, httpStatus);
    this.code = code;
    this.details = details;
  }
}

export class ValidationException extends AppException {
  constructor(message = 'Validation failed.', details?: ErrorDetails) {
    super(
      ErrorCode.VALIDATION_FAILED,
      message,
      HttpStatus.BAD_REQUEST,
      details,
    );
  }
}

export class BadRequestException extends AppException {
  constructor(message = 'The request is invalid.', details?: ErrorDetails) {
    super(ErrorCode.BAD_REQUEST, message, HttpStatus.BAD_REQUEST, details);
  }
}

export class UnauthorizedException extends AppException {
  constructor(message = 'Authentication is required.', details?: ErrorDetails) {
    super(ErrorCode.UNAUTHORIZED, message, HttpStatus.UNAUTHORIZED, details);
  }
}

export class ForbiddenException extends AppException {
  constructor(
    message = 'You do not have access to this resource.',
    details?: ErrorDetails,
  ) {
    super(ErrorCode.FORBIDDEN, message, HttpStatus.FORBIDDEN, details);
  }
}

export class NotFoundException extends AppException {
  constructor(message = 'Resource not found.', details?: ErrorDetails) {
    super(ErrorCode.NOT_FOUND, message, HttpStatus.NOT_FOUND, details);
  }
}

export class ConflictException extends AppException {
  constructor(
    message = 'This action conflicts with the current state.',
    details?: ErrorDetails,
  ) {
    super(ErrorCode.CONFLICT, message, HttpStatus.CONFLICT, details);
  }
}

export class RateLimitException extends AppException {
  constructor(
    message = 'Too many requests. Please slow down.',
    details?: ErrorDetails,
  ) {
    super(
      ErrorCode.RATE_LIMITED,
      message,
      HttpStatus.TOO_MANY_REQUESTS,
      details,
    );
  }
}

export class InternalException extends AppException {
  constructor(
    message = 'Something went wrong. Please try again later.',
    details?: ErrorDetails,
  ) {
    super(
      ErrorCode.INTERNAL,
      message,
      HttpStatus.INTERNAL_SERVER_ERROR,
      details,
    );
  }
}
