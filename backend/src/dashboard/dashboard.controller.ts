import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { IsOptional, Matches } from 'class-validator';
import { AuthUser } from '../common/auth-user';
import { CurrentUser, Roles } from '../common/decorators';
import { Role } from '../common/enums';
import { DashboardService } from './dashboard.service';

export class StatsQueryDto {
  /** YYYY-MM-DD, Africa/Tunis day */
  @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}$/) from?: string;
  @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}$/) to?: string;
}

@ApiTags('dashboard')
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  // ADMIN always; CAISSIER/CONTOIRISTE only when listed in DASHBOARD_EXTRA_ROLES (checked in service)
  @Get('stats') @Roles(Role.ADMIN, Role.CAISSIER, Role.CONTOIRISTE)
  stats(@Query() q: StatsQueryDto, @CurrentUser() user: AuthUser) {
    this.dashboard.assertAllowed(user.role);
    return this.dashboard.stats(q.from, q.to);
  }
}
