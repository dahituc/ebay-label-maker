import React, { useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Settings from './pages/Settings';
import Review from './pages/Review';
import Labels from './pages/Labels';
import { getSetting } from './db/database';
import { applyLabelFont } from './services/fontLoader';

function App() {
  useEffect(() => {
    const applyLabelSettings = async () => {
      const width = await getSetting('label_width');
      const height = await getSetting('label_height');
      const font = await getSetting('label_font');
      
      if (width) document.documentElement.style.setProperty('--label-width', `${width}mm`);
      if (height) document.documentElement.style.setProperty('--label-height', `${height}mm`);
      if (font) applyLabelFont(font);
    };
    applyLabelSettings();
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
                <Route path="/settings" element={<Settings />} />
              </Routes>
            </ErrorBoundary>
          </main>
        </div>
      </HashRouter>
    </ErrorBoundary>
  );
}

export default App;
