import React, { useState, useEffect, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, getSetting } from '../db/database.js';
import { Printer, Info, FileText, ArrowRightCircle, Save, Trash2 } from 'lucide-react';

function formatCurrency(value) {
  return value.toLocaleString(undefined, {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

export default function Invoices() {
  const invoiceItems = useLiveQuery(() => db.invoice_items.toArray(), []);
  const [selectedItemIds, setSelectedItemIds] = useState([]);
  const [invoicePrefix, setInvoicePrefix] = useState('INV');
  const [invoiceTerms, setInvoiceTerms] = useState('Payment due within 14 days.');
  const [invoiceTaxRate, setInvoiceTaxRate] = useState(10);
  const [invoiceLogoUrl, setInvoiceLogoUrl] = useState('');
  const [shippingAmount, setShippingAmount] = useState(0);
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState(() => {
    const due = new Date();
    due.setDate(due.getDate() + 14);
    return due.toISOString().slice(0, 10);
  });
  const [clientName, setClientName] = useState('');
  const [clientCompany, setClientCompany] = useState('');
  const [clientAddress1, setClientAddress1] = useState('');
  const [clientAddress2, setClientAddress2] = useState('');
  const [clientCity, setClientCity] = useState('');
  const [clientState, setClientState] = useState('');
  const [clientPostcode, setClientPostcode] = useState('');
  const [clientCountry, setClientCountry] = useState('Australia');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientNote, setClientNote] = useState('');
  const [invoiceStatus, setInvoiceStatus] = useState('paid');
  const [invoiceRows, setInvoiceRows] = useState([]);
  const [saveMessage, setSaveMessage] = useState('');
  const [formError, setFormError] = useState('');
  const savedInvoices = useLiveQuery(() => db.invoices.orderBy('createdAt').reverse().toArray(), []);

  useEffect(() => {
    const loadInvoiceSettings = async () => {
      setInvoicePrefix((await getSetting('invoice_prefix')) || 'INV');
      setInvoiceTerms((await getSetting('invoice_terms')) || 'Payment due within 14 days.');
      setInvoiceTaxRate(parseFloat((await getSetting('invoice_tax_rate')) || '10') || 0);
      setInvoiceLogoUrl((await getSetting('invoice_logo_url')) || '');
    };
    loadInvoiceSettings();
  }, []);

  useEffect(() => {
    if (!invoiceItems) return;
    const initialSelection = invoiceItems.slice(0, 2).map(item => ({
      id: item.id,
      description: item.description,
      quantity: 1,
      unitPrice: item.unitPrice
    }));
    if (invoiceRows.length === 0 && initialSelection.length > 0) {
      setInvoiceRows(initialSelection);
      setSelectedItemIds(initialSelection.map(row => row.id));
    }
  }, [invoiceItems]);

  const availableItems = useMemo(() => {
    if (!invoiceItems) return [];
    return invoiceItems.filter(item => !selectedItemIds.includes(item.id));
  }, [invoiceItems, selectedItemIds]);

  const isInvoiceFormValid = Boolean(clientName.trim() && (clientPhone.trim() || clientEmail.trim()));

  const addItemRow = (itemId) => {
    const item = invoiceItems.find(entry => entry.id === Number(itemId));
    if (!item) return;
    setInvoiceRows(prev => [...prev, { id: item.id, description: item.description, quantity: 1, unitPrice: item.unitPrice }]);
    setSelectedItemIds(prev => [...prev, item.id]);
  };

  const updateRow = (index, field, value) => {
    setInvoiceRows(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: field === 'description' ? value : Number(value || 0) };
      return next;
    });
  };

  const removeRow = (index) => {
    setInvoiceRows(prev => {
      const next = [...prev];
      const removed = next.splice(index, 1)[0];
      setSelectedItemIds(ids => ids.filter(id => id !== removed.id));
      return next;
    });
  };

  const saveInvoice = async () => {
    if (invoiceRows.length === 0) {
      setSaveMessage('Add at least one item before saving an invoice.');
      setFormError('Invoice must contain at least one item.');
      return;
    }

    if (!isInvoiceFormValid) {
      setSaveMessage('Please complete required buyer fields before saving.');
      setFormError('Buyer name and either phone or email are required.');
      return;
    }

    setFormError('');
    const invoiceToSave = {
      invoiceNumber,
      issueDate: invoiceDate,
      dueDate,
      clientName,
      clientCompany,
      clientAddress1,
      clientAddress2,
      clientCity,
      clientState,
      clientPostcode,
      clientCountry,
      clientPhone,
      clientEmail,
      clientNote,
      shippingAmount: Number(shippingAmount || 0),
      taxRate: Number(invoiceTaxRate || 0),
      terms: invoiceTerms,
      logoUrl: invoiceLogoUrl,
      status: invoiceStatus,
      rows: invoiceRows,
      subtotal,
      taxAmount,
      total,
      createdAt: new Date().toISOString()
    };

    await db.invoices.add(invoiceToSave);
    setSaveMessage('Invoice saved successfully.');
    setTimeout(() => setSaveMessage(''), 3000);
  };

  const loadSavedInvoice = (invoice) => {
    setInvoiceDate(invoice.issueDate || new Date().toISOString().slice(0, 10));
    setDueDate(invoice.dueDate || new Date().toISOString().slice(0, 10));
    setClientName(invoice.clientName || '');
    setClientCompany(invoice.clientCompany || '');
    setClientAddress1(invoice.clientAddress1 || '');
    setClientAddress2(invoice.clientAddress2 || '');
    setClientCity(invoice.clientCity || '');
    setClientState(invoice.clientState || '');
    setClientPostcode(invoice.clientPostcode || '');
    setClientCountry(invoice.clientCountry || 'Australia');
    setClientPhone(invoice.clientPhone || '');
    setClientEmail(invoice.clientEmail || '');
    setClientNote(invoice.clientNote || '');
    setInvoiceStatus(invoice.status || 'paid');
    setShippingAmount(invoice.shippingAmount ?? 0);
    setInvoiceTaxRate(invoice.taxRate ?? 10);
    setInvoiceTerms(invoice.terms || 'Payment due within 14 days.');
    setInvoiceLogoUrl(invoice.logoUrl || '');
    setInvoiceRows(invoice.rows || []);
    setSelectedItemIds((invoice.rows || []).map(row => row.id));
  };

  const deleteSavedInvoice = async (id) => {
    if (!window.confirm('Delete this saved invoice?')) return;
    await db.invoices.delete(id);
  };

  const subtotal = invoiceRows.reduce((sum, row) => sum + row.quantity * row.unitPrice, 0);
  const taxAmount = subtotal * (invoiceTaxRate / 100);
  const total = subtotal + taxAmount + Number(shippingAmount || 0);
  const invoiceNumber = `${invoicePrefix}-${new Date().getTime().toString().slice(-6)}`;

  return (
    <div className="animate-fade-in invoice-page">
      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 12mm; }
          body { background: #fff !important; }
          .invoice-page .print-hide { display: none !important; }
          .invoice-page .invoice-card {
            box-shadow: none !important;
            border: 1px solid rgba(0, 0, 0, 0.12) !important;
            width: 100% !important;
            max-width: 100% !important;
            padding: 16px !important;
          }
          .invoice-page .invoice-header { page-break-after: avoid; }
          .invoice-page .invoice-table th, .invoice-page .invoice-table td { color: #000 !important; }
        }
      `}</style>

      <div className="print-hide" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', gap: '16px' }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FileText size={28} color="var(--accent)" />
            Invoices
          </h1>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '680px' }}>
            Build invoices from a dedicated item catalog. This section is separate from labels and Amazon/AusPost conversion data.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            className="btn btn-secondary"
            onClick={saveInvoice}
            disabled={invoiceRows.length === 0}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          >
            <Save size={18} />
            Save Invoice
          </button>
          <button
            className="btn btn-primary"
            onClick={() => window.print()}
            disabled={invoiceRows.length === 0 || !isInvoiceFormValid}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          >
            <Printer size={18} />
            Print / Save as PDF
          </button>
        </div>
        {(saveMessage || formError) && (
          <div style={{ marginTop: '12px', color: formError ? 'var(--danger)' : 'var(--success)', fontSize: '0.95rem' }}>
            {formError || saveMessage}
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(360px, 1.1fr) minmax(320px, 0.9fr)', gap: '24px' }}>
        <div className="print-hide">
          <div className="card" style={{ marginBottom: '24px' }}>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Info size={20} />
              Invoice Details
            </h2>
            <div style={{ display: 'grid', gap: '16px', marginTop: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Invoice Date</span>
                  <input type="date" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} style={{ padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }} />
                </label>
                {invoiceStatus !== 'paid' && (
                  <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Due Date</span>
                    <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} style={{ padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }} />
                  </label>
                )}
              </div>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Payment Status</span>
                <select value={invoiceStatus} onChange={e => setInvoiceStatus(e.target.value)} style={{ padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
                  <option value="paid">Paid</option>
                  <option value="waiting_payment">Waiting payment</option>
                </select>
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Client Name</span>
                <input type="text" value={clientName} onChange={e => setClientName(e.target.value)} placeholder="Client name" style={{ padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }} />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Company</span>
                <input type="text" value={clientCompany} onChange={e => setClientCompany(e.target.value)} placeholder="Client company" style={{ padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }} />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Address Line 1</span>
                <input type="text" value={clientAddress1} onChange={e => setClientAddress1(e.target.value)} placeholder="Street address" style={{ padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }} />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Address Line 2</span>
                <input type="text" value={clientAddress2} onChange={e => setClientAddress2(e.target.value)} placeholder="Apartment, suite, unit, etc." style={{ padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }} />
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>City</span>
                  <input type="text" value={clientCity} onChange={e => setClientCity(e.target.value)} style={{ padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }} />
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>State</span>
                  <input type="text" value={clientState} onChange={e => setClientState(e.target.value)} style={{ padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }} />
                </label>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Postcode</span>
                  <input type="text" value={clientPostcode} onChange={e => setClientPostcode(e.target.value)} style={{ padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }} />
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Country</span>
                  <input type="text" value={clientCountry} onChange={e => setClientCountry(e.target.value)} style={{ padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }} />
                </label>
              </div>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Phone</span>
                <input type="text" value={clientPhone} onChange={e => setClientPhone(e.target.value)} placeholder="Phone number" style={{ padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }} />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Email</span>
                <input type="email" value={clientEmail} onChange={e => setClientEmail(e.target.value)} placeholder="Buyer email" style={{ padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }} />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Client Note</span>
                <textarea value={clientNote} onChange={e => setClientNote(e.target.value)} rows={3} placeholder="Optional note for the invoice" style={{ padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)', resize: 'vertical' }} />
              </label>
            </div>
          </div>

          <div className="card">
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <FileText size={20} />
              Available Invoice Items
            </h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '18px' }}>
              Items are managed separately under Invoice Items. Add them there and then choose from the list below.
            </p>
            {invoiceItems?.length > 0 ? (
              <div style={{ display: 'grid', gap: '14px' }}>
                <select value="" onChange={e => addItemRow(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
                  <option value="">Add item to invoice...</option>
                  {availableItems.map(item => (
                    <option key={item.id} value={item.id}>{item.description} — {formatCurrency(item.unitPrice)}</option>
                  ))}
                </select>
                {availableItems.length === 0 && (
                  <div style={{ color: 'var(--text-secondary)' }}>All items are already added. Remove one to add another.</div>
                )}
              </div>
            ) : (
              <div style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                No invoice items are available. Please add invoice items in the Invoice Items page.
              </div>
            )}
          </div>

          <div className="card" style={{ marginTop: '24px' }}>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <FileText size={20} />
              Saved Invoices
            </h2>
            {savedInvoices?.length ? (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '12px', borderBottom: '2px solid var(--border)', color: 'var(--text-secondary)' }}>Invoice #</th>
                    <th style={{ textAlign: 'left', padding: '12px', borderBottom: '2px solid var(--border)', color: 'var(--text-secondary)' }}>Client</th>
                    <th style={{ textAlign: 'left', padding: '12px', borderBottom: '2px solid var(--border)', color: 'var(--text-secondary)' }}>Status</th>
                    <th style={{ textAlign: 'left', padding: '12px', borderBottom: '2px solid var(--border)', color: 'var(--text-secondary)' }}>Date</th>
                    <th style={{ width: '120px', textAlign: 'center', padding: '12px', borderBottom: '2px solid var(--border)', color: 'var(--text-secondary)' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {savedInvoices.map(invoice => (
                    <tr key={invoice.id}>
                      <td style={{ padding: '12px', borderBottom: '1px solid var(--border)', color: 'var(--text-primary)' }}>{invoice.invoiceNumber}</td>
                      <td style={{ padding: '12px', borderBottom: '1px solid var(--border)', color: 'var(--text-primary)' }}>{invoice.clientCompany || invoice.clientName || '—'}</td>
                      <td style={{ padding: '12px', borderBottom: '1px solid var(--border)', color: invoice.status === 'paid' ? 'var(--success)' : 'var(--warning)', fontWeight: 700, textTransform: 'capitalize' }}>{invoice.status === 'paid' ? 'Paid' : 'Waiting payment'}</td>
                      <td style={{ padding: '12px', borderBottom: '1px solid var(--border)', color: 'var(--text-primary)' }}>{new Date(invoice.createdAt).toLocaleDateString()}</td>
                      <td style={{ padding: '12px', borderBottom: '1px solid var(--border)', textAlign: 'center' }}>
                        <button onClick={() => loadSavedInvoice(invoice)} style={{ background: 'transparent', border: 'none', color: 'var(--accent)', cursor: 'pointer', marginRight: '10px' }}>Load</button>
                        <button onClick={() => deleteSavedInvoice(invoice.id)} style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}>Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
                No saved invoices yet. Save an invoice to see it listed here.
              </p>
            )}
          </div>
        </div>

        <div>
          <div className="invoice-card card" style={{ padding: '24px 24px 28px', maxWidth: '780px', width: '100%' }}>
            <div className="invoice-header" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px', alignItems: 'start' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {invoiceLogoUrl ? (
                  <img src={invoiceLogoUrl} alt="Invoice logo" style={{ maxWidth: '220px', maxHeight: '80px', objectFit: 'contain' }} />
                ) : (
                  <div className="invoice-logo-placeholder" style={{ width: '220px', minHeight: '80px', border: '1px dashed var(--border)', borderRadius: '14px', display: 'grid', placeItems: 'center', color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                    Logo placeholder
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ fontSize: '0.95rem', color: 'var(--text-secondary)' }}>Invoice Number</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>{invoiceNumber}</div>
                  <div style={{ marginTop: '8px', display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 12px', borderRadius: '999px', background: invoiceStatus === 'paid' ? 'rgba(34, 197, 94, 0.12)' : 'rgba(245, 158, 11, 0.12)', color: invoiceStatus === 'paid' ? 'var(--success)' : 'var(--warning)' }}>
                    {invoiceStatus === 'paid' ? 'Paid' : 'Waiting payment'}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
                  <div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '6px' }}>Invoice date</div>
                    <div style={{ fontWeight: 700 }}>{new Date(invoiceDate).toLocaleDateString()}</div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '6px' }}>Due date</div>
                    <div style={{ fontWeight: 700 }}>{new Date(dueDate).toLocaleDateString()}</div>
                  </div>
                </div>
                <div style={{ padding: '16px', borderRadius: '14px', background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.15)' }}>
                  <div style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>Bill to</div>
                  <div style={{ fontWeight: 700, marginBottom: '4px' }}>{clientCompany || clientName || 'Client name'}</div>
                  <div style={{ lineHeight: 1.5, color: 'var(--text-secondary)' }}>
                    {clientAddress1}{clientAddress2 ? `, ${clientAddress2}` : ''}<br />
                    {clientCity}, {clientState} {clientPostcode}<br />
                    {clientCountry}<br />
                    {clientPhone && `Phone: ${clientPhone}`}
                  </div>
                </div>
              </div>
            </div>

            <div className="invoice-body" style={{ marginBottom: '28px' }}>
              <table className="invoice-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '12px 10px', borderBottom: '2px solid var(--border)', color: 'var(--text-secondary)', fontWeight: 600 }}>Description</th>
                    <th style={{ width: '80px', textAlign: 'right', padding: '12px 10px', borderBottom: '2px solid var(--border)', color: 'var(--text-secondary)', fontWeight: 600 }}>Qty</th>
                    <th style={{ width: '120px', textAlign: 'right', padding: '12px 10px', borderBottom: '2px solid var(--border)', color: 'var(--text-secondary)', fontWeight: 600 }}>Unit Price</th>
                    <th style={{ width: '120px', textAlign: 'right', padding: '12px 10px', borderBottom: '2px solid var(--border)', color: 'var(--text-secondary)', fontWeight: 600 }}>Line Total</th>
                    <th style={{ width: '60px', textAlign: 'center', padding: '12px 10px', borderBottom: '2px solid var(--border)', color: 'var(--text-secondary)', fontWeight: 600 }}>Remove</th>
                  </tr>
                </thead>
                <tbody>
                  {invoiceRows.length > 0 ? invoiceRows.map((row, index) => (
                    <tr key={`${row.id}-${index}`}>
                      <td style={{ padding: '12px 10px', borderBottom: '1px solid var(--border)', color: 'var(--text-primary)' }}>
                        <input type="text" value={row.description} onChange={e => updateRow(index, 'description', e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }} />
                      </td>
                      <td style={{ padding: '12px 10px', borderBottom: '1px solid var(--border)', textAlign: 'right' }}>
                        <input type="number" min="1" value={row.quantity} onChange={e => updateRow(index, 'quantity', e.target.value)} style={{ width: '100%', maxWidth: '72px', padding: '8px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)', textAlign: 'right' }} />
                      </td>
                      <td style={{ padding: '12px 10px', borderBottom: '1px solid var(--border)', textAlign: 'right' }}>
                        <input type="number" step="0.01" value={row.unitPrice} onChange={e => updateRow(index, 'unitPrice', e.target.value)} style={{ width: '100%', maxWidth: '120px', padding: '8px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)', textAlign: 'right' }} />
                      </td>
                      <td style={{ padding: '12px 10px', borderBottom: '1px solid var(--border)', textAlign: 'right', fontWeight: 700, color: 'var(--text-primary)' }}>{formatCurrency(row.quantity * row.unitPrice)}</td>
                      <td style={{ padding: '12px 10px', borderBottom: '1px solid var(--border)', textAlign: 'center' }}>
                        <button onClick={() => removeRow(index)} style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontWeight: 700 }}>×</button>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan="5" style={{ padding: '18px 10px', color: 'var(--text-secondary)', textAlign: 'center' }}>
                        No invoice items added. Use the dropdown on the left to add invoice items.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '24px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', color: 'var(--text-secondary)' }}>
                <div>
                  <div style={{ fontWeight: 600, marginBottom: '8px' }}>Invoice Terms</div>
                  <div style={{ lineHeight: 1.6 }}>{invoiceTerms}</div>
                </div>
                {clientNote && (
                  <div>
                    <div style={{ fontWeight: 600, marginBottom: '8px' }}>Client note</div>
                    <div style={{ lineHeight: 1.6 }}>{clientNote}</div>
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', borderRadius: '14px', background: 'var(--bg-primary)', border: '1px solid var(--border)' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Subtotal</span>
                  <span style={{ fontWeight: 700 }}>{formatCurrency(subtotal)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', borderRadius: '14px', background: 'var(--bg-primary)', border: '1px solid var(--border)' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Tax ({invoiceTaxRate}%)</span>
                  <span style={{ fontWeight: 700 }}>{formatCurrency(taxAmount)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', borderRadius: '14px', background: 'var(--bg-primary)', border: '1px solid var(--border)' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Shipping</span>
                  <span style={{ fontWeight: 700 }}>{formatCurrency(Number(shippingAmount || 0))}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 16px', borderRadius: '16px', background: 'var(--accent-soft)', border: '1px solid var(--accent)' }}>
                  <span style={{ fontWeight: 700 }}>Total</span>
                  <span style={{ fontWeight: 800, fontSize: '1.05rem' }}>{formatCurrency(total)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="print-hide" style={{ marginTop: '24px', padding: '18px 22px', borderRadius: '16px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <ArrowRightCircle size={18} color="var(--accent)" />
        <span style={{ color: 'var(--text-secondary)' }}>
          Print this page and choose "Save as PDF" from the browser dialog to export the invoice.
        </span>
      </div>
    </div>
  );
}
