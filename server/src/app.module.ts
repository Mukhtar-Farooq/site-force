import { Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { Worker } from './database/entities/worker.entity';
import { Attendance } from './database/entities/attendance.entity';
import { Transaction } from './database/entities/transaction.entity';
import { Material } from './database/entities/material.entity';
import { Zone } from './database/entities/zone.entity';
import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      useFactory: () => {
        const dbUrl = process.env.DATABASE_URL;
        if (dbUrl) {
          console.log('Connecting to PostgreSQL database (Supabase/Neon)...');
          return {
            type: 'postgres',
            url: dbUrl,
            entities: [Worker, Attendance, Transaction, Material, Zone],
            synchronize: true, // Automatically keeps database tables in sync with schema
            ssl: {
              rejectUnauthorized: false, // Required for secure hosted postgres connections
            },
          };
        } else {
          console.log('Connecting to local SQLite database (database.sqlite)...');
          return {
            type: 'sqlite',
            database: 'database.sqlite',
            entities: [Worker, Attendance, Transaction, Material, Zone],
            synchronize: true,
          };
        }
      },
    }),
    TypeOrmModule.forFeature([Worker, Attendance, Transaction, Material, Zone]),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements OnModuleInit {
  onModuleInit() {
    if (process.env.BYPASS_AUTH === 'true') {
      console.log('Firebase Auth Bypassed (BYPASS_AUTH=true is active)');
      return;
    }

    const serviceAccountPath = path.resolve(process.cwd(), 'firebase-adminsdk.json');
    if (fs.existsSync(serviceAccountPath)) {
      try {
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccountPath),
        });
        console.log('Firebase Admin SDK initialized successfully via local service account JSON.');
      } catch (err) {
        console.error('Error initializing Firebase Admin via JSON file:', err);
      }
    } else {
      const firebasePrivateKey = process.env.FIREBASE_PRIVATE_KEY;
      const firebaseClientEmail = process.env.FIREBASE_CLIENT_EMAIL;
      const firebaseProjectId = process.env.FIREBASE_PROJECT_ID;

      if (firebasePrivateKey && firebaseClientEmail && firebaseProjectId) {
        try {
          admin.initializeApp({
            credential: admin.credential.cert({
              projectId: firebaseProjectId,
              clientEmail: firebaseClientEmail,
              privateKey: firebasePrivateKey.replace(/\\n/g, '\n'),
            }),
          });
          console.log('Firebase Admin SDK initialized successfully via environment variables.');
        } catch (err) {
          console.error('Error initializing Firebase Admin via environment variables:', err);
        }
      } else {
        console.warn(
          'WARNING: Firebase Authentication credentials are missing. ' +
          'Set BYPASS_AUTH=true in .env for local offline testing, or add a firebase-adminsdk.json private key file.',
        );
      }
    }
  }
}
