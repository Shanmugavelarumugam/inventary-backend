import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Repository,
  DataSource,
  EntityManager,
  FindOptionsWhere,
} from 'typeorm';
import {
  StockMovement,
  MovementType,
} from '../../../database/entities/stock-movement.entity.js';
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
    const where: FindOptionsWhere<StockMovement> = { businessId };
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
    manager?: EntityManager,
  ) {
    const executeAdjustment = async (em: EntityManager) => {
      const product = await em.findOne(Product, {
        where: { id: productId, businessId },
      });

      if (!product) {
        throw new NotFoundException('Product not found');
      }

      // Update quantity (quantity is signed: e.g. -5 for damage, +10 for purchase)
      product.stockQty = Number(product.stockQty) + Number(quantity);

      // Save product
      await em.save(product);

      // Record movement
      const movement = em.create(StockMovement, {
        productId,
        businessId,
        quantity,
        type,
        reason,
        reference,
        branchId,
        performedById: userId,
      });

      return em.save(movement);
    };

    if (manager) {
      return executeAdjustment(manager);
    }

    return this.dataSource.transaction(async (em) => {
      return executeAdjustment(em);
    });
  }

  async getInventoryAnalytics(businessId: string) {
    // 1. Calculate Valuation & Basic Counts from Products
    const products = await this.productRepository.find({
      where: { businessId },
    });

    let totalValue = 0;
    let outOfStock = 0;
    let lowStock = 0;

    products.forEach((p) => {
      totalValue += Number(p.stockQty) * Number(p.purchasePrice || 0);
      if (Number(p.stockQty) <= 0) outOfStock++;
      else if (Number(p.stockQty) <= Number(p.minStockLevel)) lowStock++;
    });

    // 2. Calculate 24h Throughput from Movements
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    const recentMovements = await this.movementRepository
      .createQueryBuilder('m')
      .where('m.businessId = :businessId', { businessId })
      .andWhere('m.createdAt >= :since', { since: twentyFourHoursAgo })
      .getMany();

    let stockIn24h = 0;
    let stockOut24h = 0;

    recentMovements.forEach((m) => {
      const qty = Number(m.quantity);
      if (qty > 0) stockIn24h += qty;
      else stockOut24h += Math.abs(qty);
    });

    return {
      totalValue,
      outOfStock,
      lowStock,
      stockIn24h,
      stockOut24h,
    };
  }

  async verifyIntegrity(businessId: string) {
    const productsWithMismatches = await this.productRepository
      .createQueryBuilder('p')
      .select('p.id', 'productId')
      .addSelect('p.name', 'productName')
      .addSelect('p.stockQty', 'expected')
      .addSelect('COALESCE(SUM(m.quantity), 0)', 'actual')
      .leftJoin('stock_movements', 'm', 'm.productId = p.id')
      .where('p.businessId = :businessId', { businessId })
      .groupBy('p.id')
      .addGroupBy('p.name')
      .addGroupBy('p.stockQty')
      .having(
        'CAST(p.stockQty AS DECIMAL) != CAST(COALESCE(SUM(m.quantity), 0) AS DECIMAL)',
      )
      .getRawMany();

    return {
      isValid: productsWithMismatches.length === 0,
      totalChecked: await this.productRepository.count({
        where: { businessId },
      }),
      mismatchCount: productsWithMismatches.length,
      mismatches: productsWithMismatches.slice(0, 10),
      verifiedAt: new Date(),
    };
  }
}
