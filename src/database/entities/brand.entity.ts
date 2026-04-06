import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  Index,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { Business } from './business.entity.js';
import { Product } from './product.entity.js';

@Entity('brands')
export class Brand {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Index()
  @Column()
  businessId: string;

  @ManyToOne(() => Business)
  @JoinColumn({ name: 'businessId' })
  business: Business;

  @OneToMany(() => Product, (product) => product.brand)
  products: Product[];
}
