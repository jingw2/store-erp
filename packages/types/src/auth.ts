import { GlobalRole } from './roles';

export interface JwtPayload {
  sub: string;        // userId
  tenantId: string | null;  // null for SUPER_ADMIN
  role: GlobalRole;
  iat?: number;
  exp?: number;
}

export interface AuthUser {
  userId: string;
  tenantId: string | null;
  role: GlobalRole;
}
