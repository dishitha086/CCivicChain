import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { StatusBadge, LoadingSpinner } from '../components/ui';
import { format } from 'date-fns';

export default function AuthorityDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['authority-dashboard'],
    queryFn: () => api.get('/dashboard/authority').then(r => r.data)
  });

  if (isLoading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
      <LoadingSpinner size={32} />
    </div>
  );

  const stats = data?.stats || {};
  const recent = data?.recent || [];
  const byCategory = data?.byCategory || [];

  const statCards = [
    { label: 'Total', value: stats.total || 0, color: '#3b82f6' },
    { label: 'Pending Reg.', value: stats.pending_registration || 0, color: '#f59e0b' },
    { label: 'Assigned', value: stats.assigned || 0, color: '#06b6d4' },
    { label: 'Investigating', value: stats.investigating || 0, color: '#a855f7' },
    { label: 'Verified', value: stats.verified || 0, color: '#6366f1' },
    { label: 'Resolved', value: stats.resolved || 0, color: '#10b981' },
    { label: 'Closed', value: stats.closed || 0, color: '#64748b' },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Authority Dashboard</h1>
          <p>Monitor and manage all civic complaints</p>
        </div>
        <Link to="/complaints" className="btn btn-primary">View All Complaints</Link>
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))' }}>
        {statCards.map(({ label, value, color }) => (
          <div className="stat-card" key={label}>
            <div className="stat-card-value" style={{ color, fontSize: '1.8rem' }}>{value}</div>
            <div className="stat-card-label">{label}</div>
          </div>
        ))}
      </div>

      <div className="grid-2" style={{ marginTop: 0 }}>
        <div className="card">
          <div className="section-title">By Category</div>
          {byCategory.map(({ category, count }) => (
            <div key={category} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontSize: '0.88rem' }}>{category}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ height: 6, width: `${Math.min(count * 10, 100)}px`, background: 'var(--primary)', borderRadius: 3 }} />
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{count}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="card">
          <div className="section-title">Recent Activity</div>
          {recent.slice(0, 6).map(c => (
            <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
              <div>
                <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)' }}>{c.title}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{c.complaint_number} • {c.category}</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                <StatusBadge status={c.status} />
                <Link to={`/complaints/${c.id}`} style={{ fontSize: '0.75rem', color: 'var(--primary-light)' }}>View →</Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card" style={{ marginTop: 20 }}>
        <div className="section-title">All Recent Complaints</div>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Complaint #</th>
                <th>Title</th>
                <th>Category</th>
                <th>Citizen</th>
                <th>Status</th>
                <th>Department</th>
                <th>Date</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {recent.map(c => (
                <tr key={c.id}>
                  <td className="font-mono" style={{ fontSize: '0.8rem', color: 'var(--accent)' }}>{c.complaint_number}</td>
                  <td style={{ fontWeight: 500 }}>{c.title}</td>
                  <td>{c.category}</td>
                  <td style={{ color: 'var(--text-muted)' }}>{c.citizen_name || '—'}</td>
                  <td><StatusBadge status={c.status} /></td>
                  <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{c.assigned_department || '—'}</td>
                  <td style={{ fontSize: '0.78rem' }}>{format(new Date(c.created_at), 'dd MMM yy')}</td>
                  <td><Link to={`/complaints/${c.id}`} className="btn btn-secondary btn-sm">View</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
