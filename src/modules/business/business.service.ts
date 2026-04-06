import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Business } from '../../database/entities/business.entity.js';

@Injectable()
export class BusinessService {
  constructor(
    @InjectRepository(Business)
    private readonly businessRepository: Repository<Business>,
  ) {}

  async findOne(id: string): Promise<Business> {
    const business = await this.businessRepository.findOne({ where: { id } });
    if (!business) throw new NotFoundException('Business not found');
    return business;
  }
}

