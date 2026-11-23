import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AuthUser } from './auth-user';
import { IS_PUBLIC_KEY, ROLES_KEY } from './decorators';
import { Role } from './enums';
import { AppException } from './errors';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) { super(); }

  canActivate(ctx: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      ctx.getHandler(), ctx.getClass(),
    ]);
    return isPublic ? true : super.canActivate(ctx);
  }

  handleRequest<T>(err: unknown, user: T | false): T {
    if (err || !user) throw new AppException(401, 'UNAUTHORIZED', 'Authentication required');
    return user;
  }
}

@Injectable()
export class RolesGuard {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES_KEY, [
      ctx.getHandler(), ctx.getClass(),
    ]);
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      ctx.getHandler(), ctx.getClass(),
    ]);
    if (isPublic || !roles || roles.length === 0) return true;
    const user = ctx.switchToHttp().getRequest<{ user?: AuthUser }>().user;
    if (!user || !roles.includes(user.role)) {
      throw new AppException(403, 'FORBIDDEN', 'Insufficient permissions');
    }
    return true;
  }
}

/** Rate limit tracker = IP (+ qrToken on public table routes). */
@Injectable()
export class AppThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, unknown>): Promise<string> {
    const ip = typeof req.ip === 'string' ? req.ip : 'unknown';
    const params = req.params as Record<string, string> | undefined;
    return params?.qrToken ? `${ip}:${params.qrToken}` : ip;
  }

  protected async shouldSkip(): Promise<boolean> {
    return process.env.NODE_ENV === 'test';
  }
}
