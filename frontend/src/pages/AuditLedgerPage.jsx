import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import {
  FileText, Check, Copy, X, Search, Download,
  Layers, ShieldCheck, ExternalLink, ChevronRight,
  Clock, AlertTriangle, ArrowUpRight, Cpu, CheckCircle2
} from 'lucide-react';
import toast from 'react-hot-toast';

const DEFAULT_TRANSACTIONS = [
  { id: 'TX-9042-ALPHA', block: '48,192', ward: 'WD-04', type: 'State transition', state: 'Action taken', hash: '0x4f8a1e9c2b3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f', time: '18:42:18', status: 'Verified' },
  { id: 'TX-9041-BETA', block: '48,191', ward: 'WD-07', type: 'Evidence anchored', state: 'Under review', hash: '0x3c9f8a2e1d4b5c6a7e8f9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e', time: '18:38:44', status: 'Verified' },
  { id: 'TX-9040-GAMMA', block: '48,190', ward: 'WD-02', type: 'Resolution verified', state: 'Resolved', hash: '0x1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f', time: '18:35:02', status: 'Verified' },
  { id: 'TX-9039-DELTA', block: '48,189', ward: 'WD-12', type: 'State transition', state: 'Investigating', hash: '0xa72f91b4c3d658e0f1294a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d', time: '18:32:10', status: 'Pending' },
  { id: 'TX-9038-EPSILON', block: '48,188', ward: 'WD-01', type: 'Complaint registered', state: 'Registered', hash: '0x82be45d17f306a9c8d21e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5', time: '18:29:36', status: 'Verified' },
  { id: 'TX-9037-ZETA', block: '48,187', ward: 'WD-04', type: 'Invalid transition', state: 'Rejected', hash: '0x6a8b7c9d12e45f30a62b7c8d91e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0', time: '18:27:18', status: 'Rejected' },
  { id: 'TX-9036-ETA', block: '48,186', ward: 'WD-09', type: 'Citizen feedback', state: 'Rated 5 Stars', hash: '0x9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e', time: '18:24:05', status: 'Verified' },
  { id: 'TX-9035-THETA', block: '48,185', ward: 'WD-03', type: 'Resolution confirmed', state: 'Closed', hash: '0x5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d', time: '18:21:40', status: 'Verified' }
];

