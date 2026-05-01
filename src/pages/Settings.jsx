import React, { useState, useEffect } from 'react';
import { getSetting, saveSetting, getDailyUsage } from '../db/database';
import { applyLabelFont } from '../services/fontLoader';
import { Key, Activity, Save, CheckCircle, AlertCircle, Layout, Type, Search } from 'lucide-react';

const POPULAR_FONTS = [
  'Arial', 'Inter', 'Roboto', 'Open Sans', 'Lato', 'Montserrat', 
  'Oswald', 'Raleway', 'PT Sans', 'Ubuntu', 'Nunito'
];

export default function Settings() {
  const [apiKey, setApiKey] = useState('');
  const [isSaved, setIsSaved] = useState(false);
  const [dailyUsage, setDailyUsage] = useState(0);
  const maxUsage = 3000;

  const [useGeoApify, setUseGeoApify] = useState(true);
  const [labelWidth, setLabelWidth] = useState(90);
  const [labelHeight, setLabelHeight] = useState(30);
  const [selectedFont, setSelectedFont] = useState('Arial');
  const [fontSearch, setFontSearch] = useState('');
  const [allFonts, setAllFonts] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

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

        const savedWidth = await getSetting('label_width');
        if (savedWidth) setLabelWidth(parseInt(savedWidth, 10));

        const savedHeight = await getSetting('label_height');
        if (savedHeight) setLabelHeight(parseInt(savedHeight, 10));

        const savedFont = await getSetting('label_font');
        if (savedFont) setSelectedFont(savedFont);

        // Fetch font list for search
        const res = await fetch('https://cdn.jsdelivr.net/gh/hasinhayder/google-fonts/subsets/latin/display/fonts.json');
        const data = await res.json();
        if (data && data.fonts) {
          setAllFonts(data.fonts);
        }
      } catch (error) {
        console.error('Error loading settings:', error);
      }
    };
    loadData();
  }, []);

  // Live preview the font and dimensions when they change
  useEffect(() => {
    applyLabelFont(selectedFont);
  }, [selectedFont]);

  useEffect(() => {
    document.documentElement.style.setProperty('--label-width', `${labelWidth}mm`);
    document.documentElement.style.setProperty('--label-height', `${labelHeight}mm`);
  }, [labelWidth, labelHeight]);

  const handleSave = async () => {
    try {
      await saveSetting('geoapify_api_key', apiKey);
      await saveSetting('use_geoapify', useGeoApify.toString());
      await saveSetting('label_width', labelWidth.toString());
      await saveSetting('label_height', labelHeight.toString());
      await saveSetting('label_font', selectedFont);
      
      // Update CSS variables immediately
      document.documentElement.style.setProperty('--label-width', `${labelWidth}mm`);
      document.documentElement.style.setProperty('--label-height', `${labelHeight}mm`);
      applyLabelFont(selectedFont);
      
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  };

  const filteredFonts = fontSearch.length > 1 
    ? allFonts.filter(f => f.toLowerCase().includes(fontSearch.toLowerCase())).slice(0, 10)
    : [];

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
          <Layout size={20} />
          Label Configuration
        </h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', fontSize: '0.95rem', lineHeight: 1.5 }}>
          Set the dimensions and typography for your thermal labels.
        </p>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontWeight: 600, fontSize: '0.9rem' }}>Label Width (mm)</label>
            <input 
              type="number" 
              value={labelWidth}
              onChange={(e) => setLabelWidth(parseInt(e.target.value, 10) || 0)}
              style={{ 
                padding: '12px 14px', 
                borderRadius: 'var(--radius-sm)', 
                border: '1px solid var(--border)',
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                width: '100%',
                fontSize: '1rem',
                outline: 'none'
              }} 
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontWeight: 600, fontSize: '0.9rem' }}>Label Height (mm)</label>
            <input 
              type="number" 
              value={labelHeight}
              onChange={(e) => setLabelHeight(parseInt(e.target.value, 10) || 0)}
              style={{ 
                padding: '12px 14px', 
                borderRadius: 'var(--radius-sm)', 
                border: '1px solid var(--border)',
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                width: '100%',
                fontSize: '1rem',
                outline: 'none'
              }} 
            />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px', padding: '16px', background: 'var(--bg-primary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <Type size={18} color="var(--accent)" />
            <span style={{ fontWeight: 600 }}>Label Font</span>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {POPULAR_FONTS.map(font => (
              <button
                key={font}
                onClick={() => setSelectedFont(font)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '20px',
                  border: '1px solid',
                  borderColor: selectedFont === font ? 'var(--accent)' : 'var(--border)',
                  background: selectedFont === font ? 'var(--accent)' : 'var(--bg-secondary)',
                  color: selectedFont === font ? 'white' : 'var(--text-primary)',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  transition: 'var(--transition)',
                  fontFamily: font === 'Arial' ? 'Arial' : `'${font}', sans-serif`
                }}
              >
                {font}
              </button>
            ))}
          </div>

          <div style={{ position: 'relative', marginTop: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
              <Search size={16} color="var(--text-secondary)" />
              <input 
                type="text" 
                placeholder="Search all Google Fonts..." 
                value={fontSearch}
                onChange={(e) => setFontSearch(e.target.value)}
                style={{ 
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--text-primary)',
                  width: '100%',
                  fontSize: '0.9rem',
                  outline: 'none'
                }}
              />
            </div>

            {filteredFonts.length > 0 && (
              <div style={{ 
                position: 'absolute', 
                top: '100%', 
                left: 0, 
                right: 0, 
                zIndex: 10, 
                background: 'var(--bg-secondary)', 
                border: '1px solid var(--border)', 
                borderRadius: 'var(--radius-sm)', 
                marginTop: '4px',
                boxShadow: 'var(--shadow-lg)',
                maxHeight: '200px',
                overflowY: 'auto'
              }}>
                {filteredFonts.map(font => (
                  <div 
                    key={font}
                    onClick={() => {
                      setSelectedFont(font);
                      setFontSearch('');
                    }}
                    style={{ 
                      padding: '10px 16px', 
                      cursor: 'pointer', 
                      borderBottom: '1px solid var(--border)',
                      transition: 'var(--transition)',
                      fontFamily: `'${font}', sans-serif`
                    }}
                    onMouseOver={(e) => e.currentTarget.style.background = 'var(--bg-primary)'}
                    onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    {font}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '8px' }}>
             <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Selected:</span>
             <span style={{ fontWeight: 700, color: 'var(--accent)', fontFamily: `'${selectedFont}', sans-serif` }}>{selectedFont}</span>
          </div>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <label style={{ fontWeight: 600, fontSize: '0.9rem', display: 'block', marginBottom: '12px' }}>Preview Label</label>
          <div style={{ 
            background: 'var(--bg-primary)', 
            padding: '24px', 
            borderRadius: 'var(--radius-sm)', 
            border: '1px solid var(--border)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '150px',
            overflow: 'auto'
          }}>
            <div className="label-item" style={{ boxShadow: 'var(--shadow-lg)', border: '1px solid var(--accent)' }}>
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
            transition: 'var(--transition)'
          }}
        >
          {isSaved ? <CheckCircle size={18} /> : <Save size={18} />}
          {isSaved ? 'Saved Successfully' : 'Save Label Config'}
        </button>
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
