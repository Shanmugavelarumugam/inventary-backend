import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  Index,
  JoinColumn,
  type Relation,
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

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'varchar', unique: true, nullable: true })
  sku: string | null;

  @Column({ type: 'varchar', nullable: true })
  barcode: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  purchasePrice: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number; // Selling Price

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  taxRate: number; // GST/VAT percentage

  @Column({ type: 'int', default: 0 })
  stockQty: number;

  @Column({ type: 'int', default: 10 })
  minStockLevel: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  mrp: number | null;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  discount: number;

  @Column({ type: 'timestamp', nullable: true })
  manufactureDate: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  expiryDate: Date | null;

  @Column({ type: 'varchar', nullable: true })
  batchNumber: string | null;

  @Column({ type: 'varchar', nullable: true })
  manufacturer: string | null;

  @Column({ type: 'varchar', nullable: true })
  scheduleType: string | null; // e.g., Schedule H, H1 (Pharmacy)

  @Column({ type: 'varchar', nullable: true })
  shelfLocation: string | null;

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
  business: Relation<Business>;

  @Column({ nullable: true })
  categoryId: string | null;

  @ManyToOne(() => Category, { nullable: true })
  @JoinColumn({ name: 'categoryId' })
  category: Relation<Category>;

  @Column({ nullable: true })
  unitId: string | null;

  @ManyToOne(() => Unit, { nullable: true })
  @JoinColumn({ name: 'unitId' })
  unit: Relation<Unit>;

  @Column({ nullable: true })
  brandId: string | null;

  @ManyToOne(() => Brand, { nullable: true })
  @JoinColumn({ name: 'brandId' })
  brand: Relation<Brand>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
