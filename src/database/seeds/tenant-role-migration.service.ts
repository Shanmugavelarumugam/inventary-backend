import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, IsNull } from 'typeorm';
import { Business } from '../entities/business.entity.js';
import { Role } from '../entities/role.entity.js';
import { User } from '../entities/user.entity.js';
import { Permission } from '../entities/permission.entity.js';

@Injectable()
export class TenantRoleMigrationService {
  private readonly logger = new Logger(TenantRoleMigrationService.name);

  constructor(
    @InjectRepository(Business)
    private readonly businessRepository: Repository<Business>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Permission)
    private readonly permissionRepository: Repository<Permission>,
  ) {}

  async migrateAllTenants() {
    const businesses = await this.businessRepository.find();
    this.logger.log(`🚀 Starting role migration for ${businesses.length} businesses...`);

    const universalRoleNames = [
      'TENANT_ADMIN',
      'BUSINESS_MANAGER',
      'SALES_STAFF',
      'INVENTORY_MANAGER',
      'FINANCE_MANAGER',
      'VIEWER',
    ];

    const allPermissions = await this.permissionRepository.find();

    for (const business of businesses) {
      await this.migrateSingleTenant(business, universalRoleNames, allPermissions);
    }

    this.logger.log('✅ Universal role migration complete.');
  }

  private async migrateSingleTenant(
    business: Business,
    roleNames: string[],
    allPermissions: Permission[],
  ) {
    this.logger.log(`📦 Migrating roles for: ${business.name} (${business.id})`);

    // 1. Seed/Sync Universal Roles
    const existingRoles = await this.roleRepository.find({
      where: { businessId: business.id },
      relations: ['permissions'],
    });

    for (const name of roleNames) {
      let role = existingRoles.find((r) => r.name === name);
      const defaultPerms = this.getDefaultPermissions(name, allPermissions);

      if (!role) {
        role = this.roleRepository.create({
          name,
          businessId: business.id,
          permissions: defaultPerms,
        });
        await this.roleRepository.save(role);
        this.logger.log(`   + Created universal role: ${name}`);
      } else if (!role.permissions || role.permissions.length === 0) {
        // Repair empty permissions
        role.permissions = defaultPerms;
        await this.roleRepository.save(role);
        this.logger.log(`   + Repaired permissions for role: ${name}`);
      }
    }

    // 2. Re-assign Legacy Admins to TENANT_ADMIN
    const tenantAdminRole = await this.roleRepository.findOne({
      where: { name: 'TENANT_ADMIN', businessId: business.id },
    });

    if (tenantAdminRole) {
      const legacyAdminRoles = existingRoles.filter((r) =>
        ['OWNER', 'Tenant Admin', 'admin'].includes(r.name),
      );

      if (legacyAdminRoles.length > 0) {
        const legacyRoleIds = legacyAdminRoles.map((r) => r.id);
        
        const legacyUsers = await this.userRepository.find({
          where: {
            businessId: business.id,
            roleId: In(legacyRoleIds),
            platformRole: IsNull(),
          },
        });

        if (legacyUsers.length > 0) {
          for (const user of legacyUsers) {
            user.roleId = tenantAdminRole.id;
          }
          await this.userRepository.save(legacyUsers);
          this.logger.log(`   + Re-assigned ${legacyUsers.length} users to TENANT_ADMIN.`);
        }
      }
    }
  }

  private getDefaultPermissions(roleName: string, allPerms: Permission[]): Permission[] {
    const getPerms = (keys: string[]) => allPerms.filter((p) => keys.includes(p.key));

    switch (roleName) {
      case 'TENANT_ADMIN':
        return allPerms.filter((p) => p.key !== 'manage_platform');
      case 'BUSINESS_MANAGER':
        return getPerms([
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
        ]);
      case 'SALES_STAFF':
        return getPerms(['view_product', 'stock_out', 'create_invoice']);
      case 'INVENTORY_MANAGER':
        return getPerms([
          'view_product',
          'create_product',
          'update_product',
          'stock_in',
          'stock_out',
          'view_reports',
        ]);
      case 'FINANCE_MANAGER':
        return getPerms(['view_reports', 'create_invoice']);
      case 'VIEWER':
        return getPerms(['view_business', 'view_user', 'view_product', 'view_reports']);
      default:
        return [];
    }
  }
}
