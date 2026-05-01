import React from 'react';
import { BookOpen, Upload, Edit, Printer, Settings as SettingsIcon, CheckCircle, Info, AlertCircle } from 'lucide-react';

export default function Guide() {
  return (
    <div className="animate-fade-in" style={{ maxWidth: '900px', margin: '0 auto', paddingBottom: '60px' }}>
      <div style={{ marginBottom: '40px' }}>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <BookOpen size={28} color="var(--accent)" />
          User Guide & Documentation
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>
          Welcome to the eBay Label Maker. This guide will help you get started with processing orders and printing labels efficiently.
        </p>
      </div>

      <section style={{ marginBottom: '60px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <div style={{ padding: '10px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '12px' }}>
            <Upload size={24} color="var(--accent)" />
          </div>
          <h2 style={{ margin: 0 }}>Step 1: Uploading Orders</h2>
        </div>
        <div className="card" style={{ padding: '0', overflow: 'hidden', marginBottom: '24px' }}>
          <img 
            src={`${import.meta.env.BASE_URL}guide/dashboard_real.png`} 
            alt="Dashboard Upload" 
            style={{ width: '100%', display: 'block' }} 
          />
        </div>
        <div style={{ lineHeight: 1.6 }}>
          <p style={{ marginBottom: '16px' }}>
            To begin, export your orders from eBay as a <strong>CSV file</strong>. On the Dashboard, you can either click the upload zone or simply <strong>drag and drop</strong> your file.
          </p>
          <ul style={{ paddingLeft: '20px', color: 'var(--text-secondary)' }}>
            <li style={{ marginBottom: '8px' }}>Each upload creates a separate <strong>Batch</strong> for organized processing.</li>
            <li style={{ marginBottom: '8px' }}>Orders are automatically grouped by Order ID and Buyer Username.</li>
            <li style={{ marginBottom: '8px' }}>Multiple orders for the same buyer are merged into a single label to save on postage.</li>
          </ul>
        </div>
      </section>

      <section style={{ marginBottom: '60px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <div style={{ padding: '10px', background: 'rgba(245, 158, 11, 0.1)', borderRadius: '12px' }}>
            <Edit size={24} color="var(--warning)" />
          </div>
          <h2 style={{ margin: 0 }}>Step 2: Reviewing Issues</h2>
        </div>
        <div style={{ lineHeight: 1.6, marginBottom: '24px' }}>
          <p>
            If an address fails local validation (State/Postcode mismatch) or the API can't verify it, the batch will show an <strong>"Invalid"</strong> status.
          </p>
        </div>
        <div className="card" style={{ padding: '24px', background: 'var(--bg-secondary)', borderLeft: '4px solid var(--warning)' }}>
          <div style={{ display: 'flex', gap: '16px' }}>
            <Info size={24} color="var(--warning)" style={{ flexShrink: 0 }} />
            <div>
              <h4 style={{ marginBottom: '8px' }}>How to Fix Addresses</h4>
              <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
                Click the <strong>"Review Issues"</strong> button on the batch card. You can manually edit the address fields. Once saved, the order is marked as <strong>Valid</strong> and added to the print queue.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section style={{ marginBottom: '60px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <div style={{ padding: '10px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '12px' }}>
            <Printer size={24} color="var(--success)" />
          </div>
          <h2 style={{ margin: 0 }}>Step 3: Preview & Print</h2>
        </div>
        <div className="card" style={{ padding: '0', overflow: 'hidden', marginBottom: '24px' }}>
          <img 
            src={`${import.meta.env.BASE_URL}guide/labels_real.png`} 
            alt="Labels Preview" 
            style={{ width: '100%', display: 'block' }} 
          />
        </div>
        <div style={{ lineHeight: 1.6 }}>
          <p style={{ marginBottom: '16px' }}>
            Click <strong>"Print Labels"</strong> to view the thermal layout. Here you can:
          </p>
          <ul style={{ paddingLeft: '20px', color: 'var(--text-secondary)' }}>
            <li style={{ marginBottom: '8px' }}>
              <strong>Switch Addresses:</strong> If Geoapify found a better format, click the <strong>"API"</strong> toggle in the top-right of the label.
            </li>
            <li style={{ marginBottom: '8px' }}>
              <strong>Inline Edit:</strong> Click the small pencil icon to make last-minute name or address corrections.
            </li>
            <li style={{ marginBottom: '8px' }}>
              <strong>Verified Badge:</strong> A green badge indicates the address is highly confident and standardized.
            </li>
          </ul>
        </div>
      </section>

      <section style={{ marginBottom: '60px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <div style={{ padding: '10px', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '12px' }}>
            <SettingsIcon size={24} color="var(--accent)" />
          </div>
          <h2 style={{ margin: 0 }}>Configuration & Settings</h2>
        </div>
        <div className="card" style={{ padding: '0', overflow: 'hidden', marginBottom: '24px' }}>
          <img 
            src={`${import.meta.env.BASE_URL}guide/settings_real.png`} 
            alt="Settings Configuration" 
            style={{ width: '100%', display: 'block' }} 
          />
        </div>
        <div style={{ lineHeight: 1.6 }}>
          <p style={{ marginBottom: '16px' }}>
            Fine-tune the app in the <strong>Settings</strong> page:
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div className="card" style={{ padding: '16px', background: 'var(--bg-primary)' }}>
              <h4 style={{ marginBottom: '8px' }}>Label Size</h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Set your thermal printer's exact dimensions (Default: 90mm x 30mm). These variables update the print CSS automatically.
              </p>
            </div>
            <div className="card" style={{ padding: '16px', background: 'var(--bg-primary)' }}>
              <h4 style={{ marginBottom: '8px' }}>Typography</h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Choose from popular fonts or search thousands of Google Fonts to match your branding.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section style={{ marginBottom: '60px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <div style={{ padding: '10px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '12px' }}>
            <AlertCircle size={24} color="var(--danger)" />
          </div>
          <h2 style={{ margin: 0 }}>Troubleshooting</h2>
        </div>
        <div className="card" style={{ padding: '24px', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
          <h4 style={{ color: 'var(--danger)', marginBottom: '12px' }}>Database Errors</h4>
          <p style={{ lineHeight: 1.6, marginBottom: '0' }}>
            If the application fails to load or you encounter "Database Upgrade Errors," head to <strong>Settings</strong> and look for the <strong>Danger Zone</strong> at the bottom. 
            The <strong>"Reset Application Data"</strong> button will wipe all order history and logs while safely keeping your API keys and label preferences.
          </p>
        </div>
      </section>

      <div style={{ 
        padding: '32px', 
        background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(99, 102, 241, 0.1) 100%)', 
        borderRadius: 'var(--radius)',
        textAlign: 'center',
        border: '1px solid rgba(59, 130, 246, 0.2)'
      }}>
        <CheckCircle size={40} color="var(--accent)" style={{ margin: '0 auto 16px' }} />
        <h3 style={{ marginBottom: '12px' }}>Ready to go?</h3>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '0' }}>
          Head back to the Dashboard to upload your first CSV and start saving time on order fulfillment.
        </p>
      </div>
    </div>
  );
}
