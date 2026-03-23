import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from '../../../database/entities/audit-log.entity.js';
import { AuditLogQueryDto, CreateAuditLogDto } from '../dto/audit-log.dto.js';

@Injectable()
export class AuditLogService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
  ) {}

  /**
   * Records a new audit log entry
   */
  async logAction(dto: CreateAuditLogDto) {
    const log = this.auditLogRepository.create(dto);
    return this.auditLogRepository.save(log);
  }

  /**
   * Retrieves audit logs with filtering and pagination
   */
  async findAll(query: AuditLogQueryDto) {
    const { page = 1, limit = 10, userId, userEmail, role, action } = query;
    const qb = this.auditLogRepository.createQueryBuilder('log');

    if (userId) {
      qb.andWhere('log.userId = :userId', { userId });
    }
    if (userEmail) {
      qb.andWhere('log.userEmail ILIKE :userEmail', {
        userEmail: `%${userEmail}%`,
      });
    }
    if (role) {
      qb.andWhere('log.userRole = :role', { role });
    }
    if (action) {
      qb.andWhere('log.action = :action', { action });
    }

    const [data, total] = await qb
      .orderBy('log.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      data,
    };
  }
}
