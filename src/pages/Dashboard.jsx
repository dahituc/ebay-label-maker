import React from 'react';

export default function Dashboard() {
  return (
    <div className="animate-fade-in">
      <h1>Dashboard</h1>
      <div className="card">
        <h2>Upload Orders CSV</h2>
        <p style={{ color: 'var(--text-secondary)' }}>Drag and drop your eBay orders CSV here to begin processing.</p>
        <div style={{ 
          border: '2px dashed var(--border)', 
          borderRadius: 'var(--radius)', 
          padding: '60px', 
          textAlign: 'center',
          marginTop: '24px',
          cursor: 'pointer',
          transition: 'var(--transition)'
        }}>
          Click here or drop your .csv file
        </div>
      </div>
    </div>
  );
}
