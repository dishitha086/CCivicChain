import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { StatusBadge, RoleBadge, LoadingSpinner } from '../components/ui';
import { format } from 'date-fns';

export default function AdminDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: () => api.get('/dashboard/admin').then(r => r.data)
  });

  if (isLoading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><LoadingSpinner size={32} /></div>;

  const { complaintStats, userStats, blockchainStats, recentUsers, recentComplaints, systemInfo } = data || {};

  return (
    <div>
      <div className="page-header">
        <div><h1>Admin Dashboard</h1><p>System overview and management</p></div>
        <Link to="/users" className="btn btn-primary">Manage Users</Link>
      </div>

      {/* System info banner */}
      <div style={{ background: 'rgba(6,182,212,0.05)', border: '1px solid rgba(6,182,212,0.15)', borderRadius: 'var(--radius-lg)', padding: '16px 20px', marginBottom: 24, display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>Blockchain Mode</div>
          <div style={{ color: '#67e8f9', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace' }}>{systemInfo?.blockchainMode?.toUpperCase()}</div>
        </div>
        <div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>Environment</div>
          <div style={{ color: '#fcd34d', fontWeight: 700 }}>{systemInfo?.nodeEnv?.toUpperCase()}</div>
        </div>
        <div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>Blockchain Records</div>
          <div style={{ color: '#34d399', fontWeight: 700 }}>{blockchainStats?.count || 0}</div>
        </div>
        <div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>Version</div>
          <div style={{ color: 'var(--text-secondary)', fontWeight: 700 }}>{systemInfo?.version}</div>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        {[
          { label: 'Total Complaints', value: complaintStats?.total || 0, color: '#3b82f6' },
          { label: 'Reported', value: complaintStats?.reported || 0, color: '#94a3b8' },
          { label: 'Registered', value: complaintStats?.registered || 0, color: '#6366f1' },
          { label: 'Assigned', value: complaintStats?.assigned || 0, color: '#f59e0b' },
          { label: 'Investigating', value: complaintStats?.investigating || 0, color: '#06b6d4' },
          { label: 'Closed', value: complaintStats?.closed || 0, color: '#64748b' },
        ].map(({ label, value, color }) => (
          <div className="stat-card" key={label}>
            <div className="stat-card-value" style={{ color, fontSize: '1.8rem' }}>{value}</div>
            <div className="stat-card-label">{label}</div>
          </div>
        ))}
      </div>

      <div className="grid-2" style={{ marginTop: 0 }}>
        {/* Users by role */}
        <div className="card">
          <div className="section-title">Users by Role</div>
          {userStats?.map(({ role, count }) => (
            <div key={role} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
              <RoleBadge role={role} />
              <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>{count}</span>
            </div>
          ))}
        </div>

        {/* Recent users */}
        <div className="card">
          <div className="section-title">Recent Users</div>
          {recentUsers?.map(u => (
            <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
              <div>
                <div style={{ fontSize: '0.88rem', fontWeight: 600 }}>{u.name}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{u.email}</div>
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <RoleBadge role={u.role} />
                <span className={`badge ${u.is_active ? 'badge-resolved' : 'badge-reported'}`} style={{ fontSize: '0.65rem' }}>
                  {u.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent complaints */}
      <div className="card" style={{ marginTop: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div className="section-title" style={{ margin: 0, border: 0 }}>Recent Complaints</div>
          <Link to="/complaints" className="btn btn-secondary btn-sm">View All</Link>
        </div>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Complaint #</th>
                <th>Title</th>
                <th>Category</th>
                <th>Citizen</th>
                <th>Status</th>
                <th>Date</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {recentComplaints?.map(c => (
                <tr key={c.id}>
                  <td className="font-mono" style={{ fontSize: '0.8rem', color: 'var(--accent)' }}>{c.complaint_number}</td>
                  <td style={{ fontWeight: 500 }}>{c.title}</td>
                  <td>{c.category}</td>
                  <td style={{ color: 'var(--text-muted)' }}>{c.citizen_name}</td>
                  <td><StatusBadge status={c.status} /></td>
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
