import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser, JwtPayload } from '@store-erp/types';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async validateUser(email: string, password: string): Promise<AuthUser | null> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) return null;

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return null;

    return {
      userId: user.id,
      tenantId: user.tenantId,
      role: user.globalRole as AuthUser['role'],
    };
  }

  async login(user: AuthUser): Promise<{ accessToken: string }> {
    const payload: JwtPayload = {
      sub: user.userId,
      tenantId: user.tenantId,
      role: user.role,
    };
    return { accessToken: this.jwt.sign(payload) };
  }

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }
}
