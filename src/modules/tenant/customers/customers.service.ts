import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Customer } from '../../../database/entities/customer.entity.js';
import { Invoice } from '../../../database/entities/invoice.entity.js';

@Injectable()
export class CustomersService {
  constructor(
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,
  ) {}

  async findAll(businessId: string) {
    return this.customerRepository.find({ where: { businessId }, order: { name: 'ASC' } });
  }

  async findOne(id: string, businessId: string) {
    const customer = await this.customerRepository.findOne({ where: { id, businessId } });
    if (!customer) throw new NotFoundException('Customer not found');
    return customer;
  }

  async create(businessId: string, data: Partial<Customer>) {
    const customer = this.customerRepository.create({ ...data, businessId });
    return this.customerRepository.save(customer);
  }

  async update(id: string, businessId: string, data: Partial<Customer>) {
    const customer = await this.findOne(id, businessId);
    Object.assign(customer, data);
    return this.customerRepository.save(customer);
  }

  async delete(id: string, businessId: string) {
    const customer = await this.findOne(id, businessId);
    return this.customerRepository.remove(customer);
  }

  async getLedger(id: string, businessId: string) {
    const customer = await this.findOne(id, businessId);
    const invoices = await this.invoiceRepository.find({
      where: { customerId: id, businessId },
      order: { createdAt: 'DESC' },
    });

    return {
      customer,
      balance: invoices.reduce((sum, inv) => sum + Number(inv.totalAmount), 0), // Simple balance logic
      transactions: invoices,
    };
  }

  async getInvoices(id: string, businessId: string) {
    return this.invoiceRepository.find({
      where: { customerId: id, businessId },
      order: { createdAt: 'DESC' },
    });
  }
}
