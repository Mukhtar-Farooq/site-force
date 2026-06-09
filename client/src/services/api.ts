import { isMockAuth, auth } from '../config/firebase';

const BASE_URL = 'http://localhost:5000/api';

// Simple UUID generator for local offline entity creation
export function generateUUID() {
  return 'local-' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// Local Cache helper functions
export function getLocalCache(key: string, defaultValue: any) {
  const data = localStorage.getItem(`siteforce_cache_${key}`);
  return data ? JSON.parse(data) : defaultValue;
}

export function setLocalCache(key: string, value: any) {
  localStorage.setItem(`siteforce_cache_${key}`, JSON.stringify(value));
}

// Sync Queue Helpers
export interface SyncMutation {
  id: string;
  type: 'worker' | 'attendance' | 'transaction' | 'material' | 'zone';
  action: 'create' | 'update' | 'delete';
  data: any;
}

export function getSyncQueue(): SyncMutation[] {
  const data = localStorage.getItem('siteforce_sync_queue');
  return data ? JSON.parse(data) : [];
}

export function setSyncQueue(queue: SyncMutation[]) {
  localStorage.setItem('siteforce_sync_queue', JSON.stringify(queue));
}

export function addToSyncQueue(mutation: Omit<SyncMutation, 'id'>) {
  const queue = getSyncQueue();
  const newMutation = { ...mutation, id: generateUUID() };
  queue.push(newMutation);
  setSyncQueue(queue);
  console.log('Added mutation to offline sync queue:', newMutation);
}

// Fetch helper with authorization header
async function fetchWithAuth(endpoint: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers || {});
  
  // Get Auth Token
  let token = 'dev-token';
  if (!isMockAuth && auth && auth.currentUser) {
    try {
      token = await auth.currentUser.getIdToken();
    } catch (err) {
      console.warn('Error fetching ID token from Firebase:', err);
    }
  }

  headers.append('Authorization', `Bearer ${token}`);
  if (!(options.body instanceof FormData)) {
    headers.append('Content-Type', 'application/json');
  }

  const response = await fetch(`${BASE_URL}/${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API Error [${response.status}]: ${errorText || response.statusText}`);
  }

  if (response.status === 204) return null;
  return response.json();
}

