import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('subscription_plans')
export class SubscriptionPlan {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  price: number;

  @Column({ default: 'INR' })
  currency: string;

  @Column()
  billingCycle: string; // MONTHLY, YEARLY

  @Column({ type: 'int', default: 30 })
  durationDays: number;

  @Column({ type: 'json', nullable: true })
  features: Record<string, any>;

  @Column({ type: 'int', default: 0 })
  maxUsers: number;

  @Column({ type: 'int', default: 0 })
  maxProducts: number;

  @Column({ default: 'ACTIVE' })
  status: 'ACTIVE' | 'INACTIVE';

  @Column({ type: 'int', default: 1 })
  version: number;

  @Column({ nullable: true })
  updatedBy: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
