import React from 'react';

export default function Review() {
  return (
    <div className="animate-fade-in">
      <h1>Review Issues</h1>
      <div className="card">
        <h2>Unverified Addresses</h2>
        <p style={{ color: 'var(--text-secondary)' }}>Addresses that failed local validation and API standardization will appear here.</p>
        
        <div style={{ marginTop: '24px', padding: '24px', background: 'var(--bg-primary)', borderRadius: 'var(--radius-sm)', textAlign: 'center', color: 'var(--text-secondary)' }}>
          No unverified addresses found. Great job!
        </div>
      </div>
    </div>
  );
}
