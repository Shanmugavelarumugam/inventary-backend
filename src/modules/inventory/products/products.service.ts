import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, DataSource } from 'typeorm';
import { Product, ProductStatus } from '../../../database/entities/product.entity.js';
import { StockMovement, MovementType } from '../../../database/entities/stock-movement.entity.js';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    private readonly dataSource: DataSource,
  ) {}

  async findAll(businessId: string, search?: string) {
    const where: any = { businessId };
    if (search) {
      where.name = Like(`%${search}%`);
    }
    return this.productRepository.find({
      where,
      relations: ['category', 'unit', 'brand'],
      order: { createdAt: 'DESC' },
    });
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
    const { id: _, createdAt: __, updatedAt: ___, sku: ____, ...rest } = original;
    const copy = this.productRepository.create({
      ...rest,
      sku: `${original.sku}-COPY-${Date.now().toString().slice(-4)}`,
      name: `${original.name} (Copy)`,
      businessId,
    });
    return this.productRepository.save(copy);
  }

  async setProductStatus(id: string, businessId: string, status: ProductStatus) {
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
      const products = productsData.map(data => 
        manager.create(Product, { ...data, businessId })
      );
      return manager.save(Product, products);
    });
  }

  async generateBarcode(id: string, businessId: string) {
    const product = await this.findOne(id, businessId);
    // Placeholder logic for barcode generation
    // In a real app, this might generate a GS1-compliant code or just return the SKU
    return {
      barcode: `BC-${product.sku}-${Date.now()}`,
      productId: id
    };
  }
}


