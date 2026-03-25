import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '@store-erp/types';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const canActivate = await super.canActivate(context);
    if (!canActivate) return false;

    const request = context.switchToHttp().getRequest<{ user: AuthUser; tenantContextSet?: boolean }>();
    const user = request.user;

    return new Promise((resolve) => {
      this.prisma.runWithTenantContext(user.tenantId, user.role, () => {
        request.tenantContextSet = true;
        resolve(true);
      });
    });
  }
}
