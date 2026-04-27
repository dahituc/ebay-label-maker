import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { db } from '../db/database.js';
import { validatePostcode } from '../services/addressValidator.js';
import { Edit2, Check, X, AlertCircle, ChevronLeft } from 'lucide-react';

export default function Review() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const batchTimestamp = searchParams.get('batch');

  // If a specific batch is requested, filter to that batch only
  const invalidOrders = useLiveQuery(() => {
    if (batchTimestamp) {
      return db.orders
        .filter(order => order.status !== 'valid' && order.status !== 'manual' && order.batchTimestamp === batchTimestamp)
        .toArray();
    }
    return db.orders.filter(order => order.status !== 'valid' && order.status !== 'manual').toArray();
  }, [batchTimestamp]);

  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(null);

  // Determine batch display info (must be above early return to preserve hook order)
  const batchInfo = React.useMemo(() => {
    if (!batchTimestamp) return null;
    if (!invalidOrders || invalidOrders.length === 0) return batchTimestamp;
    const filename = invalidOrders[0]?.batchFilename;
    return filename || 'Unknown CSV';
  }, [invalidOrders, batchTimestamp]);

  if (invalidOrders === undefined) return <div style={{ padding: '24px' }}>Loading...</div>;

  const handleEditClick = (order) => {
    setEditingId(order.orderId);
    setEditForm({ ...order });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm(null);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    // Re-run simple local validation as a hint, but we allow forced saving
    const isValid = validatePostcode(editForm.state, editForm.postcode);
    
    // Save updated order to DB, forcing valid status if they manually edit and submit
    await db.orders.update(editingId, {
      ...editForm,
      status: 'valid', // Mark as valid once manually reviewed and saved
      error: null // clear error
    });

    setEditingId(null);
    setEditForm(null);
  };

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          {batchTimestamp && (
            <button 
              onClick={() => navigate('/dashboard')}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '8px', fontWeight: 500, fontSize: '0.9rem', padding: 0 }}
            >
              <ChevronLeft size={16} /> Back to Dashboard
            </button>
          )}
          <h1 style={{ marginBottom: '4px' }}>Review Issues</h1>
          {batchInfo && (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Batch: <strong>{batchInfo}</strong>
            </p>
          )}
        </div>
        {invalidOrders.length > 0 && (
          <div style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', padding: '8px 16px', borderRadius: 'var(--radius-sm)', fontWeight: 600 }}>
            {invalidOrders.length} Records Require Attention
          </div>
        )}
      </div>
      
      <div className="card">
        <h2 style={{ marginBottom: '8px' }}>Unverified Addresses</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
          Addresses that failed local validation and API standardization. Please review and edit them to correct any formatting or spelling mistakes before printing.
        </p>

        {invalidOrders.length === 0 ? (
          <div style={{ padding: '48px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius)', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <Check size={48} color="#22c55e" style={{ margin: '0 auto 16px', opacity: 0.5 }} />
            <div style={{ fontSize: '1.2rem', fontWeight: 500 }}>No unverified addresses found.</div>
            <p>Great job! All orders are ready for label generation.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {invalidOrders.map(order => {
              const isEditing = editingId === order.orderId;
              
              return (
                <div key={order.orderId} style={{ 
                  border: `1px solid ${isEditing ? 'var(--primary)' : 'var(--border)'}`, 
                  borderRadius: 'var(--radius-sm)', 
                  padding: '16px',
                  background: isEditing ? 'rgba(59, 130, 246, 0.05)' : 'transparent',
                  transition: 'var(--transition)'
                }}>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '1.1rem', marginBottom: '4px' }}>Order {order.orderId}</div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Buyer: {order.buyerUsername}</div>
                    </div>
                    
                    {!isEditing && (
                      <button className="btn btn-primary" onClick={() => handleEditClick(order)} style={{ padding: '8px 16px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <Edit2 size={16} /> Edit
                      </button>
                    )}
                  </div>

                  {order.error && !isEditing && (
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '8px 12px', borderRadius: '4px', marginBottom: '16px', fontSize: '0.9rem' }}>
                      <AlertCircle size={16} />
                      {order.error}
                    </div>
                  )}

                  {isEditing ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div>
                          <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.9rem' }}>Name</label>
                          <input type="text" name="name" value={editForm.name} onChange={handleInputChange} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }} />
                        </div>
                        <div>
                          <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.9rem' }}>Address 1</label>
                          <input type="text" name="address1" value={editForm.address1} onChange={handleInputChange} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }} />
                        </div>
                        <div>
                          <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.9rem' }}>Address 2</label>
                          <input type="text" name="address2" value={editForm.address2 || ''} onChange={handleInputChange} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }} />
                        </div>
                        <div>
                          <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.9rem' }}>City / Suburb</label>
                          <input type="text" name="city" value={editForm.city} onChange={handleInputChange} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }} />
                        </div>
                        <div>
                          <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.9rem' }}>State</label>
                          <input type="text" name="state" value={editForm.state} onChange={handleInputChange} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }} />
                        </div>
                        <div>
                          <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.9rem' }}>Postcode</label>
                          <input type="text" name="postcode" value={editForm.postcode} onChange={handleInputChange} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }} />
                        </div>
                      </div>
                      
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
                        <button className="btn" onClick={handleCancelEdit} style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', display: 'flex', gap: '4px', alignItems: 'center', padding: '8px 16px', cursor: 'pointer', borderRadius: 'var(--radius-sm)', fontWeight: 600, color: 'var(--text-primary)' }}>
                          <X size={16} /> Cancel
                        </button>
                        <button className="btn btn-primary" onClick={handleSave} style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                          <Check size={16} /> Save & Mark Valid
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ background: 'var(--bg-secondary)', padding: '12px', borderRadius: '4px', fontFamily: 'monospace', fontSize: '0.9rem' }}>
                      {order.name}<br />
                      {order.address1}{order.address2 ? `, ${order.address2}` : ''}<br />
                      {order.city}, {order.state} {order.postcode}<br />
                      {order.country}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
