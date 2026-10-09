import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { RoleBadge, LoadingSpinner } from '../components/ui';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export default function UsersAdminPage() {
  const qc = useQueryClient();
  const [filters, setFilters] = useState({ role: '', search: '', page: 1 });

  const { data, isLoading } = useQuery({
    queryKey: ['users', filters],
    queryFn: () => {
      const p = new URLSearchParams();
      if (filters.role) p.set('role', filters.role);
      if (filters.search) p.set('search', filters.search);
      p.set('page', filters.page);
      return api.get(`/users?${p}`).then(r => r.data);
    }
  });

  const toggleStatus = async (userId, currentStatus) => {
    try {
      await api.put(`/users/${userId}/toggle-status`);
      toast.success(`User ${currentStatus ? 'deactivated' : 'activated'}`);
      qc.invalidateQueries(['users']);
    } catch { toast.error('Failed to update status'); }
  };

  const updateRole = async (userId, newRole) => {
    try {
      await api.put(`/users/${userId}/role`, { role: newRole });
      toast.success('Role updated');
      qc.invalidateQueries(['users']);
    } catch { toast.error('Failed to update role'); }
  };

  const ROLES = ['CITIZEN', 'AUTHORITY', 'INVESTIGATOR', 'VERIFIER', 'ADMIN'];

  return (
    <div>
      <div className="page-header">
        <div><h1>User Management</h1><p>Manage all registered users</p></div>
      </div>

      <div className="card" style={{ marginBottom: 20, padding: 16 }}>
        <div style={{ display: 'flex', gap: 12 }}>
          <input className="form-input" placeholder="Search by name or email..." value={filters.search}
            onChange={e => setFilters(f => ({ ...f, search: e.target.value, page: 1 }))} style={{ flex: 1 }} />
          <select className="form-input" style={{ flex: '0 0 160px' }} value={filters.role}
            onChange={e => setFilters(f => ({ ...f, role: e.target.value, page: 1 }))}>
            <option value="">All Roles</option>
            {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
      </div>

      <div className="card">
        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><LoadingSpinner /></div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Role</th>
                  <th>Department</th>
                  <th>Status</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data?.users?.map(u => (
                  <tr key={u.id}>
                    <td style={{ fontWeight: 600 }}>{u.name}</td>
                    <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{u.email}</td>
                    <td style={{ fontSize: '0.85rem' }}>{u.phone || '—'}</td>
                    <td>
                      <select
                        value={u.role}
                        onChange={e => updateRole(u.id, e.target.value)}
                        style={{ background: 'transparent', border: 'none', color: 'inherit', fontSize: '0.85rem', cursor: 'pointer' }}
                      >
                        {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </td>
                    <td style={{ fontSize: '0.82rem' }}>{u.department || '—'}</td>
                    <td>
                      <span className={`badge ${u.is_active ? 'badge-resolved' : 'badge-reported'}`}>
                        {u.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.78rem' }}>{format(new Date(u.created_at), 'dd MMM yy')}</td>
                    <td>
                      <button
                        className={`btn btn-sm ${u.is_active ? 'btn-danger' : 'btn-success'}`}
                        onClick={() => toggleStatus(u.id, u.is_active)}
                      >
                        {u.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {data?.pagination?.pages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 20 }}>
            <button className="btn btn-secondary btn-sm" disabled={filters.page === 1} onClick={() => setFilters(f => ({ ...f, page: f.page - 1 }))}>Previous</button>
            <span style={{ padding: '6px 12px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Page {filters.page} of {data.pagination.pages}</span>
            <button className="btn btn-secondary btn-sm" disabled={filters.page >= data.pagination.pages} onClick={() => setFilters(f => ({ ...f, page: f.page + 1 }))}>Next</button>
          </div>
        )}
      </div>
    </div>
  );
}
