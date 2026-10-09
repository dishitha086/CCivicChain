import { Link } from 'react-router-dom';
import { Shield, Eye, FileCheck, Users, Lock, BarChart3, ArrowRight, Zap } from 'lucide-react';

export default function LandingPage() {
  return (
    <div style={{ minHeight: '100vh' }}>
      {/* Navbar */}
      <nav style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '18px 40px',
        background: 'rgba(10,15,30,0.9)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        backdropFilter: 'blur(20px)',
        position: 'sticky', top: 0, zIndex: 100
      }}>
        <div style={{ fontWeight: 900, fontSize: '1.4rem', background: 'linear-gradient(135deg, #3b82f6, #06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          ⛓ CivicChain
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <Link to="/login" className="btn btn-secondary btn-sm">Sign In</Link>
          <Link to="/register" className="btn btn-primary btn-sm">Get Started</Link>
        </div>
      </nav>

      {/* Hero */}
      <div className="landing-hero">
        <div className="hero-badge">
          <Zap size={14} /> Powered by Hyperledger Fabric
        </div>
        <h1 className="hero-title">
          Civic Accountability<br />on the Blockchain
        </h1>
        <p className="hero-subtitle">
          CivicChain is a privacy-preserving platform that empowers citizens to report public infrastructure issues and holds authorities accountable through tamper-evident blockchain records.
        </p>
        <div className="hero-actions">
          <Link to="/register" className="btn btn-primary btn-lg">
            <Shield size={18} /> Report an Issue
          </Link>
          <Link to="/login" className="btn btn-secondary btn-lg">
            <ArrowRight size={18} /> Sign In
          </Link>
        </div>

        {/* Features */}
        <div className="features-grid">
          {[
            { icon: '🔒', title: 'Privacy Preserving', desc: 'Citizen data stays private. Only authorized personnel access sensitive information.', color: '#3b82f6' },
            { icon: '⛓', title: 'Blockchain Audit Trail', desc: 'Every lifecycle event is recorded immutably. Complete tamper-evident history.', color: '#06b6d4' },
            { icon: '📸', title: 'Evidence Integrity', desc: 'SHA-256 hashes ensure uploaded evidence cannot be altered without detection.', color: '#10b981' },
            { icon: '🔄', title: '9-Stage Lifecycle', desc: 'Report → Register → Assign → Investigate → Verify → Act → Resolve → Verify → Close', color: '#f59e0b' },
            { icon: '👥', title: 'Role-Based Access', desc: 'Citizens, Authorities, Investigators, Verifiers, and Admins with distinct permissions.', color: '#a855f7' },
            { icon: '📊', title: 'Real-time Dashboards', desc: 'Live stats and analytics for every role. Track progress at a glance.', color: '#ef4444' },
          ].map((f, i) => (
            <div className="feature-card" key={i}>
              <div className="feature-icon" style={{ background: `${f.color}20`, border: `1px solid ${f.color}30` }}>
                <span style={{ fontSize: '1.4rem' }}>{f.icon}</span>
              </div>
              <div className="feature-title">{f.title}</div>
              <div className="feature-desc">{f.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Lifecycle section */}
      <div style={{ padding: '80px 40px', maxWidth: 900, margin: '0 auto' }}>
        <h2 style={{ textAlign: 'center', fontSize: '1.8rem', fontWeight: 800, marginBottom: 8 }}>
          Complaint Lifecycle
        </h2>
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: 40 }}>
          9-stage state machine enforced on the blockchain
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
          {['REPORT', 'REGISTER', 'ASSIGN', 'INVESTIGATE', 'VERIFY', 'TAKE ACTION', 'RESOLVE', 'VERIFY RESOLUTION', 'CLOSE'].map((s, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                background: `hsl(${220 + i * 15}, 70%, 40%)`,
                border: `1px solid hsl(${220 + i * 15}, 70%, 50%)`,
                borderRadius: 100, padding: '6px 14px',
                fontSize: '0.8rem', fontWeight: 600,
                color: 'white', whiteSpace: 'nowrap'
              }}>
                {s}
              </div>
              {i < 8 && <span style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>→</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid var(--border)',
        padding: '24px 40px',
        textAlign: 'center',
        color: 'var(--text-muted)',
        fontSize: '0.85rem'
      }}>
        CivicChain — Privacy-Preserving Civic Accountability Platform &nbsp;|&nbsp; Built with Hyperledger Fabric
      </footer>
    </div>
  );
}
