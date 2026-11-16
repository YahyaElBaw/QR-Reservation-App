import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Logger } from '@nestjs/common';
import { Request, Response } from 'express';
import { ErrorCode } from './errors';

function codeFromStatus(status: number): ErrorCode {
  if (status === 401) return 'UNAUTHORIZED';
  if (status === 403) return 'FORBIDDEN';
  if (status === 404) return 'NOT_FOUND';
  if (status === 429) return 'TOO_MANY_REQUESTS';
  if (status >= 400 && status < 500) return 'VALIDATION_ERROR';
  return 'INTERNAL_ERROR';
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exceptions');
  constructor(private readonly isProd: boolean) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const res = http.getResponse<Response>();
    const req = http.getRequest<Request>();

    let status = 500;
    let code: ErrorCode = 'INTERNAL_ERROR';
    let message = 'Internal server error';
    let details: unknown[] = [];

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      const obj = (typeof body === 'string' ? { message: body } : body) as {
        code?: ErrorCode; message?: string | string[]; details?: unknown[];
      };
      code = obj.code ?? codeFromStatus(status);
      if (Array.isArray(obj.message)) {
        details = obj.message;
        message = 'Validation failed';
      } else if (obj.message) {
        message = obj.message;
      }
      if (obj.details) details = obj.details;
    } else {
      const id = req.headers['x-request-id'];
      this.logger.error(
        `[${String(id)}] Unhandled error on ${req.method} ${req.originalUrl}`,
        this.isProd || !(exception instanceof Error) ? undefined : exception.stack,
      );
    }
    res.status(status).json({ statusCode: status, code, message, details });
  }
}
