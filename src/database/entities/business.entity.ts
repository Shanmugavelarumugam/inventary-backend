import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
} from 'typeorm';
import { BusinessStatus } from '../../common/enums/business.enum.js';

export enum DomainType {
  PHARMACY = 'pharmacy',
  SUPERMARKET = 'supermarket',
  RETAIL = 'retail',
  WAREHOUSE = 'warehouse',
  RESTAURANT = 'restaurant',
}

@Entity('businesses')
export class Business {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Index({ unique: true })
  @Column({ unique: true })
  companyCode: string;

  @Column({ type: 'enum', enum: DomainType })
  domainType: DomainType;

  // ─── Status & Subscription ─────────────────────────────
  @Column({
    type: 'enum',
    enum: BusinessStatus,
    default: BusinessStatus.TRIAL,
  })
  status: BusinessStatus;

  @Column({
    nullable: true,
  })
  subscriptionPlan: string;

  @Column({ nullable: true, type: 'timestamp' })
  subscriptionExpiresAt: Date;

  @Column({ default: 10 })
  maxUsers: number;

  @Column({ default: 3000 })
  maxProducts: number;

  @Column({ default: 1 })
  maxBranches: number;

  // ─── Contact & Location ────────────────────────────────
  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  email: string;

  @Column({ nullable: true })
  address: string;

  @Column({ nullable: true, default: 'Asia/Kolkata' })
  timezone: string;

  @Column({ nullable: true, default: 'INR' })
  currency: string;

  // ─── Audit ────────────────────────────────────────────
  @Column({ nullable: true })
  statusReason: string;

  @Column({ nullable: true })
  statusChangedBy: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;
}
