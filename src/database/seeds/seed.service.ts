import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
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
    private readonly migrationService: TenantRoleMigrationService,
    private readonly configService: ConfigService,
  ) {}

  async onApplicationBootstrap() {
    await this.seedPermissions();
    await this.seedRoles();
    await this.seedSubscriptionPlans();
    await this.seedRootAdmin(); // ROOT from env
    await this.seedTestTenant();
    await this.migrationService.migrateAllTenants();
  }

  /**
   * ROOT Admin — Created once from environment variables.
   * This is the platform owner. Never created via API.
   */
  private async seedRootAdmin() {
    const email =
      this.configService.get<string>('ROOT_EMAIL') || 'root@gmail.com';
    const password =
      this.configService.get<string>('ROOT_PASSWORD') || '123456789';

    const exists = await this.userRepository.findOne({ where: { email } });

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
      await this.userRepository.save(root);
      this.logger.log(`✅ ROOT admin seeded: ${email}`);
    }
  }

  private async seedTestTenant() {
    const companyCode = 'ABC-PHARMA';
    let business = await this.businessRepository.findOne({
      where: { companyCode },
    });

    if (!business) {
      business = this.businessRepository.create({
        name: 'ABC Pharmacy',
        companyCode,
        domainType: 'pharmacy' as any as DomainType,
        status: BusinessStatus.ACTIVE,
        subscriptionPlan: SubscriptionPlan.PROFESSIONAL,
      });
      business = await this.businessRepository.save(business);
    }

    const adminRoleTemplate = await this.roleRepository.findOne({
      where: { name: 'admin', businessId: IsNull() },
      relations: ['permissions'],
    });

    let tenantAdminRole = await this.roleRepository.findOne({
      where: { name: 'Tenant Admin', businessId: business.id },
    });

    if (!tenantAdminRole && adminRoleTemplate) {
      tenantAdminRole = this.roleRepository.create({
        name: 'Tenant Admin',
        businessId: business.id,
        permissions: adminRoleTemplate.permissions,
      });
      tenantAdminRole = await this.roleRepository.save(tenantAdminRole);
    }

    const email = 'admin@abcpharma.com';
    const exists = await this.userRepository.findOne({ where: { email } });

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
      await this.userRepository.save(tenantAdmin);
    }

    // Ensure test tenant has a subscription
    const subExists = await this.subscriptionRepository.findOne({
      where: { businessId: business.id },
    });

    if (!subExists) {
      const trialEnd = new Date();
      trialEnd.setDate(trialEnd.getDate() + 7);

      const subscription = this.subscriptionRepository.create({
        businessId: business.id,
        plan: SubscriptionPlan.PROFESSIONAL,
        startDate: new Date(),
        endDate: trialEnd,
        status: 'ACTIVE',
      });
      await this.subscriptionRepository.save(subscription);
      this.logger.log(`✅ Subscription seeded for ABC Pharma`);
    }
  }

  private async seedPermissions() {
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
      const exists = await this.permissionRepository.findOne({
        where: { key: p.key },
      });
      if (!exists) {
        await this.permissionRepository.save(
          this.permissionRepository.create(p),
        );
      }
    }
  }

  private async seedRoles() {
    const allPermissions = await this.permissionRepository.find();
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
      let role = await this.roleRepository.findOne({
        where: { name: template.name, businessId: IsNull() },
        relations: ['permissions'],
      });

      if (!role) {
        role = this.roleRepository.create({
          name: template.name,
          businessId: null as unknown as string,
          permissions: template.permissions,
        });
        await this.roleRepository.save(role);
      } else {
        role.permissions = template.permissions;
        await this.roleRepository.save(role);
      }
    }
  }

  private async seedSubscriptionPlans() {
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
        features: { reports: 'enterprise', api: true, customIntegrations: true },
      },
    ];

    for (const planData of plans) {
      const exists = await this.subscriptionPlanRepository.findOne({
        where: { name: planData.name },
      });

      if (!exists) {
        const plan = this.subscriptionPlanRepository.create(planData);
        await this.subscriptionPlanRepository.save(plan);
        this.logger.log(`✅ Subscription Plan seeded: ${planData.name}`);
      }
    }
  }
}
