import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, IsNull, ILike } from 'typeorm';
import { User } from '../../../database/entities/user.entity.js';
import { Business, DomainType } from '../../../database/entities/business.entity.js';
import { Role } from '../../../database/entities/role.entity.js';
import { AuditLogService } from './audit-log.service.js';
import { AuditAction } from '../../../common/enums/audit-action.enum.js';
import { HashUtil } from '../../../common/utils/hash.util.js';
import {
  CreatePlatformTenantUserDto,
  UpdatePlatformTenantUserDto,
} from '../dto/tenant-user.dto.js';

interface FindAllFilters {
  page?: number;
  limit?: number;
  search?: string;
  businessId?: string;
  role?: string;
  status?: string;
}

@Injectable()
export class TenantUserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Business)
    private readonly businessRepository: Repository<Business>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    private readonly auditLogService: AuditLogService,
  ) {}

  async findAll(filters: FindAllFilters) {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const query = this.userRepository.createQueryBuilder('user')
      .leftJoinAndSelect('user.business', 'business')
      .leftJoinAndSelect('user.role', 'role')
      .where('user.businessId IS NOT NULL');

    if (filters.search) {
      query.andWhere(
        '(user.name ILIKE :search OR user.email ILIKE :search)',
        { search: `%${filters.search}%` },
      );
    }

    if (filters.businessId) {
      query.andWhere('user.businessId = :businessId', { businessId: filters.businessId });
    }

    if (filters.role) {
      query.andWhere('role.name ILIKE :role', { role: `%${filters.role}%` });
    }

    if (filters.status) {
      const isActive = filters.status.toUpperCase() === 'ACTIVE';
      query.andWhere('user.isActive = :isActive', { isActive });
    }

    const [users, total] = await query
      .orderBy('user.createdAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    const data = users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role?.name || null,
      business: u.business ? {
        id: u.business.id,
        name: u.business.name,
        companyCode: u.business.companyCode,
      } : null,
      isActive: u.isActive,
      lastLogin: u.lastLogin,
      createdAt: u.createdAt,
    }));

    return {
      data,
      pagination: {
        page,
        limit,
        total,
      },
    };
  }

  async findOne(id: string) {
    const user = await this.userRepository.findOne({
      where: { id, businessId: Not(IsNull()) as any },
      relations: ['business', 'role'],
    });

    if (!user) {
      throw new NotFoundException('Tenant user not found');
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role?.name || null,
      business: user.business ? {
        id: user.business.id,
        name: user.business.name,
      } : null,
      isActive: user.isActive,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt,
    };
  }

  async create(dto: CreatePlatformTenantUserDto, auditInfo: any) {
    const business = await this.businessRepository.findOne({
      where: { id: dto.businessId },
    });

    if (!business) {
      throw new NotFoundException('Business not found');
    }

    // Role Validation
    const role = await this.roleRepository.findOne({
      where: [
        { id: dto.roleId, businessId: business.id },
        { id: dto.roleId, businessId: IsNull() as any }, // Platform-provided templates
      ],
    });

    if (!role) {
      throw new BadRequestException('Invalid role for this business');
    }

    const existingUser = await this.userRepository.findOne({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email is already registered');
    }

    // Check user limits
    const userCount = await this.userRepository.count({
      where: { businessId: business.id, isActive: true },
    });

    if (business.maxUsers !== -1 && userCount >= business.maxUsers) {
      throw new BadRequestException('User limit reached for this tenant');
    }

    const hashedPassword = await HashUtil.hash(dto.password);
    const user = this.userRepository.create({
      businessId: business.id,
      name: dto.name,
      email: dto.email,
      password: hashedPassword,
      roleId: dto.roleId,
      isActive: true,
    });

    const savedUser = await this.userRepository.save(user);

    await this.auditLogService.logAction({
      userId: auditInfo.userId,
      userRole: auditInfo.platformRole,
      action: AuditAction.CREATE_TENANT_USER,
      entityType: 'user',
      entityId: savedUser.id,
      entityName: savedUser.name,
      businessId: business.id,
      newValue: { email: savedUser.email, role: role.name },
      ipAddress: auditInfo.ipAddress,
      userAgent: auditInfo.userAgent,
    });

    return {
      message: 'Tenant user created successfully',
      userId: savedUser.id,
    };
  }

  async update(id: string, dto: UpdatePlatformTenantUserDto, auditInfo: any) {
    const user = await this.userRepository.findOne({
      where: { id, businessId: Not(IsNull()) as any },
    });

    if (!user) {
      throw new NotFoundException('Tenant user not found');
    }

    if (dto.roleId) {
      const role = await this.roleRepository.findOne({
        where: [
          { id: dto.roleId, businessId: user.businessId },
          { id: dto.roleId, businessId: IsNull() as any },
        ],
      });
      if (!role) {
        throw new BadRequestException('Invalid role for this business');
      }
      user.roleId = dto.roleId;
    }

    if (dto.name) {
      user.name = dto.name;
    }

    await this.userRepository.save(user);

    await this.auditLogService.logAction({
      userId: auditInfo.userId,
      userRole: auditInfo.platformRole,
      action: AuditAction.UPDATE_TENANT_USER,
      entityType: 'user',
      entityId: user.id,
      entityName: user.name,
      businessId: user.businessId,
      newValue: { name: user.name, roleId: user.roleId },
      ipAddress: auditInfo.ipAddress,
      userAgent: auditInfo.userAgent,
    });

    return { message: 'Tenant user updated successfully' };
  }

  async resetPassword(id: string, newPassword: string, auditInfo: any) {
    const user = await this.userRepository.findOne({
      where: { id, businessId: Not(IsNull()) as any },
      relations: ['business'],
    });

    if (!user) {
      throw new NotFoundException('Tenant user not found');
    }

    const hashedPassword = await HashUtil.hash(newPassword);
    
    await this.userRepository.update(id, {
      password: hashedPassword,
      refreshToken: null, // Force logout
    });

    await this.auditLogService.logAction({
      userId: auditInfo.userId,
      userRole: auditInfo.platformRole,
      action: AuditAction.RESET_TENANT_USER_PASSWORD,
      entityType: 'user',
      entityId: user.id,
      entityName: user.name,
      businessId: user.businessId,
      newValue: { event: 'PASSWORD_RESET_BY_PLATFORM_ADMIN' },
      ipAddress: auditInfo.ipAddress,
      userAgent: auditInfo.userAgent,
    });

    return { message: 'Password reset successfully' };
  }

  async setStatus(id: string, isActive: boolean, auditInfo: any) {
    const user = await this.userRepository.findOne({
      where: { id, businessId: Not(IsNull()) as any },
    });

    if (!user) {
      throw new NotFoundException('Tenant user not found');
    }

    await this.userRepository.update(id, {
      isActive,
      ...(isActive ? {} : { refreshToken: null }), // Force logout if deactivated
    });

    await this.auditLogService.logAction({
      userId: auditInfo.userId,
      userRole: auditInfo.platformRole,
      action: isActive ? AuditAction.ACTIVATE_TENANT_USER : AuditAction.DEACTIVATE_TENANT_USER,
      entityType: 'user',
      entityId: user.id,
      entityName: user.name,
      businessId: user.businessId,
      newValue: { status: isActive ? 'ACTIVE' : 'INACTIVE' },
      ipAddress: auditInfo.ipAddress,
      userAgent: auditInfo.userAgent,
    });

    return { message: `Tenant user ${isActive ? 'activated' : 'deactivated'}` };
  }
}
