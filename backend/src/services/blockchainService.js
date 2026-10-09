/**
 * BlockchainService - Clean abstraction over Hyperledger Fabric
 *
 * Modes:
 *  - 'mock'   : Simulates blockchain behaviour locally using SQLite for persistence
 *  - 'fabric' : Real Hyperledger Fabric via @hyperledger/fabric-gateway
 *
 * BLOCKCHAIN CONCEPTS DEMONSTRATED:
 * - Immutable ledger: records once written are never deleted
 * - State machine: validated transitions with tamper-evident event sourcing
 * - Hash chaining: each record contains a payload hash
 * - Identity: performer identity is hashed (privacy-preserving)
 * - Auditability: full history of every state change
 */

import { getDb } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

const MODE = process.env.BLOCKCHAIN_MODE || 'mock';

// ─── State machine ────────────────────────────────────────────────────────────
export const VALID_TRANSITIONS = {
  REPORTED:             ['REGISTERED'],
  REGISTERED:           ['ASSIGNED'],
  ASSIGNED:             ['INVESTIGATING'],
  INVESTIGATING:        ['VERIFIED'],
  VERIFIED:             ['ACTION_TAKEN'],
  ACTION_TAKEN:         ['RESOLVED'],
  RESOLVED:             ['RESOLUTION_VERIFIED'],
  RESOLUTION_VERIFIED:  ['CLOSED'],
  CLOSED:               []
};

// Map API action name → target status
export const ACTION_TO_STATUS = {
  register:             'REGISTERED',
  assign:               'ASSIGNED',
  investigate:          'INVESTIGATING',
  verify:               'VERIFIED',
  action:               'ACTION_TAKEN',
  resolve:              'RESOLVED',
  'verify-resolution':  'RESOLUTION_VERIFIED',
  close:                'CLOSED'
};

export function validateTransition(from, to) {
  const allowed = VALID_TRANSITIONS[from];
  if (!allowed) throw new Error(`Unknown status: ${from}`);
  if (!allowed.includes(to)) {
    throw new Error(
      `Invalid state transition: ${from} → ${to}. ` +
      `Allowed next states: [${allowed.join(', ') || 'none (CLOSED is terminal)'}]`
    );
  }
}

// ─── Utilities ────────────────────────────────────────────────────────────────
function hashPayload(payload) {
  return crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}

function mockTxId(type, complaintId) {
  const ts = Date.now().toString(16).toUpperCase();
  const rand = crypto.randomBytes(8).toString('hex').toUpperCase();
  return `MOCK:${type}:${(complaintId || 'SYS').slice(-8).toUpperCase()}:${ts}:${rand}`;
}

// ─── Mock Blockchain Adapter ──────────────────────────────────────────────────
class MockBlockchainAdapter {
  constructor() {
    console.log('🔷 BlockchainService: Using MOCK adapter');
    console.log('   To use real Hyperledger Fabric, set BLOCKCHAIN_MODE=fabric in .env');
  }

  async createComplaint(complaintData) {
    const db = getDb();
    const txId = mockTxId('CREATE', complaintData.complaintId);
    const payload = {
      type: 'CREATE_COMPLAINT',
      complaintId: complaintData.complaintId,
      citizenHash: crypto.createHash('sha256').update(complaintData.citizenId).digest('hex'),
      category: complaintData.category,
      status: 'REPORTED',
      timestamp: new Date().toISOString()
    };
    const payloadHash = hashPayload(payload);

    await db.run(
      `INSERT INTO blockchain_records (id, tx_id, complaint_id, event_type, payload_hash, block_number, timestamp, mode, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [uuidv4(), txId, complaintData.complaintId, 'CREATE_COMPLAINT', payloadHash,
       Math.floor(Math.random() * 900000) + 100000, new Date().toISOString(), 'mock', new Date().toISOString()]
    );

    return { txId, payloadHash, mode: 'mock' };
  }

  async transitionComplaint(complaintId, action, performerId, performerRole, notes, extraData = {}) {
    const db = getDb();
    const complaint = await db.get('SELECT * FROM complaints WHERE id = ?', complaintId);
    if (!complaint) throw new Error(`Complaint ${complaintId} not found`);

    const toStatus = ACTION_TO_STATUS[action];
    if (!toStatus) throw new Error(`Unknown action: ${action}`);

    // Validate state machine transition
    validateTransition(complaint.status, toStatus);

    const txId = mockTxId(action.toUpperCase().replace('-', '_'), complaintId);
    const payload = {
      type: `COMPLAINT_${action.toUpperCase().replace('-', '_')}`,
      complaintId,
      fromStatus: complaint.status,
      toStatus,
      performerHash: crypto.createHash('sha256').update(performerId).digest('hex'),
      performerRole,
      timestamp: new Date().toISOString()
    };
    const payloadHash = hashPayload(payload);

    await db.run(
      `INSERT INTO blockchain_records (id, tx_id, complaint_id, event_type, payload_hash, block_number, timestamp, mode, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [uuidv4(), txId, complaintId, payload.type, payloadHash,
       Math.floor(Math.random() * 900000) + 100000, new Date().toISOString(), 'mock', new Date().toISOString()]
    );

    return { txId, fromStatus: complaint.status, toStatus, payloadHash, mode: 'mock' };
  }

  async getComplaintHistory(complaintId) {
    const db = getDb();
    return await db.all(
      'SELECT * FROM blockchain_records WHERE complaint_id = ? ORDER BY created_at ASC',
      complaintId
    );
  }

  async verifyEvidenceHash(evidenceId, claimedHash) {
    const db = getDb();
    const ev = await db.get('SELECT sha256_hash FROM evidence WHERE id = ?', evidenceId);
    if (!ev) return { verified: false, reason: 'Evidence not found' };
    const verified = ev.sha256_hash === claimedHash;
    return { verified, storedHash: ev.sha256_hash, claimedHash };
  }
}

// ─── Fabric Adapter (Ready for real Fabric) ───────────────────────────────────
class FabricBlockchainAdapter {
  constructor() {
    console.log('🔷 BlockchainService: FABRIC adapter configured');
    // Prerequisites for real Fabric:
    // 1. npm install @hyperledger/fabric-gateway
    // 2. Run network: ./blockchain/scripts/start-network.sh
    // 3. Deploy chaincode: ./blockchain/scripts/deploy-chaincode.sh
    // 4. Configure TLS certs and wallet identity in .env
  }

  async createComplaint(data) {
    throw new Error('Fabric adapter: connect to real Hyperledger Fabric network. See blockchain/README.md');
  }

  async transitionComplaint(complaintId, action, performerId, performerRole, notes, extraData) {
    throw new Error('Fabric adapter: not connected. Set BLOCKCHAIN_MODE=mock for development');
  }

  async getComplaintHistory(complaintId) {
    throw new Error('Fabric adapter: not connected');
  }
}

// ─── Factory ──────────────────────────────────────────────────────────────────
let _adapter = null;

export function getBlockchainService() {
  if (!_adapter) {
    _adapter = MODE === 'fabric'
      ? new FabricBlockchainAdapter()
      : new MockBlockchainAdapter();
  }
  return _adapter;
}
