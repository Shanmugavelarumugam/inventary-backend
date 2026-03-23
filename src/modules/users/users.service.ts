import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../database/entities/user.entity.js';
import { Role } from '../../database/entities/role.entity.js';
import { HashUtil } from '../../common/utils/hash.util.js';
import { CreateUserDto, UpdateUserDto } from './dto/index.js';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
  ) {}

  async create(dto: CreateUserDto, businessId: string) {
    const existing = await this.userRepository.findOne({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('Email already exists');
    }

    // Validate role exists for this business
    const role = await this.roleRepository.findOne({
      where: { id: dto.roleId, businessId },
    });
    if (!role) {
      throw new BadRequestException('Invalid role for this business');
    }

    const hashedPassword = await HashUtil.hash(dto.password);
    const user = new User();
    Object.assign(user, {
      ...dto,
      password: hashedPassword,
      businessId,
      isActive: true,
    });

    const saved = await this.userRepository.save(user);
    return {
      id: saved.id,
      name: saved.name,
      email: saved.email,
      businessId: saved.businessId,
      role: {
        id: role.id,
        name: role.name,
      },
      isActive: saved.isActive,
    };
  }

  async findAll(businessId: string, page = 1, limit = 10) {
    const [data, total] = await this.userRepository.findAndCount({
      where: { businessId },
      relations: ['role'],
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return {
      total,
      page,
      limit,
      data: data.map((u) => ({
        id: u.id,
        email: u.email,
        role: u.role?.name,
        isActive: u.isActive,
      })),
    };
  }

  async findOne(id: string, businessId: string) {
    const user = await this.userRepository.findOne({
      where: { id, businessId },
      relations: ['role'],
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async updateRole(id: string, roleId: string, businessId: string) {
    const user = await this.findOne(id, businessId);

    const role = await this.roleRepository.findOne({
      where: { id: roleId, businessId },
    });
    if (!role) {
      throw new BadRequestException('Invalid role for this business');
    }

    user.roleId = roleId;
    await this.userRepository.save(user);
    return { message: 'Role updated successfully' };
  }

  async deactivate(id: string, businessId: string) {
    const user = await this.findOne(id, businessId);
    user.isActive = false;
    await this.userRepository.save(user);
    return { message: 'User deactivated' };
  }

  async activate(id: string, businessId: string) {
    const user = await this.findOne(id, businessId);
    user.isActive = true;
    await this.userRepository.save(user);
    return { message: 'User activated' };
  }

  async update(id: string, dto: UpdateUserDto, businessId: string) {
    const user = await this.findOne(id, businessId);
    Object.assign(user, dto);
    return this.userRepository.save(user);
  }
}
