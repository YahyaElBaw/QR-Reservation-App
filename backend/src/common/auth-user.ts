import { Role } from './enums';

export interface AuthUser { id: string; username: string; name: string; role: Role }
export interface JwtPayload { sub: string; username: string; role: Role }
