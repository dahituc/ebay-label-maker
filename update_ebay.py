import re

with open('src/pages/EbayConverter.jsx', 'r') as f:
    content = f.read()

# Chunk 1: Imports
content = content.replace(
    "import { Upload, Download, FileText, CheckCircle, AlertCircle, RefreshCcw, ArrowRight, Settings, Printer, Trash2 } from 'lucide-react';\nimport { db, getSetting } from '../db/database';",
    "import { Upload, Download, FileText, CheckCircle, AlertCircle, RefreshCcw, ArrowRight, Settings, Printer, Trash2, Edit2 } from 'lucide-react';\nimport { db, getSetting } from '../db/database';\nimport { validateAddresses } from '../services/addressValidator';"
)

# Chunk 2: State
content = content.replace(
    "  const [activeLabelRow, setActiveLabelRow] = React.useState(null);",
    "  const [activeLabelRow, setActiveLabelRow] = React.useState(null);\n  const [editingAddressRow, setEditingAddressRow] = React.useState(null);\n  const [editAddressData, setEditAddressData] = React.useState({});\n  const [isValidating, setIsValidating] = React.useState(false);"
)

# Chunk 3: Helper functions
helpers_orig = """  const closeLabelPanel = () => {
    setActiveLabelRow(null);
  };

  React.useEffect(() => {"""
helpers_new = """  const closeLabelPanel = () => {
    setActiveLabelRow(null);
  };

  const openEditAddress = (row) => {
    setEditingAddressRow(row);
    setEditAddressData({
      'Deliver To Name': row['Deliver To Name'] || '',
      'Deliver To Address Line 1': row['Deliver To Address Line 1'] || '',
      'Deliver To Address Line 2': row['Deliver To Address Line 2'] || '',
      'Deliver To Suburb': row['Deliver To Suburb'] || '',
      'Deliver To State': row['Deliver To State'] || '',
      'Deliver To Postcode': row['Deliver To Postcode'] || '',
    });
  };

  const handleEditAddressChange = (e) => {
    setEditAddressData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const saveEditedAddress = async () => {
    setIsValidating(true);
    const addressPayload = [{
      address1: editAddressData['Deliver To Address Line 1'],
      address2: editAddressData['Deliver To Address Line 2'],
      city: editAddressData['Deliver To Suburb'],
      state: editAddressData['Deliver To State'],
      postcode: editAddressData['Deliver To Postcode'],
    }];
    
    const validationResults = await validateAddresses(addressPayload);
    
    const nextRows = previewData.map(row => {
      if (row.rowId === editingAddressRow.rowId) {
        return {
          ...row,
          ...editAddressData,
          validationStatus: validationResults[0].status,
          validationError: validationResults[0].error
        };
      }
      return row;
    });

    await updatePreviewRows(nextRows);
    setEditingAddressRow(null);
    setIsValidating(false);
  };

  React.useEffect(() => {"""
content = content.replace(helpers_orig, helpers_new)

# Chunk 4: Papa.parse
content = content.replace(
    "      skipEmptyLines: true,",
    "      skipEmptyLines: 'greedy',"
)

# Chunk 5: Filtering
filter_orig = """      data.forEach((row, index) => {
        const normalizedRow = normalizeRow(row);
        const sourceOrderNumber = resolveValue(normalizedRow, ['sales-record-number', 'order-number', 'order-id']);
        const key = sourceOrderNumber || `unknown-${index}`;
        
        if (!groupedOrders.has(key)) {"""
filter_new = """      data.forEach((row, index) => {
        const normalizedRow = normalizeRow(row);
        const sourceOrderNumber = resolveValue(normalizedRow, ['sales-record-number', 'order-number', 'order-id']);
        const buyerName = getBuyerName(normalizedRow);
        
        if (!sourceOrderNumber && !buyerName) return;

        const key = sourceOrderNumber || `unknown-${index}`;
        
        if (!groupedOrders.has(key)) {"""
content = content.replace(filter_orig, filter_new)

