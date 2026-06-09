import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Worker } from './database/entities/worker.entity';
import { Attendance } from './database/entities/attendance.entity';
import { Transaction } from './database/entities/transaction.entity';
import { Material } from './database/entities/material.entity';
import { Zone } from './database/entities/zone.entity';

@Injectable()
export class AppService {
  constructor(
    @InjectRepository(Worker)
    private readonly workerRepo: Repository<Worker>,
    @InjectRepository(Attendance)
    private readonly attendanceRepo: Repository<Attendance>,
    @InjectRepository(Transaction)
    private readonly transactionRepo: Repository<Transaction>,
    @InjectRepository(Material)
    private readonly materialRepo: Repository<Material>,
    @InjectRepository(Zone)
    private readonly zoneRepo: Repository<Zone>,
  ) {}

  // ==========================================
  // WORKER METHODS
  // ==========================================
  async createWorker(dto: Partial<Worker>): Promise<Worker> {
    const worker = this.workerRepo.create(dto);
    return this.workerRepo.save(worker);
  }

  async findAllWorkers(): Promise<Worker[]> {
    return this.workerRepo.find({ order: { name: 'ASC' } });
  }

  async findWorkerById(id: string): Promise<Worker> {
    const worker = await this.workerRepo.findOne({ where: { id } });
    if (!worker) throw new NotFoundException(`Worker with ID ${id} not found`);
    return worker;
  }

  async updateWorker(id: string, dto: Partial<Worker>): Promise<Worker> {
    const worker = await this.findWorkerById(id);
    Object.assign(worker, dto);
    return this.workerRepo.save(worker);
  }

  async deleteWorker(id: string): Promise<void> {
    const result = await this.workerRepo.delete(id);
    if (result.affected === 0) throw new NotFoundException(`Worker with ID ${id} not found`);
  }

  // ==========================================
  // ATTENDANCE METHODS
  // ==========================================
  async markAttendance(dto: {
    workerId: string;
    date: string;
    status: string;
    overtimeHours?: number;
    zoneId?: string;
  }): Promise<Attendance> {
    // Check if attendance already exists for this worker on this date
    let attendance = await this.attendanceRepo.findOne({
      where: { workerId: dto.workerId, date: dto.date },
    });

    if (attendance) {
      attendance.status = dto.status;
      attendance.overtimeHours = dto.overtimeHours || 0;
      attendance.zoneId = dto.zoneId || undefined;
    } else {
      attendance = this.attendanceRepo.create({
        workerId: dto.workerId,
        date: dto.date,
        status: dto.status,
        overtimeHours: dto.overtimeHours || 0,
        zoneId: dto.zoneId || undefined,
      });
    }

    const saved = await this.attendanceRepo.save(attendance);

    // Automatically manage the worker's auto-generated Daily Wage Transaction
    await this.updateDailyWageTransaction(dto.workerId, dto.date, dto.status, dto.overtimeHours || 0);

    return saved;
  }

  private async updateDailyWageTransaction(
    workerId: string,
    date: string,
    status: string,
    overtimeHours: number,
  ) {
    const worker = await this.workerRepo.findOne({ where: { id: workerId } });
    if (!worker) return;

    // Calculate wages based on status
    let multiplier = 0;
    if (status === 'Present') multiplier = 1.0;
    else if (status === 'Half-Day') multiplier = 0.5;

    // Overtime base hourly calculation (DailyRate / 8 hours)
    const hourlyRate = worker.dailyRate / 8;
    const overtimeWage = overtimeHours * hourlyRate * 1.5; // 1.5x OT multiplier
    const totalWage = (worker.dailyRate * multiplier) + overtimeWage;

    // Find if a wage transaction already exists for this day
    let transaction = await this.transactionRepo.findOne({
      where: { workerId, date, type: 'Wage' },
    });

    if (totalWage <= 0) {
      // If wage is 0 (e.g. status changed to Absent), delete transaction if exists
      if (transaction) {
        await this.transactionRepo.remove(transaction);
      }
    } else {
      if (transaction) {
        transaction.amount = totalWage;
        transaction.notes = `Auto-calculated wage for ${status}${overtimeHours > 0 ? ` + ${overtimeHours}hr OT` : ''}`;
      } else {
        transaction = this.transactionRepo.create({
          workerId,
          date,
          type: 'Wage',
          amount: totalWage,
          notes: `Auto-calculated wage for ${status}${overtimeHours > 0 ? ` + ${overtimeHours}hr OT` : ''}`,
        });
      }
      await this.transactionRepo.save(transaction);
    }
  }

  async getAttendanceByDate(date: string): Promise<Attendance[]> {
    return this.attendanceRepo.find({ where: { date }, relations: ['worker'] });
  }

  async getAttendanceHistory(): Promise<Attendance[]> {
    return this.attendanceRepo.find({ relations: ['worker'], order: { date: 'DESC' } });
  }

  // ==========================================
  // TRANSACTION METHODS
  // ==========================================
  async logTransaction(dto: {
    workerId: string;
    type: string; // Advance or Settlement (Wages are auto-logged by attendance)
    amount: number;
    date: string;
    notes?: string;
  }): Promise<Transaction> {
    const transaction = this.transactionRepo.create(dto);
    return this.transactionRepo.save(transaction);
  }

