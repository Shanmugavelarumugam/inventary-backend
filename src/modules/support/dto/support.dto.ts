import {
  IsString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  MaxLength,
} from 'class-validator';
import { TicketPriority } from '../../../common/enums/ticket-priority.enum.js';
import { TicketCategory } from '../../../common/enums/ticket-category.enum.js';
import { TicketStatus } from '../../../common/enums/ticket-status.enum.js';

export class CreateSupportTicketDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsEnum(TicketPriority)
  @IsOptional()
  priority?: TicketPriority;

  @IsEnum(TicketCategory)
  @IsOptional()
  category?: TicketCategory;
}

export class AddSupportMessageDto {
  @IsString()
  @IsNotEmpty()
  message: string;
}

export class UpdateTicketStatusDto {
  @IsEnum(TicketStatus)
  status: TicketStatus;

  @IsString()
  @IsOptional()
  reason?: string;
}

export class AssignTicketDto {
  @IsString()
  @IsNotEmpty()
  supportAdminId: string;
}

export class QuerySupportTicketDto {
  @IsEnum(TicketStatus)
  @IsOptional()
  status?: TicketStatus;

  @IsEnum(TicketPriority)
  @IsOptional()
  priority?: TicketPriority;

  @IsEnum(TicketCategory)
  @IsOptional()
  category?: TicketCategory;

  @IsString()
  @IsOptional()
  tenantId?: string;

  @IsString()
  @IsOptional()
  assignedTo?: string;

  @IsOptional()
  page?: number = 1;

  @IsOptional()
  limit?: number = 10;
}
