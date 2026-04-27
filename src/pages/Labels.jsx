import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { db } from '../db/database.js';
import { Printer, List, LayoutGrid, ChevronLeft } from 'lucide-react';

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

  // Determine batch display info (must be above early return to preserve hook order)
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
            validOrders.map(order => (
              <div key={order.orderId} className="label-item">
                <span className="label-to">To</span>
                <strong className="label-name">{order.name}</strong>
                <span className="label-address">{order.address1}{order.address2 ? `, ${order.address2}` : ''}</span>
                <span className="label-address">{order.city} {order.state} {order.postcode}</span>
                {order.country && order.country.toLowerCase() !== 'australia' && (
                  <span className="label-address">{order.country}</span>
                )}
                <div style={{ flex: 1 }}></div>
                <span className="label-sku">{order.itemsSummary || ''}</span>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="card print-hide" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border)' }}>
                <th style={{ padding: '12px' }}>Order ID</th>
                <th style={{ padding: '12px' }}>Buyer</th>
                <th style={{ padding: '12px' }}>Name</th>
                <th style={{ padding: '12px' }}>Address</th>
                <th style={{ padding: '12px' }}>Items</th>
              </tr>
            </thead>
            <tbody>
              {validOrders.map(order => (
                <tr key={order.orderId} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '12px' }}>{order.orderId}</td>
                  <td style={{ padding: '12px' }}>{order.buyerUsername}</td>
                  <td style={{ padding: '12px' }}>{order.name}</td>
                  <td style={{ padding: '12px' }}>
                    {order.address1}{order.address2 ? `, ${order.address2}` : ''}<br/>
                    {order.city}, {order.state} {order.postcode}
                  </td>
                  <td style={{ padding: '12px', maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={order.itemsSummary}>
                    {order.itemsSummary}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
