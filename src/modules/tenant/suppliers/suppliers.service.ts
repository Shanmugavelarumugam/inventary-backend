import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Supplier } from '../../../database/entities/supplier.entity.js';
import { Purchase } from '../../../database/entities/purchase.entity.js';

@Injectable()
export class SuppliersService {
  constructor(
    @InjectRepository(Supplier)
    private readonly supplierRepository: Repository<Supplier>,
    @InjectRepository(Purchase)
    private readonly purchaseRepository: Repository<Purchase>,
  ) {}

  async findAll(businessId: string) {
    return this.supplierRepository.find({ where: { businessId }, order: { name: 'ASC' } });
  }

  async findOne(id: string, businessId: string) {
    const supplier = await this.supplierRepository.findOne({ where: { id, businessId } });
    if (!supplier) throw new NotFoundException('Supplier not found');
    return supplier;
  }

  async create(businessId: string, data: Partial<Supplier>) {
    const supplier = this.supplierRepository.create({ ...data, businessId });
    return this.supplierRepository.save(supplier);
  }

  async update(id: string, businessId: string, data: Partial<Supplier>) {
    const supplier = await this.findOne(id, businessId);
    Object.assign(supplier, data);
    return this.supplierRepository.save(supplier);
  }

  async delete(id: string, businessId: string) {
    const supplier = await this.findOne(id, businessId);
    return this.supplierRepository.remove(supplier);
  }

  async getPurchases(id: string, businessId: string) {
    return this.purchaseRepository.find({
      where: { supplierId: id, businessId },
      order: { purchaseDate: 'DESC' },
    });
  }

  async getPayments(id: string, businessId: string) {
    // Basic implementation: payments are usually tied to purchases
    const purchases = await this.getPurchases(id, businessId);
    return purchases.map(p => ({
      purchaseId: p.id,
      amount: p.totalAmount,
      date: p.purchaseDate,
      status: p.status,
    }));
  }
}
