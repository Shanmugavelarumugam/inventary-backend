import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, Not, DataSource } from 'typeorm';
import { Business } from '../../../database/entities/business.entity.js';
import { BusinessStatus } from '../../../common/enums/business.enum.js';
import { User } from '../../../database/entities/user.entity.js';
import { Role } from '../../../database/entities/role.entity.js';
import { Permission } from '../../../database/entities/permission.entity.js';
import { SubscriptionPlan } from '../../../database/entities/subscription-plan.entity.js';
import { Subscription } from '../../../database/entities/subscription.entity.js';
import { Invoice } from '../../../database/entities/invoice.entity.js';
import { HashUtil } from '../../../common/utils/hash.util.js';
import { PlatformRole } from '../../../common/enums/platform-role.enum.js';
import { AuditLogService } from './audit-log.service.js';
import { AuditAction } from '../../../common/enums/audit-action.enum.js';

import {
  UpdateTenantDto,
  CreatePlatformAdminDto,
  UpdatePlatformAdminDto,
  ResetPlatformAdminPasswordDto,
  BootstrapRootDto,
  UpdateTenantStatusDto,
  AssignPlanDto,
} from '../dto/index.js';

@Injectable()
export class TenantManagementService {
  constructor(
    @InjectRepository(Business)
    private readonly businessRepository: Repository<Business>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    @InjectRepository(Permission)
    private readonly permissionRepository: Repository<Permission>,
    @InjectRepository(Subscription)
    private readonly subscriptionRepository: Repository<Subscription>,
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,
    private readonly auditLogService: AuditLogService,
    private readonly dataSource: DataSource,
  ) {}

  // ═══════════════════════════════════════════════════
  // ROOT BOOTSTRAP — public, works ONCE only
  // ═══════════════════════════════════════════════════

  async bootstrapRoot(dto: BootstrapRootDto) {
    if (dto.password !== dto.confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }
    const rootExists = await this.userRepository.findOne({
      where: { platformRole: PlatformRole.ROOT },
    });
    if (rootExists) {
      throw new ForbiddenException(
        'ROOT already exists. Bootstrap is disabled.',
      );
    }
    const hashed = await HashUtil.hash(dto.password);
    const root = new User();
    Object.assign(root, {
      email: dto.email,
      password: hashed,
      platformRole: PlatformRole.ROOT,
      isActive: true,
    });
    const saved = await this.userRepository.save(root);

    // Audit Log
    await this.auditLogService.logAction({
      action: AuditAction.BOOTSTRAP_ROOT,
      entityType: 'user',
      entityId: saved.id,
      entityName: saved.email,
      userEmail: saved.email,
      userRole: PlatformRole.ROOT,
      newValue: { email: saved.email, role: saved.platformRole },
    });

    return {
      id: saved.id,
      email: saved.email,
      platformRole: saved.platformRole,
      createdAt: saved.createdAt,
    };
  }

  // ═══════════════════════════════════════════════════
  // PLATFORM ADMIN MANAGEMENT — ROOT only
  // ═══════════════════════════════════════════════════

  async createAdmin(
    dto: CreatePlatformAdminDto,
    caller: {
      userId: string;
      platformRole: PlatformRole;
      ipAddress?: string;
      userAgent?: string;
    },
  ) {
    const { userId: creatorId, platformRole: callerRole } = caller;

    // 1. Role Validation
    if (dto.role === PlatformRole.ROOT) {
      throw new ForbiddenException('Cannot create another ROOT admin');
    }

    if (
      callerRole === PlatformRole.PLATFORM_ADMIN &&
      dto.role !== PlatformRole.SUPPORT_ADMIN
    ) {
      throw new ForbiddenException(
        'Platform Admins can only create Support Admins',
      );
    }

    // 2. Existence Check
    const existing = await this.userRepository.findOne({
      where: { email: dto.email },
    });
    if (existing) throw new ConflictException('Email already exists');

    // 3. Create Admin
    const hashed = await HashUtil.hash(dto.password);
    const admin = new User();
    Object.assign(admin, {
      name: dto.name,
      email: dto.email,
      password: hashed,
      platformRole: dto.role,
      createdBy: creatorId,
      isActive: true,
    });
    const saved = await this.userRepository.save(admin);

    // Audit Log
    await this.auditLogService.logAction({
      userId: creatorId,
      userRole: callerRole,
      action: AuditAction.CREATE_PLATFORM_ADMIN,
      entityType: 'user',
      entityId: saved.id,
      entityName: saved.email,
      newValue: {
        name: saved.name,
        email: saved.email,
        role: saved.platformRole,
      },
    });

    return {
      id: saved.id,
      name: saved.name,
      email: saved.email,
      platformRole: saved.platformRole,
      status: saved.isActive ? 'ACTIVE' : 'SUSPENDED',
      createdBy: saved.createdBy,
      createdAt: saved.createdAt,
    };
  }

