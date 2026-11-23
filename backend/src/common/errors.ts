import { HttpException } from '@nestjs/common';

export type ErrorCode =
  | 'VALIDATION_ERROR' | 'UNAUTHORIZED' | 'FORBIDDEN' | 'NOT_FOUND' | 'QR_INVALID'
  | 'TICKET_NOT_OPEN' | 'TICKET_TABLE_MISMATCH' | 'PRODUCT_UNAVAILABLE' | 'TABLE_HAS_OPEN_TICKET'
  | 'TABLE_OCCUPIED_BY_ANOTHER_CLIENT'
  | 'TOO_MANY_REQUESTS' | 'INTERNAL_ERROR';

export class AppException extends HttpException {
  constructor(status: number, code: ErrorCode, message: string, details: unknown[] = []) {
    super({ code, message, details }, status);
  }
}

export const notFound = (what: string): AppException =>
  new AppException(404, 'NOT_FOUND', `${what} not found`);

export function duplicateField(e: unknown): string | undefined {
  if (typeof e !== 'object' || e === null) return undefined;
  const err = e as { code?: number; keyPattern?: Record<string, number> };
  if (err.code !== 11000) return undefined;
  return Object.keys(err.keyPattern ?? {})[0] ?? 'unknown';
}
