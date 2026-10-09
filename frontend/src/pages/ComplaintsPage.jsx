import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { StatusBadge, PriorityBadge, LoadingSpinner } from '../components/ui';
import {
  Search, Filter, PlusCircle, Layers, ArrowRight,
  ShieldCheck, RefreshCw, FileText, Camera
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const CATEGORIES = ['Roads', 'Streetlights', 'Drainage', 'Water Supply', 'Sanitation', 'Government Schools', 'Hospitals', 'Waste Management', 'Public Safety', 'Other'];
const STATUSES = ['REPORTED', 'REGISTERED', 'ASSIGNED', 'INVESTIGATING', 'VERIFIED', 'ACTION_TAKEN', 'RESOLVED', 'RESOLUTION_VERIFIED', 'CLOSED'];

export default function ComplaintsPage() {
  const { user } = useAuth();
  const [filters, setFilters] = useState({ status: '', category: '', search: '', page: 1 });

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['complaints', filters],
    queryFn: () => {
      const params = new URLSearchParams();
      if (filters.status) params.set('status', filters.status);
      if (filters.category) params.set('category', filters.category);
      if (filters.search) params.set('search', filters.search);
      params.set('page', filters.page);
      params.set('limit', '15');
      return api.get(`/complaints?${params}`).then(r => r.data);
    }
  });

  const complaints = data?.complaints || [];
  const pagination = data?.pagination || {};

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Page Heading */}
      <div className="page-heading">
        <div>
          <div className="eyebrow" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Layers size={12} color="var(--primary)" />
            <span>MUNICIPAL AUDIT TRAIL</span>
            <span style={{ color: 'var(--muted-foreground)' }}>/</span>
            <span>PUBLIC RECORDS</span>
          </div>
          <h1 style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            {user?.role === 'CITIZEN' ? 'My Grievances' : 'Municipal Complaints Registry'}
          </h1>
          <p style={{ color: 'var(--muted-foreground)' }}>
            Showing {complaints.length} of {pagination.total || complaints.length} complaints with verifiable blockchain state.
          </p>
        </div>

        <div className="heading-actions">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw size={14} className={isFetching ? 'spin' : ''} />
            <span>Refresh</span>
          </button>

          {(user?.role === 'CITIZEN' || user?.role === 'ADMIN') && (
            <Link
              to="/complaints/new"
              className="btn btn-primary btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px' }}
            >
              <Camera size={14} />
              <span>Report Grievance</span>
            </Link>
          )}
        </div>
      </div>

      {/* Main Table Section */}
      <section className="section" style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '4px', padding: '20px' }}>
        {/* Filter Bar */}
        <div className="filter-bar" style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap' }}>
          <div className="search-field" style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
            <Search size={14} style={{ position: 'absolute', left: '12px', top: '10px', color: 'var(--muted-foreground)' }} />
            <input
              type="text"
              placeholder="Search by title, location, complaint #..."
              value={filters.search}
              onChange={e => setFilters(f => ({ ...f, search: e.target.value, page: 1 }))}
              className="form-input"
              style={{ paddingLeft: '34px', height: '36px', fontSize: '12px', background: 'var(--background)' }}
            />
          </div>

          <select
            className="form-input"
            value={filters.status}
            onChange={e => setFilters(f => ({ ...f, status: e.target.value, page: 1 }))}
            style={{ width: '170px', height: '36px', fontSize: '12px', background: 'var(--background)' }}
          >
            <option value="">All Statuses</option>
            {STATUSES.map(s => (
              <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
            ))}
          </select>

          <select
            className="form-input"
            value={filters.category}
            onChange={e => setFilters(f => ({ ...f, category: e.target.value, page: 1 }))}
            style={{ width: '170px', height: '36px', fontSize: '12px', background: 'var(--background)' }}
          >
            <option value="">All Categories</option>
            {CATEGORIES.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          {(filters.status || filters.category || filters.search) && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setFilters({ status: '', category: '', search: '', page: 1 })}
              style={{ height: '36px', fontSize: '11px' }}
            >
              Clear
            </button>
          )}
        </div>

        {/* Table */}
        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
            <LoadingSpinner size={32} />
          </div>
        ) : complaints.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 20px', border: '1px dashed var(--border)', borderRadius: '4px' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>📋</div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>No complaints found</h3>
            <p style={{ color: 'var(--muted-foreground)', fontSize: '0.85rem', margin: '4px auto 16px' }}>
              No records match your active search filter.
            </p>
          </div>
        ) : (
          <div className="table-scroll" style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left', color: 'var(--muted-foreground)', fontSize: '10px', letterSpacing: '0.05em' }}>
                  <th style={{ padding: '10px 12px' }}>COMPLAINT #</th>
                  <th style={{ padding: '10px 12px' }}>TITLE</th>
                  <th style={{ padding: '10px 12px' }}>CATEGORY</th>
                  {user?.role !== 'CITIZEN' && <th style={{ padding: '10px 12px' }}>CITIZEN</th>}
                  <th style={{ padding: '10px 12px' }}>STATUS</th>
                  <th style={{ padding: '10px 12px' }}>PRIORITY</th>
                  <th style={{ padding: '10px 12px' }}>DEPARTMENT</th>
                  <th style={{ padding: '10px 12px' }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {complaints.map(c => (
                  <tr
                    key={c.id}
                    style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.15s ease' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '12px', fontFamily: 'JetBrains Mono, monospace', color: 'var(--primary)', fontWeight: 600 }}>
                      {c.complaint_number}
                    </td>
                    <td style={{ padding: '12px', fontWeight: 500, color: 'var(--foreground)', maxWidth: '240px' }}>
                      <div className="truncate">{c.title}</div>
                      <div style={{ fontSize: '10px', color: 'var(--muted-foreground)', marginTop: '2px' }}>
                        {c.location?.slice(0, 32)}...
                      </div>
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span className="tag" style={{ fontSize: '9px' }}>{c.category}</span>
                    </td>
                    {user?.role !== 'CITIZEN' && (
                      <td style={{ padding: '12px', color: 'var(--muted-foreground)', fontSize: '11px' }}>
                        {c.citizen_name || 'Anonymous Citizen'}
                      </td>
                    )}
                    <td style={{ padding: '12px' }}>
                      <StatusBadge status={c.status} />
                    </td>
                    <td style={{ padding: '12px' }}>
                      <PriorityBadge priority={c.priority} />
                    </td>
                    <td style={{ padding: '12px', color: 'var(--muted-foreground)', fontSize: '11px' }}>
                      {c.assigned_department || '—'}
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

        {/* Table Footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', fontSize: '11px', color: 'var(--muted-foreground)' }}>
          <span>Showing {complaints.length} of {pagination.total || complaints.length} records</span>
          <span style={{ fontFamily: 'JetBrains Mono, monospace' }}>
            Page {pagination.page || 1} of {pagination.pages || 1}
          </span>
        </div>
      </section>
    </div>
  );
}
