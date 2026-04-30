import React, { useState, useEffect } from 'react';
import { Key, Activity, Save, CheckCircle, AlertCircle } from 'lucide-react';
import { getSetting, saveSetting, getDailyUsage } from '../db/database';

export default function Settings() {
  const [apiKey, setApiKey] = useState('');
  const [isSaved, setIsSaved] = useState(false);
  const [dailyUsage, setDailyUsage] = useState(0);
  const maxUsage = 3000;

  const [useGeoApify, setUseGeoApify] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const savedKey = await getSetting('geoapify_api_key');
        if (savedKey) setApiKey(savedKey);

        const savedUseGeo = await getSetting('use_geoapify');
        if (savedUseGeo !== null) setUseGeoApify(savedUseGeo === 'true');

        const today = new Date().toISOString().split('T')[0];
        const usageCount = await getDailyUsage(today);
        setDailyUsage(usageCount);
      } catch (error) {
        console.error('Error loading settings:', error);
      }
    };
    loadData();
  }, []);

  const handleSave = async () => {
    try {
      await saveSetting('geoapify_api_key', apiKey);
      await saveSetting('use_geoapify', useGeoApify.toString());
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  };

  const usagePercentage = Math.min((dailyUsage / maxUsage) * 100, 100);
  const getUsageColor = () => {
    if (usagePercentage < 50) return 'var(--success)';
    if (usagePercentage < 85) return 'var(--warning)';
    return 'var(--danger)';
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <div>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Key size={28} color="var(--accent)" />
          Settings
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>Manage your application configuration and API quotas.</p>
      </div>

      <div className="card" style={{ maxWidth: '600px' }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Key size={20} />
          API Integrations
        </h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', fontSize: '0.95rem', lineHeight: 1.5 }}>
          Configure your Geoapify API key. This is required to seamlessly validate addresses that fail local offline validation.
        </p>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: 'var(--bg-primary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
            <input 
              type="checkbox" 
              id="useGeoApify"
              checked={useGeoApify}
              onChange={(e) => setUseGeoApify(e.target.checked)}
              style={{ width: '18px', height: '18px', cursor: 'pointer' }}
            />
            <label htmlFor="useGeoApify" style={{ fontWeight: 600, fontSize: '0.95rem', cursor: 'pointer', flex: 1 }}>
              Enable Geoapify Address Validation
            </label>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontWeight: 600, fontSize: '0.9rem' }}>Geoapify API Key</label>
            <input 
              type="password" 
              placeholder="Enter your API key" 
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              disabled={!useGeoApify}
              style={{ 
                padding: '12px 14px', 
                borderRadius: 'var(--radius-sm)', 
                border: '1px solid var(--border)',
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                width: '100%',
                fontSize: '1rem',
                outline: 'none',
                transition: 'var(--transition)',
                opacity: useGeoApify ? 1 : 0.6
              }} 
              onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
            />
          </div>
          
          <button 
            onClick={handleSave}
            style={{
              background: 'var(--accent)',
              color: 'white',
              border: 'none',
              padding: '12px 20px',
              borderRadius: 'var(--radius-sm)',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              alignSelf: 'flex-start',
              transition: 'var(--transition)'
            }}
            onMouseOver={(e) => e.currentTarget.style.background = 'var(--accent-hover)'}
            onMouseOut={(e) => e.currentTarget.style.background = 'var(--accent)'}
          >
            {isSaved ? <CheckCircle size={18} /> : <Save size={18} />}
            {isSaved ? 'Saved Successfully' : 'Save Settings'}
          </button>
        </div>
      </div>

      <div className="card" style={{ maxWidth: '600px' }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Activity size={20} />
          API Daily Usage Quota
        </h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', fontSize: '0.95rem', lineHeight: 1.5 }}>
          Monitor your Geoapify batch processing limits to avoid overages. The free tier allows up to 3,000 validations per day.
        </p>

        <div style={{ background: 'var(--bg-primary)', padding: '20px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontWeight: 600 }}>
            <span>Requests Used</span>
            <span>{dailyUsage.toLocaleString()} / {maxUsage.toLocaleString()}</span>
          </div>
          
          <div style={{ width: '100%', backgroundColor: 'var(--border)', height: '10px', borderRadius: '5px', overflow: 'hidden' }}>
            <div style={{ 
              width: `${usagePercentage}%`, 
              backgroundColor: getUsageColor(), 
              height: '100%',
              transition: 'width 0.5s ease-in-out' 
            }} />
          </div>

          {usagePercentage >= 90 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '16px', color: 'var(--danger)', fontSize: '0.9rem', fontWeight: 500 }}>
              <AlertCircle size={16} />
              You are approaching your daily free limit!
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
