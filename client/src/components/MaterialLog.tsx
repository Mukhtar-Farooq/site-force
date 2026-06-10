import React, { useState } from 'react';
import { Package, Plus, FileText, Camera } from 'lucide-react';

interface Zone {
  id: string;
  name: string;
}

interface Worker {
  id: string;
  name: string;
  role: string;
  status: string;
}

interface Material {
  id: string;
  name: string;
  supplier: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalCost: number;
  date: string;
  paymentStatus: string; // Paid, Unpaid, Partially Paid
  paidAmount: number;
  balanceDue: number;
  photoBase64?: string;
  zoneId?: string;
  paidByWorkerId?: string;
}

interface MaterialLogProps {
  materials: Material[];
  zones: Zone[];
  workers: Worker[];
  onLogMaterial: (materialData: Omit<Material, 'id' | 'totalCost' | 'balanceDue' | 'paymentStatus'>) => Promise<any>;
}

export const MaterialLog: React.FC<MaterialLogProps> = ({
  materials,
  zones,
  workers,
  onLogMaterial,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form States
  const [name, setName] = useState('');
  const [supplier, setSupplier] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [unit, setUnit] = useState('Bags');
  const [unitPrice, setUnitPrice] = useState(0);
  const [paidAmount, setPaidAmount] = useState(0);
  const [date, setDate] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  });
  const [zoneId, setZoneId] = useState('');
  const [photoBase64, setPhotoBase64] = useState<string | undefined>(undefined);
  const [paidByWorkerId, setPaidByWorkerId] = useState('');

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
    if (!name || !supplier || quantity <= 0 || unitPrice <= 0 || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onLogMaterial({
        name,
        supplier,
        quantity: Number(quantity),
        unit,
        unitPrice: Number(unitPrice),
        paidAmount: Number(paidAmount),
        date,
        zoneId: zoneId || undefined,
        photoBase64,
        paidByWorkerId: paidByWorkerId || undefined,
      });

      // Reset Form
      setName('');
      setSupplier('');
      setQuantity(1);
      setUnit('Bags');
      setUnitPrice(0);
      setPaidAmount(0);
      setZoneId('');
      setPhotoBase64(undefined);
      setPaidByWorkerId('');
      setShowAddModal(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalSpent = materials.reduce((sum, m) => sum + m.totalCost, 0);
  const totalOwed = materials.reduce((sum, m) => sum + m.balanceDue, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Title & Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '6px' }}>Material Log</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Log raw material procurements, invoice payments, and supplier balances.</p>
        </div>
        <button className="btn-primary" onClick={() => setShowAddModal(true)}>
          <Plus size={20} /> Log Procurement
        </button>
      </div>

      {/* Summary Banner */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
        <div className="glass-card" style={{ padding: '16px 24px' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: 500 }}>Total Materials Cost</p>
          <h4 style={{ fontSize: '22px', fontWeight: 700, marginTop: '2px', color: 'var(--accent-secondary)' }}>₹{totalSpent.toFixed(2)}</h4>
        </div>
        <div className="glass-card" style={{ padding: '16px 24px' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: 500 }}>Total Balance Owed</p>
          <h4 style={{ fontSize: '22px', fontWeight: 700, marginTop: '2px', color: 'var(--status-halfday)' }}>₹{totalOwed.toFixed(2)}</h4>
        </div>
        <div className="glass-card" style={{ padding: '16px 24px' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: 500 }}>Total Procurements</p>
          <h4 style={{ fontSize: '22px', fontWeight: 700, marginTop: '2px' }}>{materials.length} orders</h4>
        </div>
      </div>

      {/* Materials Table List */}
      <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <h4 style={{ fontSize: '18px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FileText size={20} style={{ color: 'var(--accent-secondary)' }} /> Procurement List
        </h4>

        {materials.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '24px' }}>No material orders logged yet.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-card)', color: 'var(--text-muted)', fontSize: '13px', fontWeight: 600 }}>
                  <th style={{ padding: '12px' }}>Date</th>
                  <th style={{ padding: '12px' }}>Material</th>
                  <th style={{ padding: '12px' }}>Supplier</th>
                  <th style={{ padding: '12px' }}>Quantity</th>
                  <th style={{ padding: '12px' }}>Status</th>
                  <th style={{ padding: '12px', textAlign: 'right' }}>Total Cost</th>
                  <th style={{ padding: '12px', textAlign: 'right' }}>Balance Due</th>
                </tr>
              </thead>
              <tbody>
                {materials.map((m) => (
                  <tr key={m.id} style={{ borderBottom: '1px solid var(--border-card)', fontSize: '14px' }}>
                    <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>{m.date}</td>
                    <td style={{ padding: '12px', fontWeight: 600 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {m.photoBase64 && (
                          <div style={{ width: '28px', height: '28px', borderRadius: '4px', overflow: 'hidden', background: '#ccc' }}>
                            <img src={m.photoBase64} alt={m.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          </div>
                        )}
                        <span>{m.name}</span>
                      </div>
                    </td>
                    <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>
                      <div>{m.supplier}</div>
                      {m.paidByWorkerId && (
                        <div style={{ fontSize: '11px', color: 'var(--accent-secondary)', marginTop: '2px', fontWeight: 500 }}>
                          Paid by: {workers.find(w => w.id === m.paidByWorkerId)?.name || 'Crew Member'}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>{m.quantity} {m.unit}</td>
                    <td style={{ padding: '12px' }}>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: 600,
                        background: 
                          m.paymentStatus === 'Paid' ? 'var(--status-present-glow)' :
                          m.paymentStatus === 'Partially Paid' ? 'var(--status-halfday-glow)' : 'var(--status-absent-glow)',
                        color:
                          m.paymentStatus === 'Paid' ? 'var(--status-present)' :
                          m.paymentStatus === 'Partially Paid' ? 'var(--status-halfday)' : 'var(--status-absent)',
                      }}>
                        {m.paymentStatus}
                      </span>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right', fontWeight: 600 }}>₹{m.totalCost.toFixed(2)}</td>
                    <td style={{
                      padding: '12px',
                      textAlign: 'right',
                      fontWeight: 600,
                      color: m.balanceDue > 0 ? 'var(--status-halfday)' : 'var(--text-secondary)'
                    }}>
                      ₹{m.balanceDue.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Procurement Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Package size={22} style={{ color: 'var(--accent-secondary)' }} /> Log Material Purchase
              </h3>
              <button 
                onClick={() => !isSubmitting && setShowAddModal(false)} 
                disabled={isSubmitting} 
                className="modal-close-btn"
                style={{ cursor: isSubmitting ? 'not-allowed' : 'pointer' }}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="modal-form">
              <div className="modal-body-scroll">
                {/* Photo Upload */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '90px',
                    height: '70px',
                    borderRadius: '6px',
                    background: 'var(--bg-app)',
                    border: '2px dashed var(--border-card-hover)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    position: 'relative',
                  }}>
                    {photoBase64 ? (
                      <img src={photoBase64} alt="Invoice Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <Camera size={20} style={{ color: 'var(--text-muted)' }} />
                    )}
                  </div>
                  <label style={{
                    fontSize: '13px',
                    fontWeight: 500,
                    color: 'var(--accent-secondary)',
                    cursor: 'pointer',
                    border: '1px solid var(--accent-secondary)',
                    padding: '4px 12px',
                    borderRadius: '6px',
                  }}>
                    Upload Invoice / Receipt Image
                    <input type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
                  </label>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '6px', color: 'var(--text-secondary)' }}>Material Name</label>
                    <input type="text" className="form-input" required placeholder="e.g. Cement Bags / Sand" value={name} onChange={(e) => setName(e.target.value)} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '6px', color: 'var(--text-secondary)' }}>Supplier / Vendor</label>
                    <input type="text" className="form-input" required placeholder="e.g. Ultratech / Local Supplier" value={supplier} onChange={(e) => setSupplier(e.target.value)} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.2fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '6px', color: 'var(--text-secondary)' }}>Quantity</label>
                    <input type="number" className="form-input" min={1} required value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '6px', color: 'var(--text-secondary)' }}>Unit</label>
                    <select className="form-select" value={unit} onChange={(e) => setUnit(e.target.value)}>
                      <option value="Bags">Bags</option>
                      <option value="Tons">Tons</option>
                      <option value="Brass">Brass</option>
                      <option value="Units">Units</option>
                      <option value="Liters">Liters</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '6px', color: 'var(--text-secondary)' }}>Unit Price (₹)</label>
                    <input type="number" className="form-input" min={0} required placeholder="Price per unit" value={unitPrice} onChange={(e) => setUnitPrice(Number(e.target.value))} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '6px', color: 'var(--text-secondary)' }}>Amount Paid (₹)</label>
                    <input type="number" className="form-input" min={0} value={paidAmount} onChange={(e) => setPaidAmount(Number(e.target.value))} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '6px', color: 'var(--text-secondary)' }}>Invoice Date</label>
                    <input type="date" className="form-input" required value={date} onChange={(e) => setDate(e.target.value)} />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '6px', color: 'var(--text-secondary)' }}>Allocate to Site Zone (Optional)</label>
                  <select className="form-select" value={zoneId} onChange={(e) => setZoneId(e.target.value)}>
                    <option value="">-- No Zone Allocation --</option>
                    {zones.map((z) => (
                      <option key={z.id} value={z.id}>{z.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '6px', color: 'var(--text-secondary)' }}>Paid By (Payer)</label>
                  <select className="form-select" value={paidByWorkerId} onChange={(e) => setPaidByWorkerId(e.target.value)}>
                    <option value="">Owner (Default)</option>
                    {workers.filter(w => w.status === 'Active').map((w) => (
                      <option key={w.id} value={w.id}>{w.name} ({w.role})</option>
                    ))}
                  </select>
                </div>

                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)', padding: '4px 0' }}>
                  Total Cost Breakdown: <strong style={{ color: 'var(--text-primary)' }}>₹{(quantity * unitPrice).toFixed(2)}</strong> (Remaining Balance: <strong style={{ color: 'var(--status-halfday)' }}>₹{(quantity * unitPrice - paidAmount).toFixed(2)}</strong>)
                </div>
              </div>

              <div className="modal-footer">
                <button 
                  type="submit" 
                  className="btn-primary" 
                  style={{ 
                    width: '100%',
                    background: 'linear-gradient(135deg, var(--accent-secondary), #0891b2)', 
                    cursor: isSubmitting ? 'not-allowed' : 'pointer' 
                  }}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Saving...' : 'Save Procurement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