// Main API Service
export const ApiService = {
  // ==========================================
  // SYNC UTILS
  // ==========================================
  isOnline: (): boolean => {
    return navigator.onLine;
  },

  syncOfflineData: async (): Promise<boolean> => {
    const queue = getSyncQueue();
    if (queue.length === 0) return true;
    if (!navigator.onLine) return false;

    try {
      console.log(`Attempting to sync ${queue.length} offline mutations...`);
      const response = await fetchWithAuth('sync', {
        method: 'POST',
        body: JSON.stringify({ mutations: queue }),
      });

      // Server successfully synced, overwrite local cache with backend authoritative state
      setLocalCache('workers', response.workers);
      setLocalCache('attendances', response.attendances);
      setLocalCache('ledgers', response.ledgers);
      setLocalCache('materials', response.materials);
      setLocalCache('zones', response.zones);

      // Clear the queue
      setSyncQueue([]);
      console.log('Offline synchronization completed successfully.');
      return true;
    } catch (err) {
      console.error('Failed to synchronize offline data:', err);
      return false;
    }
  },

  // ==========================================
  // DASHBOARD
  // ==========================================
  getDashboardStats: async () => {
    if (ApiService.isOnline()) {
      try {
        const stats = await fetchWithAuth('dashboard/stats');
        setLocalCache('dashboard_stats', stats);
        return stats;
      } catch (err) {
        console.warn('Dashboard fetch failed, loading from local cache:', err);
      }
    }

    // Offline / Fallback computation
    const workers = getLocalCache('workers', []);
    const materials = getLocalCache('materials', []);
    const ledgers = getLocalCache('ledgers', []);

    const activeWorkers = workers.filter((w: any) => w.status === 'Active');
    const masons = activeWorkers.filter((w: any) => w.role.toLowerCase().includes('mason') || w.role.toLowerCase().includes('mistri')).length;
    const labors = activeWorkers.length - masons;

    const totalLaborWages = ledgers.reduce((sum: number, l: any) => sum + (l.earned || 0), 0);
    const totalLaborAdvances = ledgers.reduce((sum: number, l: any) => sum + (l.advances || 0), 0);
    const totalLaborOutstanding = ledgers.reduce((sum: number, l: any) => sum + (l.balance || 0), 0);

    const totalMaterialCost = materials.reduce((sum: number, m: any) => sum + (m.totalCost || 0), 0);
    const totalMaterialPaid = materials.reduce((sum: number, m: any) => sum + (m.paidAmount || 0), 0);
    const totalMaterialOutstanding = materials.reduce((sum: number, m: any) => sum + (m.balanceDue || 0), 0);

    return {
      totalActiveWorkers: activeWorkers.length,
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
  },

  // ==========================================
  // WORKERS
  // ==========================================
  getWorkers: async () => {
    if (ApiService.isOnline()) {
      try {
        const workers = await fetchWithAuth('workers');
        setLocalCache('workers', workers);
        return workers;
      } catch (err) {
        console.warn('Workers fetch failed, loading from cache', err);
      }
    }
    return getLocalCache('workers', []);
  },

  createWorker: async (workerData: any) => {
    const localWorker = {
      ...workerData,
      id: generateUUID(),
      status: 'Active',
      createdAt: new Date().toISOString(),
    };

    // Update Local Cache immediately
    const cachedWorkers = getLocalCache('workers', []);
    cachedWorkers.unshift(localWorker);
    setLocalCache('workers', cachedWorkers);

    if (ApiService.isOnline()) {
      try {
        const saved = await fetchWithAuth('workers', {
          method: 'POST',
          body: JSON.stringify(workerData),
        });
        // Replace temp local worker with actual server worker in cache
        const freshWorkers = cachedWorkers.map((w: any) => w.id === localWorker.id ? saved : w);
        setLocalCache('workers', freshWorkers);
        return saved;
      } catch (err) {
        console.warn('Failed to save worker to server, queued offline:', err);
      }
    }

    addToSyncQueue({ type: 'worker', action: 'create', data: workerData });
    return localWorker;
  },

  updateWorker: async (id: string, workerData: any) => {
    const cachedWorkers = getLocalCache('workers', []);
    const updatedWorkers = cachedWorkers.map((w: any) => {
      if (w.id === id) {
        return { ...w, ...workerData };
      }
      return w;
    });
    setLocalCache('workers', updatedWorkers);

    if (ApiService.isOnline() && !id.startsWith('local-')) {
      try {
        return await fetchWithAuth(`workers/${id}`, {
          method: 'PUT',
          body: JSON.stringify(workerData),
        });
      } catch (err) {
        console.warn('Failed to update worker on server, queued offline:', err);
      }
    }

    addToSyncQueue({ type: 'worker', action: 'update', data: { id, ...workerData } });
    return { id, ...workerData };
  },

  // ==========================================
  // ATTENDANCE
  // ==========================================
  getAttendanceByDate: async (date: string) => {
    if (ApiService.isOnline()) {
      try {
        const list = await fetchWithAuth(`attendance/date/${date}`);
        // Merge into local attendance cache
        const allLocal = getLocalCache('attendances', []);
        const filtered = allLocal.filter((a: any) => a.date !== date);
        setLocalCache('attendances', [...filtered, ...list]);
        return list;
      } catch (err) {
        console.warn('Attendance date fetch failed, loading local', err);
      }
    }
    const all = getLocalCache('attendances', []);
    return all.filter((a: any) => a.date === date);
  },

  markAttendance: async (attendanceData: {
    workerId: string;
    date: string;
    status: string;
    overtimeHours?: number;
    zoneId?: string;
  }) => {
    const localId = generateUUID();
    const newRecord = { id: localId, ...attendanceData };

    // Update Local Attendances Cache
    const all = getLocalCache('attendances', []);
    const filtered = all.filter((a: any) => !(a.workerId === attendanceData.workerId && a.date === attendanceData.date));
    setLocalCache('attendances', [...filtered, newRecord]);

    // Recalculate local ledger representation
    const workers = getLocalCache('workers', []);
    const worker = workers.find((w: any) => w.id === attendanceData.workerId);
    if (worker) {
      const dailyRate = worker.dailyRate || 0;
      let mult = 0;
      if (attendanceData.status === 'Present') mult = 1;
      else if (attendanceData.status === 'Half-Day') mult = 0.5;

      const hourly = dailyRate / 8;
      const otWage = (attendanceData.overtimeHours || 0) * hourly * 1.5;
      const calculatedWage = (dailyRate * mult) + otWage;

      // Update local transaction ledger
      const ledgers = getLocalCache('ledgers', []);
      let workerLedger = ledgers.find((l: any) => l.worker.id === attendanceData.workerId);
      
      if (!workerLedger) {
        workerLedger = {
          worker,
          earned: 0,
          advances: 0,
          settled: 0,
          balance: 0,
          transactions: [],
        };
        ledgers.push(workerLedger);
      }

      // Check for pre-existing auto wage for this date
      const existingWageTxIndex = workerLedger.transactions.findIndex(
        (t: any) => t.date === attendanceData.date && t.type === 'Wage'
      );

      if (calculatedWage > 0) {
        const wageTx = {
          id: generateUUID(),
          workerId: attendanceData.workerId,
          type: 'Wage',
          amount: calculatedWage,
          date: attendanceData.date,
          notes: `Auto-calculated wage for ${attendanceData.status}${attendanceData.overtimeHours ? ` + ${attendanceData.overtimeHours}hr OT` : ''}`,
        };

        if (existingWageTxIndex !== -1) {
          workerLedger.transactions[existingWageTxIndex] = wageTx;
        } else {
          workerLedger.transactions.push(wageTx);
        }
      } else {
        if (existingWageTxIndex !== -1) {
          workerLedger.transactions.splice(existingWageTxIndex, 1);
        }
      }

      // Recalculate ledger sums
      workerLedger.earned = workerLedger.transactions
        .filter((t: any) => t.type === 'Wage')
        .reduce((sum: number, t: any) => sum + t.amount, 0);
      workerLedger.advances = workerLedger.transactions
        .filter((t: any) => t.type === 'Advance')
        .reduce((sum: number, t: any) => sum + t.amount, 0);
      workerLedger.settled = workerLedger.transactions
        .filter((t: any) => t.type === 'Settlement')
        .reduce((sum: number, t: any) => sum + t.amount, 0);
      workerLedger.balance = workerLedger.earned - workerLedger.advances - workerLedger.settled;

      setLocalCache('ledgers', ledgers);
    }

    if (ApiService.isOnline() && !attendanceData.workerId.startsWith('local-')) {
      try {
        return await fetchWithAuth('attendance', {
          method: 'POST',
          body: JSON.stringify(attendanceData),
        });
      } catch (err) {
        console.warn('Failed to post attendance to server, queued offline:', err);
      }
    }

    addToSyncQueue({ type: 'attendance', action: 'create', data: attendanceData });
    return newRecord;
  },

  // ==========================================
  // LEDGER / TRANSACTIONS
  // ==========================================
  getLedgers: async () => {
    if (ApiService.isOnline()) {
      try {
        const ledgers = await fetchWithAuth('transactions/ledgers');
        setLocalCache('ledgers', ledgers);
        return ledgers;
      } catch (err) {
        console.warn('Ledgers fetch failed, returning cache', err);
      }
    }
    return getLocalCache('ledgers', []);
  },

  logTransaction: async (txData: {
    workerId: string;
    type: string; // Advance or Settlement
    amount: number;
    date: string;
    notes?: string;
  }) => {
    const localTx = { id: generateUUID(), ...txData };

    // Update Local Ledger Cache
    const ledgers = getLocalCache('ledgers', []);
    const workerLedger = ledgers.find((l: any) => l.worker.id === txData.workerId);
    
    if (workerLedger) {
      workerLedger.transactions.unshift(localTx);
      
      workerLedger.earned = workerLedger.transactions
        .filter((t: any) => t.type === 'Wage')
        .reduce((sum: number, t: any) => sum + t.amount, 0);
      workerLedger.advances = workerLedger.transactions
        .filter((t: any) => t.type === 'Advance')
        .reduce((sum: number, t: any) => sum + t.amount, 0);
      workerLedger.settled = workerLedger.transactions
        .filter((t: any) => t.type === 'Settlement')
        .reduce((sum: number, t: any) => sum + t.amount, 0);
      workerLedger.balance = workerLedger.earned - workerLedger.advances - workerLedger.settled;

      setLocalCache('ledgers', ledgers);
    }

    if (ApiService.isOnline() && !txData.workerId.startsWith('local-')) {
      try {
        return await fetchWithAuth('transactions', {
          method: 'POST',
          body: JSON.stringify(txData),
        });
      } catch (err) {
        console.warn('Failed to log transaction on server, queued offline:', err);
      }
    }

    addToSyncQueue({ type: 'transaction', action: 'create', data: txData });
    return localTx;
  },

  // ==========================================
  // MATERIALS
  // ==========================================
  getMaterials: async () => {
    if (ApiService.isOnline()) {
      try {
        const materials = await fetchWithAuth('materials');
        setLocalCache('materials', materials);
        return materials;
      } catch (err) {
        console.warn('Materials fetch failed, loading local cache:', err);
      }
    }
    return getLocalCache('materials', []);
  },

  logMaterialPurchase: async (materialData: any) => {
    const totalCost = (materialData.quantity || 0) * (materialData.unitPrice || 0);
    const paidAmount = materialData.paidAmount || 0;
    const balanceDue = totalCost - paidAmount;
    
    let paymentStatus = 'Unpaid';
    if (paidAmount >= totalCost) paymentStatus = 'Paid';
    else if (paidAmount > 0) paymentStatus = 'Partially Paid';

    const localMaterial = {
      ...materialData,
      id: generateUUID(),
      totalCost,
      paidAmount,
      balanceDue,
      paymentStatus,
      createdAt: new Date().toISOString(),
    };

    const cachedMaterials = getLocalCache('materials', []);
    cachedMaterials.unshift(localMaterial);
    setLocalCache('materials', cachedMaterials);

    if (ApiService.isOnline()) {
      try {
        const saved = await fetchWithAuth('materials', {
          method: 'POST',
          body: JSON.stringify(materialData),
        });
        const freshMaterials = cachedMaterials.map((m: any) => m.id === localMaterial.id ? saved : m);
        setLocalCache('materials', freshMaterials);
        return saved;
      } catch (err) {
        console.warn('Failed to log material to server, queued offline:', err);
      }
    }

    addToSyncQueue({ type: 'material', action: 'create', data: materialData });
    return localMaterial;
  },

  // ==========================================
  // ZONES
  // ==========================================
  getZones: async () => {
    if (ApiService.isOnline()) {
      try {
        const zones = await fetchWithAuth('zones');
        setLocalCache('zones', zones);
        return zones;
      } catch (err) {
        console.warn('Zones fetch failed, loading cache:', err);
      }
    }
    return getLocalCache('zones', []);
  },

  createZone: async (zoneData: any) => {
    const localZone = {
      ...zoneData,
      id: generateUUID(),
    };

    const cachedZones = getLocalCache('zones', []);
    cachedZones.push(localZone);
    setLocalCache('zones', cachedZones);

    if (ApiService.isOnline()) {
      try {
        const saved = await fetchWithAuth('zones', {
          method: 'POST',
          body: JSON.stringify(zoneData),
        });
        const freshZones = cachedZones.map((z: any) => z.id === localZone.id ? saved : z);
        setLocalCache('zones', freshZones);
        return saved;
      } catch (err) {
        console.warn('Failed to create zone on server, queued offline:', err);
      }
    }

    addToSyncQueue({ type: 'zone', action: 'create', data: zoneData });
    return localZone;
  },
};
