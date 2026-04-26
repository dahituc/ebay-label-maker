import React from 'react';

export default function Settings() {
  return (
    <div className="animate-fade-in">
      <h1>Settings</h1>
      <div className="card">
        <h2>API Integrations</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>Configure your Geoapify API key for address validation.</p>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: '400px' }}>
          <label style={{ fontWeight: 500 }}>Geoapify API Key</label>
          <input 
            type="password" 
            placeholder="Enter your API key" 
            style={{ 
              padding: '10px 12px', 
              borderRadius: 'var(--radius-sm)', 
              border: '1px solid var(--border)',
              backgroundColor: 'var(--bg-primary)',
              color: 'var(--text-primary)'
            }} 
          />
          <button style={{
            background: 'var(--accent)',
            color: 'white',
            border: 'none',
            padding: '10px 16px',
            borderRadius: 'var(--radius-sm)',
            fontWeight: 600,
            cursor: 'pointer',
            marginTop: '12px',
            alignSelf: 'flex-start'
          }}>Save Settings</button>
        </div>
      </div>
    </div>
  );
}
