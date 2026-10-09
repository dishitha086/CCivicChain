import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { StatusBadge, PriorityBadge, LoadingSpinner } from '../components/ui';
import {
  PlusCircle, FileText, Clock, CheckCircle2,
  XCircle, Layers, ArrowRight, ShieldCheck, Camera,
  Sparkles, ExternalLink
} from 'lucide-react';

export default function CitizenDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['citizen-dashboard'],
    queryFn: () => api.get('/dashboard/citizen').then(r => r.data)
  });

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
        <LoadingSpinner size={32} />
      </div>
    );
  }

  const stats = data?.stats || {};
  const recent = data?.recent || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Page Heading */}
      <div className="page-heading">
        <div>
          <div className="eyebrow" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Layers size={12} color="var(--primary)" />
            <span>CITIZEN PORTAL</span>
            <span style={{ color: 'var(--muted-foreground)' }}>/</span>
            <span>PUBLIC GRIEVANCES</span>
          </div>
          <h1 style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Citizen Dashboard</h1>
          <p style={{ color: 'var(--muted-foreground)' }}>
            Track your grievances across the 9-stage Hyperledger Fabric verification lifecycle.
          </p>
        </div>

        <div className="heading-actions">
          <Link
            to="/complaints/new"
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', fontWeight: 600 }}
          >
            <Camera size={16} />
            <span>Report New Issue</span>
          </Link>
        </div>
      </div>

      {/* Metrics Row matching Emerald Ledger Vision */}
      <div className="metrics">
        <div className="metric">
          <div className="metric-top">
            <span>Total Reported</span>
            <FileText size={16} />
          </div>
          <div className="metric-number">{stats.total || 0}</div>
          <div className="metric-bottom">
            <span className="positive">● Verified</span>
            <span>anchored on ledger</span>
          </div>
        </div>

        <div className="metric">
          <div className="metric-top">
            <span>Under Review / Active</span>
            <Clock size={16} color="#f59e0b" />
          </div>
          <div className="metric-number" style={{ color: '#fbbf24' }}>{stats.active || 0}</div>
          <div className="metric-bottom">
            <span style={{ color: '#fbbf24' }}>Field Investigation</span>
            <span>in progress</span>
          </div>
        </div>

        <div className="metric">
          <div className="metric-top">
            <span>Work Resolved</span>
            <CheckCircle2 size={16} color="#10b981" />
          </div>
          <div className="metric-number" style={{ color: '#34d399' }}>{stats.resolved || 0}</div>
          <div className="metric-bottom">
            <span className="positive">Ready for feedback</span>
            <span>quality verified</span>
          </div>
        </div>

        <div className="metric">
          <div className="metric-top">
            <span>Closed Cases</span>
            <ShieldCheck size={16} />
          </div>
          <div className="metric-number">{stats.closed || 0}</div>
          <div className="metric-bottom">
            <span className="positive">100% completed</span>
            <span>immutable audit</span>
          </div>
        </div>
      </div>

      {/* Recent Submissions Card */}
      <section className="section" style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '4px', padding: '20px' }}>
        <div className="section-head" style={{ marginBottom: '16px' }}>
          <div className="section-title">
            <FileText size={16} color="var(--primary)" />
            <h2 style={{ fontSize: '15px', fontWeight: 600 }}>My Recent Grievances</h2>
          </div>
          <Link to="/complaints" style={{ fontSize: '12px', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span>View All</span>
            <ArrowRight size={12} />
          </Link>
        </div>

        {recent.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 20px', border: '1px dashed var(--border)', borderRadius: '4px' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>📭</div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--foreground)' }}>No complaints submitted yet</h3>
            <p style={{ color: 'var(--muted-foreground)', fontSize: '0.85rem', maxWidth: '360px', margin: '6px auto 18px' }}>
              Spot a pothole, failed streetlight, or water leakage in your neighborhood? Report it to record on the blockchain.
            </p>
            <Link to="/complaints/new" className="btn btn-primary btn-sm">
              <Camera size={14} /> Report First Grievance
            </Link>
          </div>
        ) : (
          <div className="table-scroll" style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left', color: 'var(--muted-foreground)', fontSize: '10px', letterSpacing: '0.05em' }}>
                  <th style={{ padding: '10px 12px' }}>COMPLAINT #</th>
                  <th style={{ padding: '10px 12px' }}>TITLE</th>
                  <th style={{ padding: '10px 12px' }}>CATEGORY</th>
                  <th style={{ padding: '10px 12px' }}>STATUS</th>
                  <th style={{ padding: '10px 12px' }}>PRIORITY</th>
                  <th style={{ padding: '10px 12px' }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((c) => (
                  <tr
                    key={c.id}
                    style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.15s ease' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '12px', fontFamily: 'JetBrains Mono, monospace', color: 'var(--primary)', fontWeight: 600 }}>
                      {c.complaint_number}
                    </td>
                    <td style={{ padding: '12px', color: 'var(--foreground)', fontWeight: 500, maxWidth: '280px' }}>
                      <div className="truncate">{c.title}</div>
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span className="tag" style={{ fontSize: '9px' }}>{c.category}</span>
                    </td>
                    <td style={{ padding: '12px' }}>
                      <StatusBadge status={c.status} />
                    </td>
                    <td style={{ padding: '12px' }}>
                      <PriorityBadge priority={c.priority} />
                    </td>
                    <td style={{ padding: '12px' }}>
                      <Link
                        to={`/complaints/${c.id}`}
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '4px 10px', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      >
                        <span>Inspect</span>
                        <ArrowRight size={11} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
