import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  Index,
  JoinColumn,
  OneToMany,
  type Relation,
} from 'typeorm';
import { Business } from './business.entity.js';
import { Product } from './product.entity.js';

export enum CategoryStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

@Entity('categories')
export class Category {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'varchar', nullable: true })
  code: string | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'int', default: 0 })
  displayOrder: number;

  @Column({ type: 'varchar', nullable: true })
  icon: string | null;

  @Column({ type: 'varchar', nullable: true })
  color: string | null;

  @Column({
    type: 'enum',
    enum: CategoryStatus,
    default: CategoryStatus.ACTIVE,
  })
  status: CategoryStatus;

  @Index()
  @Column()
  businessId: string;

  @ManyToOne(() => Business)
  @JoinColumn({ name: 'businessId' })
  business: Relation<Business>;

  @Column({ nullable: true })
  parentCategoryId: string | null;

  @ManyToOne(() => Category, (category) => category.children, {
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'parentCategoryId' })
  parent: Relation<Category>;

  @OneToMany(() => Category, (category) => category.parent)
  children: Relation<Category>[];

  @OneToMany(() => Product, (product) => product.category)
  products: Relation<Product>[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
