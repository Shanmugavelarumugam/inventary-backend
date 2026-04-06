import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { StockMovement, MovementType } from '../../../database/entities/stock-movement.entity.js';
import { Product } from '../../../database/entities/product.entity.js';

@Injectable()
export class StockMovementsService {
  constructor(
    @InjectRepository(StockMovement)
    private readonly movementRepository: Repository<StockMovement>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    private readonly dataSource: DataSource,
  ) {}

  async findAll(businessId: string, productId?: string) {
    const where: any = { businessId };
    if (productId) {
      where.productId = productId;
    }
    return this.movementRepository.find({
      where,
      relations: ['product', 'performedBy'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Performs an atomic stock adjustment
   * Updates product stock and records the movement in a single transaction
   */
  async adjustStock(
    businessId: string,
    productId: string,
    quantity: number,
    type: MovementType,
    userId: string,
    reason?: string,
    reference?: string,
    branchId?: string,
  ) {
    return this.dataSource.transaction(async (manager) => {
      const product = await manager.findOne(Product, {
        where: { id: productId, businessId },
      });

      if (!product) {
        throw new NotFoundException('Product not found');
      }

      // Update quantity (quantity is signed: e.g. -5 for damage, +10 for purchase)
      product.stockQty = Number(product.stockQty) + Number(quantity);

      // Save product
      await manager.save(product);

      // Record movement
      const movement = manager.create(StockMovement, {
        productId,
        businessId,
        quantity,
        type,
        reason,
        reference,
        branchId,
        performedById: userId,
      });

      return manager.save(movement);
    });
  }
}
