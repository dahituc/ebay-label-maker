import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { db } from '../db/database.js';
import { Printer, List, LayoutGrid, ChevronLeft, Edit2 } from 'lucide-react';

export default function Labels() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const batchTimestamp = searchParams.get('batch');

  // If a specific batch is requested, filter to that batch only; otherwise show all valid
  const validOrders = useLiveQuery(() => {
    if (batchTimestamp) {
      return db.orders
        .filter(order => order.status === 'valid' && order.batchTimestamp === batchTimestamp)
        .toArray();
    }
    return db.orders.filter(order => order.status === 'valid').toArray();
  }, [batchTimestamp]);

  const [viewMode, setViewMode] = useState('labels'); // 'labels' | 'table'
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(null);

  const handleEditClick = (order) => {
    setEditingId(order.id);
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
    await db.orders.update(editingId, {
      ...editForm,
      status: 'valid', // Ensure it stays/becomes valid
      error: null
    });
    setEditingId(null);
    setEditForm(null);
  };

  // Determine batch display info
  const batchInfo = React.useMemo(() => {
    if (!validOrders || validOrders.length === 0) return 'No orders';
    if (batchTimestamp) {
      const filename = validOrders[0]?.batchFilename;
      const time = new Date(batchTimestamp).toLocaleString();
      return `${filename || 'Unknown'} — ${time}`;
    }
    const files = new Set(validOrders.map(o => o.batchFilename).filter(Boolean));
    if (files.size === 0) return 'Active Session';
    if (files.size === 1) return [...files][0];
    return `${files.size} CSVs combined`;
  }, [validOrders, batchTimestamp]);

  if (validOrders === undefined) return <div style={{ padding: '24px' }}>Loading...</div>;

  return (
    <div className="animate-fade-in labels-page">
      <div className="print-hide" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          {batchTimestamp && (
            <button 
              onClick={() => navigate('/dashboard')}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '8px', fontWeight: 500, fontSize: '0.9rem', padding: 0 }}
            >
              <ChevronLeft size={16} /> Back to Dashboard
            </button>
          )}
          <h1>Print Labels</h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Batch: <strong>{batchInfo}</strong><br />
            {validOrders.length} valid orders ready for printing.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '16px' }}>
          <div style={{ display: 'flex', background: 'var(--bg-secondary)', borderRadius: 'var(--radius)', padding: '4px' }}>
            <button 
              onClick={() => setViewMode('labels')}
              style={{ padding: '8px 16px', borderRadius: '4px', background: viewMode === 'labels' ? 'var(--bg-primary)' : 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', color: viewMode === 'labels' ? 'var(--text-primary)' : 'var(--text-secondary)', boxShadow: viewMode === 'labels' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}
            >
              <LayoutGrid size={16} /> Labels
            </button>
            <button 
              onClick={() => setViewMode('table')}
              style={{ padding: '8px 16px', borderRadius: '4px', background: viewMode === 'table' ? 'var(--bg-primary)' : 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', color: viewMode === 'table' ? 'var(--text-primary)' : 'var(--text-secondary)', boxShadow: viewMode === 'table' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}
            >
              <List size={16} /> List View
            </button>
          </div>

          <button 
            className="btn btn-primary" 
            style={{ display: 'flex', gap: '8px', alignItems: 'center', padding: '10px 24px', fontSize: '1.1rem' }} 
            onClick={() => window.print()}
            disabled={validOrders.length === 0 || viewMode === 'table'}
          >
            <Printer size={20} /> Print {validOrders.length} Labels
          </button>
        </div>
      </div>
      
      {viewMode === 'labels' ? (
        <div className="labels-grid">
          {validOrders.length === 0 ? (
            <div className="print-hide card" style={{ textAlign: 'center', padding: '48px', color: 'var(--text-secondary)' }}>
              No valid orders found. Go to the Dashboard to upload and process a CSV.
            </div>
          ) : (
            validOrders.map(order => {
              const isEditing = editingId === order.id;
              
              return (
                <div key={order.id} className={`label-item ${isEditing ? 'is-editing' : ''}`} style={{ position: 'relative' }}>
                  {!isEditing && (
                    <button 
                      className="print-hide"
                      onClick={() => handleEditClick(order)}
                      style={{ position: 'absolute', top: '4px', right: '4px', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '4px', padding: '4px', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', opacity: 0.7 }}
                      title="Edit label"
                    >
                      <Edit2 size={12} />
                    </button>
                  )}

                  {isEditing ? (
                    <div className="print-hide" style={{ display: 'flex', flexDirection: 'column', gap: '4px', height: '100%', fontSize: '10px' }}>
                      <input type="text" name="name" value={editForm.name} onChange={handleInputChange} placeholder="Name" style={{ padding: '2px 4px', fontSize: '10px', border: '1px solid var(--border)', borderRadius: '2px' }} />
                      <input type="text" name="address1" value={editForm.address1} onChange={handleInputChange} placeholder="Addr 1" style={{ padding: '2px 4px', fontSize: '10px', border: '1px solid var(--border)', borderRadius: '2px' }} />
                      <input type="text" name="address2" value={editForm.address2 || ''} onChange={handleInputChange} placeholder="Addr 2" style={{ padding: '2px 4px', fontSize: '10px', border: '1px solid var(--border)', borderRadius: '2px' }} />
                      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '2px' }}>
                        <input type="text" name="city" value={editForm.city} onChange={handleInputChange} placeholder="City" style={{ padding: '2px 4px', fontSize: '10px', border: '1px solid var(--border)', borderRadius: '2px', width: '100%' }} />
                        <input type="text" name="state" value={editForm.state} onChange={handleInputChange} placeholder="State" style={{ padding: '2px 4px', fontSize: '10px', border: '1px solid var(--border)', borderRadius: '2px', width: '100%' }} />
                        <input type="text" name="postcode" value={editForm.postcode} onChange={handleInputChange} placeholder="PC" style={{ padding: '2px 4px', fontSize: '10px', border: '1px solid var(--border)', borderRadius: '2px', width: '100%' }} />
                      </div>
                      <div style={{ display: 'flex', gap: '4px', marginTop: 'auto' }}>
                        <button onClick={handleSave} style={{ flex: 1, background: 'var(--success)', color: 'white', border: 'none', borderRadius: '2px', padding: '2px', fontSize: '10px', cursor: 'pointer' }}>Save</button>
                        <button onClick={handleCancelEdit} style={{ flex: 1, background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '2px', padding: '2px', fontSize: '10px', cursor: 'pointer' }}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <span className="label-to">To</span>
                      <strong className="label-name">{order.name} <span className="label-orderID">({order.orderId})</span></strong>
                      <span className="label-address">{order.address1},</span>
                      <span className="label-address">{order.address2 ? `${order.address2}` : ''}, {order.city} {order.state} {order.postcode}</span>
                      {order.country && order.country.toLowerCase() !== 'australia' && (
                        <span className="label-address">{order.country}</span>
                      )}
                      <div style={{ flex: 1 }}></div>
                      <span className="label-sku" dangerouslySetInnerHTML={{ __html: order.itemsSummary }} />
                      {!!order.buyerNote && (<span className="label-buyer-note"> ** {order.buyerNote} **</span>) }
                    </>
                  )}
                </div>
              );
            })
          )}
        </div>
      ) : (
        <div className="card print-hide" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border)' }}>
                <th style={{ padding: '12px' }}>Order ID</th>
                <th style={{ padding: '12px' }}>Name</th>
                <th style={{ padding: '12px' }}>Address</th>
                <th style={{ padding: '12px' }}>Items</th>
                <th style={{ padding: '12px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {validOrders.map(order => {
                const isEditing = editingId === order.id;
                return (
                  <tr key={order.id} style={{ borderBottom: '1px solid var(--border)', background: isEditing ? 'rgba(59, 130, 246, 0.05)' : 'transparent' }}>
                    <td style={{ padding: '12px' }}>{order.orderId}</td>
                    <td style={{ padding: '12px' }}>
                      {isEditing ? (
                        <input type="text" name="name" value={editForm.name} onChange={handleInputChange} style={{ width: '100%', padding: '4px', fontSize: '0.9rem' }} />
                      ) : order.name}
                    </td>
                    <td style={{ padding: '12px' }}>
                      {isEditing ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <input type="text" name="address1" value={editForm.address1} onChange={handleInputChange} style={{ width: '100%', padding: '4px', fontSize: '0.9rem' }} />
                          <input type="text" name="address2" value={editForm.address2 || ''} onChange={handleInputChange} style={{ width: '100%', padding: '4px', fontSize: '0.9rem' }} />
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <input type="text" name="city" value={editForm.city} onChange={handleInputChange} style={{ flex: 2, padding: '4px', fontSize: '0.9rem' }} />
                            <input type="text" name="state" value={editForm.state} onChange={handleInputChange} style={{ flex: 1, padding: '4px', fontSize: '0.9rem' }} />
                            <input type="text" name="postcode" value={editForm.postcode} onChange={handleInputChange} style={{ flex: 1, padding: '4px', fontSize: '0.9rem' }} />
                          </div>
                        </div>
                      ) : (
                        <>
                          <span className="label-address">{order.address1},</span>
                          <span className="label-address">{order.address2 ? `${order.address2}` : ''}, {order.city} {order.state} {order.postcode}</span>
                        </>
                      )}
                    </td>
                    <td style={{ padding: '12px', maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      <span className="label-sku" dangerouslySetInnerHTML={{ __html: order.itemsSummary }} />
                      {!!order.buyerNote && (<span className="label-buyer-note"> ** {order.buyerNote} **</span>) }
                    </td>
                    <td style={{ padding: '12px' }}>
                      {isEditing ? (
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button onClick={handleSave} style={{ padding: '4px 8px', background: 'var(--success)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Save</button>
                          <button onClick={handleCancelEdit} style={{ padding: '4px 8px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '4px', cursor: 'pointer' }}>Cancel</button>
                        </div>
                      ) : (
                        <button onClick={() => handleEditClick(order)} style={{ padding: '6px', background: 'transparent', border: '1px solid var(--border)', borderRadius: '4px', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                          <Edit2 size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
