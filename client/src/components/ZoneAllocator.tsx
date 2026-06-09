import React, { useState } from 'react';
import { MapPin, Plus, FolderPlus } from 'lucide-react';

interface Zone {
  id: string;
  name: string;
  description?: string;
}

interface ZoneAllocatorProps {
  zones: Zone[];
  onCreateZone: (zoneData: Omit<Zone, 'id'>) => Promise<any>;
}

export const ZoneAllocator: React.FC<ZoneAllocatorProps> = ({
  zones,
  onCreateZone,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onCreateZone({ name, description });

      setName('');
      setDescription('');
      setShowAddModal(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Title & Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '6px' }}>Site Zones</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Partition your construction site into logical zones (e.g. Blocks, Floors) to organize allocations.</p>
        </div>
        <button className="btn-primary" onClick={() => setShowAddModal(true)}>
          <Plus size={20} /> Create New Zone
        </button>
      </div>

      {/* Zones list grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
        {zones.map((zone) => (
          <div className="glass-card" key={zone.id} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ background: 'var(--accent-glow)', color: 'var(--accent)', padding: '10px', borderRadius: '10px' }}>
                <MapPin size={22} />
              </div>
              <h4 style={{ fontSize: '18px', fontWeight: 600 }}>{zone.name}</h4>
            </div>
            
            {zone.description && (
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1.5, marginTop: '4px' }}>
                {zone.description}
              </p>
            )}

            <div style={{ borderTop: '1px solid var(--border-card)', paddingTop: '12px', marginTop: '8px', fontSize: '12px', color: 'var(--text-muted)' }}>
              Zone ID: <span style={{ fontFamily: 'monospace' }}>{zone.id.substring(0, 13)}...</span>
            </div>
          </div>
        ))}

        {zones.length === 0 && (
          <div className="glass-card" style={{ gridColumn: '1 / -1', padding: '48px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            No site zones defined yet. Click "Create New Zone" to define construction boundaries.
          </div>
        )}
      </div>

      {/* Add Zone Modal */}
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
          <div className="glass-card" style={{ width: '90%', maxWidth: '440px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '20px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FolderPlus size={22} style={{ color: 'var(--accent)' }} /> Create Construction Zone
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
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '6px', color: 'var(--text-secondary)' }}>Zone Name</label>
                <input type="text" className="form-input" required placeholder="e.g. Block A - Foundation / Floor 1 Plaster" value={name} onChange={(e) => setName(e.target.value)} />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '6px', color: 'var(--text-secondary)' }}>Description</label>
                <textarea 
                  className="form-input" 
                  rows={3} 
                  style={{ resize: 'none' }}
                  placeholder="e.g. Area designated for raw excavation and basement columns"
                  value={description} 
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <button 
                type="submit" 
                className="btn-primary" 
                style={{ marginTop: '8px', cursor: isSubmitting ? 'not-allowed' : 'pointer' }}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Saving...' : 'Save Zone'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
