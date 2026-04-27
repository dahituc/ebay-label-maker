import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { parseEbayCsv } from '../services/csvParser.js';
import { validateAddresses } from '../services/addressValidator.js';
import { db } from '../db/database.js';
import { UploadCloud, CheckCircle, AlertTriangle, Loader, FileText, Clock, Archive } from 'lucide-react';

export default function Dashboard() {
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');

  const recentLogs = useLiveQuery(() => db.csv_logs.orderBy('id').reverse().limit(5).toArray());
  const latestLog = recentLogs && recentLogs.length > 0 ? recentLogs[0] : null;

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsProcessing(true);
    setProgress('Parsing CSV...');
    setError('');

    try {
      // 1. Parse CSV
      const parsedOrders = await parseEbayCsv(file);
      
      if (parsedOrders.length === 0) {
        throw new Error('No valid orders found in CSV.');
      }

      // 2. Validate Addresses
      setProgress(`Validating ${parsedOrders.length} addresses...`);
      const validatedOrders = await validateAddresses(parsedOrders);
      
      // 3. Save to DB
      setProgress('Saving results...');
      await db.orders.clear(); // Clear previous session
      
      const currentTimestamp = new Date().toISOString();
      const ordersToSave = validatedOrders.map(o => ({
        ...o,
        orderId: o.orderIds, // Map for schema
        batchTimestamp: currentTimestamp
      }));
      
      await db.orders.bulkAdd(ordersToSave);

      // 4. Summarize and Log
      const validCount = validatedOrders.filter(o => o.status === 'valid').length;
      const manualCount = validatedOrders.filter(o => o.status === 'manual').length;
      const invalidCount = validatedOrders.length - validCount - manualCount;

      await db.csv_logs.add({
        filename: file.name,
        processedAt: new Date().toISOString(),
        totalRows: validatedOrders.length,
        validCount,
        invalidCount,
        manualCount,
        ordersData: ordersToSave // Store full validated order snapshot for quick load
      });
      
      // Keep only last 5 logs
      const logsCount = await db.csv_logs.count();
      if (logsCount > 5) {
        const oldestLogs = await db.csv_logs.orderBy('id').limit(logsCount - 5).toArray();
        await db.csv_logs.bulkDelete(oldestLogs.map(l => l.id));
      }
      
      // Clear file input so same file can be uploaded again if needed
      event.target.value = null;
    } catch (err) {
      console.error(err);
      setError(err.message || 'An error occurred during processing.');
    } finally {
      setIsProcessing(false);
      setProgress('');
    }
  };

  const loadPastSession = async (log) => {
    if (!log.ordersData) {
      alert("No order details saved for this session.");
      return;
    }
    setIsProcessing(true);
    setProgress('Loading past session...');
    try {
      const dataToLoad = log.ordersData.map(o => ({
        ...o,
        batchTimestamp: o.batchTimestamp || log.processedAt
      }));
      await db.orders.clear();
      await db.orders.bulkAdd(dataToLoad);
      alert(`Loaded session from ${log.filename}. You can now view Labels or Review.`);
    } catch (err) {
      console.error(err);
      setError('Failed to load past session: ' + err.message);
    } finally {
      setIsProcessing(false);
      setProgress('');
    }
  };

  return (
    <div className="animate-fade-in">
      <h1 style={{ marginBottom: '24px' }}>Dashboard</h1>
      
      {/* SECTION 1: Latest Record */}
      {latestLog ? (
        <div className="card" style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
            <div>
              <h2 style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText size={24} color="var(--primary)" />
                Latest Processing Record
              </h2>
              <p style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Clock size={16} />
                {new Date(latestLog.processedAt).toLocaleString()} — <strong>{latestLog.filename}</strong>
              </p>
            </div>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '24px', marginBottom: '32px' }}>
            <div style={{ 
              padding: '32px', 
              borderRadius: 'var(--radius)', 
              background: 'rgba(34, 197, 94, 0.1)', 
              border: '1px solid rgba(34, 197, 94, 0.2)',
              textAlign: 'center'
            }}>
              <CheckCircle size={48} color="#22c55e" style={{ margin: '0 auto 16px' }} />
              <div style={{ fontSize: '2rem', fontWeight: 700, color: '#22c55e', marginBottom: '8px' }}>{latestLog.validCount}</div>
              <div style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Valid Orders</div>
            </div>
            
            <div style={{ 
              padding: '32px', 
              borderRadius: 'var(--radius)', 
              background: latestLog.invalidCount > 0 ? 'rgba(245, 158, 11, 0.1)' : 'var(--bg-secondary)', 
              border: `1px solid ${latestLog.invalidCount > 0 ? 'rgba(245, 158, 11, 0.2)' : 'var(--border)'}`,
              textAlign: 'center'
            }}>
              <AlertTriangle size={48} color={latestLog.invalidCount > 0 ? '#f59e0b' : 'var(--text-secondary)'} style={{ margin: '0 auto 16px' }} />
              <div style={{ fontSize: '2rem', fontWeight: 700, color: latestLog.invalidCount > 0 ? '#f59e0b' : 'var(--text-secondary)', marginBottom: '8px' }}>{latestLog.invalidCount}</div>
              <div style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Invalid Records</div>
            </div>

            <div style={{ 
              padding: '32px', 
              borderRadius: 'var(--radius)', 
              background: latestLog.manualCount > 0 ? 'rgba(59, 130, 246, 0.1)' : 'var(--bg-secondary)', 
              border: `1px solid ${latestLog.manualCount > 0 ? 'rgba(59, 130, 246, 0.2)' : 'var(--border)'}`,
              textAlign: 'center'
            }}>
              <Archive size={48} color={latestLog.manualCount > 0 ? '#3b82f6' : 'var(--text-secondary)'} style={{ margin: '0 auto 16px' }} />
              <div style={{ fontSize: '2rem', fontWeight: 700, color: latestLog.manualCount > 0 ? '#3b82f6' : 'var(--text-secondary)', marginBottom: '8px' }}>{latestLog.manualCount || 0}</div>
              <div style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Manual Processing</div>
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
            <button 
              className="btn btn-primary" 
              onClick={() => navigate('/labels')}
              style={{ fontSize: '1.1rem', padding: '12px 32px' }}
              disabled={latestLog.validCount === 0}
            >
              Create {latestLog.validCount} Labels
            </button>
            
            {latestLog.invalidCount > 0 && (
              <button 
                className="btn" 
                onClick={() => navigate('/review')}
                style={{ fontSize: '1.1rem', padding: '12px 32px', background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
              >
                Review {latestLog.invalidCount} Invalid Records
              </button>
            )}
          </div>
        </div>
      ) : null}

      {/* SECTION 2: Process New CSV */}
      <div className="card" style={{ marginBottom: '32px' }}>
        <h2 style={{ marginBottom: '8px' }}>Process New CSV</h2>
        <p style={{ color: 'var(--text-secondary)' }}>Select a new eBay orders CSV to begin processing. This will overwrite current session data.</p>
        
        <label 
          style={{ 
            display: 'block',
            border: '2px dashed var(--border)', 
            borderRadius: 'var(--radius)', 
            padding: '60px', 
            textAlign: 'center',
            marginTop: '24px',
            cursor: isProcessing ? 'wait' : 'pointer',
            transition: 'var(--transition)',
            background: 'var(--bg-secondary)',
            position: 'relative'
          }}
        >
          <input 
            type="file" 
            accept=".csv" 
            onChange={handleFileUpload} 
            disabled={isProcessing}
            style={{ display: 'none' }}
          />
          {isProcessing ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
              <Loader className="spin" size={48} color="var(--primary)" />
              <span style={{ fontWeight: 500 }}>{progress}</span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', color: 'var(--text-secondary)' }}>
              <UploadCloud size={48} />
              <span style={{ fontWeight: 500, fontSize: '1.1rem' }}>Click here to select your .csv file</span>
            </div>
          )}
        </label>

        {error && (
          <div style={{ marginTop: '24px', padding: '16px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: 'var(--radius-sm)' }}>
            <strong>Error:</strong> {error}
          </div>
        )}
      </div>

      {/* SECTION 3: Recent Processed Logs */}
      {recentLogs && recentLogs.length > 0 && (
        <div className="card">
          <h2 style={{ marginBottom: '16px' }}>Recent Processed Files</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {recentLogs.map(log => (
              <div key={log.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                <div>
                  <div style={{ fontWeight: 600, marginBottom: '4px' }}>{log.filename}</div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    {new Date(log.processedAt).toLocaleString()} — {log.validCount} Valid, {log.invalidCount} Invalid, {log.manualCount || 0} Manual
                  </div>
                </div>
                <button 
                  className="btn" 
                  style={{ padding: '8px 16px', fontSize: '0.9rem', background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                  onClick={() => loadPastSession(log)}
                >
                  Load Session
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
