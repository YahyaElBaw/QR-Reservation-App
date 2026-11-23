import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { Role } from '../common/enums';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  const hash = bcrypt.hashSync('secret123', 4);
  const user = (active = true) => ({
    id: 'u1', username: 'admin', role: Role.ADMIN, active, passwordHash: hash,
    toJSON: () => ({ _id: 'u1', username: 'admin', role: Role.ADMIN }),
  });
  const build = (found: unknown) => {
    const users = { findForLogin: jest.fn().mockResolvedValue(found) } as unknown as UsersService;
    const jwt = { signAsync: jest.fn().mockResolvedValue('tok') } as unknown as JwtService;
    return { svc: new AuthService(users, jwt), jwt };
  };

  it('returns token and user without passwordHash on valid credentials', async () => {
    const { svc, jwt } = build(user());
    const res = await svc.login('admin', 'secret123');
    expect(res.accessToken).toBe('tok');
    expect(JSON.stringify(res.user)).not.toContain('passwordHash');
    expect(jwt.signAsync).toHaveBeenCalledWith({ sub: 'u1', username: 'admin', role: Role.ADMIN });
  });
  it('rejects a wrong password with 401', async () => {
    await expect(build(user()).svc.login('admin', 'nope')).rejects.toMatchObject({ status: 401 });
  });
  it('rejects unknown and disabled users with 401', async () => {
    await expect(build(null).svc.login('x', 'y')).rejects.toMatchObject({ status: 401 });
    await expect(build(user(false)).svc.login('admin', 'secret123')).rejects.toMatchObject({ status: 401 });
  });
});
