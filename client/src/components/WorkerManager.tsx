import React, { useState } from 'react';
import { Search, Plus, Trash2, Shield, Camera, Phone, UserPlus } from 'lucide-react';

interface Worker {
  id: string;
  name: string;
  phone: string;
  role: string;
  dailyRate: number;
  photoBase64?: string;
  status: string;
  createdAt: string;
}

interface WorkerManagerProps {
  workers: Worker[];
  onCreateWorker: (workerData: Omit<Worker, 'id' | 'status' | 'createdAt'>) => Promise<any>;
  onUpdateWorker: (id: string, workerData: Partial<Worker>) => Promise<any>;
  onDeleteWorker: (id: string) => Promise<any>;
}

export const WorkerManager: React.FC<WorkerManagerProps> = ({
  workers,
  onCreateWorker,
  onUpdateWorker,
  onDeleteWorker,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Add Worker Form States
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('Labor');
  const [dailyRate, setDailyRate] = useState(20);
  const [photoBase64, setPhotoBase64] = useState<string | undefined>(undefined);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoBase64(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone || dailyRate <= 0 || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onCreateWorker({
        name,
        phone,
        role,
        dailyRate: Number(dailyRate),
        photoBase64,
      });

      // Reset fields
      setName('');
      setPhone('');
      setRole('Labor');
      setDailyRate(20);
      setPhotoBase64(undefined);
      setShowAddModal(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredWorkers = workers.filter((w) => {
    const matchesSearch = w.name.toLowerCase().includes(searchTerm.toLowerCase()) || w.phone.includes(searchTerm);
    const matchesRole = roleFilter === 'All' || w.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Top Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '6px' }}>Crew Registry</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Manage your construction crew profiles, roles, and wage rates.</p>
        </div>
        <button className="btn-primary" onClick={() => setShowAddModal(true)}>
          <Plus size={20} /> Onboard Worker
        </button>
      </div>

      {/* Filters & Search Grid */}
      <div className="glass-card" style={{ padding: '16px', display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search by name or phone..."
            className="form-input"
            style={{ paddingLeft: '40px' }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div style={{ minWidth: '150px' }}>
          <select className="form-select" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
            <option value="All">All Roles</option>
            <option value="Labor">Labor (Mazdoor)</option>
            <option value="Mason">Mason (Rajmistri)</option>
            <option value="Carpenter">Carpenter</option>
            <option value="Plumber">Plumber</option>
            <option value="Electrician">Electrician</option>
            <option value="Supervisor">Supervisor</option>
          </select>
        </div>
      </div>

      {/* Worker List Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: '20px',
      }}>
        {filteredWorkers.map((worker) => (
          <div className="glass-card" key={worker.id} style={{ display: 'flex', flexDirection: 'column', gap: '16px', position: 'relative' }}>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              
              {/* Photo */}
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'var(--bg-app)',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '2px solid var(--border-card-hover)',
              }}>
                {worker.photoBase64 ? (
                  <img src={worker.photoBase64} alt={worker.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span style={{ fontSize: '20px', fontWeight: 600, color: 'var(--accent)' }}>
                    {worker.name.charAt(0)}
                  </span>
                )}
              </div>

              {/* Profile Details */}
              <div style={{ flex: 1 }}>
                <h4 style={{ fontSize: '18px', fontWeight: 600 }}>{worker.name}</h4>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  <Shield size={13} style={{ color: 'var(--accent)' }} />
                  <span>{worker.role}</span>
                </div>
              </div>
            </div>

            {/* Sub-info */}
            <div style={{ borderTop: '1px solid var(--border-card)', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Daily Rate:</span>
                <span style={{ fontWeight: 600, color: 'var(--status-present)' }}>₹{worker.dailyRate.toFixed(2)}/day</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Phone size={13} /> Phone:
                </span>
                <span>{worker.phone}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Status:</span>
                <span style={{
                  color: worker.status === 'Active' ? 'var(--status-present)' : 'var(--text-muted)',
                  fontWeight: 600,
                  fontSize: '12px',
                  background: worker.status === 'Active' ? 'var(--status-present-glow)' : 'transparent',
                  padding: '2px 8px',
                  borderRadius: '12px',
                }}>{worker.status}</span>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
              <button 
                onClick={() => onUpdateWorker(worker.id, { status: worker.status === 'Active' ? 'Inactive' : 'Active' })}
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: '1px solid var(--border-card)',
                  color: 'var(--text-secondary)',
                  padding: '8px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 500,
                }}
              >
                Toggle Status
              </button>
              <button 
                onClick={() => onDeleteWorker(worker.id)}
                style={{
                  background: 'var(--status-absent-glow)',
                  border: 'none',
                  color: 'var(--status-absent)',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                }}
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Onboard Modal */}
      {showAddModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0,0,0,0.65)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          backdropFilter: 'blur(4px)'
        }}>
          <div className="glass-card" style={{ width: '90%', maxWidth: '480px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '22px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <UserPlus size={22} style={{ color: 'var(--accent)' }} /> Add Crew Member
              </h3>
              <button 
                onClick={() => !isSubmitting && setShowAddModal(false)} 
                disabled={isSubmitting} 
                style={{ 
                  background: 'transparent', 
                  border: 'none', 
                  color: 'var(--text-muted)', 
                  fontSize: '20px', 
                  cursor: isSubmitting ? 'not-allowed' : 'pointer' 
                }}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {/* Photo Input */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '50%',
                  background: 'var(--bg-app)',
                  border: '2px dashed var(--border-card-hover)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  position: 'relative',
                }}>
                  {photoBase64 ? (
                    <img src={photoBase64} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <Camera size={24} style={{ color: 'var(--text-muted)' }} />
                  )}
                </div>
                <label style={{
                  fontSize: '13px',
                  fontWeight: 500,
                  color: 'var(--accent)',
                  cursor: 'pointer',
                  border: '1px solid var(--accent)',
                  padding: '4px 12px',
                  borderRadius: '6px',
                }}>
                  Upload Photo
                  <input type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
                </label>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '6px', color: 'var(--text-secondary)' }}>Full Name</label>
                <input type="text" className="form-input" required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Ramesh Kumar" />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '6px', color: 'var(--text-secondary)' }}>Phone Number</label>
                <input type="tel" className="form-input" required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="e.g. 9876543210" />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '6px', color: 'var(--text-secondary)' }}>Role / Trade</label>
                  <select className="form-select" value={role} onChange={(e) => setRole(e.target.value)}>
                    <option value="Labor">Labor (Mazdoor)</option>
                    <option value="Mason">Mason (Rajmistri)</option>
                    <option value="Carpenter">Carpenter</option>
                    <option value="Plumber">Plumber</option>
                    <option value="Electrician">Electrician</option>
                    <option value="Supervisor">Supervisor</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '6px', color: 'var(--text-secondary)' }}>Daily Rate (₹)</label>
                  <input type="number" className="form-input" min={1} required value={dailyRate} onChange={(e) => setDailyRate(Number(e.target.value))} />
                </div>
              </div>

              <button 
                type="submit" 
                className="btn-primary" 
                style={{ marginTop: '10px', cursor: isSubmitting ? 'not-allowed' : 'pointer' }}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Onboarding...' : 'Onboard Worker'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
