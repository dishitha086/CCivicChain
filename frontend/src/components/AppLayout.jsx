import { useState } from 'react';
import { Outlet, NavLink, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, FileText, PlusCircle, Users, User,
  Shield, LogOut, Layers, Link2, CheckCircle2, ChevronRight,
  Menu, X, Cpu, Bell, Activity
} from 'lucide-react';

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getDashboardPath = () => {
    if (!user) return '/login';
    if (user.role === 'CITIZEN') return '/citizen-dashboard';
    if (user.role === 'ADMIN') return '/admin-dashboard';
    return '/authority-dashboard';
  };

  const getBreadcrumbTitle = () => {
    const p = location.pathname;
    if (p.includes('/ledger')) return 'Audit ledger';
    if (p.includes('/complaints/new')) return 'Submit complaint';
    if (p.includes('/complaints')) return 'Complaints';
    if (p.includes('/users')) return 'Manage users';
    if (p.includes('/profile')) return 'Profile';
    return 'Overview';
  };

  const initials = user?.name ? user.name.slice(0, 2).toUpperCase() : 'CC';

  return (
    <div className="app-shell" style={{ display: 'flex', minHeight: '100vh', background: 'var(--background)' }}>
      {/* Sidebar matching Emerald Ledger Vision */}
      <aside className={`sidebar ${mobileOpen ? 'open' : ''}`}>
        <Link to="/" className="brand">
          <span className="brand-mark">
            <Link2 size={24} color="var(--primary)" />
          </span>
          <span>
            CivicChain
            <small>TRUST, MADE VERIFIABLE.</small>
          </span>
        </Link>

        <div className="nav-caption">Workspace</div>
        <nav className="side-nav" aria-label="Main navigation">
          <NavLink
            to={getDashboardPath()}
            className={({ isActive }) => `side-nav-item ${isActive ? 'active' : ''}`}
            onClick={() => setMobileOpen(false)}
          >
            <LayoutDashboard size={16} />
            <span>Overview</span>
            {location.pathname.includes('dashboard') && <ChevronRight size={12} className="ml-auto" />}
          </NavLink>

          <NavLink
            to="/complaints"
            className={({ isActive }) => `side-nav-item ${isActive ? 'active' : ''}`}
            onClick={() => setMobileOpen(false)}
          >
            <FileText size={16} />
            <span>Complaints</span>
            <span className="nav-count">112</span>
          </NavLink>

          {(user?.role === 'CITIZEN' || user?.role === 'ADMIN') && (
            <NavLink
              to="/complaints/new"
              className={({ isActive }) => `side-nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setMobileOpen(false)}
            >
              <PlusCircle size={16} />
              <span>Submit Complaint</span>
            </NavLink>
          )}

          <NavLink
            to="/ledger"
            className={({ isActive }) => `side-nav-item ${isActive ? 'active' : ''}`}
            onClick={() => setMobileOpen(false)}
          >
            <Layers size={16} />
            <span>Audit ledger</span>
            {location.pathname === '/ledger' && <ChevronRight size={12} className="ml-auto" />}
          </NavLink>

          {user?.role === 'ADMIN' && (
            <NavLink
              to="/users"
              className={({ isActive }) => `side-nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setMobileOpen(false)}
            >
              <Users size={16} />
              <span>Manage Users</span>
            </NavLink>
          )}

          <NavLink
            to="/profile"
            className={({ isActive }) => `side-nav-item ${isActive ? 'active' : ''}`}
            onClick={() => setMobileOpen(false)}
          >
            <User size={16} />
            <span>Profile</span>
          </NavLink>
        </nav>

        <div className="nav-caption">Network</div>
        <nav className="side-nav" aria-label="Network navigation">
          <NavLink
            to={getDashboardPath()}
            className="side-nav-item"
            onClick={() => setMobileOpen(false)}
          >
            <Cpu size={16} />
            <span>Peer nodes</span>
            <span className="nav-count positive">4/4</span>
          </NavLink>

          <NavLink
            to="/ledger"
            className="side-nav-item"
            onClick={() => setMobileOpen(false)}
          >
            <Shield size={16} />
            <span>Smart contracts</span>
          </NavLink>
        </nav>

        {/* Sidebar Bottom Status */}
        <div className="sidebar-bottom">
          <div className="node-status">
            <p>
              <span className="status-dot" /> All systems operational
            </p>
            <div>
              <span>NODE ID</span>
              <span style={{ fontFamily: 'JetBrains Mono, monospace' }}>#9042-ALPHA</span>
            </div>
            <div>
              <span>CONSENSUS</span>
              <span className="positive">99.8% verified</span>
            </div>
          </div>

          <div className="side-footer">
            <span>CivicChain v2.4.0</span>
            <button
              type="button"
              onClick={handleLogout}
              style={{ background: 'none', border: 'none', color: 'var(--muted-foreground)', cursor: 'pointer', padding: 2, display: 'flex', alignItems: 'center' }}
              title="Sign Out"
            >
              <LogOut size={13} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main App Container */}
      <div className="main-shell" style={{ flex: 1, minWidth: 0, paddingLeft: '232px' }}>
        {/* Topbar matching Emerald Ledger Vision */}
        <header className="topbar">
          <div className="breadcrumb" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              className="mobile-menu"
              onClick={() => setMobileOpen(!mobileOpen)}
              style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', display: 'none' }}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
            <span style={{ color: 'var(--muted-foreground)', fontSize: '13px' }}>Workspace</span>
            <ChevronRight size={12} style={{ color: 'var(--muted-foreground)' }} />
            <span style={{ fontWeight: 600, fontSize: '13px' }}>{getBreadcrumbTitle()}</span>
          </div>

          <div className="topbar-actions">
            <div className="network-pill">
              <span className="status-dot" />
              <span>Fabric mainnet</span>
            </div>

            <div className="profile" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                className="avatar"
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: 'var(--card)',
                  border: '1px solid var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '11px',
                  fontWeight: 700,
                  color: 'var(--primary)'
                }}
              >
                {initials}
              </div>
              <span style={{ fontSize: '12px', fontWeight: 600 }}>{user?.name || 'User'}</span>
              <span className="tag" style={{ fontSize: '9px', padding: '2px 6px' }}>
                {user?.role || 'CITIZEN'}
              </span>
            </div>
          </div>
        </header>

        {/* Content Outlet */}
        <main className="page-content" style={{ padding: '24px 32px' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