# Chunk 6: Address validation
val_orig = """      if (hasMissingMandatory) {
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
      await db.ebay_conversions.clear();
      await db.ebay_conversions.add({
        filename: file.name,
        data: ausPostRows,
        createdAt: new Date(),
        downloaded: false
      });

      setPreviewData(ausPostRows);
      setConvertedBlob(blob);
      setIsDone(true);"""
val_new = """      if (hasMissingMandatory) {
        setMissingFields(Array.from(missing).slice(0, 5));
        setError('Mandatory fields are missing. Please check your settings and the uploaded file.');
      }

      const addressPayload = ausPostRows.map(row => ({
        address1: row['Deliver To Address Line 1'],
        address2: row['Deliver To Address Line 2'],
        city: row['Deliver To Suburb'],
        state: row['Deliver To State'],
        postcode: row['Deliver To Postcode']
      }));

      const validationResults = await validateAddresses(addressPayload);

      const finalAusPostRows = ausPostRows.map((row, idx) => ({
        ...row,
        validationStatus: validationResults[idx].status,
        validationError: validationResults[idx].error
      }));

      const csv = Papa.unparse({
        fields: AUSPOST_HEADERS,
        data: finalAusPostRows
      }, {
        header: true
      });
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      
      // Save to DB
      await db.ebay_conversions.clear();
      await db.ebay_conversions.add({
        filename: file.name,
        data: finalAusPostRows,
        createdAt: new Date(),
        downloaded: false
      });

      setPreviewData(finalAusPostRows);
      setConvertedBlob(blob);
      setIsDone(true);"""
content = content.replace(val_orig, val_new)

# Chunk 7: Download button
dl_orig = """            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
               <button 
                onClick={() => { setFile(null); setPreviewData(null); setHasDownloaded(false); setSelectedRows([]); setPrintedRowIds([]); setActiveLabelRow(null); db.ebay_conversions.clear(); }}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button onClick={handleDownload} className="btn btn-success" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Download size={18} />
                Download CSV
              </button>
            </div>"""
dl_new = """            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
               {previewData.some(r => r.validationStatus && r.validationStatus !== 'valid') && (
                 <span style={{ color: 'var(--danger)', fontSize: '0.9rem', fontWeight: 600 }}>
                   Fix invalid addresses to download
                 </span>
               )}
               <button 
                onClick={() => { setFile(null); setPreviewData(null); setHasDownloaded(false); setSelectedRows([]); setPrintedRowIds([]); setActiveLabelRow(null); db.ebay_conversions.clear(); }}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button 
                onClick={handleDownload} 
                className="btn btn-success" 
                style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: previewData.some(r => r.validationStatus && r.validationStatus !== 'valid') ? 0.5 : 1 }}
                disabled={previewData.some(r => r.validationStatus && r.validationStatus !== 'valid')}
              >
                <Download size={18} />
                Download CSV
              </button>
            </div>"""
content = content.replace(dl_orig, dl_new)

# Chunk 8: Bulk delete display
bulk_orig = """          {hasDownloaded && (
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
          )}"""
bulk_new = """          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', marginBottom: '16px' }}>
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
          </div>"""
content = content.replace(bulk_orig, bulk_new)

# Chunk 9: Table headers
th_orig = """                <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-secondary)', zIndex: 10 }}>
                  <tr>
                    {hasDownloaded && <th style={{ padding: '14px 16px', borderBottom: '2px solid var(--border)', width: '40px' }}></th>}
                    {hasDownloaded && <th style={{ padding: '14px 16px', borderBottom: '2px solid var(--border)' }}>Actions</th>}
                    <th style={{ padding: '14px 16px', borderBottom: '2px solid var(--border)' }}>Reference</th>"""
th_new = """                <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-secondary)', zIndex: 10 }}>
                  <tr>
                    <th style={{ padding: '14px 16px', borderBottom: '2px solid var(--border)', width: '40px' }}></th>
                    <th style={{ padding: '14px 16px', borderBottom: '2px solid var(--border)' }}>Actions</th>
                    <th style={{ padding: '14px 16px', borderBottom: '2px solid var(--border)' }}>Reference</th>"""
content = content.replace(th_orig, th_new)

# Chunk 10: Table body
tb_orig = """                      <tr key={row.rowId || i} style={{ borderBottom: '1px solid var(--border)', background: printed ? 'rgba(220, 253, 220, 0.6)' : i % 2 === 0 ? 'transparent' : 'var(--bg-primary)' }}>
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
                        <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>"""
