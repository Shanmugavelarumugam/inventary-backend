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

@Entity('units')
export class Unit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string; // e.g., kg, box, strip

  @Column({ nullable: true })
  shortName: string; // e.g., kg

  @Index()
  @Column()
  businessId: string;

  @ManyToOne(() => Business)
  @JoinColumn({ name: 'businessId' })
  business: Business;

  @OneToMany(() => Product, (product) => product.unit)
  products: Product[];
}
