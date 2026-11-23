import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { JwtPayload } from '../common/auth-user';
import { AppException } from '../common/errors';
import { UsersService } from '../users/users.service';
import { UserDocument } from '../users/user.schema';

@Injectable()
export class AuthService {
  constructor(private readonly users: UsersService, private readonly jwt: JwtService) {}

  async login(username: string, password: string): Promise<{ accessToken: string; user: unknown }> {
    const user = await this.users.findForLogin(username);
    const ok = user !== null && user.active && (await bcrypt.compare(password, user.passwordHash));
    if (!user || !ok) throw new AppException(401, 'UNAUTHORIZED', 'Invalid credentials');
    const payload: JwtPayload = { sub: user.id, username: user.username, role: user.role };
    return { accessToken: await this.jwt.signAsync(payload), user: user.toJSON() };
  }

  me(id: string): Promise<UserDocument> {
    return this.users.findById(id);
  }
}
