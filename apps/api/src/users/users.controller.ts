import {
  Controller, Get, Post, Delete,
  Param, Body, UseGuards, UseInterceptors,
  HttpCode, HttpStatus,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { AssignUserRegionDto } from './dto/assign-user-region.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { TenantContextInterceptor } from '../auth/tenant-context.interceptor';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { GlobalRole, AuthUser } from '@store-erp/types';

@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(TenantContextInterceptor)
@Roles(GlobalRole.SUPER_ADMIN, GlobalRole.HQ_ADMIN)
@Controller('users')
export class UsersController {
  constructor(private readonly service: UsersService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Post()
  create(@Body() dto: CreateUserDto) {
    return this.service.create(dto);
  }

  @Post(':id/regions')
  assignRegion(
    @Param('id') userId: string,
    @Body() dto: AssignUserRegionDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.assignRegion(user.tenantId!, userId, dto);
  }

  @Delete(':id/regions/:region')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeRegion(@Param('id') userId: string, @Param('region') region: string) {
    return this.service.removeRegion(userId, region);
  }
}
