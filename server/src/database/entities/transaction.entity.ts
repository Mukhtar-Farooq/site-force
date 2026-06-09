import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Worker } from './worker.entity';
import { Zone } from './zone.entity';

@Entity()
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  workerId: string;

  @Column()
  type: string; // Wage, Advance, Settlement

  @Column('float')
  amount: number;

  @Column()
  date: string; // YYYY-MM-DD

  @Column({ nullable: true })
  notes: string;

  @Column({ nullable: true })
  zoneId?: string;

  @ManyToOne(() => Worker, (worker) => worker.transactions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workerId' })
  worker: Worker;

  @ManyToOne(() => Zone, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'zoneId' })
  zone?: Zone;
}
