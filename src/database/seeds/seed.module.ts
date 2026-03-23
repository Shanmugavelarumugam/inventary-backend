import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { User } from '../entities/user.entity.js';
import { Role } from '../entities/role.entity.js';
import { Permission } from '../entities/permission.entity.js';
import { SeedService } from './seed.service.js';
import { Business } from '../entities/business.entity.js';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([User, Role, Permission, Business]),
  ],
  providers: [SeedService],
  exports: [SeedService],
})
export class SeedModule {}
