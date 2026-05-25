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
import {
  SupplierType,
  SupplierStatus,
} from '../../common/enums/supplier.enum.js';

@Entity('suppliers')
export class Supplier {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'varchar', nullable: true })
  contactPerson: string;

  @Index()
  @Column({ type: 'varchar', nullable: true })
  phone: string;

  @Column({ type: 'varchar', nullable: true })
  email: string;

  @Column({ type: 'text', nullable: true })
  address: string;

  @Column({ type: 'varchar', nullable: true })
  gstNumber: string;

  @Column({
    type: 'enum',
    enum: SupplierType,
    default: SupplierType.LOCAL_VENDOR,
  })
  type: SupplierType;

  @Column({
    type: 'enum',
    enum: SupplierStatus,
    default: SupplierStatus.ACTIVE,
  })
  status: SupplierStatus;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  currentBalance: number; // Outstanding due to supplier

  @Column({ type: 'text', nullable: true })
  paymentTerms: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Index()
  @Column({ type: 'varchar' })
  businessId: string;

  @ManyToOne(() => Business)
  @JoinColumn({ name: 'businessId' })
  business: Relation<Business>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