  async findAllAdmins(
    callerRole: PlatformRole,
    options: { page: number; limit: number },
  ) {
    const { page, limit } = options;
    const queryBuilder = this.userRepository
      .createQueryBuilder('u')
      .select([
        'u.id',
        'u.name',
        'u.email',
        'u.platformRole',
        'u.isActive',
        'u.lastLogin',
        'u.createdAt',
      ])
      .where('u.platformRole IS NOT NULL');

    if (callerRole !== PlatformRole.ROOT) {
      queryBuilder.andWhere('u.platformRole != :root', {
        root: PlatformRole.ROOT,
      });
    }

    const [users, total] = await queryBuilder
      .orderBy('u.createdAt', 'ASC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      total,
      page,
      limit,
      data: users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        platformRole: u.platformRole,
        status: u.isActive ? 'ACTIVE' : 'SUSPENDED',
        lastLoginAt: u.lastLogin,
      })),
    };
  }

  async findOneAdmin(id: string, callerRole: PlatformRole) {
    const user = await this.userRepository.findOne({
      where: { id, platformRole: Not(IsNull()) },
    });
    if (!user) throw new NotFoundException('Platform Admin not found');

    // Hierarchy Security: PLATFORM_ADMIN cannot view ROOT
    if (
      callerRole !== PlatformRole.ROOT &&
      user.platformRole === PlatformRole.ROOT
    ) {
      throw new ForbiddenException(
        'You do not have permission to view this admin',
      );
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      platformRole: user.platformRole,
      status: user.isActive ? 'ACTIVE' : 'SUSPENDED',
      lastLoginAt: user.lastLogin,
      createdBy: user.createdBy,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  async updateAdmin(
    id: string,
    dto: UpdatePlatformAdminDto,
    metadata: { ipAddress?: string; userAgent?: string },
  ) {
    const { ipAddress, userAgent } = metadata;

    const user = await this.userRepository.findOne({
      where: { id, platformRole: Not(IsNull()) },
    });
    if (!user) throw new NotFoundException('Platform Admin not found');

    const updateData: Partial<User> = {};
    if (dto.name) updateData.name = dto.name;
    if (dto.status) updateData.isActive = dto.status === 'ACTIVE';

    await this.userRepository.update(id, updateData);

    // Audit Log
    await this.auditLogService.logAction({
      action: AuditAction.UPDATE_PLATFORM_ADMIN,
      entityType: 'user',
      entityId: id,
      entityName: user.email,
      ipAddress,
      userAgent,
      oldValue: { name: user.name, isActive: user.isActive },
      newValue: updateData,
    });

    return { message: 'Platform admin updated successfully' };
  }

  async suspendAdmin(
    id: string,
    caller: { userId: string; ipAddress?: string; userAgent?: string },
  ) {
    const { userId: callerId, ipAddress, userAgent } = caller;

    const user = await this.userRepository.findOne({
      where: { id, platformRole: Not(IsNull()) },
    });
    if (!user) throw new NotFoundException('Platform Admin not found');

    if (user.platformRole === PlatformRole.ROOT) {
      throw new ForbiddenException('Cannot suspend ROOT');
    }
    if (user.id === callerId) {
      throw new ForbiddenException('Cannot suspend yourself');
    }

    await this.userRepository.update(id, { isActive: false });

    // Audit Log
    await this.auditLogService.logAction({
      userId: callerId,
      action: AuditAction.SUSPEND_PLATFORM_ADMIN,
      entityType: 'user',
      entityId: id,
      entityName: user.email,
      ipAddress,
      userAgent,
    });

    return {
      message: 'Platform admin suspended successfully',
      status: 'SUSPENDED',
    };
  }

  async activateAdmin(
    id: string,
    metadata: { ipAddress?: string; userAgent?: string },
  ) {
    const { ipAddress, userAgent } = metadata;

    const user = await this.userRepository.findOne({
      where: { id, platformRole: Not(IsNull()) },
    });
    if (!user) throw new NotFoundException('Platform Admin not found');

    await this.userRepository.update(id, { isActive: true });

    // Audit Log
    await this.auditLogService.logAction({
      action: AuditAction.ACTIVATE_PLATFORM_ADMIN,
      entityType: 'user',
      entityId: id,
      entityName: user.email,
      ipAddress,
      userAgent,
    });

    return {
      message: 'Platform admin activated successfully',
      status: 'ACTIVE',
    };
  }

  async resetAdminPassword(
    id: string,
    dto: ResetPlatformAdminPasswordDto,
    metadata: { ipAddress?: string; userAgent?: string },
  ) {
    const { ipAddress, userAgent } = metadata;

    const user = await this.userRepository.findOne({
      where: { id, platformRole: Not(IsNull()) },
    });
    if (!user) throw new NotFoundException('Platform Admin not found');

    const hashed = await HashUtil.hash(dto.newPassword);
    await this.userRepository.update(id, {
      password: hashed,
      refreshToken: null,
    });

    // Audit Log
    await this.auditLogService.logAction({
      action: AuditAction.RESET_PLATFORM_ADMIN_PASSWORD,
      entityType: 'user',
      entityId: id,
      entityName: user.email,
      ipAddress,
      userAgent,
    });

    return { message: 'Password reset successfully' };
  }

  async deleteAdmin(
    id: string,
    caller: { userId: string; ipAddress?: string; userAgent?: string },
  ) {
    const { userId: callerId, ipAddress, userAgent } = caller;

    const user = await this.userRepository.findOne({
      where: { id, platformRole: Not(IsNull()) },
    });
    if (!user) throw new NotFoundException('Platform Admin not found');

    if (user.platformRole === PlatformRole.ROOT) {
      throw new ForbiddenException('Cannot delete ROOT');
    }
    if (user.id === callerId) {
      throw new ForbiddenException('Cannot delete yourself');
    }
    await this.userRepository.softDelete(id);

    // Audit Log
    await this.auditLogService.logAction({
      userId: callerId,
      action: AuditAction.DELETE_PLATFORM_ADMIN,
      entityType: 'user',
      entityId: id,
      entityName: user.email,
      ipAddress,
      userAgent,
      oldValue: { name: user.name, email: user.email, role: user.platformRole },
    });

    return { message: 'Platform admin deleted successfully' };
  }

  // ═══════════════════════════════════════════════════
  // SUPPORT CAPABILITIES — Tenant User Password Reset
  // ═══════════════════════════════════════════════════

  async resetTenantUserPassword(
    userId: string,
    metadata: { password?: string; ipAddress?: string; userAgent?: string },
  ) {
    const { password: newPassword, ipAddress, userAgent } = metadata;

    const user = await this.userRepository.findOne({
      where: { id: userId, platformRole: IsNull() }, // Only tenant users
    });
    if (!user) throw new NotFoundException('Tenant user not found');

    const password = newPassword || Math.random().toString(36).slice(-10); // Generate if not provided
    const hashed = await HashUtil.hash(password);

    await this.userRepository.update(userId, {
      password: hashed,
      refreshToken: null, // Invalidate current session
    });

    // Audit Log
    await this.auditLogService.logAction({
      action: AuditAction.RESET_TENANT_USER_PASSWORD,
      entityType: 'user',
      entityId: userId,
      entityName: user.email,
      businessId: user.businessId,
      ipAddress,
      userAgent,
    });

    return {
      message: 'Tenant user password reset successfully',
      newPassword: newPassword ? '******' : password, // Only return if generated
    };
  }

  // ═══════════════════════════════════════════════════
  // TENANT MANAGEMENT — ROOT + PLATFORM_ADMIN
  // ═══════════════════════════════════════════════════

  // DEPRECATED: Use TenantProvisioningService.createTenant via TenantManagementController

  async findAllTenants(options: {
    page?: number;
    limit?: number;
    search?: string;
    status?: BusinessStatus;
    plan?: string;
    sortBy?: string;
    order?: 'ASC' | 'DESC';
  }) {
    const {
      page = 1,
      limit = 10,
      search,
      status,
      plan,
      sortBy = 'createdAt',
      order = 'DESC',
    } = options;

    const qb = this.businessRepository.createQueryBuilder('b');

    // Search logic - using EXISTS to avoid duplicate business rows from joins
    if (search) {
      qb.where(
        '(b.name ILIKE :search OR b.companyCode ILIKE :search OR EXISTS (SELECT 1 FROM users u WHERE u.businessId = b.id AND u.email ILIKE :search))',
        {
          search: `%${search}%`,
        },
      );
    }

    // Filters
    if (status) {
      qb.andWhere('b.status = :status', { status });
    }
    if (plan) {
      qb.andWhere('b.subscriptionPlan = :plan', { plan });
    }

    const total = await qb.getCount();
    const totalPages = Math.ceil(total / limit);

    // Sorting & Select
    // Note: isSubscriptionActive is a calculated field
    const data = await qb
      .select([
        'b.id as "businessId"',
        'b.name as "name"',
        'b.companyCode as "companyCode"',
        'b.status as "status"',
        'b.subscriptionPlan as "plan"',
        'b.createdAt as "createdAt"',
      ])
      .addSelect((subQuery) => {
        return subQuery
          .select('COUNT(s.id) > 0', 'isActive')
          .from(Subscription, 's')
          .where('s.businessId = b.id')
          .andWhere('s.status = :activeStatus', { activeStatus: 'ACTIVE' });
      }, 'isSubscriptionActive')
      .orderBy(`b.${sortBy}`, order)
      .offset((page - 1) * limit)
      .limit(limit)
      .getRawMany();

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages,
      },
    };
  }

  async findOneTenant(id: string) {
    const tenant = await this.businessRepository.findOne({ where: { id } });
    if (!tenant) throw new NotFoundException('Tenant not found');

    // Fetch latest subscription
    const subscription = await this.subscriptionRepository.findOne({
      where: { businessId: id },
      order: { createdAt: 'DESC' },
    });

    // Fetch primary admin (Owner)
    const admin = await this.userRepository.findOne({
      where: { businessId: id, platformRole: IsNull() },
      order: { createdAt: 'ASC' },
    });

    return {
      businessId: tenant.id,
      name: tenant.name,
      companyCode: tenant.companyCode,
      domainType: tenant.domainType,
      status: tenant.status,
      createdAt: tenant.createdAt,
      updatedAt: tenant.updatedAt,
      subscription: subscription
        ? {
            plan: subscription.plan,
            status: subscription.status,
            startDate: subscription.startDate,
            endDate: subscription.endDate,
          }
        : {
            plan: tenant.subscriptionPlan,
            status: 'INACTIVE',
            startDate: null,
            endDate: null,
          },
      admin: admin
        ? {
            id: admin.id,
            name: admin.name,
            email: admin.email,
          }
        : null,
    };
  }

  async updateTenant(id: string, dto: UpdateTenantDto) {
    const tenant = await this.businessRepository.findOne({ where: { id } });
    if (!tenant) throw new NotFoundException('Tenant not found');

    await this.businessRepository.update(id, dto);
    return { message: 'Tenant updated successfully' };
  }

  async deleteTenant(id: string) {
    const tenant = await this.businessRepository.findOne({ where: { id } });
    if (!tenant) throw new NotFoundException('Tenant not found');

    // Note: In real app, consider cascading / soft delete
    await this.businessRepository.softDelete(id);
    return { message: 'Tenant deleted successfully' };
  }

  async updateTenantStatus(
    id: string,
    dto: UpdateTenantStatusDto,
    metadata: { userId: string; ipAddress?: string; userAgent?: string },
  ) {
    const { userId: updatedBy, ipAddress, userAgent } = metadata;

    const business = await this.businessRepository.findOne({ where: { id } });
    if (!business) throw new NotFoundException('Tenant not found');

    await this.businessRepository.update(id, {
      status: dto.status,
      statusReason: dto.reason,
      statusChangedBy: updatedBy,
    });

    // Audit Log
    await this.auditLogService.logAction({
      userId: updatedBy,
      action: AuditAction.UPDATE_TENANT_STATUS,
      entityType: 'business',
      entityId: id,
      entityName: business.name,
      businessId: id,
      ipAddress,
      userAgent,
      oldValue: { status: business.status },
      newValue: { status: dto.status, reason: dto.reason },
    });

    return {
      message: `Tenant ${dto.status.toLowerCase()} successfully`,
      status: dto.status,
    };
  }

  async disableTenant(id: string, updatedBy: string) {
    // Note: This is a legacy helper, updating to match internal call if needed,
    // but it's likely called from elsewhere.
    return this.updateTenantStatus(
      id,
      {
        status: BusinessStatus.SUSPENDED,
        reason: 'Disabled by platform admin',
      },
      { userId: updatedBy },
    );
  }

  // ════════════════════════════════════════════════════════════════
  // SUBSCRIPTION & BILLING
  // ════════════════════════════════════════════════════════════════

  async assignPlan(
    tenantId: string,
    dto: AssignPlanDto,
    metadata: { userId: string; ipAddress?: string; userAgent?: string },
  ) {
    const { userId: updaterId, ipAddress, userAgent } = metadata;

    return this.dataSource.transaction(async (manager) => {
      const tenant = await manager.findOne(Business, {
        where: { id: tenantId },
      });
      if (!tenant) throw new NotFoundException('Tenant not found');

      const plan = await manager.findOne(SubscriptionPlan, {
        where: { id: dto.planId },
      });
      if (!plan) throw new NotFoundException('Subscription plan not found');
      if (plan.status !== 'ACTIVE')
        throw new BadRequestException('Plan is not active');

      // Deactivate current active subscriptions
      await manager.update(
        Subscription,
        { businessId: tenantId, status: 'ACTIVE' },
        { status: 'DEACTIVATED' },
      );

      // Calculate Dates
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(startDate.getDate() + (plan.durationDays || 30));

      // Update business limits and plan
      await manager.update(Business, tenantId, {
        subscriptionPlan: plan.name,
        subscriptionExpiresAt: endDate,
        status: BusinessStatus.ACTIVE,
        maxUsers: plan.maxUsers,
        maxProducts: plan.maxProducts,
        maxBranches: 1, // Default
      });

      // Log NEW subscription
      const subscription = manager.create(Subscription, {
        businessId: tenantId,
        plan: plan.name,
        startDate,
        endDate,
        status: 'ACTIVE',
      });
      const savedSubscription = await manager.save(subscription);

      // Audit Log
      const log = manager.create('AuditLog', {
        userId: updaterId,
        action: AuditAction.ASSIGN_PLAN,
        entityType: 'business',
        entityId: tenantId,
        entityName: tenant.name,
        businessId: tenantId,
        ipAddress,
        userAgent,
        oldValue: { plan: tenant.subscriptionPlan },
        newValue: { plan: plan.name, subscriptionId: savedSubscription.id },
      });
      await manager.save(log);

      return {
        message: 'Plan assigned successfully',
        data: {
          id: savedSubscription.id,
          tenantId: savedSubscription.businessId,
          plan: {
            id: plan.id,
            name: plan.name,
          },
          status: savedSubscription.status,
          startDate: savedSubscription.startDate,
          expiresAt: savedSubscription.endDate,
        },
      };
    });
  }

  async getSubscription(tenantId: string) {
    const tenant = await this.businessRepository.findOne({
      where: { id: tenantId },
    });
    if (!tenant) throw new NotFoundException('Tenant not found');

    return {
      plan: tenant.subscriptionPlan,
      status: tenant.status,
      expiresAt: tenant.subscriptionExpiresAt,
    };
  }

  async getPayments(tenantId: string) {
    const invoices = await this.invoiceRepository.find({
      where: { businessId: tenantId },
      order: { createdAt: 'DESC' },
    });

    return invoices.map((inv) => ({
      paymentId: inv.id,
      amount: inv.totalAmount,
      status: 'SUCCESS', // Mock status as requested since no Payment entity
      date: inv.createdAt,
    }));
  }

  // ════════════════════════════════════════════════════════════════
  // TENANT USER ADMINISTRATION
  // ════════════════════════════════════════════════════════════════

  async getTenantUsers(
    tenantId: string,
    options: { page?: number; limit?: number; search?: string } = {},
  ) {
    const { page = 1, limit = 10, search } = options;

    const qb = this.userRepository
      .createQueryBuilder('u')
      .leftJoinAndSelect('u.role', 'r')
      .where('u.businessId = :tenantId', { tenantId })
      .andWhere('u.platformRole IS NULL');

    if (search) {
      qb.andWhere('(u.name ILIKE :search OR u.email ILIKE :search)', {
        search: `%${search}%`,
      });
    }

    const total = await qb.getCount();
    const totalPages = Math.ceil(total / limit);

    const users = await qb
      .orderBy('u.createdAt', 'DESC')
      .offset((page - 1) * limit)
      .limit(limit)
      .getMany();

    const data = users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role
        ? {
            id: u.role.id,
            name: u.role.name,
          }
        : null,
      status: u.isActive ? 'ACTIVE' : 'SUSPENDED',
      lastLoginAt: u.lastLogin,
    }));

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages,
      },
    };
  }

  async getTenantRoles(tenantId: string) {
    const tenant = await this.businessRepository.findOne({
      where: { id: tenantId },
    });
    if (!tenant) throw new NotFoundException('Tenant not found');

    const roles = await this.roleRepository.find({
      where: { businessId: tenantId },
      relations: ['permissions'],
      order: { createdAt: 'ASC' },
    });

    return {
      data: roles.map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description,
        permissions: r.permissions?.map((p) => p.key) || [],
      })),
    };
  }
}
