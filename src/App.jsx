import React, { useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Settings from './pages/Settings';
import Review from './pages/Review';
import Labels from './pages/Labels';
import Invoices from './pages/Invoices';
import InvoiceItems from './pages/InvoiceItems';
import Guide from './pages/Guide';
import AmazonConverter from './pages/AmazonConverter';
import { getSetting } from './db/database';
import { applyLabelFont } from './services/fontLoader';
import { NotificationService } from './services/notificationService';

function App() {
  useEffect(() => {
    const applyGlobalSettings = async () => {
      const width = await getSetting('label_width');
      const height = await getSetting('label_height');
      const font = await getSetting('label_font');
      const theme = await getSetting('theme');
      const palette = await getSetting('palette');
      
      if (width) document.documentElement.style.setProperty('--label-width', `${width}mm`);
      if (height) document.documentElement.style.setProperty('--label-height', `${height}mm`);
      if (font) applyLabelFont(font);
      if (theme) document.documentElement.setAttribute('data-theme', theme);
      if (palette) document.documentElement.setAttribute('data-palette', palette);
    };
    applyGlobalSettings();
  }, []);

  // Request notification permission when app loads
  useEffect(() => {
    NotificationService.requestPermission().catch(err => 
      console.warn('Notification permission request failed:', err)
    );
  }, []);

  return (
    <ErrorBoundary>
      <HashRouter>
        <div className="app-container">
          <Sidebar className="print-hide" />
          <main className="main-content">
            <ErrorBoundary>
              <Routes>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/review" element={<Review />} />
                <Route path="/labels" element={<Labels />} />
                <Route path="/invoices" element={<Invoices />} />
                <Route path="/invoice-items" element={<InvoiceItems />} />
                <Route path="/amazon" element={<AmazonConverter />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/guide" element={<Guide />} />
              </Routes>
            </ErrorBoundary>
          </main>
        </div>
      </HashRouter>
    </ErrorBoundary>
  );
}

export default App;
