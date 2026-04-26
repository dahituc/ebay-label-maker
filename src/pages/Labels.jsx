import React from 'react';

export default function Labels() {
  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }} className="print-hide">
        <h1>Print Labels</h1>
        <button style={{
          background: 'var(--success)',
          color: 'white',
          border: 'none',
          padding: '10px 20px',
          borderRadius: 'var(--radius-sm)',
          fontWeight: 600,
          cursor: 'pointer'
        }} onClick={() => window.print()}>
          Print Now
        </button>
      </div>
      
      <div style={{
         display: 'grid',
         gridTemplateColumns: 'repeat(auto-fill, 90mm)',
         gap: '10px',
      }}>
        {/* Mock Label */}
        <div style={{
          width: '90mm',
          height: '30mm',
          border: '1px solid black',
          padding: '4mm',
          background: 'white',
          color: 'black',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          fontSize: '12px',
          fontFamily: 'arial, sans-serif'
        }}>
          <strong style={{ fontSize: '14px' }}>John Doe</strong>
          <span>123 Fake Street</span>
          <span>Sydney NSW 2000</span>
          <div style={{ flex: 1 }}></div>
          <span style={{ fontSize: '10px', color: '#555' }}>SKU-01 x 2</span>
        </div>
      </div>
    </div>
  );
}
