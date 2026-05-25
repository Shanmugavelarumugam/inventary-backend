import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { StockTransfer } from '../../database/entities/stock-transfer.entity.js';
import { StockTransferItem } from '../../database/entities/stock-transfer-item.entity.js';
import { StockMovementsService } from '../inventory/movements/movements.service.js';
import { MovementType } from '../../database/entities/stock-movement.entity.js';
import { StockTransferStatus } from '../../common/enums/branch.enum.js';

export class InitiateTransferDto {
  fromBranchId: string;
  toBranchId: string;
  items: {
    productId: string;
    quantity: number;
  }[];
  notes?: string;
}

@Injectable()
export class StockTransfersService {
  constructor(
    @InjectRepository(StockTransfer)
    private readonly transferRepository: Repository<StockTransfer>,
    @InjectRepository(StockTransferItem)
    private readonly itemRepository: Repository<StockTransferItem>,
    private readonly stockMovementsService: StockMovementsService,
    private readonly dataSource: DataSource,
  ) {}

  async findAll(businessId: string) {
    return this.transferRepository.find({
      where: { businessId },
      relations: [
        'fromBranch',
        'toBranch',
        'items',
        'items.product',
        'transferredBy',
        'receivedBy',
      ],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string, businessId: string) {
    const transfer = await this.transferRepository.findOne({
      where: { id, businessId },
      relations: [
        'fromBranch',
        'toBranch',
        'items',
        'items.product',
        'transferredBy',
        'receivedBy',
      ],
    });
    if (!transfer) throw new NotFoundException('Transfer not found');
    return transfer;
  }

  /**
   * 1. Initiate: Create PENDING record
   */
  async initiate(
    businessId: string,
    userId: string,
    data: InitiateTransferDto,
  ) {
    const { fromBranchId, toBranchId, items, notes } = data;

    if (fromBranchId === toBranchId) {
      throw new BadRequestException(
        'Source and destination cannot be the same',
      );
    }

    const transfer = this.transferRepository.create({
      businessId,
      fromBranchId,
      toBranchId,
      notes,
      transferredById: userId,
      status: StockTransferStatus.PENDING,
    });

    const savedTransfer = await this.transferRepository.save(transfer);

    for (const item of items) {
      const transferItem = this.itemRepository.create({
        transferId: savedTransfer.id,
        productId: item.productId,
        quantity: item.quantity,
      });
      await this.itemRepository.save(transferItem);
    }

    return savedTransfer;
  }

  /**
   * 2. Dispatch: Set to IN_TRANSIT (Deduct from Source)
   */
  async dispatch(id: string, businessId: string, userId: string) {
    const transfer = await this.findOne(id, businessId);
    if (transfer.status !== StockTransferStatus.PENDING) {
      throw new BadRequestException('Only pending transfers can be dispatched');
    }

    return this.dataSource.transaction(async (manager) => {
      transfer.status = StockTransferStatus.IN_TRANSIT;
      await manager.save(transfer);

      for (const item of transfer.items) {
        // Decrease stock at source branch
        await this.stockMovementsService.adjustStock(
          businessId,
          item.productId,
          -Math.abs(item.quantity),
          MovementType.TRANSFER,
          userId,
          `Transfer #${transfer.id.split('-')[0]} OUT`,
          transfer.id,
          transfer.fromBranchId,
          manager,
        );
      }

      return transfer;
    });
  }

  /**
   * 3. Receive: Set to RECEIVED (Add to Destination)
   */
  async receive(id: string, businessId: string, userId: string) {
    const transfer = await this.findOne(id, businessId);
    if (transfer.status !== StockTransferStatus.IN_TRANSIT) {
      throw new BadRequestException(
        'Only in-transit transfers can be received',
      );
    }

    return this.dataSource.transaction(async (manager) => {
      transfer.status = StockTransferStatus.RECEIVED;
      transfer.receivedById = userId;
      await manager.save(transfer);

      for (const item of transfer.items) {
        // Increase stock at destination branch
        await this.stockMovementsService.adjustStock(
          businessId,
          item.productId,
          Math.abs(item.quantity),
          MovementType.TRANSFER,
          userId,
          `Transfer #${transfer.id.split('-')[0]} IN`,
          transfer.id,
          transfer.toBranchId,
          manager,
        );
      }

      return transfer;
    });
  }

  async cancel(id: string, businessId: string, _userId: string) {
    const transfer = await this.findOne(id, businessId);
    if (transfer.status === StockTransferStatus.RECEIVED) {
      throw new BadRequestException('Cannot cancel received transfers');
    }

    transfer.status = StockTransferStatus.CANCELLED;
    return this.transferRepository.save(transfer);
  }
}
