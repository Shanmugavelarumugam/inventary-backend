import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Role } from '../../database/entities/role.entity.js';
import { Permission } from '../../database/entities/permission.entity.js';
import { CreateRoleDto, AssignPermissionsDto } from './dto/index.js';

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    @InjectRepository(Permission)
    private readonly permissionRepository: Repository<Permission>,
  ) {}

  async create(dto: CreateRoleDto, businessId: string) {
    const role = new Role();
    Object.assign(role, {
      ...dto,
      businessId,
      permissions: [],
    });
    return this.roleRepository.save(role);
  }

  async assignPermissions(
    id: string,
    dto: AssignPermissionsDto,
    businessId: string,
  ) {
    const role = await this.findOne(id, businessId);

    const permissions = await this.permissionRepository.find({
      where: { id: In(dto.permissionIds) },
    });

    role.permissions = permissions;
    return this.roleRepository.save(role);
  }

  async findAll(businessId: string) {
    return this.roleRepository.find({
      where: { businessId },
      relations: ['permissions'],
      order: { name: 'ASC' },
    });
  }

  async findOne(id: string, businessId: string) {
    const role = await this.roleRepository.findOne({
      where: { id, businessId },
      relations: ['permissions'],
    });
    if (!role) {
      throw new NotFoundException('Role not found');
    }
    return role;
  }
}
