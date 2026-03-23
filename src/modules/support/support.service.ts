import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SupportTicket } from '../../database/entities/support-ticket.entity.js';
import {
  SupportMessage,
  SenderType,
} from '../../database/entities/support-message.entity.js';
import { SupportAttachment } from '../../database/entities/support-attachment.entity.js';
import { TicketStatus } from '../../common/enums/ticket-status.enum.js';
import { AuditLogService } from '../platform/services/audit-log.service.js';
import { AuditAction } from '../../common/enums/audit-action.enum.js';

import {
  CreateSupportTicketDto,
  AddSupportMessageDto,
  UpdateTicketStatusDto,
  AssignTicketDto,
  QuerySupportTicketDto,
} from './dto/support.dto.js';

@Injectable()
export class SupportService {
  constructor(
    @InjectRepository(SupportTicket)
    private readonly ticketRepository: Repository<SupportTicket>,
    @InjectRepository(SupportMessage)
    private readonly messageRepository: Repository<SupportMessage>,
    @InjectRepository(SupportAttachment)
    private readonly attachmentRepository: Repository<SupportAttachment>,
    private readonly auditLogService: AuditLogService,
  ) {}

  // ─── Tenant Side ───────────────────────────────────────

  async createTicket(
    tenantId: string,
    userId: string,
    dto: CreateSupportTicketDto,
  ) {
    const ticket = this.ticketRepository.create({
      ...dto,
      tenantId,
      createdBy: userId,
      status: TicketStatus.OPEN,
    });
    const savedTicket = await this.ticketRepository.save(ticket);

    // Audit Log
    await this.auditLogService.logAction({
      userId,
      action: AuditAction.CREATE_TICKET,

      entityType: 'support_ticket',
      entityId: savedTicket.id,
      entityName: savedTicket.title,
      businessId: tenantId,
    });

    // Initial message

    await this.addMessage(savedTicket.id, userId, SenderType.TENANT, {
      message: dto.description,
    });

    return savedTicket;
  }

