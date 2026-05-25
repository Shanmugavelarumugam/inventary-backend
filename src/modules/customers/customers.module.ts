import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomersService } from './customers.service.js';
import { CustomersController } from './customers.controller.js';
import { Customer } from '../../database/entities/customer.entity.js';
import { CustomerLedger } from '../../database/entities/customer-ledger.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([Customer, CustomerLedger])],
  controllers: [CustomersController],
  providers: [CustomersService],
  exports: [CustomersService],
})
export class CustomersModule {}
