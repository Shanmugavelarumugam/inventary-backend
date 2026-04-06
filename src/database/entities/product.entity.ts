import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  Index,
  JoinColumn,
} from 'typeorm';
import { Business } from './business.entity.js';
import { Category } from './category.entity.js';
import { Unit } from './unit.entity.js';
import { Brand } from './brand.entity.js';

export enum ProductStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  DRAFT = 'DRAFT',
}

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ unique: true, nullable: true })
  sku: string;

  @Column({ nullable: true })
  barcode: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  purchasePrice: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number; // Selling Price

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  taxRate: number; // GST/VAT percentage

  @Column({ default: 0 })
  stockQty: number;

  @Column({ default: 10 })
  minStockLevel: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  mrp: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  discount: number;

  @Column({ type: 'timestamp', nullable: true })
  manufactureDate: Date;

  @Column({ type: 'timestamp', nullable: true })
  expiryDate: Date;

  @Column({ type: 'varchar', nullable: true })
  batchNumber: string;

  @Column({ type: 'varchar', nullable: true })
  manufacturer: string;

  @Column({ type: 'varchar', nullable: true })
  scheduleType: string; // e.g., Schedule H, H1 (Pharmacy)

  @Column({ type: 'varchar', nullable: true })
  shelfLocation: string;

  @Column({ default: false })
  isRecipeItem: boolean; // Restaurant domain

  @Column({
    type: 'enum',
    enum: ProductStatus,
    default: ProductStatus.ACTIVE,
  })
  status: ProductStatus;

  @Index()
  @Column()
  businessId: string;

  @ManyToOne(() => Business)
  @JoinColumn({ name: 'businessId' })
  business: Business;

  @Column({ nullable: true })
  categoryId: string;

  @ManyToOne(() => Category, { nullable: true })
  @JoinColumn({ name: 'categoryId' })
  category: Category;

  @Column({ nullable: true })
  unitId: string;

  @ManyToOne(() => Unit, { nullable: true })
  @JoinColumn({ name: 'unitId' })
  unit: Unit;

  @Column({ nullable: true })
  brandId: string;

  @ManyToOne(() => Brand, { nullable: true })
  @JoinColumn({ name: 'brandId' })
  brand: Brand;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

