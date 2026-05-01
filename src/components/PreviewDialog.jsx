import React from 'react';
import { X, Eye } from 'lucide-react';

export default function PreviewDialog({ isOpen, onClose, selectedFont, labelWidth, labelHeight }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay animate-fade-in" onClick={onClose}>
      <div className="modal-content animate-slide-up" style={{ maxWidth: 'max-content' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header" style={{ paddingBottom: '8px' }}>
          <div className="modal-icon-container" style={{ background: 'var(--accent-soft)' }}>
            <Eye size={24} color="var(--accent)" />
          </div>
          <h3 style={{ margin: '0 0 0 12px', flex: 1 }}>Label Preview</h3>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', padding: '24px' }}>
          <p style={{ textAlign: 'center', fontSize: '0.9rem', marginBottom: '8px' }}>
            Previewing <strong>{labelWidth}mm x {labelHeight}mm</strong> with <strong>{selectedFont}</strong>
          </p>
          
          <div style={{ 
            background: 'var(--bg-primary)', 
            padding: '40px', 
            borderRadius: 'var(--radius-sm)', 
            border: '1px solid var(--border)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '200px',
            width: '100%'
          }}>
            <div className="label-item" style={{ 
              boxShadow: 'var(--shadow-lg)', 
              border: '1px solid var(--accent)',
              backgroundColor: 'var(--bg-secondary)'
            }}>
              <span className="label-to">To</span>
              <strong className="label-name">
                John Doe <span className="label-orderID">(12-34567-89012)</span>
              </strong>
              <span className="label-address">123 Sample Street,</span>
              <span className="label-address">Sydney NSW 2000</span>
              <div style={{ flex: 1 }}></div>
              <span className="label-sku">SAMPLE-SKU-001 <b>x1</b></span>
              <span className="label-buyer-note"> ** This is a demo label **</span>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-primary" onClick={onClose}>
            Close Preview
          </button>
        </div>
      </div>
    </div>
  );
}
