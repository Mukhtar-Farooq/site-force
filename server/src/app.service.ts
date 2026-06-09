import { Injectable, NotFoundException, UnauthorizedException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { Worker } from './database/entities/worker.entity';
import { Attendance } from './database/entities/attendance.entity';
import { Transaction } from './database/entities/transaction.entity';
import { Material } from './database/entities/material.entity';
import { Zone } from './database/entities/zone.entity';
import { User } from './database/entities/user.entity';
import * as crypto from 'crypto';

interface DecodedUser {
  id: string;
  email: string;
  role: string;
  assignedZones: string[];
}

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
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

  // ==========================================
  // AUTHENTICATION & SUPERVISORS
  // ==========================================
  async login(email: string, password: string): Promise<any> {
    const passwordHash = crypto
      .pbkdf2Sync(password, 'siteforce-salt', 1000, 64, 'sha512')
      .toString('hex');

    const user = await this.userRepo.findOne({
      where: { email, password: passwordHash },
      relations: ['zones'],
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const payload = {
      id: user.id,
      email: user.email,
      role: user.role,
      assignedZones: user.zones.map((z) => z.id),
    };

    const token = this.jwtService.sign(payload);

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        zones: user.zones,
      },
    };
  }

  async createSupervisor(dto: {
    email: string;
    password?: string;
    zoneIds: string[];
  }): Promise<User> {
    const existing = await this.userRepo.findOne({ where: { email: dto.email } });
    if (existing) {
      throw new BadRequestException(`User with email ${dto.email} already exists`);
    }

    const passwordHash = crypto
      .pbkdf2Sync(dto.password || 'supervisor123', 'siteforce-salt', 1000, 64, 'sha512')
      .toString('hex');

    const zones = await this.zoneRepo.find({
      where: { id: In(dto.zoneIds) },
    });

    const supervisor = this.userRepo.create({
      email: dto.email,
      password: passwordHash,
      role: 'supervisor',
      zones,
    });

    const saved = await this.userRepo.save(supervisor);
    delete saved.password;
    return saved;
  }

  async findAllSupervisors(): Promise<User[]> {
    const users = await this.userRepo.find({
      where: { role: 'supervisor' },
      relations: ['zones'],
      order: { email: 'ASC' },
    });
    users.forEach((u) => delete u.password);
    return users;
  }

  async deleteSupervisor(id: string): Promise<void> {
    const result = await this.userRepo.delete(id);
    if (result.affected === 0) throw new NotFoundException(`Supervisor with ID ${id} not found`);
  }

  // ==========================================
  // WORKER METHODS (Global Master Data)
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
  // ATTENDANCE METHODS (Zone Scoped)
  // ==========================================
  async markAttendance(
    dto: {
      workerId: string;
      date: string;
      status: string;
      overtimeHours?: number;
      zoneId?: string;
    },
    user: DecodedUser,
  ): Promise<Attendance> {
    // Validate zone restriction for supervisors
    if (user.role === 'supervisor') {
      if (!dto.zoneId || !user.assignedZones.includes(dto.zoneId)) {
        throw new ForbiddenException('You are not authorized to mark attendance for this zone.');
      }
    }

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

    // Auto-generate transaction ledger entry in the correct zone
    await this.updateDailyWageTransaction(
      dto.workerId,
      dto.date,
      dto.status,
      dto.overtimeHours || 0,
      dto.zoneId,
    );

    return saved;
  }

  private async updateDailyWageTransaction(
    workerId: string,
    date: string,
    status: string,
    overtimeHours: number,
    zoneId?: string,
  ) {
    const worker = await this.workerRepo.findOne({ where: { id: workerId } });
    if (!worker) return;

    let multiplier = 0;
    if (status === 'Present') multiplier = 1.0;
    else if (status === 'Half-Day') multiplier = 0.5;

    const hourlyRate = worker.dailyRate / 8;
    const overtimeWage = overtimeHours * hourlyRate * 1.5;
    const totalWage = (worker.dailyRate * multiplier) + overtimeWage;

    let transaction = await this.transactionRepo.findOne({
      where: { workerId, date, type: 'Wage' },
    });

    if (totalWage <= 0) {
      if (transaction) {
        await this.transactionRepo.remove(transaction);
      }
    } else {
      if (transaction) {
        transaction.amount = totalWage;
        transaction.zoneId = zoneId;
        transaction.notes = `Auto-calculated wage for ${status}${overtimeHours > 0 ? ` + ${overtimeHours}hr OT` : ''}`;
      } else {
        transaction = this.transactionRepo.create({
          workerId,
          date,
          type: 'Wage',
          amount: totalWage,
          zoneId,
          notes: `Auto-calculated wage for ${status}${overtimeHours > 0 ? ` + ${overtimeHours}hr OT` : ''}`,
        });
      }
      await this.transactionRepo.save(transaction);
    }
  }

  async getAttendanceByDate(date: string, user: DecodedUser): Promise<Attendance[]> {
    const records = await this.attendanceRepo.find({ where: { date }, relations: ['worker'] });
    
    // Filter records for supervisors
    if (user.role === 'supervisor') {
      return records.filter((r) => r.zoneId && user.assignedZones.includes(r.zoneId));
    }
    return records;
  }

  async getAttendanceHistory(user: DecodedUser): Promise<Attendance[]> {
    const records = await this.attendanceRepo.find({ relations: ['worker'], order: { date: 'DESC' } });
    if (user.role === 'supervisor') {
      return records.filter((r) => r.zoneId && user.assignedZones.includes(r.zoneId));
    }
    return records;
  }

  // ==========================================
  // TRANSACTION METHODS (Zone Scoped)
  // ==========================================
  async logTransaction(
    dto: {
      workerId: string;
      type: string;
      amount: number;
      date: string;
      zoneId?: string;
      notes?: string;
    },
    user: DecodedUser,
  ): Promise<Transaction> {
    if (user.role === 'supervisor') {
      if (!dto.zoneId || !user.assignedZones.includes(dto.zoneId)) {
        throw new ForbiddenException('You are not authorized to log payments for this zone.');
      }
    }
    const transaction = this.transactionRepo.create(dto);
    return this.transactionRepo.save(transaction);
  }

  async getTransactionsByWorker(workerId: string, user: DecodedUser): Promise<Transaction[]> {
    const records = await this.transactionRepo.find({
      where: { workerId },
      order: { date: 'DESC' },
    });

    if (user.role === 'supervisor') {
      return records.filter((r) => r.zoneId && user.assignedZones.includes(r.zoneId));
    }
    return records;
  }

  async getWorkerLedgers(user: DecodedUser): Promise<any[]> {
    const workers = await this.workerRepo.find();
    
    // Filter transactions based on permission
    let transactions = await this.transactionRepo.find();
    if (user.role === 'supervisor') {
      transactions = transactions.filter((t) => t.zoneId && user.assignedZones.includes(t.zoneId));
    }

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
    }).filter((ledger) => ledger.transactions.length > 0 || user.role === 'owner'); 
    // Supervisors only see workers with activity in their zones
  }

  // ==========================================
  // MATERIAL METHODS (Zone Scoped)
  // ==========================================
  async logMaterialPurchase(dto: Partial<Material>, user: DecodedUser): Promise<Material> {
    if (user.role === 'supervisor') {
      if (!dto.zoneId || !user.assignedZones.includes(dto.zoneId)) {
        throw new ForbiddenException('You are not authorized to log materials in this zone.');
      }
    }

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

  async findAllMaterials(user: DecodedUser): Promise<Material[]> {
    const list = await this.materialRepo.find({ order: { date: 'DESC' } });
    if (user.role === 'supervisor') {
      return list.filter((m) => m.zoneId && user.assignedZones.includes(m.zoneId));
    }
    return list;
  }

  async deleteMaterial(id: string, user: DecodedUser): Promise<void> {
    const material = await this.materialRepo.findOne({ where: { id } });
    if (!material) throw new NotFoundException(`Material with ID ${id} not found`);

    if (user.role === 'supervisor') {
      if (!material.zoneId || !user.assignedZones.includes(material.zoneId)) {
        throw new ForbiddenException('You are not authorized to delete materials in this zone.');
      }
    }
    await this.materialRepo.remove(material);
  }

  // ==========================================
  // ZONE METHODS
  // ==========================================
  async createZone(dto: Partial<Zone>): Promise<Zone> {
    const zone = this.zoneRepo.create(dto);
    return this.zoneRepo.save(zone);
  }

  async findAllZones(user: DecodedUser): Promise<Zone[]> {
    const zones = await this.zoneRepo.find({ order: { name: 'ASC' } });
    if (user.role === 'supervisor') {
      return zones.filter((z) => user.assignedZones.includes(z.id));
    }
    return zones;
  }

  // ==========================================
  // OFFLINE SYNC SERVICE
  // ==========================================
  async syncOfflineMutations(mutations: any[], user: DecodedUser): Promise<any> {
    for (const mutation of mutations) {
      try {
        const { type, action, data } = mutation;

        if (type === 'worker') {
          if (action === 'create') await this.createWorker(data);
          else if (action === 'update') await this.updateWorker(data.id, data);
        } else if (type === 'attendance') {
          await this.markAttendance(data, user);
        } else if (type === 'transaction') {
          await this.logTransaction(data, user);
        } else if (type === 'material') {
          await this.logMaterialPurchase(data, user);
        } else if (type === 'zone' && user.role === 'owner') {
          await this.createZone(data);
        }
      } catch (err) {
        console.error('Error syncing individual mutation:', mutation, err);
      }
    }

    const workers = await this.findAllWorkers();
    const attendances = await this.getAttendanceHistory(user);
    const ledgers = await this.getWorkerLedgers(user);
    const materials = await this.findAllMaterials(user);
    const zones = await this.findAllZones(user);

    return {
      workers,
      attendances,
      ledgers,
      materials,
      zones,
    };
  }

  // ==========================================
  // DASHBOARD STATS (Consolidated vs Scoped)
  // ==========================================
  async getDashboardStats(zoneIdQuery: string | undefined, user: DecodedUser): Promise<any> {
    // 1. Resolve which zones the user is checking
    let targetZoneIds: string[] = [];
    
    if (user.role === 'supervisor') {
      if (zoneIdQuery) {
        if (!user.assignedZones.includes(zoneIdQuery)) {
          throw new ForbiddenException('Access Denied to this zone.');
        }
        targetZoneIds = [zoneIdQuery];
      } else {
        targetZoneIds = user.assignedZones;
      }
    } else {
      // Owner
      if (zoneIdQuery) {
        targetZoneIds = [zoneIdQuery];
      }
    }

    const workers = await this.workerRepo.find({ where: { status: 'Active' } });
    
    // Fetch and filter materials
    let materials = await this.materialRepo.find();
    if (targetZoneIds.length > 0) {
      materials = materials.filter((m) => m.zoneId && targetZoneIds.includes(m.zoneId));
    } else if (user.role === 'supervisor') {
      materials = []; // no zones assigned
    }

    // Fetch and filter ledgers
    const ledgers = await this.getWorkerLedgers(user);
    let filteredLedgers = ledgers;
    if (targetZoneIds.length > 0) {
      // Recompute wages and transactions for the specified zones
      filteredLedgers = ledgers.map((l) => {
        const zoneTxs = l.transactions.filter((t: any) => t.zoneId && targetZoneIds.includes(t.zoneId));
        const earned = zoneTxs.filter((t: any) => t.type === 'Wage').reduce((sum: number, t: any) => sum + t.amount, 0);
        const advances = zoneTxs.filter((t: any) => t.type === 'Advance').reduce((sum: number, t: any) => sum + t.amount, 0);
        const settled = zoneTxs.filter((t: any) => t.type === 'Settlement').reduce((sum: number, t: any) => sum + t.amount, 0);
        return {
          ...l,
          earned,
          advances,
          settled,
          balance: earned - advances - settled,
          transactions: zoneTxs,
        };
      }).filter((l) => l.transactions.length > 0);
    }

    const totalActiveWorkers = workers.length;
    const masons = workers.filter((w) => w.role.toLowerCase().includes('mason') || w.role.toLowerCase().includes('mistri')).length;
    const labors = totalActiveWorkers - masons;

    const totalLaborWages = filteredLedgers.reduce((sum, l) => sum + l.earned, 0);
    const totalLaborAdvances = filteredLedgers.reduce((sum, l) => sum + l.advances, 0);
    const totalLaborOutstanding = filteredLedgers.reduce((sum, l) => sum + l.balance, 0);

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
