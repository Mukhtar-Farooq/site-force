import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany } from 'typeorm';
import { Attendance } from './attendance.entity';
import { Transaction } from './transaction.entity';

@Entity()
export class Worker {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  phone: string;

  @Column()
  role: string; // Mason, Labor, etc.

  @Column('float')
  dailyRate: number;

  @Column({ type: 'text', nullable: true })
  photoBase64: string;

  @Column({ default: 'Active' })
  status: string; // Active or Inactive

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => Attendance, (attendance) => attendance.worker)
  attendances: Attendance[];

  @OneToMany(() => Transaction, (transaction) => transaction.worker)
  transactions: Transaction[];
}
