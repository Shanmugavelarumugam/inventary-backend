import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';

@Entity('permissions')
export class Permission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', unique: true })
  key: string;

  @Column({ type: 'varchar' })
  description: string;
}
