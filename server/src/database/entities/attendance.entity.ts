import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Worker } from './worker.entity';
import { Zone } from './zone.entity';

@Entity()
export class Attendance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  workerId: string;

  @Column()
  date: string; // YYYY-MM-DD format for local date consistency

  @Column()
  status: string; // Present, Half-Day, Absent

  @Column('float', { default: 0 })
  overtimeHours: number;

  @Column({ nullable: true })
  zoneId?: string;

  @ManyToOne(() => Worker, (worker) => worker.attendances, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workerId' })
  worker: Worker;

  @ManyToOne(() => Zone, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'zoneId' })
  zone: Zone;
}
