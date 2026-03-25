import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '@store-erp/types';

@Injectable()
export class TenantContextInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context
      .switchToHttp()
      .getRequest<{ user?: AuthUser }>();

    const user = request.user;

    // No authenticated user — skip (public routes)
    if (!user) return next.handle();

    // Wrap the entire handler execution inside runWithTenantContext
    // so AsyncLocalStorage is active throughout the handler and all
    // services it calls (including PrismaService middleware).
    return new Observable((subscriber) => {
      this.prisma.runWithTenantContext(user.tenantId, user.role, () => {
        next.handle().subscribe(subscriber);
      });
    });
  }
}
