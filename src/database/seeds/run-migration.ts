import { NestFactory } from '@nestjs/core';
import { SeedModule } from './seed.module.js';
import { TenantRoleMigrationService } from './tenant-role-migration.service.js';
import { AppModule } from '../../app.module.js';

async function runMigration() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const migrationService = app.get(TenantRoleMigrationService);
  
  try {
    await migrationService.migrateAllTenants();
    console.log('🚀 Migration successful!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await app.close();
  }
}

runMigration();
