import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BranchesService } from './branches.service.js';
import { StockTransfersService } from './transfers.service.js';
import { BranchesController } from './branches.controller.js';
import { StockTransfersController } from './transfers.controller.js';

import { Branch } from '../../database/entities/branch.entity.js';
import { StockLevel } from '../../database/entities/stock-level.entity.js';
import { StockTransfer } from '../../database/entities/stock-transfer.entity.js';
import { StockTransferItem } from '../../database/entities/stock-transfer-item.entity.js';
import { User } from '../../database/entities/user.entity.js';
import { InventoryModule } from '../inventory/inventory.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Branch,
      StockLevel,
      StockTransfer,
      StockTransferItem,
      User,
    ]),
    InventoryModule, // For StockMovements
  ],
  controllers: [BranchesController, StockTransfersController],
  providers: [BranchesService, StockTransfersService],
  exports: [BranchesService, StockTransfersService],
})
export class BranchesModule {}
