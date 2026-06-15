import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { db } from '../db/database.js';
import { Printer, List, LayoutGrid, ChevronLeft, Edit2, CheckCircle, MapPin, AlertCircle } from 'lucide-react';
import { splitLabel, renderSingleLabelHtmlContent, printLabels } from '../utils/labelPrinter';

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

  // Synchronously compute printable labels (splitting overflows using temporary DOM measurement)
  const printableLabels = useMemo(() => {
    if (!validOrders) return [];
    const labels = [];
    for (const order of validOrders) {
      labels.push(...splitLabel(order));
    }
    return labels;
  }, [validOrders]);

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

  const handleToggleAddress = async (order) => {
    await db.orders.update(order.id, {
      useGeoAddress: !order.useGeoAddress
    });
  };

  const buildAddressQuery = (order) => {
    if (!order) return '';
    return [order.address1, order.address2, order.city, order.state, order.postcode, order.country]
      .filter(Boolean)
      .join(', ');
  };

  const openInGoogleMaps = (order) => {
    const query = buildAddressQuery(order);
    if (!query) return;
    window.open(
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`,
      '_blank',
      'noopener,noreferrer'
    );
  };

  // Determine batch display info
  const batchInfo = useMemo(() => {
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

  if (validOrders === undefined) return (
    <div className="loading-state" style={{ height: '50vh' }}>
      <div className="spinner spin"></div>
      <p style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Loading orders...</p>
    </div>
  );

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
            style={{ display: 'flex', gap: '8px', alignItems: 'center', padding: '10px 24px', fontSize: '1.1rem', position: 'relative' }} 
            onClick={() => printLabels(validOrders)}
            disabled={!validOrders || validOrders.length === 0 || viewMode === 'table'}
          >
            <Printer size={20} /> 
            Print {validOrders?.length ?? 0} Labels
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
            printableLabels.map(order => {
              const isEditing = editingId === order.id;
              
              return (
                <div key={order.labelKey} className={`label-item ${isEditing ? 'is-editing' : ''}`} style={{ position: 'relative' }}>
                  {!isEditing ? (
                    <>
                      <div className="label-actions print-hide">
                        {order.geoConfidence >= 0.7 && (
                          <div className="verified-badge">
                            <CheckCircle size={10} /> Verified ({(order.geoConfidence * 100).toFixed(0)}%)
                          </div>
                        )}
                        {order.geoFormatted && order.geoConfidence >= 0.7 && (
                          <button 
                            className="address-toggle-btn"
                            onClick={() => handleToggleAddress(order)}
                            title={order.useGeoAddress ? "Switch to CSV Address" : "Switch to API Formatted Address"}
                          >
                            <LayoutGrid size={10} /> {order.useGeoAddress ? "CSV" : "API"}
                          </button>
                        )}
                        <button 
                          className="address-toggle-btn"
                          onClick={() => openInGoogleMaps(order)}
                          title="Open address in Google Maps"
                          style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                          <MapPin size={10} /> Map
                        </button>
                        <button 
                          className="edit-label-btn"
                          onClick={() => handleEditClick(order)}
                          title="Edit label"
                        >
                          <Edit2 size={12} />
                        </button>
                      </div>
                      <div dangerouslySetInnerHTML={{ __html: renderSingleLabelHtmlContent(order) }} style={{ display: 'contents' }} />
                    </>
                  ) : (
                    <div className="print-hide" style={{ display: 'flex', flexDirection: 'column', gap: '4px', height: '100%', fontSize: '10px' }}>
                      <input type="text" name="name" value={editForm.name} onChange={handleInputChange} placeholder="Name" style={{ padding: '4px 6px', fontSize: '10px', border: '1px solid var(--border)', borderRadius: '4px', background: 'var(--bg-primary)', color: 'var(--text-primary)' }} />
                      <input type="text" name="address1" value={editForm.address1} onChange={handleInputChange} placeholder="Addr 1" style={{ padding: '4px 6px', fontSize: '10px', border: '1px solid var(--border)', borderRadius: '4px', background: 'var(--bg-primary)', color: 'var(--text-primary)' }} />
                      <input type="text" name="address2" value={editForm.address2 || ''} onChange={handleInputChange} placeholder="Addr 2" style={{ padding: '4px 6px', fontSize: '10px', border: '1px solid var(--border)', borderRadius: '4px', background: 'var(--bg-primary)', color: 'var(--text-primary)' }} />
                      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '4px' }}>
                        <input type="text" name="city" value={editForm.city} onChange={handleInputChange} placeholder="City" style={{ padding: '4px 6px', fontSize: '10px', border: '1px solid var(--border)', borderRadius: '4px', background: 'var(--bg-primary)', color: 'var(--text-primary)', width: '100%' }} />
                        <input type="text" name="state" value={editForm.state} onChange={handleInputChange} placeholder="State" style={{ padding: '4px 6px', fontSize: '10px', border: '1px solid var(--border)', borderRadius: '4px', background: 'var(--bg-primary)', color: 'var(--text-primary)', width: '100%' }} />
                        <input type="text" name="postcode" value={editForm.postcode} onChange={handleInputChange} placeholder="PC" style={{ padding: '4px 6px', fontSize: '10px', border: '1px solid var(--border)', borderRadius: '4px', background: 'var(--bg-primary)', color: 'var(--text-primary)', width: '100%' }} />
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '4px', alignItems: 'center' }}>
                        <input type="text" name="phone" value={editForm.phone || ''} onChange={handleInputChange} placeholder="Mobile" style={{ padding: '4px 6px', fontSize: '10px', border: '1px solid var(--border)', borderRadius: '4px', background: 'var(--bg-primary)', color: 'var(--text-primary)', width: '100%' }} />
                        <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '9px', cursor: 'pointer', color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                          <input 
                            type="checkbox" 
                            name="showPhoneOnLabel" 
                            checked={!!editForm.showPhoneOnLabel} 
                            onChange={(e) => setEditForm(prev => ({ ...prev, showPhoneOnLabel: e.target.checked }))} 
                            style={{ cursor: 'pointer', width: '12px', height: '12px' }}
                          />
                          Show phone
                        </label>
                      </div>
                      <div style={{ display: 'flex', gap: '6px', marginTop: 'auto', paddingTop: '4px' }}>
                        <button
                          type="button"
                          onClick={() => openInGoogleMaps(editForm)}
                          style={{ flex: 1, background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: '4px', padding: '6px 0', fontSize: '11px', fontWeight: 600, cursor: 'pointer', transition: 'var(--transition)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                        >
                          <MapPin size={12} />
                          Open in Maps
                        </button>
                        <button 
                          onClick={handleSave} 
                          style={{ flex: 1, background: 'var(--success)', color: 'white', border: 'none', borderRadius: '4px', padding: '6px 0', fontSize: '11px', fontWeight: 600, cursor: 'pointer', transition: 'var(--transition)' }}
                          onMouseOver={(e) => e.currentTarget.style.filter = 'brightness(1.1)'}
                          onMouseOut={(e) => e.currentTarget.style.filter = 'none'}
                        >
                          Save
                        </button>
                        <button 
                          onClick={handleCancelEdit} 
                          style={{ flex: 1, background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '4px', padding: '6px 0', fontSize: '11px', fontWeight: 600, cursor: 'pointer', transition: 'var(--transition)' }}
                          onMouseOver={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'}
                          onMouseOut={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
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
                      ) : (
                        <>
                          {order.name}
                          {order.phone && order.showPhoneOnLabel && (
                            <span
                              className="label-phone"
                              style={{
                                display: 'block',
                                marginTop: '2px',
                                fontSize: '11px',
                                fontWeight: 'normal',
                                color: 'var(--text-primary)',
                              }}
                            >
                              {order.phone}
                            </span>
                          )}
                        </>
                      )}
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
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px' }}>
                            <input type="text" name="phone" value={editForm.phone || ''} onChange={handleInputChange} placeholder="Mobile Number" style={{ flex: 1, padding: '4px', fontSize: '0.85rem' }} />
                            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                              <input 
                                type="checkbox" 
                                name="showPhoneOnLabel" 
                                checked={!!editForm.showPhoneOnLabel} 
                                onChange={(e) => setEditForm(prev => ({ ...prev, showPhoneOnLabel: e.target.checked }))} 
                                style={{ cursor: 'pointer' }}
                              />
                              Show on label
                            </label>
                          </div>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          {order.useGeoAddress && order.geoFormatted ? (
                            <span style={{ fontSize: '0.85rem' }}>{order.geoFormatted} <span style={{ color: 'var(--success)', fontSize: '0.7rem' }}>(API)</span></span>
                          ) : (
                            <>
                              <span style={{ fontSize: '0.85rem' }}>{order.address1},</span>
                              <span className="label-address">{order.address2 ? `${order.address2}` : ''}, {order.city} {order.state} {order.postcode}</span>
                            </>
                          )}
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            {order.geoConfidence > 0 && (
                              <span style={{ fontSize: '0.65rem', color: order.geoConfidence >= 0.7 ? 'var(--success)' : 'var(--warning)', display: 'flex', alignItems: 'center', gap: '2px', fontWeight: 600 }}>
                                {order.geoConfidence >= 0.7 ? <CheckCircle size={10} /> : <AlertCircle size={10} />}
                                Conf: {(order.geoConfidence * 100).toFixed(0)}%
                              </span>
                            )}
                            {order.geoFormatted && order.geoConfidence >= 0.7 && (
                              <button 
                                className="print-hide"
                                onClick={() => handleToggleAddress(order)}
                                style={{ alignSelf: 'flex-start', fontSize: '0.7rem', padding: '2px 6px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '4px', cursor: 'pointer', color: 'var(--accent)' }}
                              >
                                {order.useGeoAddress ? "Switch to CSV" : "Switch to API Formatted"}
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '12px', maxWidth: '300px' }}>
                      <div className="label-sku" style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 700, fontSize: '0.75rem', color: 'var(--text-primary)', marginBottom: '2px' }}>
                          TOTAL: {order.items?.reduce((acc, i) => acc + i.quantity, 0) || 0} ITEMS
                        </div>
                        <span dangerouslySetInnerHTML={{ __html: order.itemsSummary }} />
                        {!!order.buyerNote && (<div className="label-buyer-note" style={{ textAlign: 'right', marginTop: '4px' }}> ** {order.buyerNote} **</div>) }
                      </div>
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
