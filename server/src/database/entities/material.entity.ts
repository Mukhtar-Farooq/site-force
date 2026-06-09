import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Zone } from './zone.entity';

@Entity()
export class Material {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string; // Cement, Sand, etc.

  @Column()
  supplier: string;

  @Column('float')
  quantity: number;

  @Column()
  unit: string; // Bags, Tons, etc.

  @Column('float')
  unitPrice: number;

  @Column('float')
  totalCost: number; // Calculated as quantity * unitPrice

  @Column()
  date: string; // YYYY-MM-DD

  @Column()
  paymentStatus: string; // Paid, Unpaid, Partially Paid

  @Column('float', { default: 0 })
  paidAmount: number;

  @Column('float', { default: 0 })
  balanceDue: number; // calculated totalCost - paidAmount

  @Column({ type: 'text', nullable: true })
  photoBase64: string;

  @Column({ nullable: true })
  zoneId: string;

  @ManyToOne(() => Zone, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'zoneId' })
  zone: Zone;
}