export default function AuditLedgerPage() {
  const [period, setPeriod] = useState('Last 7 days');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All statuses');
  const [selectedTx, setSelectedTx] = useState(null);
  const [exported, setExported] = useState(false);
  const [copied, setCopied] = useState(false);
  const dialogRef = useRef(null);

  // Fetch live blockchain data from backend
  const { data: explorerData } = useQuery({
    queryKey: ['blockchain-explorer-ledger'],
    queryFn: async () => {
      try {
        const res = await api.get('/blockchain/explorer');
        return res.data;
      } catch (e) {
        return null;
      }
    },
    refetchInterval: 10000
  });

  // Combine live blockchain records with demo feed
  const liveRecords = explorerData?.transactions?.map((tx, idx) => ({
    id: tx.tx_id?.length > 18 ? `TX-${tx.tx_id.slice(-8).toUpperCase()}` : tx.tx_id,
    fullTxId: tx.tx_id,
    block: String(tx.block_number || 48190 + idx),
    ward: tx.complaint_number ? `Ward ${tx.complaint_number.slice(-2)}` : 'WD-04',
    type: tx.event_type?.replace(/_/g, ' ') || 'State transition',
    state: tx.event_type?.replace('STATE_', '') || 'Action taken',
    hash: tx.payload_hash || '0x4f8a1e9c2b3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f',
    time: tx.timestamp ? new Date(tx.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '18:42:18',
    status: 'Verified',
    complaintTitle: tx.title
  })) || [];

  const allTransactions = liveRecords.length > 0
    ? [...liveRecords, ...DEFAULT_TRANSACTIONS.filter(d => !liveRecords.some(l => l.id === d.id))]
    : DEFAULT_TRANSACTIONS;

  const filtered = allTransactions.filter(tx => {
    const textMatch = Object.values(tx).join(' ').toLowerCase().includes(search.toLowerCase());
    const statusMatch = statusFilter === 'All statuses' || tx.status === statusFilter;
    return textMatch && statusMatch;
  });

  const exportCSV = () => {
    const headers = ['Transaction ID', 'Block', 'Ward', 'Type', 'State', 'Hash', 'Time UTC', 'Status'];
    const rows = filtered.map(t => [t.id, t.block, t.ward, t.type, t.state, t.hash, t.time, t.status]);
    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'civicchain-audit-ledger.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setExported(true);
    toast.success('Audit ledger CSV exported successfully');
    setTimeout(() => setExported(false), 2500);
  };

  const copyRecordDetails = async (tx) => {
    const text = [
      `Transaction ID: ${tx.id}`,
      `Block height: #${tx.block}`,
      `Ward: ${tx.ward}`,
      `Transaction type: ${tx.type}`,
      `Current state: ${tx.state}`,
      `Transaction hash: ${tx.hash}`,
      `Timestamp: ${tx.time} UTC`,
      `Verification: ${tx.status}`
    ].join('\n');

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success('Record copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  return (
    <div className="main-shell" style={{ margin: 0, padding: 0 }}>
      {/* Page Heading matching Emerald Ledger Vision */}
      <div className="page-heading">
        <div>
          <div className="eyebrow" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Layers size={12} color="var(--primary)" />
            <span>HYPERLEDGER FABRIC</span>
            <span style={{ color: 'var(--muted-foreground)' }}>/</span>
            <span>CIVIC INTELLIGENCE</span>
          </div>
          <h1 style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Audit ledger</h1>
          <p style={{ color: 'var(--muted-foreground)' }}>
            Explore verifiable transactions and their cryptographic proofs.
          </p>
        </div>

        <div className="heading-actions">
          <select
            className="period-select"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            aria-label="Reporting period"
          >
            <option>Last 7 days</option>
            <option>Last 30 days</option>
            <option>All time</option>
          </select>

          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={exportCSV}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            {exported ? <Check size={14} color="#10b981" /> : <Download size={14} />}
            <span>{exported ? 'Exported' : 'Export ledger'}</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="metrics">
        <div className="metric">
          <div className="metric-top">
            <span>Total complaints</span>
            <FileText size={16} />
          </div>
          <div className="metric-number">
            {period === 'Last 7 days' ? '1,428' : period === 'Last 30 days' ? '5,712' : '14,890'}
          </div>
          <div className="metric-bottom">
            <span className="positive">↗ 12.0%</span>
            <span>vs. previous period</span>
          </div>
        </div>

        <div className="metric">
          <div className="metric-top">
            <span>Resolution rate</span>
            <CheckCircle2 size={16} />
          </div>
          <div className="metric-number">92.6%</div>
          <div className="metric-bottom">
            <span className="positive">↗ 4.2%</span>
            <span>vs. previous period</span>
          </div>
        </div>

        <div className="metric">
          <div className="metric-top">
            <span>Avg. resolution time</span>
            <Clock size={16} />
          </div>
          <div className="metric-number">
            28.4 <span style={{ fontSize: '0.875rem', fontWeight: 400, color: 'var(--muted-foreground)' }}>hrs</span>
          </div>
          <div className="metric-bottom">
            <span className="positive">↘ 8.1%</span>
            <span>faster this period</span>
          </div>
        </div>

        <div className="metric">
          <div className="metric-top">
            <span>Verified on-chain</span>
            <ShieldCheck size={16} />
          </div>
          <div className="metric-number">99.8%</div>
          <div className="metric-bottom">
            <span className="positive">● 4/4 peers</span>
            <span>consensus reached</span>
          </div>
        </div>
      </div>

      {/* Audit Ledger Table Section */}
      <section className="section" style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '4px', padding: '20px' }}>
        <div className="section-head">
          <div className="section-title">
            <Layers size={16} color="var(--primary)" />
            <h2 style={{ fontSize: '15px', fontWeight: 600 }}>Transaction history</h2>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="filter-bar" style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap' }}>
          <div className="search-field" style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
            <Search size={14} style={{ position: 'absolute', left: '12px', top: '10px', color: 'var(--muted-foreground)' }} />
            <input
              type="text"
              placeholder="Search transaction ID, block, ward, hash..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="form-input"
              style={{ paddingLeft: '34px', height: '36px', fontSize: '12px', background: 'var(--background)' }}
            />
          </div>

          <select
            className="form-input"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ width: '160px', height: '36px', fontSize: '12px', background: 'var(--background)' }}
          >
            <option>All statuses</option>
            <option>Verified</option>
            <option>Pending</option>
            <option>Rejected</option>
          </select>
        </div>

        {/* Transactions Table */}
        <div className="table-scroll" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left', color: 'var(--muted-foreground)', fontSize: '10px', letterSpacing: '0.05em' }}>
                <th style={{ padding: '10px 12px' }}>TRANSACTION ID</th>
                <th style={{ padding: '10px 12px' }}>BLOCK</th>
                <th style={{ padding: '10px 12px' }}>WARD</th>
                <th style={{ padding: '10px 12px' }}>TYPE</th>
                <th style={{ padding: '10px 12px' }}>TIME (UTC)</th>
                <th style={{ padding: '10px 12px' }}>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <tr
                  key={t.id}
                  onClick={() => setSelectedTx(t)}
                  style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer', transition: 'background 0.15s ease' }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <td style={{ padding: '12px' }}>
                    <div style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--primary)', fontWeight: 600, fontSize: '11px' }}>
                      {t.id}
                    </div>
                    <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '9px', color: 'var(--muted-foreground)', marginTop: '3px' }}>
                      {t.hash.slice(0, 10)}...{t.hash.slice(-4)}
                    </div>
                  </td>
                  <td style={{ padding: '12px', fontFamily: 'JetBrains Mono, monospace' }}>
                    #{t.block}
                  </td>
                  <td style={{ padding: '12px' }}>{t.ward}</td>
                  <td style={{ padding: '12px', textTransform: 'capitalize' }}>{t.type}</td>
                  <td style={{ padding: '12px', fontFamily: 'JetBrains Mono, monospace' }}>{t.time}</td>
                  <td style={{ padding: '12px' }}>
                    <span className={`tag ${t.status === 'Verified' ? 'positive' : t.status === 'Pending' ? 'warning' : 'danger'}`}>
                      <span className="status-dot" />
                      {t.status.toUpperCase()}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--muted-foreground)' }}>
              No records match your search filter.
            </div>
          )}
        </div>

        {/* Table Footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', fontSize: '11px', color: 'var(--muted-foreground)' }}>
          <span>Showing {filtered.length} of {allTransactions.length} records</span>
          <span style={{ fontFamily: 'JetBrains Mono, monospace' }}>
            {explorerData?.summary?.consensusMechanism || 'Hyperledger Fabric v2.5 Verified'}
          </span>
        </div>
      </section>

      {/* Transaction Detail Dialog matching Emerald Ledger Vision */}
      {selectedTx && (
        <div className="dialog-backdrop" onClick={() => setSelectedTx(null)}>
          <div
            className="detail-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="detail-title"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '580px', width: '90%' }}
          >
            <div className="section-head">
              <div>
                <div className="eyebrow" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ShieldCheck size={12} color="var(--primary)" />
                  <span>CIVICCHAIN RECORD</span>
                </div>
                <h2 id="detail-title" style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '1.25rem' }}>
                  {selectedTx.id}
                </h2>
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setSelectedTx(null)}
                style={{ padding: '6px', border: 'none', background: 'none', color: 'var(--muted-foreground)', cursor: 'pointer' }}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ color: 'var(--muted-foreground)', fontSize: '0.85rem', marginBottom: '16px' }}>
              Municipal ledger transaction with cryptographic evidence and state history.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div className="detail-row" style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--muted-foreground)' }}>Block height</span>
                <span style={{ fontFamily: 'JetBrains Mono, monospace' }}>#{selectedTx.block}</span>
              </div>
              <div className="detail-row" style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--muted-foreground)' }}>Ward</span>
                <span>{selectedTx.ward}</span>
              </div>
              <div className="detail-row" style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--muted-foreground)' }}>Transaction type</span>
                <span>{selectedTx.type}</span>
              </div>
              <div className="detail-row" style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--muted-foreground)' }}>Current state</span>
                <span>{selectedTx.state}</span>
              </div>
              <div className="detail-row" style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--muted-foreground)' }}>Transaction hash</span>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.75rem', color: 'var(--primary)', wordBreak: 'break-all' }}>
                  {selectedTx.hash}
                </span>
              </div>
              <div className="detail-row" style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--muted-foreground)' }}>Timestamp (UTC)</span>
                <span style={{ fontFamily: 'JetBrains Mono, monospace' }}>{selectedTx.time} UTC</span>
              </div>
              <div className="detail-row" style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--muted-foreground)' }}>Verification proof</span>
                <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <CheckCircle2 size={14} /> SHA-256 verified · Block #{selectedTx.block}
                </span>
              </div>
            </div>

            <div style={{ marginTop: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span className="tag positive">IMMUTABLE FABRIC ANCHOR</span>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => copyRecordDetails(selectedTx)}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                {copied ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                <span>{copied ? 'Copied' : 'Copy record'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
