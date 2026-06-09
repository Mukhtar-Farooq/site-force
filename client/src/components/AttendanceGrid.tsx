import React, { useState, useEffect } from 'react';
import { Calendar, CheckCircle2, Clock, MapPin } from 'lucide-react';

interface Worker {
  id: string;
  name: string;
  role: string;
  status: string;
}

interface Attendance {
  id?: string;
  workerId: string;
  date: string;
  status: string;
  overtimeHours: number;
  zoneId?: string;
}

interface Zone {
  id: string;
  name: string;
}

interface AttendanceGridProps {
  workers: Worker[];
  zones: Zone[];
  onMarkAttendance: (data: {
    workerId: string;
    date: string;
    status: string;
    overtimeHours: number;
    zoneId?: string;
  }) => Promise<any>;
  onFetchAttendanceByDate: (date: string) => Promise<Attendance[]>;
}

export const AttendanceGrid: React.FC<AttendanceGridProps> = ({
  workers,
  zones,
  onMarkAttendance,
  onFetchAttendanceByDate,
}) => {
  // Get local date formatted as YYYY-MM-DD
  const getTodayString = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [date, setDate] = useState(getTodayString());
  const [attendanceRecords, setAttendanceRecords] = useState<Record<string, Attendance>>({});
  const [loading, setLoading] = useState(false);

  // Load attendance records for the selected date
  const loadAttendance = async (targetDate: string) => {
    setLoading(true);
    try {
      const records = await onFetchAttendanceByDate(targetDate);
      const recordMap: Record<string, Attendance> = {};
      records.forEach((r) => {
        recordMap[r.workerId] = r;
      });
      setAttendanceRecords(recordMap);
    } catch (err) {
      console.error('Error loading attendance logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAttendance(date);
  }, [date]);

  const activeWorkers = workers.filter((w) => w.status === 'Active');

  const handleStatusChange = async (workerId: string, status: string) => {
    const existing = attendanceRecords[workerId] || { status: 'Absent', overtimeHours: 0, zoneId: undefined };
    
    const updated = {
      workerId,
      date,
      status,
      overtimeHours: existing.overtimeHours,
      zoneId: existing.zoneId,
    };

    // Optimistic Local State Update
    setAttendanceRecords((prev) => ({
      ...prev,
      [workerId]: { ...existing, ...updated } as Attendance,
    }));

    try {
      await onMarkAttendance(updated);
    } catch (err) {
      console.error('Failed to log attendance:', err);
    }
  };

  const handleOvertimeChange = async (workerId: string, hours: number) => {
    const existing = attendanceRecords[workerId] || { status: 'Absent', overtimeHours: 0, zoneId: undefined };
    if (hours < 0 || hours > 12) return;

    const updated = {
      workerId,
      date,
      status: existing.status || 'Present', // default to present if setting OT
      overtimeHours: hours,
      zoneId: existing.zoneId,
    };

    setAttendanceRecords((prev) => ({
      ...prev,
      [workerId]: { ...existing, ...updated } as Attendance,
    }));

    try {
      await onMarkAttendance(updated);
    } catch (err) {
      console.error('Failed to update overtime logs:', err);
    }
  };

  const handleZoneChange = async (workerId: string, zoneId: string) => {
    const existing = attendanceRecords[workerId] || { status: 'Absent', overtimeHours: 0, zoneId: undefined };
    
    const updated = {
      workerId,
      date,
      status: existing.status || 'Present',
      overtimeHours: existing.overtimeHours,
      zoneId: zoneId || undefined,
    };

    setAttendanceRecords((prev) => ({
      ...prev,
      [workerId]: { ...existing, ...updated } as Attendance,
    }));

    try {
      await onMarkAttendance(updated);
    } catch (err) {
      console.error('Failed to update zone logs:', err);
    }
  };

  const handleMarkAllPresent = async () => {
    setLoading(true);
    try {
      for (const worker of activeWorkers) {
        const existing = attendanceRecords[worker.id];
        if (!existing || existing.status !== 'Present') {
          const updated = {
            workerId: worker.id,
            date,
            status: 'Present',
            overtimeHours: existing?.overtimeHours || 0,
            zoneId: existing?.zoneId,
          };
          await onMarkAttendance(updated);
        }
      }
      // Reload records to sync view
      await loadAttendance(date);
    } catch (err) {
      console.error('Failed to bulk mark present:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Title & Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '6px' }}>Daily Log</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Log daily check-ins, overtime work, and task zones.</p>
        </div>
        <button 
          onClick={handleMarkAllPresent}
          disabled={activeWorkers.length === 0}
          className="btn-primary" 
          style={{ background: 'linear-gradient(135deg, #10b981, #059669)', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)' }}
        >
          <CheckCircle2 size={20} /> Mark All Present
        </button>
      </div>

      {/* Date Picker Dashboard */}
      <div className="glass-card" style={{ padding: '16px', display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
          <Calendar size={20} style={{ color: 'var(--accent)' }} />
          <span style={{ fontWeight: 600 }}>Select Logging Date:</span>
          <input
            type="date"
            className="form-input"
            style={{ maxWidth: '200px', padding: '8px 12px' }}
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
          Active crew size today: <strong>{activeWorkers.length} workers</strong>
        </div>
      </div>

      {/* Attendance Grid list */}
      {loading ? (
        <div className="glass-card" style={{ padding: '48px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          Loading daily check-ins...
        </div>
      ) : activeWorkers.length === 0 ? (
        <div className="glass-card" style={{ padding: '48px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          No active crew members in the registry. Go to Crew tab to onboard workers first.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {activeWorkers.map((worker) => {
            const record = attendanceRecords[worker.id] || { status: 'Unmarked', overtimeHours: 0, zoneId: '' };
            const status = record.status;

            return (
              <div 
                className="glass-card" 
                key={worker.id} 
                style={{
                  padding: '16px 24px',
                  display: 'grid',
                  gridTemplateColumns: '1.5fr 2fr 1.5fr 1.5fr',
                  alignItems: 'center',
                  gap: '24px',
                  flexWrap: 'wrap',
                }}
              >
                {/* 1. Worker Name & Role */}
                <div>
                  <h4 style={{ fontSize: '16px', fontWeight: 600 }}>{worker.name}</h4>
                  <p style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '2px' }}>{worker.role}</p>
                </div>

                {/* 2. Attendance Status Buttons */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                  <button
                    onClick={() => handleStatusChange(worker.id, 'Present')}
                    className="attendance-btn"
                    style={{
                      background: status === 'Present' ? 'var(--status-present)' : 'transparent',
                      color: status === 'Present' ? '#ffffff' : 'var(--text-secondary)',
                      borderColor: status === 'Present' ? 'var(--status-present)' : 'var(--border-card)',
                      boxShadow: status === 'Present' ? '0 0 10px var(--status-present-glow)' : 'none',
                    }}
                  >
                    Present
                  </button>
                  <button
                    onClick={() => handleStatusChange(worker.id, 'Half-Day')}
                    className="attendance-btn"
                    style={{
                      background: status === 'Half-Day' ? 'var(--status-halfday)' : 'transparent',
                      color: status === 'Half-Day' ? '#ffffff' : 'var(--text-secondary)',
                      borderColor: status === 'Half-Day' ? 'var(--status-halfday)' : 'var(--border-card)',
                      boxShadow: status === 'Half-Day' ? '0 0 10px var(--status-halfday-glow)' : 'none',
                    }}
                  >
                    Half-Day
                  </button>
                  <button
                    onClick={() => handleStatusChange(worker.id, 'Absent')}
                    className="attendance-btn"
                    style={{
                      background: status === 'Absent' ? 'var(--status-absent)' : 'transparent',
                      color: status === 'Absent' ? '#ffffff' : 'var(--text-secondary)',
                      borderColor: status === 'Absent' ? 'var(--status-absent)' : 'var(--border-card)',
                      boxShadow: status === 'Absent' ? '0 0 10px var(--status-absent-glow)' : 'none',
                    }}
                  >
                    Absent
                  </button>
                </div>

                {/* 3. Overtime Counter */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                  <Clock size={16} style={{ color: 'var(--status-overtime)' }} />
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Overtime:</span>
                  <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--border-card)', borderRadius: '8px', overflow: 'hidden' }}>
                    <button 
                      onClick={() => handleOvertimeChange(worker.id, (record.overtimeHours || 0) - 1)}
                      style={{ padding: '6px 10px', background: 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                      -
                    </button>
                    <span style={{ width: '28px', textAlign: 'center', fontSize: '14px', fontWeight: 600 }}>{record.overtimeHours || 0}h</span>
                    <button 
                      onClick={() => handleOvertimeChange(worker.id, (record.overtimeHours || 0) + 1)}
                      style={{ padding: '6px 10px', background: 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* 4. Zone Selector */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <MapPin size={16} style={{ color: 'var(--accent)' }} />
                  <select 
                    className="form-select"
                    style={{ padding: '6px 10px', fontSize: '13px' }}
                    value={record.zoneId || ''}
                    onChange={(e) => handleZoneChange(worker.id, e.target.value)}
                  >
                    <option value="">No Zone</option>
                    {zones.map((zone) => (
                      <option key={zone.id} value={zone.id}>{zone.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