  async listTenantTickets(tenantId: string, query: QuerySupportTicketDto) {
    const { page = 1, limit = 10, status, priority, category } = query;
    const [data, total] = await this.ticketRepository.findAndCount({
      where: {
        tenantId,
        ...(status && { status }),
        ...(priority && { priority }),
        ...(category && { category }),
      },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { data, total, page, limit };
  }

  async getTenantTicketDetails(ticketId: string, tenantId: string) {
    const ticket = await this.ticketRepository.findOne({
      where: { id: ticketId, tenantId },
      relations: ['creator', 'assignee'],
    });
    if (!ticket) throw new NotFoundException('Ticket not found');

    const messages = await this.messageRepository.find({
      where: { ticketId },
      relations: ['sender'],
      order: { createdAt: 'ASC' },
    });

    const attachments = await this.attachmentRepository.find({
      where: { ticketId },
      order: { createdAt: 'ASC' },
    });

    return { ...ticket, messages, attachments };
  }

  async closeTicketByTenant(ticketId: string, tenantId: string) {
    const ticket = await this.ticketRepository.findOne({
      where: { id: ticketId, tenantId },
    });
    if (!ticket) throw new NotFoundException('Ticket not found');

    ticket.status = TicketStatus.CLOSED;
    return this.ticketRepository.save(ticket);
  }

  // ─── Platform Side ─────────────────────────────────────

  async listAllTickets(query: QuerySupportTicketDto) {
    const {
      page = 1,
      limit = 10,
      status,
      priority,
      category,
      tenantId,
      assignedTo,
    } = query;
    const [data, total] = await this.ticketRepository.findAndCount({
      where: {
        ...(tenantId && { tenantId }),
        ...(status && { status }),
        ...(priority && { priority }),
        ...(category && { category }),
        ...(assignedTo && { assignedTo }),
      },
      relations: ['tenant', 'creator', 'assignee'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { data, total, page, limit };
  }

  async getPlatformTicketDetails(ticketId: string) {
    const ticket = await this.ticketRepository.findOne({
      where: { id: ticketId },
      relations: ['tenant', 'creator', 'assignee'],
    });
    if (!ticket) throw new NotFoundException('Ticket not found');

    const messages = await this.messageRepository.find({
      where: { ticketId },
      relations: ['sender'],
      order: { createdAt: 'ASC' },
    });

    const attachments = await this.attachmentRepository.find({
      where: { ticketId },
      order: { createdAt: 'ASC' },
    });

    return { ...ticket, messages, attachments };
  }

  async assignTicket(ticketId: string, dto: AssignTicketDto) {
    const ticket = await this.ticketRepository.findOne({
      where: { id: ticketId },
    });
    if (!ticket) throw new NotFoundException('Ticket not found');

    ticket.assignedTo = dto.supportAdminId;
    const saved = await this.ticketRepository.save(ticket);

    // Audit Log
    await this.auditLogService.logAction({
      action: AuditAction.ASSIGN_TICKET,
      entityType: 'support_ticket',
      entityId: ticketId,
      entityName: ticket.title,
      newValue: { assignedTo: dto.supportAdminId },
    });

    return saved;
  }

  async updateStatus(ticketId: string, dto: UpdateTicketStatusDto) {
    const ticket = await this.ticketRepository.findOne({
      where: { id: ticketId },
    });
    if (!ticket) throw new NotFoundException('Ticket not found');

    ticket.status = dto.status;
    const saved = await this.ticketRepository.save(ticket);

    // Audit Log
    await this.auditLogService.logAction({
      action: AuditAction.UPDATE_TICKET_STATUS,

      entityType: 'support_ticket',
      entityId: ticketId,
      entityName: ticket.title,
      newValue: { status: dto.status },
    });

    return saved;
  }

  async getStats() {
    const stats = await this.ticketRepository
      .createQueryBuilder('ticket')
      .select('ticket.status', 'status')
      .addSelect('COUNT(ticket.id)', 'count')
      .groupBy('ticket.status')
      .getRawMany();

    const formatted = {
      OPEN: 0,
      IN_PROGRESS: 0,
      WAITING_CUSTOMER: 0,
      RESOLVED: 0,
      CLOSED: 0,
    };

    stats.forEach((s: { status: string; count: string }) => {
      formatted[s.status as keyof typeof formatted] = parseInt(s.count);
    });

    return {
      ...formatted,
      total: Object.values(formatted).reduce((a, b) => a + b, 0),
    };
  }

  // ─── Common ───────────────────────────────────────────

  async addMessage(
    ticketId: string,
    userId: string,
    senderType: SenderType,
    dto: AddSupportMessageDto,
  ) {
    const ticket = await this.ticketRepository.findOne({
      where: { id: ticketId },
    });
    if (!ticket) throw new NotFoundException('Ticket not found');

    const msg = this.messageRepository.create({
      ticketId,
      senderId: userId,
      senderType,
      message: dto.message,
    });

    // Update ticket status to IN_PROGRESS if platform admin replies to an OPEN ticket
    if (
      senderType === SenderType.PLATFORM &&
      ticket.status === TicketStatus.OPEN
    ) {
      ticket.status = TicketStatus.IN_PROGRESS;
      await this.ticketRepository.save(ticket);
    }

    // Update ticket status to WAITING_CUSTOMER if platform admin replies
    if (senderType === SenderType.PLATFORM) {
      ticket.status = TicketStatus.WAITING_CUSTOMER;
      await this.ticketRepository.save(ticket);
    }

    // Update ticket status back to OPEN/IN_PROGRESS if tenant replies when WAITING_CUSTOMER
    if (
      senderType === SenderType.TENANT &&
      ticket.status === TicketStatus.WAITING_CUSTOMER
    ) {
      ticket.status = TicketStatus.IN_PROGRESS;
      await this.ticketRepository.save(ticket);
    }

    const savedMsg = await this.messageRepository.save(msg);

    // Audit Log for reply
    await this.auditLogService.logAction({
      userId,
      action: AuditAction.REPLY_TICKET,
      entityType: 'support_ticket',
      entityId: ticketId,
      entityName: ticket.title,
    });

    return savedMsg;
  }

  async addAttachment(ticketId: string, userId: string, fileUrl: string) {
    const attachment = this.attachmentRepository.create({
      ticketId,
      fileUrl,
      uploadedBy: userId,
    });
    return this.attachmentRepository.save(attachment);
  }
}
