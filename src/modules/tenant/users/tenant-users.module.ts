import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../../../database/entities/user.entity.js';
import { Business } from '../../../database/entities/business.entity.js';
import { Role } from '../../../database/entities/role.entity.js';
import { TenantUsersController } from './tenant-users.controller.js';
import { TenantUsersService } from './tenant-users.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([User, Business, Role])],
  controllers: [TenantUsersController],
  providers: [TenantUsersService],
  exports: [TenantUsersService],
})
export class TenantUsersModule {}
