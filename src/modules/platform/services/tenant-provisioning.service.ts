import {
  Injectable,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Business } from '../../../database/entities/business.entity.js';
import { User } from '../../../database/entities/user.entity.js';
import { Role } from '../../../database/entities/role.entity.js';
import { Subscription } from '../../../database/entities/subscription.entity.js';
import { HashUtil } from '../../../common/utils/hash.util.js';
import { BusinessStatus, SubscriptionPlan } from '../../../common/enums/business.enum.js';
import { AuditLogService } from './audit-log.service.js';
import { AuditAction } from '../../../common/enums/audit-action.enum.js';
import { ProvisionTenantDto, ProvisionTenantResponseDto } from '../dto/provision-tenant.dto.js';

@Injectable()
export class TenantProvisioningService {
  constructor(
    @InjectRepository(Business)
    private readonly businessRepository: Repository<Business>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    @InjectRepository(Subscription)
    private readonly subscriptionRepository: Repository<Subscription>,
    private readonly auditLogService: AuditLogService,
    private readonly dataSource: DataSource,
  ) {}

  async createTenant(
    dto: ProvisionTenantDto,
    origin: 'SELF_SERVICE' | 'PLATFORM_ADMIN',
    creatorId?: string,
    metadata?: { ipAddress?: string; userAgent?: string },
  ): Promise<ProvisionTenantResponseDto> {
    const { ipAddress, userAgent } = metadata || {};

    // 1. Uniqueness Checks
    const existingBusiness = await this.businessRepository.findOne({
      where: { name: dto.businessName },
    });
    if (existingBusiness) {
      throw new ConflictException('Business name already exists');
    }

    const existingUser = await this.userRepository.findOne({
      where: { email: dto.adminEmail },
    });
    if (existingUser) {
      throw new ConflictException('Admin email already exists');
    }

    // 2. Transactional Creation
    return await this.dataSource.transaction(async (manager) => {
      // A. Generate Company Code
      const slug = dto.businessName
        .replace(/[^a-zA-Z0-9]/g, '')
        .toUpperCase()
        .slice(0, 8);
      const suffix = Math.random().toString(36).substring(2, 5).toUpperCase();
      const companyCode = `${slug}${suffix}`;

      // B. Create Business
      const business = manager.create(Business, {
        name: dto.businessName,
        companyCode,
        domainType: dto.domainType,
        status: BusinessStatus.ACTIVE,
        subscriptionPlan: SubscriptionPlan.FREE as any,
        phone: dto.phone,
        email: dto.businessEmail,
        address: dto.address,
        timezone: 'Asia/Kolkata',
        currency: 'INR',
      });
      const savedBusiness = await manager.save(business);

      // C. Seed Universal Tenant Roles
      const roleNames = [
        'TENANT_ADMIN',
        'BUSINESS_MANAGER',
        'SALES_STAFF',
        'INVENTORY_MANAGER',
        'FINANCE_MANAGER',
        'VIEWER',
      ];
      
      const roleEntities = roleNames.map(name => 
        manager.create(Role, { name, businessId: savedBusiness.id })
      );
      const savedRoles = await manager.save(roleEntities);
      
      // Find the TENANT_ADMIN role for the primary user
      const adminRole = savedRoles.find((r) => r.name === 'TENANT_ADMIN');
      if (!adminRole) {
        throw new Error('Failed to seed default administrator role');
      }

      // D. Create Admin User
      const hashedPassword = await HashUtil.hash(dto.adminPassword);
      const adminUser = manager.create(User, {
        name: dto.adminName,
        email: dto.adminEmail,
        password: hashedPassword,
        businessId: savedBusiness.id,
        roleId: adminRole.id,
        createdBy: creatorId,
        isActive: true,
      });
      const savedUser = await manager.save(adminUser);

      // E. Create Initial Trial Subscription (7 days)
      const trialStart = new Date();
      const trialEnd = new Date();
      trialEnd.setDate(trialEnd.getDate() + 7);

      const subscription = manager.create(Subscription, {
        businessId: savedBusiness.id,
        plan: savedBusiness.subscriptionPlan,
        startDate: trialStart,
        endDate: trialEnd,
        status: 'ACTIVE',
      });
      const savedSub = await manager.save(subscription);

      // F. Audit Log
      const auditLog = manager.create('AuditLog', {
        userId: creatorId, // May be null if SELF_SERVICE
        action: AuditAction.CREATE_TENANT,
        entityType: 'business',
        entityId: savedBusiness.id,
        entityName: savedBusiness.name,
        businessId: savedBusiness.id,
        userEmail: origin === 'SELF_SERVICE' ? savedUser.email : undefined,
        ipAddress,
        userAgent,
        newValue: {
          name: savedBusiness.name,
          code: savedBusiness.companyCode,
          plan: savedBusiness.subscriptionPlan,
          registrationType: origin,
        },
      });
      await manager.save(auditLog);

      return {
        message: 'Tenant provisioned successfully',
        business: {
          id: savedBusiness.id,
          name: savedBusiness.name,
          companyCode: savedBusiness.companyCode,
          status: savedBusiness.status,
        },
        adminUser: {
          id: savedUser.id,
          name: savedUser.name,
          email: savedUser.email,
        },
        subscription: {
          plan: savedSub.plan,
          status: savedSub.status as string,
          trialDays: 7,
        },
      };
    });
  }
}
