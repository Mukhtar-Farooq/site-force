import { Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule, InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { Worker } from './database/entities/worker.entity';
import { Attendance } from './database/entities/attendance.entity';
import { Transaction } from './database/entities/transaction.entity';
import { Material } from './database/entities/material.entity';
import { Zone } from './database/entities/zone.entity';
import { User } from './database/entities/user.entity';
import * as crypto from 'crypto';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    JwtModule.register({
      secret: process.env.JWT_SECRET ?? 'siteforce-secret-key-2026',
      signOptions: { expiresIn: '7d' },
    }),
    TypeOrmModule.forRootAsync({
      useFactory: () => {
        const dbUrl = process.env.DATABASE_URL;
        if (dbUrl) {
          console.log('Connecting to PostgreSQL database (Supabase/Neon)...');
          return {
            type: 'postgres',
            url: dbUrl,
            entities: [Worker, Attendance, Transaction, Material, Zone, User],
            synchronize: true, // Auto-sync database tables
            ssl: {
              rejectUnauthorized: false,
            },
          };
        } else {
          console.log('Connecting to local SQLite database (database.sqlite)...');
          return {
            type: 'sqlite',
            database: 'database.sqlite',
            entities: [Worker, Attendance, Transaction, Material, Zone, User],
            synchronize: true,
          };
        }
      },
    }),
    TypeOrmModule.forFeature([Worker, Attendance, Transaction, Material, Zone, User]),
  ],
  controllers: [AppController],
  providers: [AppService],
  exports: [JwtModule], // Export so it can be used for auth guard
})
export class AppModule implements OnModuleInit {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async onModuleInit() {
    // Seed default Owner account if no users exist
    try {
      const userCount = await this.userRepo.count();
      if (userCount === 0) {
        console.log('No user records found. Seeding default owner: owner@siteforce.com / owner123');
        
        // Hash password using pbkdf2 native crypto
        const passwordHash = crypto
          .pbkdf2Sync('owner123', 'siteforce-salt', 1000, 64, 'sha512')
          .toString('hex');

        const defaultOwner = this.userRepo.create({
          email: 'owner@siteforce.com',
          password: passwordHash,
          role: 'owner',
          zones: [],
        });
        await this.userRepo.save(defaultOwner);
        console.log('Default owner seeded successfully.');
      }
    } catch (err) {
      console.error('Error seeding database:', err);
    }
  }
}


