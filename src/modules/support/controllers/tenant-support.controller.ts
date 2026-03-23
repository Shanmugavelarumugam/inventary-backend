import {
  Controller,
  Post,
  Get,
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
import { TenantGuard } from '../../../common/guards/tenant.guard.js';

import {
  CreateSupportTicketDto,
  AddSupportMessageDto,
  QuerySupportTicketDto,
} from '../dto/support.dto.js';
import { SenderType } from '../../../database/entities/support-message.entity.js';

@Controller('tenant/support')
@UseGuards(JwtAuthGuard, TenantGuard)
export class TenantSupportController {
  constructor(private readonly supportService: SupportService) {}

  @Post('tickets')
  async create(
    @Body() dto: CreateSupportTicketDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.supportService.createTicket(
      req.user.businessId!,
      req.user.userId,
      dto,
    );
  }

  @Get('tickets')
  async findAll(
    @Query() query: QuerySupportTicketDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.supportService.listTenantTickets(req.user.businessId!, query);
  }

  @Get('tickets/:id')
  async findOne(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.supportService.getTenantTicketDetails(id, req.user.businessId!);
  }

  @Post('tickets/:id/messages')
  async addMessage(
    @Param('id') id: string,
    @Body() dto: AddSupportMessageDto,
    @Request() req: AuthenticatedRequest,
  ) {
    // Verify ownership/access
    await this.supportService.getTenantTicketDetails(id, req.user.businessId!);
    return this.supportService.addMessage(
      id,
      req.user.userId,
      SenderType.TENANT,
      dto,
    );
  }

  @Patch('tickets/:id/close')
  async close(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.supportService.closeTicketByTenant(id, req.user.businessId!);
  }
}