tb_new = """                      <tr key={row.rowId || i} style={{ borderBottom: '1px solid var(--border)', background: printed ? 'rgba(220, 253, 220, 0.6)' : i % 2 === 0 ? 'transparent' : 'var(--bg-primary)' }}>
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          <input type="checkbox" checked={selected} onChange={() => toggleRowSelection(row.rowId)} />
                        </td>
                        <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                          <button onClick={() => openEditAddress(row)} className="btn btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginBottom: '8px', marginRight: '8px' }}>
                            <Edit2 size={14} />
                            Edit
                          </button>
                          <button onClick={() => openLabelPanel(row)} className="btn btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginBottom: '8px', marginRight: '8px' }}>
                            <Printer size={14} />
                            Label
                          </button>
                          <button onClick={() => handleDeleteRow(row.rowId)} className="btn btn-danger" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                            <Trash2 size={14} />
                            Delete
                          </button>
                          {printed && (
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginTop: '6px', fontSize: '0.85rem', color: 'var(--success)' }}>
                              <CheckCircle size={14} /> Printed
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>"""
content = content.replace(tb_orig, tb_new)

# Chunk 11: Address cell validation UI
td_orig = """                        <td style={{ padding: '12px 16px', whiteSpace: 'nowrap', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{formatAddress(row)}</td>
                        <td style={{ padding: '12px 16px', whiteSpace: 'nowrap', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.itemDescription || '—'}</td>"""
td_new = """                        <td style={{ padding: '12px 16px', whiteSpace: 'nowrap', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {row.validationStatus && row.validationStatus !== 'valid' && (
                              <AlertCircle size={14} color="var(--danger)" title={row.validationError || 'Invalid Address'} />
                            )}
                            <span title={formatAddress(row)}>{formatAddress(row)}</span>
                          </div>
                        </td>
                        <td style={{ padding: '12px 16px', whiteSpace: 'nowrap', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.itemDescription || '—'}</td>"""
content = content.replace(td_orig, td_new)

# Chunk 12: Edit modal
modal_orig = """          {activeLabelRow && ("""
modal_new = """          {editingAddressRow && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 999, display: 'grid', placeItems: 'center', padding: '24px' }} onClick={() => setEditingAddressRow(null)}>
              <div style={{ width: 'min(100%, 500px)', background: 'var(--bg-primary)', borderRadius: '18px', boxShadow: '0 24px 56px rgba(0,0,0,0.18)', border: '1px solid var(--border)', padding: '24px' }} onClick={(e) => e.stopPropagation()}>
                <h3 style={{ margin: '0 0 16px' }}>Edit Address</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
                  <input name="Deliver To Name" value={editAddressData['Deliver To Name']} onChange={handleEditAddressChange} placeholder="Name" style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
                  <input name="Deliver To Address Line 1" value={editAddressData['Deliver To Address Line 1']} onChange={handleEditAddressChange} placeholder="Address Line 1" style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
                  <input name="Deliver To Address Line 2" value={editAddressData['Deliver To Address Line 2']} onChange={handleEditAddressChange} placeholder="Address Line 2 (Optional)" style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
                  <input name="Deliver To Suburb" value={editAddressData['Deliver To Suburb']} onChange={handleEditAddressChange} placeholder="Suburb / City" style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <input name="Deliver To State" value={editAddressData['Deliver To State']} onChange={handleEditAddressChange} placeholder="State (e.g. VIC)" style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
                    <input name="Deliver To Postcode" value={editAddressData['Deliver To Postcode']} onChange={handleEditAddressChange} placeholder="Postcode" style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                  <button className="btn btn-secondary" onClick={() => setEditingAddressRow(null)}>Cancel</button>
                  <button className="btn btn-primary" onClick={saveEditedAddress} disabled={isValidating}>
                    {isValidating ? 'Validating...' : 'Save & Revalidate'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeLabelRow && ("""
content = content.replace(modal_orig, modal_new)

with open('src/pages/EbayConverter.jsx', 'w') as f:
    f.write(content)
