import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service.js';
import { AuthController } from './auth.controller.js';
import { PlatformModule } from '../platform/platform.module.js';

import { User } from '../../database/entities/user.entity.js';
import { Business } from '../../database/entities/business.entity.js';
import { Role } from '../../database/entities/role.entity.js';
import { Permission } from '../../database/entities/permission.entity.js';
import { JwtStrategy } from './strategies/jwt.strategy.js';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),

        signOptions: {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          expiresIn: (configService.get<string>('JWT_EXPIRE_IN') ||
            '1d') as any,
        },
      }),
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature([User, Business, Role, Permission]),
    PlatformModule,
  ],

  providers: [AuthService, JwtStrategy],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
