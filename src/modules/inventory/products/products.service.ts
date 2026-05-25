import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import {
  Product,
  ProductStatus,
} from '../../../database/entities/product.entity.js';
import {
  StockMovement,
  MovementType,
} from '../../../database/entities/stock-movement.entity.js';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    private readonly dataSource: DataSource,
  ) {}

  async findAll(
    businessId: string,
    options: {
      search?: string;
      categoryId?: string;
      brandId?: string;
      minStock?: boolean;
      outOfStock?: boolean;
      page?: number;
      limit?: number;
      sortBy?: string;
      sortOrder?: 'ASC' | 'DESC';
    } = {},
  ) {
    const {
      search,
      categoryId,
      brandId,
      minStock,
      outOfStock,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
    } = options;

    const queryBuilder = this.productRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.unit', 'unit')
      .leftJoinAndSelect('product.brand', 'brand')
      .where('product.businessId = :businessId', { businessId });

    if (search) {
      queryBuilder.andWhere(
        '(product.name ILIKE :search OR product.sku ILIKE :search OR product.barcode ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (categoryId) {
      queryBuilder.andWhere('product.categoryId = :categoryId', { categoryId });
    }

    if (brandId) {
      queryBuilder.andWhere('product.brandId = :brandId', { brandId });
    }

    if (minStock) {
      queryBuilder.andWhere('product.stockQty <= product.minStockLevel');
    }

    if (outOfStock) {
      queryBuilder.andWhere('product.stockQty = 0');
    }

    queryBuilder
      .orderBy(`product.${sortBy}`, sortOrder)
      .skip((page - 1) * limit)
      .take(limit);

    const [items, total] = await queryBuilder.getManyAndCount();

    return {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string, businessId: string) {
    const product = await this.productRepository.findOne({
      where: { id, businessId },
      relations: ['category', 'unit', 'brand'],
    });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async create(businessId: string, data: Partial<Product>) {
    return this.dataSource.transaction(async (manager) => {
      const product = manager.create(Product, {
        ...data,
        businessId,
      });
      const savedProduct = await manager.save(product);

      // If initial stock is provided, record it as a movement
      if (savedProduct.stockQty > 0) {
        const movement = manager.create(StockMovement, {
          productId: savedProduct.id,
          businessId,
          quantity: savedProduct.stockQty,
          type: MovementType.IN,
          reason: 'Initial stock load',
        });
        await manager.save(movement);
      }

      return savedProduct;
    });
  }

  async update(id: string, businessId: string, data: Partial<Product>) {
    const product = await this.findOne(id, businessId);
    Object.assign(product, data);
    return this.productRepository.save(product);
  }

  async duplicate(id: string, businessId: string) {
    const original = await this.findOne(id, businessId);
    const {
      id: _,
      createdAt: __,
      updatedAt: ___,
      sku: ____,
      ...rest
    } = original;
    const copy = this.productRepository.create({
      ...rest,
      sku: `${original.sku}-COPY-${Date.now().toString().slice(-4)}`,
      name: `${original.name} (Copy)`,
      businessId,
    });
    return this.productRepository.save(copy);
  }

  async setProductStatus(
    id: string,
    businessId: string,
    status: ProductStatus,
  ) {
    const product = await this.findOne(id, businessId);
    product.status = status;
    return this.productRepository.save(product);
  }

  async delete(id: string, businessId: string) {
    const product = await this.findOne(id, businessId);
    return this.productRepository.remove(product);
  }

  async bulkImport(businessId: string, productsData: Partial<Product>[]) {
    return this.dataSource.transaction(async (manager) => {
      const products = productsData.map((data) =>
        manager.create(Product, { ...data, businessId }),
      );
      return manager.save(Product, products);
    });
  }

  async generateBarcode(id: string, businessId: string) {
    await this.findOne(id, businessId);

    // EAN-13 Standard: 200 prefix for internal use + 9 digits + checksum
    // We use a combination of business short hash and a timestamp/random part for the 9 digits
    const prefix = '200';
    const randomPart = Math.floor(Math.random() * 1000000000)
      .toString()
      .padStart(9, '0');
    const base = prefix + randomPart;

    const checksum = this.calculateEan13Checksum(base);
    const barcode = base + checksum;

    return {
      barcode,
      productId: id,
      format: 'EAN-13',
    };
  }

  private calculateEan13Checksum(code: string): number {
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      const digit = parseInt(code[i], 10);
      if (i % 2 === 0) {
        sum += digit;
      } else {
        sum += digit * 3;
      }
    }
    const remainder = sum % 10;
    return remainder === 0 ? 0 : 10 - remainder;
  }
}
