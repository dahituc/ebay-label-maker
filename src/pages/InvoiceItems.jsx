import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database.js';
import { PlusCircle, Edit3, Trash2 } from 'lucide-react';

export default function InvoiceItems() {
  const invoiceItems = useLiveQuery(() => db.invoice_items.orderBy('id').toArray(), []);
  const [description, setDescription] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingDescription, setEditingDescription] = useState('');
  const [editingUnitPrice, setEditingUnitPrice] = useState('');

  const resetForm = () => {
    setDescription('');
    setUnitPrice('');
  };

  const handleAddItem = async () => {
    if (!description.trim()) return;
    await db.invoice_items.add({ description: description.trim(), unitPrice: Number(unitPrice) || 0, sampleData: false });
    resetForm();
  };

  const handleEditItem = (item) => {
    setEditingId(item.id);
    setEditingDescription(item.description);
    setEditingUnitPrice(item.unitPrice.toString());
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editingDescription.trim()) return;
    await db.invoice_items.update(editingId, {
      description: editingDescription.trim(),
      unitPrice: Number(editingUnitPrice) || 0,
      sampleData: false
    });
    setEditingId(null);
    setEditingDescription('');
    setEditingUnitPrice('');
  };

  const handleDeleteItem = async (id) => {
    if (!window.confirm('Delete this invoice item?')) return;
    await db.invoice_items.delete(id);
    if (editingId === id) {
      setEditingId(null);
      setEditingDescription('');
      setEditingUnitPrice('');
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm('Delete all invoice items?')) return;
    await db.invoice_items.clear();
    setEditingId(null);
    setEditingDescription('');
    setEditingUnitPrice('');
  };

  return (
    <div className="animate-fade-in invoice-items-page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <PlusCircle size={28} color="var(--accent)" />
            Invoice Items
          </h1>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '700px' }}>
            Manage the reusable item catalog for the invoice builder. These items are separate from labels and Amazon/AusPost imports.
          </p>
        </div>
        <button onClick={handleClearAll} className="btn btn-danger" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
          <Trash2 size={18} />
          Clear All Items
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
        <div className="card">
          <h2 style={{ marginBottom: '16px' }}>Add New Item</h2>
          <div style={{ display: 'grid', gap: '16px' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={{ fontWeight: 600 }}>Item Description</span>
              <input value={description} onChange={e => setDescription(e.target.value)} placeholder="e.g. Premium Widget" style={{ padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }} />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={{ fontWeight: 600 }}>Unit Price</span>
              <input type="number" step="0.01" value={unitPrice} onChange={e => setUnitPrice(e.target.value)} placeholder="e.g. 49.95" style={{ padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }} />
            </label>
            <button onClick={handleAddItem} className="btn btn-primary" style={{ width: 'fit-content' }}>
              Add Item
            </button>
          </div>
        </div>

        <div className="card">
          <h2 style={{ marginBottom: '16px' }}>Edit Item</h2>
          <div style={{ display: 'grid', gap: '16px' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={{ fontWeight: 600 }}>Selected Item</span>
              <select value={editingId || ''} onChange={e => {
                const id = Number(e.target.value);
                const item = invoiceItems?.find(i => i.id === id);
                if (item) handleEditItem(item);
              }} style={{ padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
                <option value="">Choose item to edit</option>
                {invoiceItems?.map(item => (
                  <option key={item.id} value={item.id}>{item.description}</option>
                ))}
              </select>
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={{ fontWeight: 600 }}>Description</span>
              <input value={editingDescription} onChange={e => setEditingDescription(e.target.value)} style={{ padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }} />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={{ fontWeight: 600 }}>Unit Price</span>
              <input type="number" step="0.01" value={editingUnitPrice} onChange={e => setEditingUnitPrice(e.target.value)} style={{ padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }} />
            </label>
            <button onClick={handleSaveEdit} className="btn btn-success" style={{ width: 'fit-content' }} disabled={!editingId}>
              Save Changes
            </button>
          </div>
        </div>
      </div>

      <div className="card">
        <h2 style={{ marginBottom: '16px' }}>Invoice Item Catalog</h2>
        {invoiceItems?.length ? (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '12px', borderBottom: '2px solid var(--border)', color: 'var(--text-secondary)' }}>Description</th>
                <th style={{ width: '140px', textAlign: 'right', padding: '12px', borderBottom: '2px solid var(--border)', color: 'var(--text-secondary)' }}>Unit Price</th>
                <th style={{ width: '100px', textAlign: 'center', padding: '12px', borderBottom: '2px solid var(--border)', color: 'var(--text-secondary)' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {invoiceItems.map(item => (
                <tr key={item.id}>
                  <td style={{ padding: '12px', borderBottom: '1px solid var(--border)', color: 'var(--text-primary)' }}>{item.description}</td>
                  <td style={{ padding: '12px', borderBottom: '1px solid var(--border)', textAlign: 'right', color: 'var(--text-primary)' }}>${item.unitPrice.toFixed(2)}</td>
                  <td style={{ padding: '12px', borderBottom: '1px solid var(--border)', textAlign: 'center' }}>
                    <button onClick={() => handleEditItem(item)} style={{ background: 'transparent', border: 'none', color: 'var(--accent)', cursor: 'pointer', marginRight: '10px' }}>
                      <Edit3 size={16} />
                    </button>
                    <button onClick={() => handleDeleteItem(item.id)} style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}>
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p style={{ color: 'var(--text-secondary)' }}>
            No invoice items exist yet. Add items above and then return to the Invoices page to build invoices from them.
          </p>
        )}
      </div>
    </div>
  );
}
