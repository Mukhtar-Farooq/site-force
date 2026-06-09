import React, { useState, useEffect } from 'react';
import { ApiService } from './services/api';
import { isMockAuth, auth } from './config/firebase';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';

// Icons
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  DollarSign,
  Package,
  MapPin,
  Sun,
  Moon,
  Wifi,
  WifiOff,
  RefreshCw,
  LogOut,
  Hammer
} from 'lucide-react';

// Subcomponents
import { Dashboard } from './components/Dashboard';
import { WorkerManager } from './components/WorkerManager';
import { AttendanceGrid } from './components/AttendanceGrid';
import { FinancialLedger } from './components/FinancialLedger';
import { MaterialLog } from './components/MaterialLog';
import { ZoneAllocator } from './components/ZoneAllocator';

function App() {
  // Navigation & UI States
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [theme, setTheme] = useState<'dark' | 'sunlight'>('dark');
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Authentication States
  const [user, setUser] = useState<any>(null);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // Core Data States
  const [workers, setWorkers] = useState<any[]>([]);
  const [zones, setZones] = useState<any[]>([]);
  const [ledgers, setLedgers] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({
    totalActiveWorkers: 0,
    masonsCount: 0,
    laborsCount: 0,
    totalLaborWages: 0,
    totalLaborAdvances: 0,
    totalLaborOutstanding: 0,
    totalMaterialCost: 0,
    totalMaterialPaid: 0,
    totalMaterialOutstanding: 0,
    totalSiteCost: 0,
  });

  // Handle Online/Offline Status listeners
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      triggerSync();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Theme Sync Handler
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Auth Handler
  useEffect(() => {
    if (isMockAuth) {
      // Automatic developer supervisor login
      setUser({
        email: 'dev@siteforce.com',
        displayName: 'Developer Supervisor',
        uid: 'dev-supervisor-id',
      });
    } else if (auth) {
      const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
        setUser(firebaseUser);
      });
      return () => unsubscribe();
    }
  }, []);

  // Load Data on startup / login / tab change
  const loadData = async () => {
    if (!user) return;
    try {
      const workerList = await ApiService.getWorkers();
      const zoneList = await ApiService.getZones();
      const ledgerList = await ApiService.getLedgers();
      const materialList = await ApiService.getMaterials();
      const dashboardStats = await ApiService.getDashboardStats();

      setWorkers(workerList);
      setZones(zoneList);
      setLedgers(ledgerList);
      setMaterials(materialList);
      setStats(dashboardStats);
    } catch (err) {
      console.error('Error loading data from API services:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  // Re-fetch dashboard stats when active tab transitions back to dashboard
  useEffect(() => {
    if (activeTab === 'dashboard') {
      loadData();
    }
  }, [activeTab]);

  const triggerSync = async () => {
    if (!navigator.onLine || isSyncing) return;
    setIsSyncing(true);
    try {
      const success = await ApiService.syncOfflineData();
      if (success) {
        await loadData();
      }
    } catch (err) {
      console.error('Offline sync failed:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  // Periodic Auto-Sync trigger
  useEffect(() => {
    const interval = setInterval(() => {
      triggerSync();
    }, 15000); // Check and sync every 15 seconds
    return () => clearInterval(interval);
  }, [isSyncing]);

  // ==========================================
  // COMPONENT EVENT HANDLERS
  // ==========================================
  const handleCreateWorker = async (workerData: any) => {
    const saved = await ApiService.createWorker(workerData);
    await loadData();
    return saved;
  };

  const handleUpdateWorker = async (id: string, workerData: any) => {
    const updated = await ApiService.updateWorker(id, workerData);
    await loadData();
    return updated;
  };

  const handleDeleteWorker = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this worker?')) {
      if (ApiService.isOnline() && !id.startsWith('local-')) {
        try {
          let token = 'dev-token';
          if (!isMockAuth && auth && auth.currentUser) {
            token = await auth.currentUser.getIdToken();
          }
          await fetch(`http://localhost:5000/api/workers/${id}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
        } catch (err) {
          console.warn('Failed to delete worker on server, local only:', err);
        }
      }
      const updated = workers.filter((w: any) => w.id !== id);
      setWorkers(updated);
      localStorage.setItem('siteforce_cache_workers', JSON.stringify(updated));
      await loadData();
    }
  };

  const handleMarkAttendance = async (attendanceData: any) => {
    const saved = await ApiService.markAttendance(attendanceData);
    await loadData();
    return saved;
  };

  const handleLogTransaction = async (txData: any) => {
    const saved = await ApiService.logTransaction(txData);
    await loadData();
    return saved;
  };

  const handleLogMaterial = async (materialData: any) => {
    const saved = await ApiService.logMaterialPurchase(materialData);
    await loadData();
    return saved;
  };

  const handleCreateZone = async (zoneData: any) => {
    const saved = await ApiService.createZone(zoneData);
    await loadData();
    return saved;
  };

  // Auth Functions
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authEmail || !authPassword) return;
    setAuthLoading(true);
    setAuthError('');
    try {
      await signInWithEmailAndPassword(auth, authEmail, authPassword);
    } catch (err: any) {
      setAuthError(err.message || 'Authentication failed. Please check credentials.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    if (isMockAuth) {
      setUser(null);
    } else if (auth) {
      await signOut(auth);
    }
  };

  // Render Login UI
  if (!user) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'radial-gradient(at top right, #111827, #070a0f)',
        padding: '20px',
      }}>
        <div className="glass-card" style={{ width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <div style={{
              background: 'var(--accent-glow)',
              color: 'var(--accent)',
              padding: '12px',
              borderRadius: '50%',
              display: 'inline-flex',
            }}>
              <Hammer size={32} />
            </div>
            <h1 style={{ fontSize: '26px', fontWeight: 700, letterSpacing: '-0.5px' }}>SiteForce</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Log check-ins and raw materials at your site.</p>
          </div>

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {authError && (
              <div style={{
                background: 'var(--status-absent-glow)',
                color: 'var(--status-absent)',
                padding: '10px 14px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 500,
                border: '1px solid var(--status-absent)',
              }}>
                {authError}
              </div>
            )}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px', color: 'var(--text-secondary)' }}>Email Address</label>
              <input 
                type="email" 
                className="form-input" 
                required 
                placeholder="supervisor@siteforce.com"
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px', color: 'var(--text-secondary)' }}>Password</label>
              <input 
                type="password" 
                className="form-input" 
                required 
                placeholder="••••••••"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
              />
            </div>
            <button type="submit" disabled={authLoading} className="btn-primary" style={{ marginTop: '8px', padding: '14px' }}>
              {authLoading ? 'Verifying...' : 'Sign In'}
            </button>
          </form>

          {isMockAuth && (
            <div style={{ textAlign: 'center', fontSize: '12px', color: 'var(--text-muted)' }}>
              Note: App running in Bypass Mock Mode. You can log in automatically.
            </div>
          )}
        </div>
      </div>
    );
  }

  // Render Core App Dashboard
  return (
    <div style={{ display: 'flex', minHeight: '100vh', flexDirection: 'row' }}>
      
      {/* 1. Sidebar Navigation */}
      <aside style={{
        width: '260px',
        background: 'var(--bg-sidebar)',
        borderRight: '1px solid var(--border-card)',
        display: 'flex',
        flexDirection: 'column',
        padding: '24px 16px',
        gap: '24px',
        flexShrink: 0,
        zIndex: 10,
        position: 'sticky',
        top: 0,
        height: '100vh',
      }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '0 8px' }}>
          <div style={{ background: 'var(--accent-glow)', color: 'var(--accent)', padding: '8px', borderRadius: '10px' }}>
            <Hammer size={22} />
          </div>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: 700, letterSpacing: '-0.5px' }}>SiteForce</h1>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Site Management Console</p>
          </div>
        </div>

        {/* Tab Selection Navigation */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
          {[
            { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { id: 'crew', label: 'Crew Registry', icon: Users },
            { id: 'attendance', label: 'Daily Log', icon: CalendarDays },
            { id: 'finance', label: 'Finance Ledger', icon: DollarSign },
            { id: 'materials', label: 'Material Log', icon: Package },
            { id: 'zones', label: 'Site Zones', icon: MapPin },
          ].map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 16px',
                  borderRadius: '10px',
                  border: 'none',
                  background: isActive ? 'var(--accent-glow)' : 'transparent',
                  color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                  fontWeight: isActive ? 600 : 500,
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontSize: '15px',
                  transition: 'all var(--transition-fast)',
                }}
                className={isActive ? '' : 'nav-hover'}
              >
                <Icon size={18} style={{ color: isActive ? 'var(--accent)' : 'inherit' }} />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Sync Indicator & Theme Controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderTop: '1px solid var(--border-card)', paddingTop: '16px' }}>
          
          {/* Sync Button */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
              {isOnline ? (
                <>
                  <Wifi size={14} style={{ color: 'var(--status-present)' }} />
                  <span style={{ color: 'var(--text-secondary)' }}>Online</span>
                </>
              ) : (
                <>
                  <WifiOff size={14} style={{ color: 'var(--status-absent)' }} />
                  <span style={{ color: 'var(--text-secondary)' }}>Offline</span>
                </>
              )}
            </div>
            {isOnline && (
              <button
                onClick={triggerSync}
                disabled={isSyncing}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                }}
                title="Force Synchronization"
              >
                <RefreshCw size={14} className={isSyncing ? 'spinning' : ''} style={{ animation: isSyncing ? 'spin 1s linear infinite' : 'none' }} />
              </button>
            )}
          </div>

          {/* Theme Toggle */}
          <button
            onClick={() => setTheme(theme === 'dark' ? 'sunlight' : 'dark')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '10px 16px',
              borderRadius: '8px',
              border: '1px solid var(--border-card)',
              background: 'transparent',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 500,
            }}
          >
            {theme === 'dark' ? (
              <>
                <Sun size={14} style={{ color: 'var(--status-halfday)' }} />
                <span>Sunlight Mode (High Contrast)</span>
              </>
            ) : (
              <>
                <Moon size={14} style={{ color: 'var(--accent)' }} />
                <span>Dark Studio Mode</span>
              </>
            )}
          </button>

          {/* Logout */}
          <button
            onClick={handleLogout}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '10px 16px',
              borderRadius: '8px',
              border: 'none',
              background: 'var(--status-absent-glow)',
              color: 'var(--status-absent)',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 600,
            }}
          >
            <LogOut size={14} />
            <span>Sign Out</span>
          </button>

        </div>
      </aside>

      {/* 2. Main Page Content Window */}
      <main style={{
        flex: 1,
        padding: '36px 48px',
        overflowY: 'auto',
        height: '100vh',
      }}>
        {/* Tab Content Router */}
        {activeTab === 'dashboard' && <Dashboard stats={stats} onNavigate={setActiveTab} />}
        {activeTab === 'crew' && (
          <WorkerManager
            workers={workers}
            onCreateWorker={handleCreateWorker}
            onUpdateWorker={handleUpdateWorker}
            onDeleteWorker={handleDeleteWorker}
          />
        )}
        {activeTab === 'attendance' && (
          <AttendanceGrid
            workers={workers}
            zones={zones}
            onMarkAttendance={handleMarkAttendance}
            onFetchAttendanceByDate={ApiService.getAttendanceByDate}
          />
        )}
        {activeTab === 'finance' && (
          <FinancialLedger
            ledgers={ledgers}
            onLogTransaction={handleLogTransaction}
          />
        )}
        {activeTab === 'materials' && (
          <MaterialLog
            materials={materials}
            zones={zones}
            onLogMaterial={handleLogMaterial}
          />
        )}
        {activeTab === 'zones' && (
          <ZoneAllocator
            zones={zones}
            onCreateZone={handleCreateZone}
          />
        )}
      </main>

      {/* Embedded CSS for custom rotation animation */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .nav-hover:hover {
          background: rgba(255,255,255,0.03) !important;
          color: var(--text-primary) !important;
        }
        [data-theme='sunlight'] .nav-hover:hover {
          background: rgba(0,0,0,0.2) !important;
          color: #ffffff !important;
        }
      `}</style>

    </div>
  );
}

export default App;
