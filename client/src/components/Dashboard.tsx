import React from 'react';
import { Users, Package, DollarSign, Activity, Hammer } from 'lucide-react';

interface DashboardProps {
  stats: {
    totalActiveWorkers: number;
    masonsCount: number;
    laborsCount: number;
    totalLaborWages: number;
    totalLaborAdvances: number;
    totalLaborOutstanding: number;
    totalMaterialCost: number;
    totalMaterialPaid: number;
    totalMaterialOutstanding: number;
    totalSiteCost: number;
  };
  onNavigate: (tab: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ stats, onNavigate }) => {
  // Safe math calculations
  const laborPct = stats.totalSiteCost > 0 ? (stats.totalLaborWages / stats.totalSiteCost) * 100 : 50;
  const materialPct = stats.totalSiteCost > 0 ? (stats.totalMaterialCost / stats.totalSiteCost) * 100 : 50;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Title Header */}
      <div>
        <h2 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '6px' }}>Site Overview</h2>
        <p style={{ color: 'var(--text-secondary)' }}>Real-time status of workers, materials, and cost liabilities.</p>
      </div>

      {/* Grid Stats */}
      <div className="dashboard-grid">
        {/* Workers Card */}
        <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{
            background: 'var(--accent-glow)',
            color: 'var(--accent)',
            padding: '12px',
            borderRadius: '12px',
          }} className="floating-icon">
            <Users size={28} />
          </div>
          <div>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', fontWeight: 500 }}>Active Crew</p>
            <h3 style={{ fontSize: '24px', fontWeight: 700, margin: '2px 0' }}>{stats.totalActiveWorkers}</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
              {stats.masonsCount} Masons • {stats.laborsCount} Labors
            </p>
          </div>
        </div>

        {/* Labor Wages Card */}
        <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{
            background: 'rgba(16, 185, 129, 0.15)',
            color: 'var(--status-present)',
            padding: '12px',
            borderRadius: '12px',
          }}>
            <Hammer size={28} />
          </div>
          <div>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', fontWeight: 500 }}>Labor Wages</p>
            <h3 style={{ fontSize: '24px', fontWeight: 700, margin: '2px 0' }}>₹{stats.totalLaborWages.toFixed(2)}</h3>
            <p style={{ color: 'var(--status-absent)', fontSize: '12px', fontWeight: 600 }}>
              ₹{stats.totalLaborOutstanding.toFixed(2)} Dues Outstanding
            </p>
          </div>
        </div>

        {/* Materials Card */}
        <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{
            background: 'var(--accent-secondary-glow)',
            color: 'var(--accent-secondary)',
            padding: '12px',
            borderRadius: '12px',
          }}>
            <Package size={28} />
          </div>
          <div>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', fontWeight: 500 }}>Materials Cost</p>
            <h3 style={{ fontSize: '24px', fontWeight: 700, margin: '2px 0' }}>₹{stats.totalMaterialCost.toFixed(2)}</h3>
            <p style={{ color: 'var(--status-halfday)', fontSize: '12px', fontWeight: 600 }}>
              ₹{stats.totalMaterialOutstanding.toFixed(2)} Supplier Dues
            </p>
          </div>
        </div>

        {/* Total Cost Card */}
        <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{
            background: 'rgba(99, 102, 241, 0.15)',
            color: 'var(--accent)',
            padding: '12px',
            borderRadius: '12px',
          }}>
            <DollarSign size={28} />
          </div>
          <div>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', fontWeight: 500 }}>Total Project Cost</p>
            <h3 style={{ fontSize: '24px', fontWeight: 700, margin: '2px 0' }}>₹{stats.totalSiteCost.toFixed(2)}</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
              Wages + Materials
            </p>
          </div>
        </div>
      </div>

      {/* Main Analysis Panel (Glassmorphism visualization) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
        
        {/* Cost Allocation Chart */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h4 style={{ fontSize: '18px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={20} style={{ color: 'var(--accent)' }} /> Cost Distribution
          </h4>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '10px' }}>
            {/* Visual breakdown bar */}
            <div style={{
              height: '24px',
              width: '100%',
              background: '#1e293b',
              borderRadius: '12px',
              overflow: 'hidden',
              display: 'flex',
            }}>
              <div style={{
                width: `${laborPct}%`,
                background: 'linear-gradient(90deg, #6366f1, #4f46e5)',
                transition: 'width var(--transition-smooth)',
              }} title={`Labor: ${laborPct.toFixed(1)}%`} />
              <div style={{
                width: `${materialPct}%`,
                background: 'linear-gradient(90deg, #06b6d4, #0891b2)',
                transition: 'width var(--transition-smooth)',
              }} title={`Materials: ${materialPct.toFixed(1)}%`} />
            </div>

            {/* Chart Legend */}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginTop: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'var(--accent)' }} />
                <span>Labor Wages: <strong>{laborPct.toFixed(1)}%</strong> (₹{stats.totalLaborWages.toFixed(0)})</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'var(--accent-secondary)' }} />
                <span>Materials: <strong>{materialPct.toFixed(1)}%</strong> (₹{stats.totalMaterialCost.toFixed(0)})</span>
              </div>
            </div>
          </div>

          <div style={{
            borderTop: '1px solid var(--border-card)',
            paddingTop: '16px',
            marginTop: '12px',
            fontSize: '13px',
            color: 'var(--text-secondary)',
            lineHeight: 1.5
          }}>
            Pro-Tip: Track your daily attendance grids regularly. SiteForce auto-logs labor wage liabilities into the ledger based on daily attendance, keeping your labor budgets accurate down to the cent.
          </div>
        </div>

        {/* Quick Actions Card */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h4 style={{ fontSize: '18px', fontWeight: 600 }}>Quick Tasks</h4>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', height: '100%' }}>
            <button 
              onClick={() => onNavigate('attendance')}
              className="btn-primary" 
              style={{ padding: '20px', flexDirection: 'column', height: '100%', fontSize: '15px' }}
            >
              <Users size={24} />
              Mark Attendance
            </button>
            <button 
              onClick={() => onNavigate('materials')}
              className="btn-primary" 
              style={{
                padding: '20px',
                flexDirection: 'column',
                height: '100%',
                fontSize: '15px',
                background: 'linear-gradient(135deg, var(--accent-secondary), #0891b2)',
                boxShadow: '0 4px 12px var(--accent-secondary-glow)'
              }}
            >
              <Package size={24} />
              Log Material
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
