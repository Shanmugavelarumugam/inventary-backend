import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductsController } from './products/products.controller.js';
import { ProductsService } from './products/products.service.js';
import { MasterDataController } from './master-data.controller.js';
import { MasterDataService } from './master-data.service.js';
import { StockMovementsService } from './movements/movements.service.js';
import { StockMovementsController } from './movements/movements.controller.js';
import { Product } from '../../database/entities/product.entity.js';
import { Category } from '../../database/entities/category.entity.js';
import { Unit } from '../../database/entities/unit.entity.js';
import { Brand } from '../../database/entities/brand.entity.js';
import { StockMovement } from '../../database/entities/stock-movement.entity.js';
import { Branch } from '../../database/entities/branch.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([Product, Category, Unit, Brand, StockMovement, Branch])],
  controllers: [ProductsController, MasterDataController, StockMovementsController],
  providers: [ProductsService, MasterDataService, StockMovementsService],
  exports: [ProductsService, MasterDataService, StockMovementsService],
})
export class InventoryModule {}



