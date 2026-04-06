import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { User } from '../../../database/entities/user.entity.js';
import { Business } from '../../../database/entities/business.entity.js';
import { Role } from '../../../database/entities/role.entity.js';
import { HashUtil } from '../../../common/utils/hash.util.js';
import {
  CreateTenantStaffUserDto,
  UpdateTenantStaffUserDto,
  TenantUserQueryDto,
} from './dto/tenant-user.dto.js';

@Injectable()
export class TenantUsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Business)
    private readonly businessRepository: Repository<Business>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
  ) {}

  async create(dto: CreateTenantStaffUserDto, businessId: string) {
    // 1. Subscription Limit Check
    const business = await this.businessRepository.findOne({
      where: { id: businessId },
    });
    if (!business) throw new NotFoundException('Business not found');

    const currentUsersCount = await this.userRepository.count({
      where: { businessId, platformRole: IsNull() },
    });

    if (currentUsersCount >= business.maxUsers) {
      throw new ForbiddenException(
        'User limit reached for your current subscription. Please upgrade your plan.',
      );
    }

    // 2. Uniqueness Check
    const existing = await this.userRepository.findOne({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('Email already exists in the system');
    }

    // 3. Validate Role
    const role = await this.roleRepository.findOne({
      where: { id: dto.roleId, businessId },
    });
    if (!role) {
      throw new BadRequestException('Invalid role selected for this business');
    }

    // 4. Create User
    const password = dto.password || Math.random().toString(36).slice(-10);
    const hashedPassword = await HashUtil.hash(password);

    const user = this.userRepository.create({
      name: dto.name,
      email: dto.email,
      password: hashedPassword,
      businessId,
      roleId: role.id,
      isActive: true,
    });

    const saved = await this.userRepository.save(user);

    return {
      message: 'User created successfully',
      data: {
        id: saved.id,
        name: saved.name,
        email: saved.email,
        role: role.name,
        tempPassword: dto.password ? undefined : password, // Return if generated
      },
    };
  }

  async findAll(businessId: string, query: TenantUserQueryDto) {
    const page = query.page ? parseInt(query.page) : 1;
    const limit = query.limit ? parseInt(query.limit) : 20;
    const { search, role, status } = query;

    const qb = this.userRepository
      .createQueryBuilder('u')
      .leftJoinAndSelect('u.role', 'r')
      .where('u.businessId = :businessId', { businessId })
      .andWhere('u.platformRole IS NULL');

    if (search) {
      qb.andWhere('(u.name ILIKE :search OR u.email ILIKE :search)', {
        search: `%${search}%`,
      });
    }

    if (role) {
      qb.andWhere('r.name = :role', { role });
    }

    if (status) {
      qb.andWhere('u.isActive = :isActive', {
        isActive: status === 'active',
      });
    }

    const [users, total] = await qb
      .orderBy('u.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      total,
      page,
      limit,
      data: users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role?.name,
        isActive: u.isActive,
        lastLoginAt: u.lastLogin,
        createdAt: u.createdAt,
      })),
    };
  }

  async findOne(id: string, businessId: string) {
    const user = await this.userRepository.findOne({
      where: { id, businessId, platformRole: IsNull() },
      relations: ['role'],
    });
    if (!user) throw new NotFoundException('User not found');
    
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: {
        id: user.role?.id,
        name: user.role?.name,
      },
      isActive: user.isActive,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLogin,
    };
  }

  async update(id: string, dto: UpdateTenantStaffUserDto, businessId: string) {
    const user = await this.userRepository.findOne({
      where: { id, businessId },
    });
    if (!user) throw new NotFoundException('User not found');

    if (dto.roleId) {
      const role = await this.roleRepository.findOne({
        where: { id: dto.roleId, businessId },
      });
      if (!role) {
        throw new BadRequestException('Invalid role selected');
      }
      user.roleId = role.id;
    }

    if (dto.name) user.name = dto.name;

    await this.userRepository.save(user);
    return { message: 'User updated successfully' };
  }

  async setStatus(id: string, isActive: boolean, businessId: string) {
    const user = await this.userRepository.findOne({
      where: { id, businessId },
    });
    if (!user) throw new NotFoundException('User not found');

    user.isActive = isActive;
    await this.userRepository.save(user);

    return {
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
    };
  }

  async resetPassword(id: string, newPassword: string, businessId: string) {
    const user = await this.userRepository.findOne({
      where: { id, businessId },
    });
    if (!user) throw new NotFoundException('User not found');

    user.password = await HashUtil.hash(newPassword);
    user.refreshToken = null; // Logout from all sessions
    
    await this.userRepository.save(user);
    return { message: 'Password reset successfully' };
  }

  async delete(id: string, businessId: string) {
    const user = await this.userRepository.findOne({
      where: { id, businessId },
    });
    if (!user) throw new NotFoundException('User not found');

    await this.userRepository.remove(user);
    return { message: 'User deleted successfully' };
  }
}
