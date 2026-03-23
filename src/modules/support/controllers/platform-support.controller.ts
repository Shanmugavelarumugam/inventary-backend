import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../../../common/interfaces/authenticated-request.interface.js';
import { SupportService } from '../support.service.js';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard.js';
import { PlatformRoleGuard } from '../../../common/guards/platform-role.guard.js';
import { PlatformRoles } from '../../../common/decorators/platform-roles.decorator.js';
import { PlatformRole } from '../../../common/enums/platform-role.enum.js';
import {
  QuerySupportTicketDto,
  AddSupportMessageDto,
  AssignTicketDto,
  UpdateTicketStatusDto,
} from '../dto/support.dto.js';
import { SenderType } from '../../../database/entities/support-message.entity.js';

@Controller('platform/support')
@UseGuards(JwtAuthGuard, PlatformRoleGuard)
@PlatformRoles(
  PlatformRole.ROOT,
  PlatformRole.PLATFORM_ADMIN,
  PlatformRole.SUPPORT_ADMIN,
)
export class PlatformSupportController {
  constructor(private readonly supportService: SupportService) {}

  @Get('tickets')
  async findAll(@Query() query: QuerySupportTicketDto) {
    return this.supportService.listAllTickets(query);
  }

  @Get('tickets/my-tickets')
  async findMyTickets(
    @Query() query: QuerySupportTicketDto,
    @Request() req: AuthenticatedRequest,
  ) {
    query.assignedTo = req.user.userId;
    return this.supportService.listAllTickets(query);
  }

  @Get('tickets/:id')
  async findOne(@Param('id') id: string) {
    return this.supportService.getPlatformTicketDetails(id);
  }

  @Post('tickets/:id/reply')
  async reply(
    @Param('id') id: string,
    @Body() dto: AddSupportMessageDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.supportService.addMessage(
      id,
      req.user.userId,
      SenderType.PLATFORM,
      dto,
    );
  }

  @Patch('tickets/:id/assign')
  @PlatformRoles(PlatformRole.ROOT, PlatformRole.PLATFORM_ADMIN)
  async assign(@Param('id') id: string, @Body() dto: AssignTicketDto) {
    return this.supportService.assignTicket(id, dto);
  }

  @Patch('tickets/:id/status')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateTicketStatusDto) {
    return this.supportService.updateStatus(id, dto);
  }

  @Patch('tickets/:id/close')
  async close(@Param('id') id: string) {
    return this.supportService.updateStatus(id, {
      status: 'CLOSED',
    } as UpdateTicketStatusDto);
  }

  @Get('stats')
  async getStats() {
    return this.supportService.getStats();
  }
}
