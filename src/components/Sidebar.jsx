import { NavLink } from 'react-router-dom';
import { LayoutDashboard, AlertCircle, Printer, Settings, Box, Moon, Sun, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import React, { useState, useEffect } from 'react';

function getInitialTheme() {
  const saved = localStorage.getItem('ebay-label-theme');
  if (saved) return saved;
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
  return 'light';
}

function getInitialCollapsed() {
  return localStorage.getItem('ebay-label-sidebar') === 'collapsed';
}

export default function Sidebar({ className = "" }) {
  const [theme, setTheme] = useState(getInitialTheme);
  const [collapsed, setCollapsed] = useState(getInitialCollapsed);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('ebay-label-theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('ebay-label-sidebar', collapsed ? 'collapsed' : 'expanded');
  }, [collapsed]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  return (
    <aside className={`sidebar ${collapsed ? 'sidebar-collapsed' : ''} ${className}`}>
      {/* Header */}
      <div className="sidebar-header">
        <Box color="var(--accent)" size={28} style={{ flexShrink: 0 }} />
        {!collapsed && <h2 style={{ margin: 0, whiteSpace: 'nowrap' }}>Label Maker</h2>}
      </div>

      {/* Collapse toggle */}
      <button
        className="sidebar-collapse-btn"
        onClick={() => setCollapsed(prev => !prev)}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
        {!collapsed && <span>Collapse</span>}
      </button>
      
      {/* Nav links */}
      <nav className="sidebar-nav">
        <NavLink to="/dashboard" className={({isActive}) => isActive ? "nav-link active" : "nav-link"} title="Dashboard">
          <LayoutDashboard />
          {!collapsed && <span>Dashboard</span>}
        </NavLink>
        <NavLink to="/review" className={({isActive}) => isActive ? "nav-link active" : "nav-link"} title="Review Issues">
          <AlertCircle />
          {!collapsed && <span>Review Issues</span>}
        </NavLink>
        <NavLink to="/labels" className={({isActive}) => isActive ? "nav-link active" : "nav-link"} title="Print Labels">
          <Printer />
          {!collapsed && <span>Print Labels</span>}
        </NavLink>

        {/* Spacer */}
        <div style={{ flex: 1 }}></div>
        
        {/* Bottom items */}
        <button className="theme-toggle" onClick={toggleTheme} title={theme === 'dark' ? 'Light Mode' : 'Dark Mode'}>
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          {!collapsed && <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>}
        </button>

        <NavLink to="/settings" className={({isActive}) => isActive ? "nav-link active" : "nav-link"} title="Settings" style={{ marginTop: '4px' }}>
          <Settings />
          {!collapsed && <span>Settings</span>}
        </NavLink>
      </nav>
    </aside>
  );
}
