import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, DataSource, EntityManager } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { User } from '../entities/user.entity.js';
import { Role } from '../entities/role.entity.js';
import { Permission } from '../entities/permission.entity.js';
import { Business, DomainType } from '../entities/business.entity.js';
import { Subscription } from '../entities/subscription.entity.js';
import { SubscriptionPlan as SubscriptionPlanEntity } from '../entities/subscription-plan.entity.js';
import { HashUtil } from '../../common/utils/hash.util.js';
import { PlatformRole } from '../../common/enums/platform-role.enum.js';
import {
  BusinessStatus,
  SubscriptionPlan,
} from '../../common/enums/business.enum.js';
import { TenantRoleMigrationService } from './tenant-role-migration.service.js';

@Injectable()
export class SeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    @InjectRepository(Permission)
    private readonly permissionRepository: Repository<Permission>,
    @InjectRepository(Business)
    private readonly businessRepository: Repository<Business>,
    @InjectRepository(Subscription)
    private readonly subscriptionRepository: Repository<Subscription>,
    @InjectRepository(SubscriptionPlanEntity)
    private readonly subscriptionPlanRepository: Repository<SubscriptionPlanEntity>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly migrationService: TenantRoleMigrationService,
    private readonly configService: ConfigService,
  ) {}

  async onApplicationBootstrap() {
    await this.dataSource.transaction(async (manager) => {
      await this.seedPermissions(manager);
      await this.seedRoles(manager);
      await this.seedSubscriptionPlans(manager);
      await this.seedRootAdmin(manager);
      await this.seedTestTenant(manager);
      await this.migrationService.migrateAllTenants(manager);
      await this.seedDemoAccounts(manager);
    });
  }

  private async seedDemoAccounts(manager: EntityManager) {
    const demos = [
      { code: 'demo', name: 'Demo Business', domain: DomainType.RETAIL },
      {
        code: 'medicines',
        name: 'Viyan Medicines',
        domain: DomainType.PHARMACY,
      },
    ];

    for (const d of demos) {
      let business = await manager.findOne(Business, {
        where: { companyCode: d.code },
      });

      if (!business) {
        business = manager.create(Business, {
          name: d.name,
          companyCode: d.code,
          domainType: d.domain,
          status: BusinessStatus.ACTIVE,
          subscriptionPlan: SubscriptionPlan.PROFESSIONAL,
        });
        business = await manager.save(business);
        this.logger.log(`✅ Demo Business seeded: ${d.code}`);
      }

      // Create Admin for each
      const email = `admin@${d.code}.com`;
      const exists = await manager.findOne(User, { where: { email } });

      if (!exists) {
        // Find the TENANT_ADMIN role for this business
        const role = await manager.findOne(Role, {
          where: { name: 'TENANT_ADMIN', businessId: business.id },
        });

        const hashedPassword = await HashUtil.hash('admin123');
        const user = manager.create(User, {
          name: `${d.name} Admin`,
          email,
          password: hashedPassword,
          businessId: business.id,
          roleId: role?.id,
          isActive: true,
        });
        await manager.save(user);
        this.logger.log(`   + Admin seeded: ${email} / admin123`);
      }
    }
  }

  /**
   * ROOT Admin — Created once from environment variables.
   * This is the platform owner. Never created via API.
   */
  private async seedRootAdmin(manager: EntityManager) {
    const email =
      this.configService.get<string>('ROOT_EMAIL') || 'root@gmail.com';
    const password =
      this.configService.get<string>('ROOT_PASSWORD') || '123456789';

    const exists = await manager.findOne(User, { where: { email } });

    if (!exists) {
      const hashedPassword = await HashUtil.hash(password);
      const root = new User();
      Object.assign(root, {
        name: 'Platform Root',
        email,
        password: hashedPassword,
        platformRole: PlatformRole.ROOT,
        isActive: true,
      });
      await manager.save(root);
      this.logger.log(`✅ ROOT admin seeded: ${email}`);
    }
  }

  private async seedTestTenant(manager: EntityManager) {
    const companyCode = 'ABC-PHARMA';
    let business = await manager.findOne(Business, {
      where: { companyCode },
    });

    if (!business) {
      business = manager.create(Business, {
        name: 'ABC Pharmacy',
        companyCode,
        domainType: 'pharmacy' as any as DomainType,
        status: BusinessStatus.ACTIVE,
        subscriptionPlan: SubscriptionPlan.PROFESSIONAL,
      });
      business = await manager.save(business);
    }

    const adminRoleTemplate = await manager.findOne(Role, {
      where: { name: 'admin', businessId: IsNull() },
      relations: ['permissions'],
    });

    let tenantAdminRole = await manager.findOne(Role, {
      where: { name: 'Tenant Admin', businessId: business.id },
    });

    if (!tenantAdminRole && adminRoleTemplate) {
      tenantAdminRole = manager.create(Role, {
        name: 'Tenant Admin',
        businessId: business.id,
        permissions: adminRoleTemplate.permissions,
      });
      tenantAdminRole = await manager.save(tenantAdminRole);
    }

    const email = 'admin@abcpharma.com';
    const exists = await manager.findOne(User, { where: { email } });

    if (!exists) {
      const hashedPassword = await HashUtil.hash('admin123');
      const tenantAdmin = new User();
      Object.assign(tenantAdmin, {
        name: 'ABC Admin',
        email,
        password: hashedPassword,
        businessId: business.id,
        roleId: tenantAdminRole?.id,
      });
      await manager.save(tenantAdmin);
    }

    // Ensure test tenant has a subscription
    const subExists = await manager.findOne(Subscription, {
      where: { businessId: business.id },
    });

    if (!subExists) {
      const trialEnd = new Date();
      trialEnd.setDate(trialEnd.getDate() + 7);

      const subscription = manager.create(Subscription, {
        businessId: business.id,
        plan: SubscriptionPlan.PROFESSIONAL,
        startDate: new Date(),
        endDate: trialEnd,
        status: 'ACTIVE',
      });
      await manager.save(subscription);
      this.logger.log(`✅ Subscription seeded for ABC Pharma`);
    }
  }

  private async seedPermissions(manager: EntityManager) {
    const permissions = [
      { key: 'create_business', description: 'Can create businesses' },
      { key: 'view_business', description: 'Can view business details' },
      { key: 'create_user', description: 'Can create and manage users' },
      { key: 'view_user', description: 'Can view user details' },
      { key: 'update_user', description: 'Can update user details' },
      { key: 'delete_user', description: 'Can deactivate users' },
      { key: 'create_product', description: 'Can create products' },
      { key: 'view_product', description: 'Can view products' },
      { key: 'update_product', description: 'Can update products' },
      { key: 'delete_product', description: 'Can delete products' },
      { key: 'stock_in', description: 'Can record stock in movements' },
      { key: 'stock_out', description: 'Can record stock out movements' },
      { key: 'view_reports', description: 'Can view business reports' },
      { key: 'create_invoice', description: 'Can create invoices' },
      {
        key: 'manage_platform',
        description: 'Full platform administrative control',
      },
    ];

    for (const p of permissions) {
      const exists = await manager.findOne(Permission, {
        where: { key: p.key },
      });
      if (!exists) {
        await manager.save(manager.create(Permission, p));
      }
    }
  }

  private async seedRoles(manager: EntityManager) {
    const allPermissions = await manager.find(Permission);
    const getPerms = (keys: string[]) =>
      allPermissions.filter((p) => keys.includes(p.key));

    const roleTemplates = [
      {
        name: 'admin',
        permissions: allPermissions.filter((p) => p.key !== 'manage_platform'),
      },
      {
        name: 'manager',
        permissions: getPerms([
          'view_business',
          'create_user',
          'view_user',
          'update_user',
          'create_product',
          'view_product',
          'update_product',
          'stock_in',
          'stock_out',
          'view_reports',
          'create_invoice',
        ]),
      },
      {
        name: 'sales',
        permissions: getPerms(['view_product', 'stock_out', 'create_invoice']),
      },
      {
        name: 'finance',
        permissions: getPerms(['view_reports', 'create_invoice']),
      },
    ];

    for (const template of roleTemplates) {
      let role = await manager.findOne(Role, {
        where: { name: template.name, businessId: IsNull() },
        relations: ['permissions'],
      });

      if (!role) {
        role = manager.create(Role, {
          name: template.name,
          businessId: null as unknown as string,
          permissions: template.permissions,
        });
        await manager.save(role);
      } else {
        role.permissions = template.permissions;
        await manager.save(role);
      }
    }
  }

  private async seedSubscriptionPlans(manager: EntityManager) {
    const plans = [
      {
        name: SubscriptionPlan.FREE,
        price: 0,
        maxUsers: 1,
        maxProducts: 100,
        maxBranches: 1,
        maxInvoices: 100,
        billingCycle: 'MONTHLY',
        features: { reports: 'basic' },
      },
      {
        name: SubscriptionPlan.BASIC,
        price: 999,
        maxUsers: 3,
        maxProducts: 2000,
        maxBranches: 1,
        maxInvoices: 1000,
        billingCycle: 'MONTHLY',
        features: { reports: 'standard', gst: true },
      },
      {
        name: SubscriptionPlan.PROFESSIONAL,
        price: 2499,
        maxUsers: 10,
        maxProducts: 10000,
        maxBranches: 5,
        maxInvoices: -1, // Unlimited
        billingCycle: 'MONTHLY',
        features: { reports: 'advanced', barcode: true, batchTracking: true },
      },
      {
        name: SubscriptionPlan.ENTERPRISE,
        price: 0, // Custom pricing
        maxUsers: -1,
        maxProducts: -1,
        maxBranches: -1,
        maxInvoices: -1,
        billingCycle: 'MONTHLY',
        features: {
          reports: 'enterprise',
          api: true,
          customIntegrations: true,
        },
      },
    ];

    for (const planData of plans) {
      const exists = await manager.findOne(SubscriptionPlanEntity, {
        where: { name: planData.name },
      });

      if (!exists) {
        const plan = manager.create(SubscriptionPlanEntity, planData);
        await manager.save(plan);
        this.logger.log(`✅ Subscription Plan seeded: ${planData.name}`);
      }
    }
  }
}
