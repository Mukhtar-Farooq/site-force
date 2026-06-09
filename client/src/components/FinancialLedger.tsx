import React, { useState, useEffect } from 'react';
import { DollarSign, Wallet, FileText, ArrowUpRight, ArrowDownLeft, Plus } from 'lucide-react';

interface Worker {
  id: string;
  name: string;
  role: string;
  dailyRate: number;
}

interface Transaction {
  id: string;
  workerId: string;
  type: string; // Wage, Advance, Settlement
  amount: number;
  date: string;
  notes?: string;
}

interface Ledger {
  worker: Worker;
  earned: number;
  advances: number;
  settled: number;
  balance: number;
  transactions: Transaction[];
}

interface FinancialLedgerProps {
  ledgers: Ledger[];
  onLogTransaction: (data: {
    workerId: string;
    type: string;
    amount: number;
    date: string;
    notes?: string;
  }) => Promise<any>;
}

export const FinancialLedger: React.FC<FinancialLedgerProps> = ({
  ledgers,
  onLogTransaction,
}) => {
  const [selectedWorkerId, setSelectedWorkerId] = useState<string>('');
  const [showLogModal, setShowLogModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form States
  const [amount, setAmount] = useState<number>(0);
  const [type, setType] = useState('Advance');
  const [date, setDate] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  });
  const [notes, setNotes] = useState('');

  // Automatically select first worker if available
  useEffect(() => {
    if (ledgers.length > 0 && !selectedWorkerId) {
      setSelectedWorkerId(ledgers[0].worker.id);
    }
  }, [ledgers]);

  const activeLedger = ledgers.find((l) => l.worker.id === selectedWorkerId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWorkerId || amount <= 0 || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onLogTransaction({
        workerId: selectedWorkerId,
        type,
        amount: Number(amount),
        date,
        notes,
      });

      setAmount(0);
      setNotes('');
      setShowLogModal(false);
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
          <h2 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '6px' }}>Finance Ledger</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Log advances, settle worker dues, and track site expenditures.</p>
        </div>
        <button 
          onClick={() => setShowLogModal(true)} 
          disabled={ledgers.length === 0}
          className="btn-primary"
        >
          <Plus size={20} /> Log Payment / Advance
        </button>
      </div>

      {/* Select Worker Bar */}
      <div className="glass-card" style={{ padding: '16px', display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontWeight: 600, fontSize: '15px' }}>Select Crew Member:</span>
        <select 
          className="form-select" 
          style={{ maxWidth: '280px' }}
          value={selectedWorkerId}
          onChange={(e) => setSelectedWorkerId(e.target.value)}
        >
          <option value="" disabled>-- Select Worker --</option>
          {ledgers.map((l) => (
            <option key={l.worker.id} value={l.worker.id}>{l.worker.name} ({l.worker.role})</option>
          ))}
        </select>
      </div>

      {activeLedger ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Financial summary Cards */}
          <div className="dashboard-grid">
            
            {/* Earned Wages */}
            <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '20px' }}>
              <div style={{ background: 'rgba(99, 102, 241, 0.15)', color: 'var(--accent)', padding: '10px', borderRadius: '10px' }}>
                <Wallet size={22} />
              </div>
              <div>
                <p style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: 500 }}>Total Wages Earned</p>
                <h4 style={{ fontSize: '20px', fontWeight: 700, marginTop: '2px' }}>₹{activeLedger.earned.toFixed(2)}</h4>
              </div>
            </div>

            {/* Advances Logged */}
            <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '20px' }}>
              <div style={{ background: 'rgba(239, 68, 68, 0.15)', color: 'var(--status-absent)', padding: '10px', borderRadius: '10px' }}>
                <ArrowUpRight size={22} />
              </div>
              <div>
                <p style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: 500 }}>Advances Issued</p>
                <h4 style={{ fontSize: '20px', fontWeight: 700, marginTop: '2px' }}>-₹{activeLedger.advances.toFixed(2)}</h4>
              </div>
            </div>

            {/* Settled Logged */}
            <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '20px' }}>
              <div style={{ background: 'rgba(16, 185, 129, 0.15)', color: 'var(--status-present)', padding: '10px', borderRadius: '10px' }}>
                <ArrowDownLeft size={22} />
              </div>
              <div>
                <p style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: 500 }}>Payments Settled</p>
                <h4 style={{ fontSize: '20px', fontWeight: 700, marginTop: '2px' }}>-₹{activeLedger.settled.toFixed(2)}</h4>
              </div>
            </div>

            {/* Remaining Balance Due */}
            <div className="glass-card" style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              padding: '20px',
              border: activeLedger.balance > 0 ? '1px solid var(--status-halfday)' : '1px solid var(--border-card)'
            }}>
              <div style={{
                background: activeLedger.balance > 0 ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255,255,255,0.05)',
                color: activeLedger.balance > 0 ? 'var(--status-halfday)' : 'var(--text-muted)',
                padding: '10px',
                borderRadius: '10px'
              }}>
                <DollarSign size={22} />
              </div>
              <div>
                <p style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: 500 }}>Outstanding Balance</p>
                <h4 style={{ fontSize: '20px', fontWeight: 700, marginTop: '2px', color: activeLedger.balance > 0 ? 'var(--status-halfday)' : 'var(--text-primary)' }}>
                  ₹{activeLedger.balance.toFixed(2)}
                </h4>
              </div>
            </div>

          </div>

          {/* Transaction History Log Table */}
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h4 style={{ fontSize: '18px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText size={20} style={{ color: 'var(--accent)' }} /> Transaction Ledger
            </h4>

            {activeLedger.transactions.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '24px' }}>No transactions recorded yet.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '480px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-card)', color: 'var(--text-muted)', fontSize: '13px', fontWeight: 600 }}>
                      <th style={{ padding: '12px' }}>Date</th>
                      <th style={{ padding: '12px' }}>Transaction Type</th>
                      <th style={{ padding: '12px' }}>Description</th>
                      <th style={{ padding: '12px', textAlign: 'right' }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeLedger.transactions.map((tx) => (
                      <tr key={tx.id} style={{ borderBottom: '1px solid var(--border-card)', fontSize: '14px' }}>
                        <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>{tx.date}</td>
                        <td style={{ padding: '12px' }}>
                          <span style={{
                            padding: '2px 8px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: 600,
                            background: 
                              tx.type === 'Wage' ? 'rgba(99, 102, 241, 0.15)' :
                              tx.type === 'Advance' ? 'var(--status-absent-glow)' : 'var(--status-present-glow)',
                            color:
                              tx.type === 'Wage' ? 'var(--accent)' :
                              tx.type === 'Advance' ? 'var(--status-absent)' : 'var(--status-present)',
                          }}>
                            {tx.type}
                          </span>
                        </td>
                        <td style={{ padding: '12px', color: 'var(--text-secondary)', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {tx.notes || 'N/A'}
                        </td>
                        <td style={{
                          padding: '12px',
                          textAlign: 'right',
                          fontWeight: 600,
                          color:
                            tx.type === 'Wage' ? 'var(--text-primary)' :
                            tx.type === 'Advance' ? 'var(--status-absent)' : 'var(--status-present)'
                        }}>
                          {tx.type === 'Wage' ? '' : tx.type === 'Advance' ? '-' : '+'}₹{tx.amount.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      ) : (
        <div className="glass-card" style={{ padding: '48px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          Please add crew members to see ledgers.
        </div>
      )}

      {/* Log Transaction Modal */}
      {showLogModal && (
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
              <h3 style={{ fontSize: '20px', fontWeight: 700 }}>Log Financial Activity</h3>
              <button 
                onClick={() => !isSubmitting && setShowLogModal(false)} 
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
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '6px', color: 'var(--text-secondary)' }}>Select Worker</label>
                <select 
                  className="form-select" 
                  required
                  value={selectedWorkerId}
                  onChange={(e) => setSelectedWorkerId(e.target.value)}
                >
                  {ledgers.map((l) => (
                    <option key={l.worker.id} value={l.worker.id}>{l.worker.name} ({l.worker.role})</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '6px', color: 'var(--text-secondary)' }}>Transaction Type</label>
                  <select className="form-select" value={type} onChange={(e) => setType(e.target.value)}>
                    <option value="Advance">Advance (Paid Out)</option>
                    <option value="Settlement">Settlement (Clearing Dues)</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '6px', color: 'var(--text-secondary)' }}>Amount (₹)</label>
                  <input 
                    type="number" 
                    className="form-input" 
                    min={1} 
                    required 
                    value={amount} 
                    onChange={(e) => setAmount(Number(e.target.value))} 
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '6px', color: 'var(--text-secondary)' }}>Date</label>
                <input 
                  type="date" 
                  className="form-input" 
                  required 
                  value={date} 
                  onChange={(e) => setDate(e.target.value)} 
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '6px', color: 'var(--text-secondary)' }}>Notes / Description</label>
                <textarea 
                  className="form-input" 
                  rows={3} 
                  style={{ resize: 'none' }}
                  placeholder="e.g. Paid weekly cash advance / clear settlement dues"
                  value={notes} 
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <button 
                type="submit" 
                className="btn-primary" 
                style={{ marginTop: '8px', cursor: isSubmitting ? 'not-allowed' : 'pointer' }}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Saving...' : 'Save Transaction'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
