import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, IsNull, DataSource, EntityManager } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
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
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async migrateAllTenants(existingManager?: EntityManager) {
    const manager = existingManager || this.dataSource.manager;
    const businesses = await manager.find(Business);
    this.logger.log(
      `🚀 Starting role migration for ${businesses.length} businesses...`,
    );

    const universalRoleNames = [
      'TENANT_ADMIN',
      'BUSINESS_MANAGER',
      'SALES_STAFF',
      'INVENTORY_MANAGER',
      'FINANCE_MANAGER',
      'VIEWER',
    ];

    const allPermissions = await manager.find(Permission);

    for (const business of businesses) {
      await this.migrateSingleTenant(
        manager,
        business,
        universalRoleNames,
        allPermissions,
      );
    }

    this.logger.log('✅ Universal role migration complete.');
  }

  private async migrateSingleTenant(
    manager: EntityManager,
    business: Business,
    roleNames: string[],
    allPermissions: Permission[],
  ) {
    this.logger.log(
      `📦 Migrating roles for: ${business.name} (${business.id})`,
    );

    // 1. Seed/Sync Universal Roles
    const existingRoles = await manager.find(Role, {
      where: { businessId: business.id },
      relations: ['permissions'],
    });

    for (const name of roleNames) {
      let role = existingRoles.find((r) => r.name === name);
      const defaultPerms = this.getDefaultPermissions(name, allPermissions);

      if (!role) {
        role = manager.create(Role, {
          name,
          businessId: business.id,
          permissions: defaultPerms,
        });
        await manager.save(role);
        this.logger.log(`   + Created universal role: ${name}`);
      } else if (!role.permissions || role.permissions.length === 0) {
        // Repair empty permissions
        role.permissions = defaultPerms;
        await manager.save(role);
        this.logger.log(`   + Repaired permissions for role: ${name}`);
      }
    }

    // 2. Re-assign Legacy Admins to TENANT_ADMIN
    const tenantAdminRole = await manager.findOne(Role, {
      where: { name: 'TENANT_ADMIN', businessId: business.id },
    });

    if (tenantAdminRole) {
      const legacyAdminRoles = existingRoles.filter((r) =>
        ['OWNER', 'Tenant Admin', 'admin'].includes(r.name),
      );

      if (legacyAdminRoles.length > 0) {
        const legacyRoleIds = legacyAdminRoles.map((r) => r.id);

        const legacyUsers = await manager.find(User, {
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
          await manager.save(User, legacyUsers);
          this.logger.log(
            `   + Re-assigned ${legacyUsers.length} users to TENANT_ADMIN.`,
          );
        }
      }
    }
  }

  private getDefaultPermissions(
    roleName: string,
    allPerms: Permission[],
  ): Permission[] {
    const getPerms = (keys: string[]) =>
      allPerms.filter((p) => keys.includes(p.key));

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
        return getPerms([
          'view_business',
          'view_user',
          'view_product',
          'view_reports',
        ]);
      default:
        return [];
    }
  }
}
