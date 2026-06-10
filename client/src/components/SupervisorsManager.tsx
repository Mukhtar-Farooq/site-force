import React, { useState } from 'react';
import { UserCheck, Plus, Trash2, MapPin, Key } from 'lucide-react';

interface Zone {
  id: string;
  name: string;
}

interface Supervisor {
  id: string;
  email: string;
  role: string;
  zones: Zone[];
}

interface SupervisorsManagerProps {
  supervisors: Supervisor[];
  zones: Zone[];
  onCreateSupervisor: (data: { email: string; password?: string; zoneIds: string[] }) => Promise<any>;
  onDeleteSupervisor: (id: string) => Promise<any>;
}

export const SupervisorsManager: React.FC<SupervisorsManagerProps> = ({
  supervisors,
  zones,
  onCreateSupervisor,
  onDeleteSupervisor,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedZoneIds, setSelectedZoneIds] = useState<string[]>([]);

  const handleZoneToggle = (zoneId: string) => {
    if (selectedZoneIds.includes(zoneId)) {
      setSelectedZoneIds(selectedZoneIds.filter((id) => id !== zoneId));
    } else {
      setSelectedZoneIds([...selectedZoneIds, zoneId]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || selectedZoneIds.length === 0) {
      alert('Please fill out all fields and assign at least one zone.');
      return;
    }

    try {
      await onCreateSupervisor({
        email,
        password,
        zoneIds: selectedZoneIds,
      });

      setEmail('');
      setPassword('');
      setSelectedZoneIds([]);
      setShowAddModal(false);
    } catch (err: any) {
      alert(err.message || 'Failed to create supervisor');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '6px' }}>Supervisor Management</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Add supervisor logins and assign them to specific construction zones.</p>
        </div>
        <button className="btn-primary" onClick={() => setShowAddModal(true)}>
          <Plus size={20} /> Add Supervisor
        </button>
      </div>

      {/* Supervisors list grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
        {supervisors.map((sup) => (
          <div className="glass-card" key={sup.id} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ background: 'var(--accent-glow)', color: 'var(--accent)', padding: '10px', borderRadius: '10px' }}>
                  <UserCheck size={22} />
                </div>
                <div>
                  <h4 style={{ fontSize: '16px', fontWeight: 600, wordBreak: 'break-all' }}>{sup.email}</h4>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Role: Supervisor</span>
                </div>
              </div>
              
              <button 
                onClick={() => {
                  if (window.confirm(`Are you sure you want to delete supervisor: ${sup.email}?`)) {
                    onDeleteSupervisor(sup.id);
                  }
                }}
                style={{
                  background: 'var(--status-absent-glow)',
                  border: 'none',
                  color: 'var(--status-absent)',
                  padding: '8px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                }}
              >
                <Trash2 size={16} />
              </button>
            </div>

            {/* Assigned zones */}
            <div style={{ borderTop: '1px solid var(--border-card)', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>Assigned Zones:</span>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {sup.zones.map((zone) => (
                  <span 
                    key={zone.id}
                    style={{
                      fontSize: '12px',
                      background: 'rgba(255,255,255,0.05)',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border-card)',
                    }}
                  >
                    <MapPin size={10} style={{ color: 'var(--accent-secondary)' }} />
                    {zone.name}
                  </span>
                ))}
                {sup.zones.length === 0 && (
                  <span style={{ fontSize: '12px', color: 'var(--status-absent)', fontStyle: 'italic' }}>No zones assigned (Access Denied)</span>
                )}
              </div>
            </div>
          </div>
        ))}

        {supervisors.length === 0 && (
          <div className="glass-card" style={{ gridColumn: '1 / -1', padding: '48px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            No supervisors created yet. Click "Add Supervisor" to provision credentials.
          </div>
        )}
      </div>

      {/* Add Supervisor Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: '460px' }}>
            <div className="modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Key size={20} style={{ color: 'var(--accent)' }} /> Add Site Supervisor
              </h3>
              <button onClick={() => setShowAddModal(false)} className="modal-close-btn">×</button>
            </div>

            <form onSubmit={handleSubmit} className="modal-form">
              <div className="modal-body-scroll">
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '6px', color: 'var(--text-secondary)' }}>Email Address</label>
                  <input 
                    type="email" 
                    className="form-input" 
                    required 
                    placeholder="e.g. supervisor.blocka@siteforce.com" 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '6px', color: 'var(--text-secondary)' }}>Password</label>
                  <input 
                    type="password" 
                    className="form-input" 
                    required 
                    placeholder="Minimum 6 characters" 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '8px', color: 'var(--text-secondary)' }}>Assign to Zones (Choose at least one)</label>
                  <div style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: '10px', 
                    maxHeight: '120px', 
                    overflowY: 'auto',
                    border: '1px solid var(--border-card)',
                    padding: '12px',
                    borderRadius: '10px',
                    background: 'rgba(0,0,0,0.1)'
                  }}>
                    {zones.map((zone) => (
                      <label key={zone.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '14px' }}>
                        <input 
                          type="checkbox" 
                          checked={selectedZoneIds.includes(zone.id)} 
                          onChange={() => handleZoneToggle(zone.id)} 
                        />
                        <span>{zone.name}</span>
                      </label>
                    ))}
                    {zones.length === 0 && (
                      <p style={{ color: 'var(--status-absent)', fontSize: '13px', fontStyle: 'italic' }}>Please create site zones first before adding supervisors.</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="submit" className="btn-primary" style={{ width: '100%' }}>
                  Create Supervisor Login
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
