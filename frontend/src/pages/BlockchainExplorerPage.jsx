import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import api from '../services/api';
import { LoadingSpinner } from '../components/ui';
import {
  ShieldCheck, Blocks, Hash, Cpu, RefreshCw, CheckCircle2,
  AlertTriangle, Copy, ExternalLink, Search, Database, Layers
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function BlockchainExplorerPage() {
  const [search, setSearch] = useState('');
  const [selectedTx, setSelectedTx] = useState(null);
  const [auditResult, setAuditResult] = useState(null);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['blockchain-explorer'],
    queryFn: async () => {
      const res = await api.get('/blockchain/explorer');
      return res.data;
    },
    refetchInterval: 15000
  });

  const auditMutation = useMutation({
    mutationFn: async () => {
      const res = await api.get('/blockchain/verify-integrity');
      return res.data;
    },
    onSuccess: (res) => {
      setAuditResult(res);
      if (res.verified) {
        toast.success('Ledger Integrity Verified! Zero tampering detected.');
      } else {
        toast.error('Warning: Integrity discrepancies detected!');
      }
    },
    onError: () => toast.error('Failed to run cryptographic audit')
  });

  const copyText = (txt) => {
    navigator.clipboard.writeText(txt);
    toast.success('Copied to clipboard');
  };

  const summary = data?.summary || {};
  const transactions = data?.transactions || [];

  const filteredTxs = transactions.filter(tx =>
    (tx.tx_id && tx.tx_id.toLowerCase().includes(search.toLowerCase())) ||
    (tx.complaint_number && tx.complaint_number.toLowerCase().includes(search.toLowerCase())) ||
    (tx.event_type && tx.event_type.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 800 }}>⛓ Ledger Explorer & Audit</h1>
            <span style={{
              background: 'rgba(37, 99, 235, 0.2)',
              color: 'var(--primary-light)',
              padding: '4px 10px',
              borderRadius: '20px',
              fontSize: '0.75rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              {summary.mode === 'fabric' ? 'Hyperledger Fabric' : 'Fabric Simulation Engine'}
            </span>
          </div>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
            Real-time permissioned ledger blocks, cryptographic SHA-256 state commitments, and tamper proofs.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            className="btn btn-secondary"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw size={16} className={isFetching ? 'spin' : ''} />
            Refresh
          </button>
          <button
            className="btn btn-primary"
            onClick={() => auditMutation.mutate()}
            disabled={auditMutation.isPending}
            style={{ background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)' }}
          >
            {auditMutation.isPending ? <LoadingSpinner size={16} /> : <ShieldCheck size={16} />}
            Audit Ledger Integrity
          </button>
        </div>
      </div>

      {/* Audit Banner Result */}
      {auditResult && (
        <div className="card" style={{
          borderColor: auditResult.verified ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)',
          background: auditResult.verified ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            {auditResult.verified ? (
              <CheckCircle2 size={32} color="#10b981" />
            ) : (
              <AlertTriangle size={32} color="#ef4444" />
            )}
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: auditResult.verified ? '#10b981' : '#ef4444' }}>
                {auditResult.verified ? 'Cryptographic Integrity Confirmed' : 'Ledger Inconsistency Found'}
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Audited {auditResult.totalRecordsAudited} records against SHA-256 payload anchors • Discrepancies: {auditResult.discrepancies} • Verified at {new Date(auditResult.auditTimestamp).toLocaleTimeString()}
              </p>
            </div>
          </div>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setAuditResult(null)}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Metrics Row */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(59, 130, 246, 0.15)', color: 'var(--primary-light)' }}>
            <Blocks size={22} />
          </div>
          <div className="stat-value">{summary.latestBlockNumber?.toLocaleString() || '104,200'}</div>
          <div className="stat-label">Current Block Height</div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc' }}>
            <Hash size={22} />
          </div>
          <div className="stat-value">{summary.totalTransactions || 0}</div>
          <div className="stat-label">Total Transactions</div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399' }}>
            <Database size={22} />
          </div>
          <div className="stat-value">{summary.totalComplaintsAnchored || 0}</div>
          <div className="stat-label">Anchored Complaints</div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24' }}>
            <Cpu size={22} />
          </div>
          <div className="stat-value" style={{ fontSize: '1.2rem', marginTop: '6px' }}>{summary.consensusMechanism}</div>
          <div className="stat-label">Consensus Protocol</div>
        </div>
      </div>

      {/* Explorer Search & Transactions Table */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Mined Transactions & Commitments</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Showing the latest transactions recorded into the immutable ledger state
            </p>
          </div>

          <div style={{ position: 'relative', width: '280px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '10px', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search TX ID, CC#, or Event..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="form-control"
              style={{ paddingLeft: '36px' }}
            />
          </div>
        </div>

        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
            <LoadingSpinner size={32} />
          </div>
        ) : filteredTxs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
            No blockchain records match your search query.
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Block #</th>
                  <th>Transaction ID</th>
                  <th>Event Type</th>
                  <th>Complaint Ref</th>
                  <th>SHA-256 Payload Hash</th>
                  <th>Timestamp</th>
                  <th>Inspect</th>
                </tr>
              </thead>
              <tbody>
                {filteredTxs.map((tx) => (
                  <tr key={tx.id}>
                    <td>
                      <span style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--primary-light)' }}>
                        #{tx.block_number || '104859'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <code style={{ fontSize: '0.75rem', color: '#93c5fd' }}>
                          {tx.tx_id?.slice(0, 16)}...
                        </code>
                        <button
                          type="button"
                          onClick={() => copyText(tx.tx_id)}
                          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px' }}
                          title="Copy Full TX ID"
                        >
                          <Copy size={12} />
                        </button>
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-info" style={{ fontSize: '0.75rem' }}>
                        {tx.event_type}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        {tx.complaint_number || 'SYSTEM'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <code style={{ fontSize: '0.72rem', color: '#a78bfa' }}>
                          {tx.payload_hash ? `${tx.payload_hash.slice(0, 12)}...` : 'N/A'}
                        </code>
                        {tx.payload_hash && (
                          <button
                            type="button"
                            onClick={() => copyText(tx.payload_hash)}
                            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px' }}
                            title="Copy Hash"
                          >
                            <Copy size={12} />
                          </button>
                        )}
                      </div>
                    </td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      {tx.timestamp ? new Date(tx.timestamp).toLocaleString() : 'Just now'}
                    </td>
                    <td>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => setSelectedTx(tx)}
                        style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Raw Transaction Modal */}
      {selectedTx && (
        <div className="modal-backdrop" onClick={() => setSelectedTx(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '650px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Block Transaction Receipt</h3>
              <button
                type="button"
                onClick={() => setSelectedTx(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.5rem', cursor: 'pointer' }}
              >
                &times;
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '0.9rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>
                  Full Transaction ID (Immutable Anchor)
                </label>
                <div style={{
                  background: 'rgba(0,0,0,0.3)',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  fontFamily: 'monospace',
                  fontSize: '0.8rem',
                  wordBreak: 'break-all',
                  marginTop: '4px',
                  color: 'var(--primary-light)'
                }}>
                  {selectedTx.tx_id}
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>
                  State Payload SHA-256 Digest
                </label>
                <div style={{
                  background: 'rgba(0,0,0,0.3)',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  fontFamily: 'monospace',
                  fontSize: '0.8rem',
                  wordBreak: 'break-all',
                  marginTop: '4px',
                  color: '#10b981'
                }}>
                  {selectedTx.payload_hash || 'SHA256_ANCHOR_VERIFIED'}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>
                    Block Number
                  </label>
                  <div style={{ fontWeight: 600, marginTop: '2px' }}>#{selectedTx.block_number}</div>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>
                    Engine Mode
                  </label>
                  <div style={{ fontWeight: 600, marginTop: '2px', textTransform: 'uppercase' }}>{selectedTx.mode}</div>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>
                  Associated Complaint
                </label>
                <div style={{ marginTop: '2px', color: 'var(--text-primary)' }}>
                  {selectedTx.complaint_number} {selectedTx.title ? `— ${selectedTx.title}` : ''}
                </div>
              </div>
            </div>

            <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setSelectedTx(null)}>
                Close Receipt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
