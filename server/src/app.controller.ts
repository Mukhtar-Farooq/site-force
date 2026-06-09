import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { AppService } from './app.service';
import { FirebaseAuthGuard } from './auth/firebase-auth.guard';
import { Worker } from './database/entities/worker.entity';
import { Attendance } from './database/entities/attendance.entity';
import { Transaction } from './database/entities/transaction.entity';
import { Material } from './database/entities/material.entity';
import { Zone } from './database/entities/zone.entity';

@Controller('api')
@UseGuards(FirebaseAuthGuard)
export class AppController {
  constructor(private readonly appService: AppService) {}

  // ==========================================
  // DASHBOARD STATS
  // ==========================================
  @Get('dashboard/stats')
  async getDashboardStats() {
    return this.appService.getDashboardStats();
  }

  // ==========================================
  // WORKER ENDPOINTS
  // ==========================================
  @Post('workers')
  async createWorker(@Body() dto: Partial<Worker>): Promise<Worker> {
    return this.appService.createWorker(dto);
  }

  @Get('workers')
  async findAllWorkers(): Promise<Worker[]> {
    return this.appService.findAllWorkers();
  }

  @Get('workers/:id')
  async findWorkerById(@Param('id') id: string): Promise<Worker> {
    return this.appService.findWorkerById(id);
  }

  @Put('workers/:id')
  async updateWorker(@Param('id') id: string, @Body() dto: Partial<Worker>): Promise<Worker> {
    return this.appService.updateWorker(id, dto);
  }

  @Delete('workers/:id')
  async deleteWorker(@Param('id') id: string): Promise<void> {
    return this.appService.deleteWorker(id);
  }

  // ==========================================
  // ATTENDANCE ENDPOINTS
  // ==========================================
  @Post('attendance')
  async markAttendance(
    @Body() dto: {
      workerId: string;
      date: string;
      status: string;
      overtimeHours?: number;
      zoneId?: string;
    },
  ): Promise<Attendance> {
    return this.appService.markAttendance(dto);
  }

  @Get('attendance/date/:date')
  async getAttendanceByDate(@Param('date') date: string): Promise<Attendance[]> {
    return this.appService.getAttendanceByDate(date);
  }

  @Get('attendance/history')
  async getAttendanceHistory(): Promise<Attendance[]> {
    return this.appService.getAttendanceHistory();
  }

  // ==========================================
  // TRANSACTION ENDPOINTS
  // ==========================================
  @Post('transactions')
  async logTransaction(
    @Body() dto: {
      workerId: string;
      type: string;
      amount: number;
      date: string;
      notes?: string;
    },
  ): Promise<Transaction> {
    return this.appService.logTransaction(dto);
  }

  @Get('transactions/ledgers')
  async getWorkerLedgers(): Promise<any[]> {
    return this.appService.getWorkerLedgers();
  }

  @Get('transactions/worker/:workerId')
  async getTransactionsByWorker(@Param('workerId') workerId: string): Promise<Transaction[]> {
    return this.appService.getTransactionsByWorker(workerId);
  }

  // ==========================================
  // MATERIAL ENDPOINTS
  // ==========================================
  @Post('materials')
  async logMaterialPurchase(@Body() dto: Partial<Material>): Promise<Material> {
    return this.appService.logMaterialPurchase(dto);
  }

  @Get('materials')
  async findAllMaterials(): Promise<Material[]> {
    return this.appService.findAllMaterials();
  }

  @Delete('materials/:id')
  async deleteMaterial(@Param('id') id: string): Promise<void> {
    return this.appService.deleteMaterial(id);
  }

  // ==========================================
  // ZONE ENDPOINTS
  // ==========================================
  @Post('zones')
  async createZone(@Body() dto: Partial<Zone>): Promise<Zone> {
    return this.appService.createZone(dto);
  }

  @Get('zones')
  async findAllZones(): Promise<Zone[]> {
    return this.appService.findAllZones();
  }

  // ==========================================
  // SYNC ENDPOINT
  // ==========================================
  @Post('sync')
  async syncOfflineMutations(@Body() body: { mutations: any[] }): Promise<any> {
    return this.appService.syncOfflineMutations(body.mutations || []);
  }
}
