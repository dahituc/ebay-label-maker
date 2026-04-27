import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Settings from './pages/Settings';
import Review from './pages/Review';
import Labels from './pages/Labels';

function App() {
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
