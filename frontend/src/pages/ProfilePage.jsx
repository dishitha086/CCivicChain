import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { RoleBadge } from '../components/ui';
import { User, Shield, Mail, Phone, MapPin, Building, Key, CheckCircle, Copy } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ProfilePage() {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  if (!user) return null;

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '6px' }}>
          User Profile
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Manage your CivicChain identity, security credentials, and access permissions.
        </p>
      </div>

      <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '24px', padding: '28px' }}>
        <div style={{
          width: '72px',
          height: '72px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--primary) 0%, #7c3aed 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#ffffff',
          fontSize: '2rem',
          fontWeight: 700,
          boxShadow: '0 4px 20px rgba(37, 99, 235, 0.4)'
        }}>
          {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)' }}>{user.name}</h2>
            <RoleBadge role={user.role} />
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>{user.email}</p>
        </div>
      </div>

      <div className="grid grid-2" style={{ gap: '20px' }}>
        <div className="card">
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Shield size={18} color="var(--primary-light)" />
            Cryptographic Identity
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
                Citizen / Actor UUID
              </label>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'rgba(0, 0, 0, 0.25)',
                padding: '10px 14px',
                borderRadius: '8px',
                marginTop: '4px',
                border: '1px solid var(--border-color)'
              }}>
                <code style={{ fontSize: '0.85rem', color: 'var(--text-primary)', wordBreak: 'break-all' }}>
                  {user.id}
                </code>
                <button
                  type="button"
                  onClick={() => copyToClipboard(user.id)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px' }}
                  title="Copy UUID"
                >
                  <Copy size={16} />
                </button>
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
                Privacy Status
              </label>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginTop: '6px',
                color: '#10b981',
                fontSize: '0.9rem'
              }}>
                <CheckCircle size={16} />
                <span>SHA-256 Pseudonymization Active for Blockchain Ledger</span>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Building size={18} color="var(--primary-light)" />
            Organization & Assignment
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
                Department
              </label>
              <p style={{ marginTop: '4px', fontWeight: 500, color: 'var(--text-primary)' }}>
                {user.department || 'Not Assigned / General Citizen'}
              </p>
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
                Jurisdiction
              </label>
              <p style={{ marginTop: '4px', fontWeight: 500, color: 'var(--text-primary)' }}>
                {user.jurisdiction || 'All Municipal Wards'}
              </p>
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
                Account Status
              </label>
              <p style={{ marginTop: '4px', fontWeight: 500, color: user.is_active ? '#10b981' : '#ef4444' }}>
                {user.is_active ? 'Active & Authorized' : 'Pending Verification'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
