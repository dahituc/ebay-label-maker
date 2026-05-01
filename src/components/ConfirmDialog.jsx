import React from 'react';
import { X, AlertTriangle } from 'lucide-react';

export default function ConfirmDialog({ isOpen, title, message, onConfirm, onCancel, onClose, confirmText = 'Confirm', cancelText = 'Cancel', variant = 'danger' }) {
  const handleClose = onCancel || onClose;
  if (!isOpen) return null;

  return (
    <div className="modal-overlay animate-fade-in" onClick={handleClose}>
      <div className="modal-content animate-slide-up" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-icon-container" style={{ background: variant === 'danger' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(59, 130, 246, 0.1)' }}>
            <AlertTriangle size={24} color={variant === 'danger' ? '#ef4444' : 'var(--accent)'} />
          </div>
          <button className="modal-close" onClick={handleClose}>
            <X size={20} />
          </button>
        </div>
        
        <div className="modal-body">
          <h3>{title}</h3>
          <p>{message}</p>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={handleClose}>
            {cancelText}
          </button>
          <button 
            className={`btn ${variant === 'danger' ? 'btn-danger' : 'btn-primary'}`} 
            onClick={() => {
              onConfirm();
              if (handleClose) handleClose();
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
