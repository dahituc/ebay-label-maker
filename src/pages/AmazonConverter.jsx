import React, { useState } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { Upload, Download, FileText, CheckCircle, AlertCircle, RefreshCcw, ArrowRight, Settings, Printer, Trash2 } from 'lucide-react';
import { db, getSetting } from '../db/database';

const AUSPOST_HEADERS = [
  'Additional Label Information 1',
  'Send Tracking Notifications',
  'Send From Name',
  'Send From Business Name',
  'Send From Address Line 1',
  'Send From Address Line 2',
  'Send From Address Line 3',
  'Send From Suburb',
  'Send From State',
  'Send From Postcode',
  'Send From Phone Number',
  'Send From Email Address',
  'Deliver To Name',
  'Deliver To MyPost Number',
  'Deliver To Business Name',
  'Deliver To Type Of Address',
  'Deliver To Address Line 1',
  'Deliver To Address Line 2',
  'Deliver To Address Line 3',
  'Deliver To Suburb',
  'Deliver To State',
  'Deliver To Postcode',
  'Deliver To Phone Number',
  'Deliver To Email Address',
  'Item Packaging Type',
  'Item Delivery Service',
  'Item Description',
  'Item Length',
  'Item Width',
  'Item Height',
  'Item Weight',
  'Item Dangerous Goods Flag',
  'Signature On Delivery',
  'Extra Cover Amount'
];

const REQUIRED_FIELDS = [
  'Send From Name',
  'Send From Address Line 1',
  'Send From Suburb',
  'Send From State',
  'Send From Postcode',
  'Deliver To Name',
  'Deliver To Address Line 1',
  'Deliver To Suburb',
  'Deliver To State',
  'Deliver To Postcode',
  'Item Packaging Type',
  'Item Delivery Service',
  'Item Weight'
];

const AMAZON_TO_AUSPOST_MAP = {
  'amazon-order-id': 'Additional Label Information 1',
  'order-id': 'Additional Label Information 1',
  'buyer-name': 'Deliver To Name',
  'recipient-name': 'Deliver To Name',
  'ship-address-1': 'Deliver To Address Line 1',
  'ship-address-2': 'Deliver To Address Line 2',
  'ship-address-3': 'Deliver To Address Line 3',
  'ship-city': 'Deliver To Suburb',
  'ship-state': 'Deliver To State',
  'ship-postal-code': 'Deliver To Postcode',
  'ship-zip': 'Deliver To Postcode',
  'ship-phone-number': 'Deliver To Phone Number',
  'buyer-email': 'Deliver To Email Address',
  'product-name': 'Item Description',
  'sku': 'Item Description' // Fallback if product-name is missing
};

const STATE_ABBREVIATIONS = {
  'VICTORIA': 'VIC',
  'NEW SOUTH WALES': 'NSW',
  'QUEENSLAND': 'QLD',
  'WESTERN AUSTRALIA': 'WA',
  'SOUTH AUSTRALIA': 'SA',
  'TASMANIA': 'TAS',
  'NORTHERN TERRITORY': 'NT',
  'AUSTRALIAN CAPITAL TERRITORY': 'ACT',
  'VIC': 'VIC',
  'NSW': 'NSW',
  'QLD': 'QLD',
  'WA': 'WA',
  'SA': 'SA',
  'TAS': 'TAS',
  'NT': 'NT',
  'ACT': 'ACT'
};