  async getTransactionsByWorker(workerId: string): Promise<Transaction[]> {
    return this.transactionRepo.find({
      where: { workerId },
      order: { date: 'DESC' },
    });
  }

  async getWorkerLedgers(): Promise<any[]> {
    const workers = await this.workerRepo.find();
    const transactions = await this.transactionRepo.find();

    return workers.map((worker) => {
      const workerTx = transactions.filter((t) => t.workerId === worker.id);
      
      const earned = workerTx
        .filter((t) => t.type === 'Wage')
        .reduce((sum, t) => sum + t.amount, 0);

      const advances = workerTx
        .filter((t) => t.type === 'Advance')
        .reduce((sum, t) => sum + t.amount, 0);

      const settled = workerTx
        .filter((t) => t.type === 'Settlement')
        .reduce((sum, t) => sum + t.amount, 0);

      const balance = earned - advances - settled;

      return {
        worker,
        earned,
        advances,
        settled,
        balance,
        transactions: workerTx,
      };
    });
  }

  // ==========================================
  // MATERIAL METHODS
  // ==========================================
  async logMaterialPurchase(dto: Partial<Material>): Promise<Material> {
    const totalCost = (dto.quantity || 0) * (dto.unitPrice || 0);
    const paidAmount = dto.paidAmount || 0;
    const balanceDue = totalCost - paidAmount;

    let paymentStatus = 'Unpaid';
    if (paidAmount >= totalCost) paymentStatus = 'Paid';
    else if (paidAmount > 0) paymentStatus = 'Partially Paid';

    const material = this.materialRepo.create({
      ...dto,
      totalCost,
      paidAmount,
      balanceDue,
      paymentStatus,
    });

    return this.materialRepo.save(material);
  }

  async findAllMaterials(): Promise<Material[]> {
    return this.materialRepo.find({ order: { date: 'DESC' } });
  }

  async deleteMaterial(id: string): Promise<void> {
    const result = await this.materialRepo.delete(id);
    if (result.affected === 0) throw new NotFoundException(`Material with ID ${id} not found`);
  }

  // ==========================================
  // ZONE METHODS
  // ==========================================
  async createZone(dto: Partial<Zone>): Promise<Zone> {
    const zone = this.zoneRepo.create(dto);
    return this.zoneRepo.save(zone);
  }

  async findAllZones(): Promise<Zone[]> {
    return this.zoneRepo.find({ order: { name: 'ASC' } });
  }

  // ==========================================
  // OFFLINE SYNC SERVICE
  // ==========================================
  async syncOfflineMutations(mutations: any[]): Promise<any> {
    // Process items in sequence
    for (const mutation of mutations) {
      try {
        const { type, action, data } = mutation;

        if (type === 'worker') {
          if (action === 'create') {
            await this.createWorker(data);
          } else if (action === 'update') {
            await this.updateWorker(data.id, data);
          }
        } else if (type === 'attendance') {
          await this.markAttendance(data);
        } else if (type === 'transaction') {
          await this.logTransaction(data);
        } else if (type === 'material') {
          await this.logMaterialPurchase(data);
        } else if (type === 'zone') {
          await this.createZone(data);
        }
      } catch (err) {
        console.error('Error syncing individual mutation:', mutation, err);
        // Continue syncing other records even if one fails
      }
    }

    // Return full up-to-date state
    const workers = await this.findAllWorkers();
    const attendances = await this.getAttendanceHistory();
    const ledgers = await this.getWorkerLedgers();
    const materials = await this.findAllMaterials();
    const zones = await this.findAllZones();

    return {
      workers,
      attendances,
      ledgers,
      materials,
      zones,
    };
  }

  // Get cumulative stats for dashboard
  async getDashboardStats(): Promise<any> {
    const workers = await this.workerRepo.find({ where: { status: 'Active' } });
    const materials = await this.materialRepo.find();
    const ledgers = await this.getWorkerLedgers();

    const totalActiveWorkers = workers.length;
    const masons = workers.filter((w) => w.role.toLowerCase().includes('mason') || w.role.toLowerCase().includes('mistri')).length;
    const labors = totalActiveWorkers - masons;

    const totalLaborWages = ledgers.reduce((sum, l) => sum + l.earned, 0);
    const totalLaborAdvances = ledgers.reduce((sum, l) => sum + l.advances, 0);
    const totalLaborOutstanding = ledgers.reduce((sum, l) => sum + l.balance, 0);

    const totalMaterialCost = materials.reduce((sum, m) => sum + m.totalCost, 0);
    const totalMaterialPaid = materials.reduce((sum, m) => sum + m.paidAmount, 0);
    const totalMaterialOutstanding = materials.reduce((sum, m) => sum + m.balanceDue, 0);

    return {
      totalActiveWorkers,
      masonsCount: masons,
      laborsCount: labors,
      totalLaborWages,
      totalLaborAdvances,
      totalLaborOutstanding,
      totalMaterialCost,
      totalMaterialPaid,
      totalMaterialOutstanding,
      totalSiteCost: totalLaborWages + totalMaterialCost,
    };
  }
}
