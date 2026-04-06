import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Branch } from '../../database/entities/branch.entity.js';
import { StockLevel } from '../../database/entities/stock-level.entity.js';
import { StockTransfer, TransferStatus } from '../../database/entities/stock-transfer.entity.js';
import { StockTransferItem } from '../../database/entities/stock-transfer-item.entity.js';
import { StockMovementsService } from '../inventory/movements/movements.service.js';
import { MovementType } from '../../database/entities/stock-movement.entity.js';

@Injectable()
export class BranchesService {
  constructor(
    @InjectRepository(Branch)
    private readonly branchRepository: Repository<Branch>,
    @InjectRepository(StockLevel)
    private readonly stockLevelRepository: Repository<StockLevel>,
    @InjectRepository(StockTransfer)
    private readonly stockTransferRepository: Repository<StockTransfer>,
    @InjectRepository(StockTransferItem)
    private readonly stockTransferItemRepository: Repository<StockTransferItem>,
    private readonly stockMovementsService: StockMovementsService,
    private readonly dataSource: DataSource,
  ) {}

  // Branch CRUD
  async findAllBranches(businessId: string) {
    return this.branchRepository.find({ where: { businessId } });
  }

  async createBranch(businessId: string, data: Partial<Branch>) {
    const branch = this.branchRepository.create({ ...data, businessId });
    return this.branchRepository.save(branch);
  }

  // Stock Transfers
  async findAllTransfers(businessId: string) {
    return this.stockTransferRepository.find({
      where: { businessId },
      relations: ['fromBranch', 'toBranch', 'items', 'items.product'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Initiates a transfer: Deducts stock from Source and marks as SHIPPED.
   */
  async initiateTransfer(businessId: string, userId: string, data: any) {
    const { fromBranchId, toBranchId, items, notes } = data;

    if (fromBranchId === toBranchId) {
      throw new BadRequestException('Source and destination branches cannot be the same');
    }

    return this.dataSource.transaction(async (manager) => {
      const transfer = manager.create(StockTransfer, {
        businessId,
        fromBranchId,
        toBranchId,
        transferDate: new Date(),
        status: TransferStatus.SHIPPED,
        createdById: userId,
        notes,
      });

      const savedTransfer = await manager.save(transfer);

      for (const item of items) {
        // 1. Create Transfer Item record
        const transferItem = manager.create(StockTransferItem, {
          transferId: savedTransfer.id,
          productId: item.productId,
          quantity: item.quantity,
        });
        await manager.save(transferItem);

        // 2. Adjust Stock at Source (Decrease)
        await this.stockMovementsService.adjustStock(
          businessId,
          item.productId,
          -item.quantity,
          MovementType.TRANSFER,
          userId,
          `Transfer #${savedTransfer.id.split('-')[0]} OUT`,
          savedTransfer.id,
          fromBranchId
        );
      }

      return savedTransfer;
    });
  }

  /**
   * Finalizes a transfer: Adds stock to Destination and marks as RECEIVED.
   */
  async receiveTransfer(id: string, businessId: string, userId: string) {
    const transfer = await this.stockTransferRepository.findOne({
      where: { id, businessId },
      relations: ['items'],
    });

    if (!transfer) throw new NotFoundException('Transfer not found');
    if (transfer.status !== TransferStatus.SHIPPED) {
      throw new BadRequestException('Only shipped transfers can be received');
    }

    return this.dataSource.transaction(async (manager) => {
      transfer.status = TransferStatus.RECEIVED;
      await manager.save(transfer);

      for (const item of transfer.items) {
        // Adjust Stock at Destination (Increase)
        await this.stockMovementsService.adjustStock(
          businessId,
          item.productId,
          item.quantity,
          MovementType.TRANSFER,
          userId,
          `Transfer #${transfer.id.split('-')[0]} IN`,
          transfer.id,
          transfer.toBranchId
        );
      }

      return transfer;
    });
  }
}
