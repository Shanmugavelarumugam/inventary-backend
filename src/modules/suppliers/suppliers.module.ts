import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SuppliersService } from './suppliers.service.js'; // Verified path
import { SuppliersController } from './suppliers.controller.js'; // Verified path
import { Supplier } from '../../database/entities/supplier.entity.js';
import { SupplierLedger } from '../../database/entities/supplier-ledger.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([Supplier, SupplierLedger])],
  controllers: [SuppliersController],
  providers: [SuppliersService],
  exports: [SuppliersService],
})
export class SuppliersModule {}
