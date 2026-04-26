import { NavLink } from 'react-router-dom';
import { LayoutDashboard, AlertCircle, Printer, Settings, Box } from 'lucide-react';

export default function Sidebar({ className = "" }) {
  return (
    <aside className={`sidebar ${className}`}>
      <div style={{ padding: '0 16px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Box color="var(--accent)" size={28} />
        <h2 style={{ margin: 0 }}>Label Maker</h2>
      </div>
      
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <NavLink to="/dashboard" className={({isActive}) => isActive ? "nav-link active" : "nav-link"}>
          <LayoutDashboard />
          Dashboard
        </NavLink>
        <NavLink to="/review" className={({isActive}) => isActive ? "nav-link active" : "nav-link"}>
          <AlertCircle />
          Review Issues
        </NavLink>
        <NavLink to="/labels" className={({isActive}) => isActive ? "nav-link active" : "nav-link"}>
          <Printer />
          Print Labels
        </NavLink>
        <div style={{ flex: 1 }}></div>
        <NavLink to="/settings" className={({isActive}) => isActive ? "nav-link active" : "nav-link"} style={{ marginTop: 'auto' }}>
          <Settings />
          Settings
        </NavLink>
      </nav>
    </aside>
  );
}
