import React, { useState } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { Upload, Download, FileText, CheckCircle, AlertCircle, RefreshCcw, ArrowRight, Settings } from 'lucide-react';
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

  // Load existing conversion from DB on mount
  React.useEffect(() => {
    const loadLastConversion = async () => {
      const last = await db.amazon_conversions.orderBy('id').last();
      if (last) {
        setPreviewData(last.data);
        setFile({ name: last.filename });
        // Re-generate blob from data (CSV)
        const csv = Papa.unparse({
          fields: AUSPOST_HEADERS,
          data: last.data
        }, {
          header: false
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
        const ausPostRow = {};
        AUSPOST_HEADERS.forEach(header => {
          ausPostRow[header] = '';
        });

        Object.entries(AMAZON_TO_AUSPOST_MAP).forEach(([amazonKey, ausPostKey]) => {
          if (row[amazonKey]) {
            ausPostRow[ausPostKey] = row[amazonKey];
          }
        });

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
        ausPostRow['Item Weight'] = '0.25';
        ausPostRow['Item Dangerous Goods Flag'] = 'NO';
        ausPostRow['Signature On Delivery'] = 'NO';

        REQUIRED_FIELDS.forEach(field => {
          if (!ausPostRow[field]) {
            missing.add(`${field} (Row ${index + 1})`);
            hasMissingMandatory = true;
          }
        });

        return ausPostRow;
      });

      if (hasMissingMandatory) {
        setMissingFields(Array.from(missing).slice(0, 5));
        setError('Mandatory fields are missing. Please check your settings and the uploaded file.');
      }

      const csv = Papa.unparse({
        fields: AUSPOST_HEADERS,
        data: ausPostRows
      }, {
        header: false // Remove the header line on top as requested
      });
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      
      // Save to DB
      await db.amazon_conversions.clear();
      await db.amazon_conversions.add({
        filename: file.name,
        data: ausPostRows,
        createdAt: new Date()
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

    // Clear from DB after download
    await db.amazon_conversions.clear();
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '80px' }}>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <FileText size={28} color="var(--accent)" />
          Amazon to AusPost Converter
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
              <CheckCircle size={24} color="var(--success)" />
              Conversion Preview (Required Fields)
            </h2>
            <div style={{ display: 'flex', gap: '12px' }}>
               <button 
                onClick={() => { setFile(null); setPreviewData(null); db.amazon_conversions.clear(); }}
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

          <div className="card" style={{ padding: 0, overflow: 'hidden', boxShadow: 'var(--shadow-lg)' }}>
            <div style={{ overflowX: 'auto', maxHeight: '500px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
                <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-secondary)', zIndex: 10 }}>
                  <tr>
                    <th style={{ padding: '14px 16px', borderBottom: '2px solid var(--border)', width: '40px' }}>#</th>
                    {REQUIRED_FIELDS.map(h => (
                      <th key={h} style={{ padding: '14px 16px', borderBottom: '2px solid var(--border)', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewData.map((row, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--border)', background: i % 2 === 0 ? 'transparent' : 'var(--bg-primary)' }}>
                      <td style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontWeight: 600 }}>{i + 1}</td>
                      {REQUIRED_FIELDS.map(h => (
                        <td key={h} style={{ padding: '12px 16px', whiteSpace: 'nowrap', color: row[h] ? 'var(--text-primary)' : 'var(--danger)', fontWeight: row[h] ? 400 : 700 }}>
                          {row[h] || 'MISSING'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ padding: '16px', background: 'var(--bg-secondary)', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '24px', fontSize: '0.85rem' }}>
               <span style={{ color: 'var(--text-secondary)' }}>Total Orders: <strong>{previewData.length}</strong></span>
               <span style={{ color: 'var(--text-secondary)' }}>Fields Shown: <strong>{REQUIRED_FIELDS.length} (Required Only)</strong></span>
            </div>
          </div>
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


