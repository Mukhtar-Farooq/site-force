import { Entity, PrimaryGeneratedColumn, Column, ManyToMany, JoinTable } from 'typeorm';
import { Zone } from './zone.entity';

@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password?: string; // Hashed password

  @Column()
  role: string; // 'owner' or 'supervisor'

  @ManyToMany(() => Zone, { cascade: true, onDelete: 'CASCADE' })
  @JoinTable({
    name: 'user_zones',
    joinColumn: { name: 'userId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'zoneId', referencedColumnName: 'id' },
  })
  zones: Zone[];
}
