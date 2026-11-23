import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from './enums';
import { RolesGuard } from './guards';

function ctx(user: { role: Role } | undefined): ExecutionContext {
  return {
    getHandler: () => ({}), getClass: () => ({}),
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  const make = (roles: Role[] | undefined, isPublic = false) => {
    const reflector = {
      getAllAndOverride: jest.fn((key: string) => (key === 'roles' ? roles : isPublic)),
    } as unknown as Reflector;
    return new RolesGuard(reflector);
  };

  it('allows when no roles are required', () => {
    expect(make(undefined).canActivate(ctx({ role: Role.CAISSIER }))).toBe(true);
  });
  it('allows a matching role', () => {
    expect(make([Role.ADMIN, Role.CAISSIER]).canActivate(ctx({ role: Role.CAISSIER }))).toBe(true);
  });
  it('rejects another role with FORBIDDEN', () => {
    expect(() => make([Role.ADMIN]).canActivate(ctx({ role: Role.CONTOIRISTE }))).toThrow();
    try { make([Role.ADMIN]).canActivate(ctx({ role: Role.CONTOIRISTE })); } catch (e) {
      expect((e as { getStatus: () => number }).getStatus()).toBe(403);
    }
  });
  it('skips public routes', () => {
    expect(make([Role.ADMIN], true).canActivate(ctx(undefined))).toBe(true);
  });
});
