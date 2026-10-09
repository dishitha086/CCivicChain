export function StatusBadge({ status }) {
  const s = (status || '').toLowerCase().replace(' ', '_');
  return <span className={`badge badge-${s}`}>{status?.replace('_', ' ')}</span>;
}

export function RoleBadge({ role }) {
  return <span className={`badge badge-${role?.toLowerCase()}`}>{role}</span>;
}

export function PriorityBadge({ priority }) {
  return <span className={`badge badge-priority-${priority?.toLowerCase()}`}>{priority}</span>;
}

export function LoadingSpinner({ size = 20 }) {
  return <div className="loading-spinner" style={{ width: size, height: size }} />;
}

export function EmptyState({ icon, title, description, action }) {
  return (
    <div className="empty-state">
      <div style={{ fontSize: '3rem', marginBottom: 12 }}>{icon || '📭'}</div>
      <h3>{title || 'Nothing here yet'}</h3>
      <p>{description}</p>
      {action && <div style={{ marginTop: 16 }}>{action}</div>}
    </div>
  );
}

export function InfoRow({ label, value, className }) {
  return (
    <div style={{ marginBottom: 12 }} className={className}>
      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>{value || '—'}</div>
    </div>
  );
}
