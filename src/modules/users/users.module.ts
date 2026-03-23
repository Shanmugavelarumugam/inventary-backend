import { Module } from '@nestjs/common';
import { UsersService } from './users.service.js';
import { UsersController } from './users.controller.js';

import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../../database/entities/user.entity.js';
import { Role } from '../../database/entities/role.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([User, Role])],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
