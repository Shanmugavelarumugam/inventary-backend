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
  CustomerType,
  CustomerStatus,
} from '../../common/enums/customer.enum.js';

@Entity('customers')
export class Customer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  name: string;

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
    enum: CustomerType,
    default: CustomerType.RETAIL,
  })
  type: CustomerType;

  @Column({
    type: 'enum',
    enum: CustomerStatus,
    default: CustomerStatus.ACTIVE,
  })
  status: CustomerStatus;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  creditLimit: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  currentBalance: number;

  @Column({ type: 'int', default: 0 })
  loyaltyPoints: number;

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