export default function AmazonConverter() {
  const [file, setFile] = React.useState(null);
  const [data, setData] = React.useState([]);
  const [previewData, setPreviewData] = React.useState(null);
  const [convertedBlob, setConvertedBlob] = React.useState(null);
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [isDone, setIsDone] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [missingFields, setMissingFields] = React.useState([]);
  const [hasDownloaded, setHasDownloaded] = React.useState(false);
  const [selectedRows, setSelectedRows] = React.useState([]);
  const [printedRowIds, setPrintedRowIds] = React.useState([]);
  const [activeLabelRow, setActiveLabelRow] = React.useState(null);

  const normalizeKey = (key) => {
    if (!key) return '';
    return key.toString().trim().toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/[^a-z0-9 ]/g, ' ')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  };

  const normalizeRow = (row) => {
    const normalized = {};
    Object.entries(row).forEach(([key, value]) => {
      const cleanKey = normalizeKey(key);
      if (cleanKey) normalized[cleanKey] = value;
    });
    return normalized;
  };

  const resolveValue = (row, aliases) => aliases.map(alias => row[normalizeKey(alias)]).find(Boolean);

  const getOrderId = (row) => resolveValue(row, ['amazon-order-id', 'order-id', 'order-number', 'amazon-order-number']);
  const getBuyerName = (row) => resolveValue(row, ['buyer-name', 'recipient-name', 'buyer']);
  const getBuyerEmail = (row) => resolveValue(row, ['buyer-email', 'buyer-email-address', 'email']);
  const getItemQuantity = (row) => {
    const quantity = resolveValue(row, ['quantity-purchased', 'quantity', 'qty', 'item-quantity']) || '1';
    return Number(quantity) || 1;
  };
  const buildItemDescription = (items) => {
    return (items || []).map(item => item.customLabel || item.productName || '').filter(Boolean).join(' | ');
  };
  const createRowId = (prefix, index) => `${prefix || 'amazon'}-${index}-${Date.now()}`;

  const generateCsvBlob = (rows) => new Blob([Papa.unparse({ fields: AUSPOST_HEADERS, data: rows }, { header: true })], { type: 'text/csv;charset=utf-8;' });
  const persistConversion = async (rows) => {
    if (!file) return;
    await db.amazon_conversions.clear();
    await db.amazon_conversions.add({
      filename: file.name,
      data: rows,
      createdAt: new Date()
    });
  };
  const updatePreviewRows = async (rows) => {
    setPreviewData(rows);
    setConvertedBlob(generateCsvBlob(rows));
    await persistConversion(rows);
  };

  const escapeHtml = (value) => String(value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  const formatAddress = (row) => [
    row['Deliver To Address Line 1'],
    row['Deliver To Address Line 2'],
    row['Deliver To Suburb'],
    row['Deliver To State'],
    row['Deliver To Postcode']
  ].filter(Boolean).join(', ');

  const formatSendFrom = (row) => [
    row['Send From Name'],
    row['Send From Business Name'],
    row['Send From Address Line 1'],
    row['Send From Suburb'],
    row['Send From State'],
    row['Send From Postcode']
  ].filter(Boolean).join(', ');

  const handleDeleteRow = async (rowId) => {
    const remaining = previewData.filter(row => row.rowId !== rowId);
    setSelectedRows(prev => prev.filter(id => id !== rowId));
    await updatePreviewRows(remaining);
  };

  const handleBulkDelete = async () => {
    const remaining = previewData.filter(row => !selectedRows.includes(row.rowId));
    setSelectedRows([]);
    await updatePreviewRows(remaining);
  };

  const toggleRowSelection = (rowId) => {
    setSelectedRows(prev => prev.includes(rowId) ? prev.filter(id => id !== rowId) : [...prev, rowId]);
  };

  const handleSelectAll = () => {
    if (!previewData) return;
    setSelectedRows(prev => prev.length === previewData.length ? [] : previewData.map(row => row.rowId));
  };

  const openLabelPanel = (row) => {
    setActiveLabelRow(row);
  };

  const closeLabelPanel = () => {
    setActiveLabelRow(null);
  };

  React.useEffect(() => {
    const handleEsc = (event) => {
      if (event.key === 'Escape' && activeLabelRow) {
        closeLabelPanel();
      }
    };

    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [activeLabelRow]);

  const updateCustomLabel = async (rowId, itemIndex, value) => {
    const nextRows = previewData.map(row => {
      if (row.rowId !== rowId) return row;
      const items = row.items.map((item, idx) => idx === itemIndex ? { ...item, customLabel: value } : item);
      const itemDescription = buildItemDescription(items);
      return {
        ...row,
        items,
        itemDescription,
        'Item Description': itemDescription
      };
    });
    await updatePreviewRows(nextRows);
    setActiveLabelRow(nextRows.find(row => row.rowId === rowId) || null);
  };

  const markRowPrinted = (rowId) => {
    setPrintedRowIds(prev => prev.includes(rowId) ? prev : [...prev, rowId]);
  };

  const renderPrintLabelHtml = (row) => {
    const name = escapeHtml(row.sourceRecipientName || row.buyerName || 'Unknown');
    const orderNumber = escapeHtml(row.sourceOrderNumber || row.orderId || '');
    const phone = escapeHtml(row['Deliver To Phone Number'] || '');
    const addressLines = [
      row['Deliver To Address Line 1'],
      row['Deliver To Address Line 2'],
      row['Deliver To Suburb'] ? `${row['Deliver To Suburb']} ${row['Deliver To State']} ${row['Deliver To Postcode']}`.trim() : ''
    ].filter(Boolean).map(line => `<span class="label-address">${escapeHtml(line)}</span>`).join('');

    const itemLines = (row.items || []).map((item, idx) => {
      const label = escapeHtml(item.customLabel || item.sku || item.productName || 'Item');
      return `<div class="item-line">${label} X <b>${item.quantity}</b></div>`;
    }).join('');

    const totalQty = (row.items || []).reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
    const totalLine = totalQty > 1 ? `<div class="item-line" style="font-weight:700;font-size:9px;color:#333;margin-bottom:2px;text-align:right;">TOTAL ITEMS: ${totalQty}</div>` : '';

    return `
      <div class="label-item">
        <span class="label-to">To</span>
        <div style="display:flex;justify-content:space-between;align-items:flex-start; gap: 8px;">
          <strong class="label-name">
            ${name} <span class="label-orderID">(${orderNumber})</span>
            ${phone ? `<span class="label-phone" style="display:block;font-size:11px;font-weight:400;color:#444;margin-top:2px;">${phone}</span>` : ''}
          </strong>
        </div>
        <div class="label-address-container" style="display:flex;flex-direction:column;position:relative;">
          ${addressLines}
        </div>
        <div style="flex:1;"></div>
        <div class="label-sku">
          ${totalLine}
          ${itemLines}
        </div>
      </div>
    `;
  };

  const handlePrintLabel = (row) => {
    if (!row) return;
    const style = `
      body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
      .label-item { width: 90mm; min-height: 30mm; border: 1px dashed #aaa; padding: 2mm 3mm; background: white; color: black; box-sizing: border-box; display: flex; flex-direction: column; overflow: hidden; }
      .label-to { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #555; margin-bottom: 0.2em; }
      .label-name { font-size: 15px; font-weight: 700; line-height: 1.25; display: inline-block; }
      .label-orderID { font-size: 10px; font-weight: 400; display: inline-block; margin-left: 6px; }
      .label-phone { font-size: 11px; font-weight: 400; color: #444; margin-top: 2px; display: block; }
      .label-address { font-size: 13px; line-height: 1.25; white-space: break-spaces; display: block; overflow: hidden; }
      .label-sku, .label-buyer-note { font-size: 9px; color: #555; text-align: right; line-height: 1.1; white-space: normal; word-break: break-word; }
      .item-line { margin-bottom: 1px; }
      .item-line > b { font-size: 12px; font-weight: 900; }
    `;
    const printWindow = window.open('', '_blank', 'width=500,height=600');
    if (!printWindow) return;
    printWindow.document.write(`<!doctype html><html><head><title>Print Label</title><style>${style}</style></head><body>${renderPrintLabelHtml(row)}</body></html>`);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.focus();
      printWindow.print();
      if ('onafterprint' in printWindow) {
        printWindow.onafterprint = () => printWindow.close();
      } else {
        setTimeout(() => printWindow.close(), 500);
      }
    };
    markRowPrinted(row.rowId);
  };

  // Load existing conversion from DB on mount
  React.useEffect(() => {
    const loadLastConversion = async () => {
      const last = await db.amazon_conversions.orderBy('id').last();
      if (last) {
        const rowsWithIds = (last.data || []).map((row, idx) => ({
          ...row,
          rowId: row.rowId || `${last.filename}-${idx}-${new Date(last.createdAt).getTime() || Date.now()}`,
          itemDescription: row.itemDescription || row['Item Description'] || buildItemDescription(row.items || [])
        }));
        setPreviewData(rowsWithIds);
        setFile({ name: last.filename });
        setHasDownloaded(!!last.downloaded);
        // Re-generate blob from data (CSV)
        const csv = Papa.unparse({
          fields: AUSPOST_HEADERS,
          data: rowsWithIds
        }, {
          header: true
        });
        setConvertedBlob(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
        setIsDone(true);
      }
    };
    loadLastConversion();
  }, []);

  const handleFileUpload = (e) => {
    const uploadedFile = e.target.files[0];
    if (!uploadedFile) return;

    setFile(uploadedFile);
    setPreviewData(null);
    setConvertedBlob(null);
    setIsDone(false);
    setHasDownloaded(false);
    setSelectedRows([]);
    setPrintedRowIds([]);
    setActiveLabelRow(null);
    setError(null);
    setMissingFields([]);

    Papa.parse(uploadedFile, {
      header: true,
      skipEmptyLines: true,
      delimiter: uploadedFile.name.endsWith('.txt') ? '\t' : ',',
      complete: (results) => {
        if (results.errors.length > 0) {
          setError('Failed to parse file.');
          return;
        }
        setData(results.data);
      }
    });
  };

  const convertData = async () => {
    setIsProcessing(true);
    setError(null);
    setMissingFields([]);

    try {
      const senderSettings = {
        name: await getSetting('sender_name') || '',
        business: await getSetting('sender_business_name') || '',
        address1: await getSetting('sender_address_line_1') || '',
        address2: await getSetting('sender_address_line_2') || '',
        suburb: await getSetting('sender_suburb') || '',
        state: await getSetting('sender_state') || '',
        postcode: await getSetting('sender_postcode') || '',
        phone: await getSetting('sender_phone') || '',
        email: await getSetting('sender_email') || ''
      };

      let hasMissingMandatory = false;
      const missing = new Set();

      const ausPostRows = data.map((row, index) => {
        const normalizedRow = normalizeRow(row);
        const ausPostRow = {};
        AUSPOST_HEADERS.forEach(header => {
          ausPostRow[header] = '';
        });

        Object.entries(AMAZON_TO_AUSPOST_MAP).forEach(([amazonKey, ausPostKey]) => {
          const sourceValue = resolveValue(normalizedRow, [amazonKey]);
          if (sourceValue) {
            ausPostRow[ausPostKey] = sourceValue;
          }
        });

        const quantity = getItemQuantity(normalizedRow);
        const customLabel = resolveValue(normalizedRow, ['product-name', 'sku', 'custom-label',  'item-title', 'item-name']) || '';
        const items = [{ customLabel, quantity }];
        const itemDescription = customLabel.substring(0, 50);
        const sourceOrderNumber = resolveValue(normalizedRow, ['order-number', 'amazon-order-number', 'order-id']);
        const sourceRecipientName = resolveValue(normalizedRow, ['recipient-name', 'buyer-name', 'buyer']);

        ausPostRow['Send From Name'] = (senderSettings.name || '').substring(0, 35);
        ausPostRow['Send From Business Name'] = (senderSettings.business || '').substring(0, 40);
        ausPostRow['Send From Address Line 1'] = (senderSettings.address1 || '').substring(0, 40);
        ausPostRow['Send From Address Line 2'] = (senderSettings.address2 || '').substring(0, 40);
        ausPostRow['Send From Suburb'] = (senderSettings.suburb || '').substring(0, 30);
        ausPostRow['Send From State'] = (senderSettings.state || '').toUpperCase().trim();
        ausPostRow['Send From Postcode'] = (senderSettings.postcode || '').substring(0, 4);
        ausPostRow['Send From Phone Number'] = senderSettings.phone;
        ausPostRow['Send From Email Address'] = senderSettings.email;

        // Apply Recipient Truncations and Formatting
        ausPostRow['Deliver To Name'] = (ausPostRow['Deliver To Name'] || '').substring(0, 35);
        ausPostRow['Deliver To Address Line 1'] = (ausPostRow['Deliver To Address Line 1'] || '').substring(0, 40);
        ausPostRow['Deliver To Suburb'] = (ausPostRow['Deliver To Suburb'] || '').substring(0, 40);
        
        // Normalize State
        const rawState = (ausPostRow['Deliver To State'] || '').toUpperCase().trim();
        ausPostRow['Deliver To State'] = STATE_ABBREVIATIONS[rawState] || rawState.substring(0, 3);
        
        ausPostRow['Deliver To Postcode'] = (ausPostRow['Deliver To Postcode'] || '').substring(0, 4);
        ausPostRow['Deliver To Email Address'] = (ausPostRow['Deliver To Email Address'] || '').substring(0, 50);

        ausPostRow['Send Tracking Notifications'] = 'YES';
        ausPostRow['Item Packaging Type'] = 'AP_SATCHEL_XS';
        ausPostRow['Item Delivery Service'] = 'PP';
        ausPostRow['Item Description'] = itemDescription;
        ausPostRow['Item Weight'] = '0.25';
        ausPostRow['Item Dangerous Goods Flag'] = 'NO';
        ausPostRow['Signature On Delivery'] = 'NO';

        REQUIRED_FIELDS.forEach(field => {
          if (!ausPostRow[field]) {
            missing.add(`${field} (Row ${index + 1})`);
            hasMissingMandatory = true;
          }
        });

        return {
          ...ausPostRow,
          rowId: createRowId(file?.name, index),
          orderId: getOrderId(normalizedRow),
          buyerName: getBuyerName(normalizedRow),
          buyerEmail: getBuyerEmail(normalizedRow),
          sourceOrderNumber,
          sourceRecipientName,
          items,
          itemDescription
        };
      });

      if (hasMissingMandatory) {
        setMissingFields(Array.from(missing).slice(0, 5));
        setError('Mandatory fields are missing. Please check your settings and the uploaded file.');
      }

      const csv = Papa.unparse({
        fields: AUSPOST_HEADERS,
        data: ausPostRows
      }, {
        header: true
      });
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      
      // Save to DB
      await db.amazon_conversions.clear();
      await db.amazon_conversions.add({
        filename: file.name,
        data: ausPostRows,
        createdAt: new Date(),
        downloaded: false
      });

      setPreviewData(ausPostRows);
      setConvertedBlob(blob);
      setIsDone(true);
    } catch (err) {
      console.error(err);
      setError('An error occurred during conversion.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = async () => {
    if (!convertedBlob) return;
    const url = URL.createObjectURL(convertedBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `auspost_import_${new Date().getTime()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setHasDownloaded(true);

    const last = await db.amazon_conversions.orderBy('id').last();
    if (last) {
      await db.amazon_conversions.update(last.id, { downloaded: true });
    }
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '80px' }}>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <FileText size={28} color="var(--accent)" />
          Amazn To AuPost
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Convert Amazon Order TXT/CSV to Australia Post tracked label import format.
        </p>
      </div>

      <div className="card" style={{ position: 'relative', padding: '40px', textAlign: 'center', border: '2px dashed var(--border)', background: 'var(--bg-secondary)', marginBottom: '32px' }}>
        {!file ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
            <div style={{ padding: '20px', borderRadius: '50%', background: 'var(--accent-soft)', color: 'var(--accent)' }}>
              <Upload size={48} />
            </div>
            <div>
              <h3 style={{ marginBottom: '8px' }}>Select Amazon TXT or CSV File</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Drop your file here or click to browse</p>
            </div>
            <input 
              type="file" 
              accept=".csv,.txt" 
              onChange={handleFileUpload}
              style={{ position: 'absolute', opacity: 0, width: '100%', height: '100%', top: 0, left: 0, cursor: 'pointer' }}
            />
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 24px', background: 'var(--bg-primary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
              <FileText color="var(--accent)" />
              <div style={{ textAlign: 'left' }}>
                <span style={{ fontWeight: 600, display: 'block' }}>{file.name}</span>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                  {previewData ? `${previewData.length} orders processed` : `${data.length} orders detected`}
                </span>
              </div>
              <button 
                onClick={() => { setFile(null); setPreviewData(null); db.amazon_conversions.clear(); }} 
                style={{ marginLeft: '12px', background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}
                title="Clear and Upload New"
              >
                <RefreshCcw size={18} />
              </button>
            </div>
            
            {!isDone && (
              <button 
                onClick={convertData}
                disabled={isProcessing}
                className="btn btn-primary"
                style={{ padding: '16px 48px', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '12px', boxShadow: 'var(--shadow-lg)' }}
              >
                {isProcessing ? <RefreshCcw size={20} className="animate-spin" /> : <RefreshCcw size={20} />}
                {isProcessing ? 'Processing...' : 'Start Conversion'}
              </button>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="animate-shake" style={{ marginBottom: '32px', padding: '20px', background: 'var(--danger-soft)', border: '1px solid var(--danger)', borderRadius: 'var(--radius-sm)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <AlertCircle color="var(--danger)" />
            <span style={{ color: 'var(--danger)', fontWeight: 600 }}>{error}</span>
          </div>
          {missingFields.length > 0 && (
            <ul style={{ marginTop: '12px', paddingLeft: '32px', fontSize: '0.85rem', color: 'var(--danger)' }}>
              {missingFields.map((f, i) => <li key={i}>{f}</li>)}
              {missingFields.length === 5 && <li>...and more</li>}
            </ul>
          )}
        </div>
      )}

      {previewData && (
        <div className="animate-slide-up">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
              <CheckCircle size={24} color="var(--success)" />
              Conversion Preview
            </h2>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
               <button 
                onClick={() => { setFile(null); setPreviewData(null); setHasDownloaded(false); setSelectedRows([]); setPrintedRowIds([]); setActiveLabelRow(null); db.amazon_conversions.clear(); }}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button onClick={handleDownload} className="btn btn-success" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Download size={18} />
                Download CSV
              </button>
            </div>
          </div>

          {hasDownloaded && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', marginBottom: '16px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem' }}>
                <input type="checkbox" checked={selectedRows.length === previewData.length && previewData.length > 0} onChange={handleSelectAll} />
                Select all
              </label>
              <button onClick={handleBulkDelete} disabled={selectedRows.length === 0} className="btn btn-secondary" style={{ minWidth: '170px' }}>
                <Trash2 size={16} />
                Delete selected ({selectedRows.length})
              </button>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                Printed labels: <strong>{printedRowIds.length}</strong>
              </span>
            </div>
          )}

          <div className="card" style={{ padding: 0, overflow: 'hidden', boxShadow: 'var(--shadow-lg)' }}>
            <div style={{ overflowX: 'auto', maxHeight: '500px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
                <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-secondary)', zIndex: 10 }}>
                  <tr>
                    {hasDownloaded && <th style={{ padding: '14px 16px', borderBottom: '2px solid var(--border)', width: '40px' }}></th>}
                    {hasDownloaded && <th style={{ padding: '14px 16px', borderBottom: '2px solid var(--border)' }}>Actions</th>}
                    <th style={{ padding: '14px 16px', borderBottom: '2px solid var(--border)' }}>Reference</th>
                    <th style={{ padding: '14px 16px', borderBottom: '2px solid var(--border)' }}>Deliver To</th>
                    <th style={{ padding: '14px 16px', borderBottom: '2px solid var(--border)' }}>Item Description</th>
                    <th style={{ padding: '14px 16px', borderBottom: '2px solid var(--border)' }}>Custom Labels</th>
                    <th style={{ padding: '14px 16px', borderBottom: '2px solid var(--border)' }}>Send From</th>
                  </tr>
                </thead>
                <tbody>
                  {previewData.map((row, i) => {
                    const selected = selectedRows.includes(row.rowId);
                    const printed = printedRowIds.includes(row.rowId);
                    return (
                      <tr key={row.rowId || i} style={{ borderBottom: '1px solid var(--border)', background: printed ? 'rgba(220, 253, 220, 0.6)' : i % 2 === 0 ? 'transparent' : 'var(--bg-primary)' }}>
                        {hasDownloaded && (
                          <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                            <input type="checkbox" checked={selected} onChange={() => toggleRowSelection(row.rowId)} />
                          </td>
                        )}
                        {hasDownloaded && (
                          <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                            <button onClick={() => openLabelPanel(row)} className="btn btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                              <Printer size={14} />
                              Label
                            </button>
                            <button onClick={() => handleDeleteRow(row.rowId)} className="btn btn-danger" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                              <Trash2 size={14} />
                              Delete
                            </button>
                            {printed && (
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginTop: '6px', fontSize: '0.85rem', color: 'var(--success)' }}>
                                <CheckCircle size={14} /> Printed
                              </div>
                            )}
                          </td>
                        )}
                        <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span style={{ fontWeight: 600 }}>{row.sourceOrderNumber || row.orderId || '—'}</span>
                            <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{row.sourceRecipientName || '—'}</span>
                          </div>
                        </td>
                        <td style={{ padding: '12px 16px', whiteSpace: 'nowrap', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{formatAddress(row)}</td>
                        <td style={{ padding: '12px 16px', whiteSpace: 'nowrap', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.itemDescription || '—'}</td>
                        <td style={{ padding: '12px 16px', whiteSpace: 'nowrap', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{(row.items || []).map(item => `${item.customLabel || '—'}${item.quantity > 1 ? ` x${item.quantity}` : ''}`).join(' | ')}</td>
                        <td style={{ padding: '12px 16px', whiteSpace: 'nowrap', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{formatSendFrom(row)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div style={{ padding: '16px', background: 'var(--bg-secondary)', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', fontSize: '0.85rem' }}>
               <span style={{ color: 'var(--text-secondary)' }}>Total Orders: <strong>{previewData.length}</strong></span>
               <span style={{ color: 'var(--text-secondary)' }}>Download completed: <strong>{hasDownloaded ? 'Yes' : 'No'}</strong></span>
            </div>
          </div>

          {activeLabelRow && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 999, display: 'grid', placeItems: 'center', padding: '24px' }} onClick={closeLabelPanel}>
              <div style={{ width: 'min(100%, 900px)', maxHeight: 'calc(100vh - 48px)', overflowY: 'auto', background: 'var(--bg-primary)', borderRadius: '18px', boxShadow: '0 24px 56px rgba(0,0,0,0.18)', border: '1px solid var(--border)', padding: '24px' }} onClick={(e) => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap' }}>
                  <div>
                    <h3 style={{ margin: 0 }}>Label Preview</h3>
                    <p style={{ margin: '8px 0 0', color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                      Order: <strong>{activeLabelRow.sourceOrderNumber || activeLabelRow.orderId || '—'}</strong> • Buyer: <strong>{activeLabelRow.sourceRecipientName || activeLabelRow.buyerName || '—'}</strong>
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    <button className="btn btn-secondary" onClick={closeLabelPanel}>Close</button>
                    <button className="btn btn-primary" onClick={() => handlePrintLabel(activeLabelRow)} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                      <Printer size={16} /> Print Label
                    </button>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginTop: '24px' }}>
                  <div>
                    <div style={{ marginBottom: '16px', padding: '16px', borderRadius: '12px', background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                      <h4 style={{ margin: '0 0 12px', fontSize: '1rem' }}>Recipient</h4>
                      <div style={{ marginBottom: '8px' }}><strong>Name:</strong> {activeLabelRow.sourceRecipientName || activeLabelRow.buyerName || '—'}</div>
                      <div style={{ marginBottom: '8px' }}><strong>Email:</strong> {activeLabelRow.buyerEmail || '—'}</div>
                      <div style={{ marginBottom: '8px' }}><strong>Address:</strong> {formatAddress(activeLabelRow) || '—'}</div>
                      <div style={{ marginBottom: '8px' }}><strong>Send From:</strong> {formatSendFrom(activeLabelRow) || '—'}</div>
                    </div>

                    <div style={{ padding: '16px', borderRadius: '12px', background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                      <h4 style={{ margin: '0 0 12px', fontSize: '1rem' }}>Items</h4>
                      {(activeLabelRow.items || []).map((item, idx) => (
                        <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: '10px', alignItems: 'center', marginBottom: '10px' }}>
                          <div style={{ fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
                            Qty {item.quantity}
                          </div>
                          <input
                            value={item.customLabel}
                            onChange={(e) => updateCustomLabel(activeLabelRow.rowId, idx, e.target.value)}
                            placeholder="Custom label for this item"
                            style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ padding: '20px', borderRadius: '18px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', minHeight: '260px', display: 'flex', flexDirection: 'column' }}>
                      <div className="label-item" style={{ width: '100%', height: '100%', boxSizing: 'border-box', padding: '12px', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
                        <span className="label-to">To</span>
                        <strong className="label-name">
                          {activeLabelRow.sourceRecipientName || activeLabelRow.buyerName || 'Unknown'} <span className="label-orderID">({activeLabelRow.sourceOrderNumber || activeLabelRow.orderId || '—'})</span>
                        </strong>
                        <span className="label-address">{activeLabelRow['Deliver To Address Line 1']}</span>
                        {activeLabelRow['Deliver To Address Line 2'] && <span className="label-address">{activeLabelRow['Deliver To Address Line 2']}</span>}
                        <span className="label-address">{activeLabelRow['Deliver To Suburb']} {activeLabelRow['Deliver To State']} {activeLabelRow['Deliver To Postcode']}</span>
                        <div style={{ flex: 1 }}></div>
                        <div className="label-sku">
                          {(activeLabelRow.items || []).map((item, idx) => (
                            <div key={idx} className="item-line">{item.customLabel || '—'} x <b>{item.quantity}</b></div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {!previewData && (
        <>
          <div className="card" style={{ marginTop: '40px' }}>
            <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Settings size={18} />
              Mapping Configuration
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '16px', alignItems: 'center' }}>
              <div style={{ background: 'var(--bg-secondary)', padding: '12px', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem', fontWeight: 600 }}>Amazon Header</div>
              <div></div>
              <div style={{ background: 'var(--bg-secondary)', padding: '12px', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem', fontWeight: 600 }}>AusPost Column</div>
              {Object.entries(AMAZON_TO_AUSPOST_MAP).map(([amazon, auspost]) => (
                <React.Fragment key={amazon}>
                  <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)', fontSize: '0.9rem' }}>{amazon}</div>
                  <ArrowRight size={14} color="var(--text-secondary)" />
                  <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)', fontSize: '0.9rem', fontWeight: 500 }}>{auspost}</div>
                </React.Fragment>
              ))}
            </div>
          </div>
          <div style={{ marginTop: '32px', padding: '16px', background: 'var(--bg-primary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
            <h4 style={{ marginBottom: '12px', fontSize: '0.9rem' }}>Pro Tip: Missing Addresses</h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Amazon often hides buyer addresses for <strong>Pending</strong> orders or <strong>FBA</strong> (Fulfilled by Amazon) orders. 
              Ensure you use a <strong>Merchant Fulfilled</strong> order report with <strong>Unshipped</strong> status to get full delivery details.
            </p>
          </div>
        </>
      )}
    </div>
  );
}


