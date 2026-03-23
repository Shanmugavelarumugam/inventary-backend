import { Module } from '@nestjs/common';
import { ProductsController } from './products/products.controller.js';
import { ProductsService } from './products/products.service.js';

@Module({
  controllers: [ProductsController],
  providers: [ProductsService],
})
export class InventoryModule {}
