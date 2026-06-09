import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Req, Query, ForbiddenException } from '@nestjs/common';
import { AppService } from './app.service';
import { FirebaseAuthGuard } from './auth/firebase-auth.guard';
import { Worker } from './database/entities/worker.entity';
import { Attendance } from './database/entities/attendance.entity';
import { Transaction } from './database/entities/transaction.entity';
import { Material } from './database/entities/material.entity';
import { Zone } from './database/entities/zone.entity';
import { User } from './database/entities/user.entity';

@Controller('api')
@UseGuards(FirebaseAuthGuard)
export class AppController {
  constructor(private readonly appService: AppService) {}

  // ==========================================
  // AUTHENTICATION & SUPERVISORS
  // ==========================================
  @Post('auth/login')
  async login(@Body() body: any) {
    return this.appService.login(body.email, body.password);
  }

  @Post('auth/supervisors')
  async createSupervisor(@Req() req: any, @Body() body: any): Promise<User> {
    if (req.user.role !== 'owner') {
      throw new ForbiddenException('Only the Owner can onboard supervisors.');
    }
    return this.appService.createSupervisor(body);
  }

  @Get('auth/supervisors')
  async findAllSupervisors(@Req() req: any): Promise<User[]> {
    if (req.user.role !== 'owner') {
      throw new ForbiddenException('Only the Owner can list supervisors.');
    }
    return this.appService.findAllSupervisors();
  }

  @Delete('auth/supervisors/:id')
  async deleteSupervisor(@Req() req: any, @Param('id') id: string): Promise<void> {
    if (req.user.role !== 'owner') {
      throw new ForbiddenException('Only the Owner can remove supervisors.');
    }
    return this.appService.deleteSupervisor(id);
  }

  // ==========================================
  // DASHBOARD STATS
  // ==========================================
  @Get('dashboard/stats')
  async getDashboardStats(@Req() req: any, @Query('zoneId') zoneId?: string) {
    return this.appService.getDashboardStats(zoneId, req.user);
  }

  // ==========================================
  // WORKER ENDPOINTS (Global Master Data)
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
  // ATTENDANCE ENDPOINTS (Zone Scoped)
  // ==========================================
  @Post('attendance')
  async markAttendance(
    @Req() req: any,
    @Body() dto: {
      workerId: string;
      date: string;
      status: string;
      overtimeHours?: number;
      zoneId?: string;
    },
  ): Promise<Attendance> {
    return this.appService.markAttendance(dto, req.user);
  }

  @Get('attendance/date/:date')
  async getAttendanceByDate(@Req() req: any, @Param('date') date: string): Promise<Attendance[]> {
    return this.appService.getAttendanceByDate(date, req.user);
  }

  @Get('attendance/history')
  async getAttendanceHistory(@Req() req: any): Promise<Attendance[]> {
    return this.appService.getAttendanceHistory(req.user);
  }

  // ==========================================
  // TRANSACTION ENDPOINTS (Zone Scoped)
  // ==========================================
  @Post('transactions')
  async logTransaction(
    @Req() req: any,
    @Body() dto: {
      workerId: string;
      type: string;
      amount: number;
      date: string;
      zoneId?: string;
      notes?: string;
    },
  ): Promise<Transaction> {
    return this.appService.logTransaction(dto, req.user);
  }

  @Get('transactions/ledgers')
  async getWorkerLedgers(@Req() req: any): Promise<any[]> {
    return this.appService.getWorkerLedgers(req.user);
  }

  @Get('transactions/worker/:workerId')
  async getTransactionsByWorker(@Req() req: any, @Param('workerId') workerId: string): Promise<Transaction[]> {
    return this.appService.getTransactionsByWorker(workerId, req.user);
  }

  // ==========================================
  // MATERIAL ENDPOINTS (Zone Scoped)
  // ==========================================
  @Post('materials')
  async logMaterialPurchase(@Req() req: any, @Body() dto: Partial<Material>): Promise<Material> {
    return this.appService.logMaterialPurchase(dto, req.user);
  }

  @Get('materials')
  async findAllMaterials(@Req() req: any): Promise<Material[]> {
    return this.appService.findAllMaterials(req.user);
  }

  @Delete('materials/:id')
  async deleteMaterial(@Req() req: any, @Param('id') id: string): Promise<void> {
    return this.appService.deleteMaterial(id, req.user);
  }

  // ==========================================
  // ZONE ENDPOINTS
  // ==========================================
  @Post('zones')
  async createZone(@Req() req: any, @Body() dto: Partial<Zone>): Promise<Zone> {
    if (req.user.role !== 'owner') {
      throw new ForbiddenException('Only the Owner can create site zones.');
    }
    return this.appService.createZone(dto);
  }

  @Get('zones')
  async findAllZones(@Req() req: any): Promise<Zone[]> {
    return this.appService.findAllZones(req.user);
  }

  // ==========================================
  // SYNC ENDPOINT
  // ==========================================
  @Post('sync')
  async syncOfflineMutations(@Req() req: any, @Body() body: { mutations: any[] }): Promise<any> {
    return this.appService.syncOfflineMutations(body.mutations || [], req.user);
  }
}
