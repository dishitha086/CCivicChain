import { open } from 'sqlite';
import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../data/civicchain.db');

// Ensure data directory exists
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

let _db = null;

export async function initDatabase() {
  _db = await open({
    filename: DB_PATH,
    driver: sqlite3.Database
  });

  await _db.exec('PRAGMA journal_mode = WAL');
  await _db.exec('PRAGMA foreign_keys = ON');

  await _db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      phone TEXT,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'CITIZEN',
      department TEXT,
      badge_number TEXT,
      is_active INTEGER DEFAULT 1,
      profile_photo TEXT,
      address TEXT,
      city TEXT,
      state TEXT,
      pincode TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS complaints (
      id TEXT PRIMARY KEY,
      complaint_number TEXT UNIQUE NOT NULL,
      citizen_id TEXT NOT NULL,
      category TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      location TEXT NOT NULL,
      latitude REAL,
      longitude REAL,
      status TEXT NOT NULL DEFAULT 'REPORTED',
      priority TEXT DEFAULT 'MEDIUM',
      assigned_department TEXT,
      assigned_officer_id TEXT,
      investigator_id TEXT,
      verifier_id TEXT,
      resolution_details TEXT,
      verification_details TEXT,
      rejection_reason TEXT,
      blockchain_tx_id TEXT,
      blockchain_hash TEXT,
      is_anonymous INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (citizen_id) REFERENCES users(id),
      FOREIGN KEY (assigned_officer_id) REFERENCES users(id),
      FOREIGN KEY (investigator_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS complaint_events (
      id TEXT PRIMARY KEY,
      complaint_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      from_status TEXT,
      to_status TEXT,
      performed_by TEXT NOT NULL,
      performer_role TEXT NOT NULL,
      notes TEXT,
      blockchain_tx_id TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (complaint_id) REFERENCES complaints(id),
      FOREIGN KEY (performed_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS evidence (
      id TEXT PRIMARY KEY,
      complaint_id TEXT NOT NULL,
      uploaded_by TEXT NOT NULL,
      filename TEXT NOT NULL,
      original_name TEXT NOT NULL,
      file_path TEXT NOT NULL,
      file_size INTEGER,
      mime_type TEXT,
      sha256_hash TEXT NOT NULL,
      description TEXT,
      blockchain_hash TEXT,
      is_investigation_evidence INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY (complaint_id) REFERENCES complaints(id),
      FOREIGN KEY (uploaded_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS blockchain_records (
      id TEXT PRIMARY KEY,
      tx_id TEXT NOT NULL,
      complaint_id TEXT,
      event_type TEXT NOT NULL,
      payload_hash TEXT,
      block_number INTEGER,
      timestamp TEXT NOT NULL,
      mode TEXT NOT NULL DEFAULT 'mock',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS citizen_feedback (
      id TEXT PRIMARY KEY,
      complaint_id TEXT NOT NULL,
      citizen_id TEXT NOT NULL,
      rating INTEGER NOT NULL,
      comments TEXT,
      blockchain_tx_id TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (complaint_id) REFERENCES complaints(id),
      FOREIGN KEY (citizen_id) REFERENCES users(id)
    );

    CREATE INDEX IF NOT EXISTS idx_complaints_citizen ON complaints(citizen_id);
    CREATE INDEX IF NOT EXISTS idx_complaints_status ON complaints(status);
    CREATE INDEX IF NOT EXISTS idx_complaints_category ON complaints(category);
    CREATE INDEX IF NOT EXISTS idx_complaint_events_complaint ON complaint_events(complaint_id);
    CREATE INDEX IF NOT EXISTS idx_evidence_complaint ON evidence(complaint_id);
  `);
    
  // Add evidence type without deleting existing evidence.
  const evidenceColumns = await _db.all(
    'PRAGMA table_info(evidence)'
  );

  if (!evidenceColumns.some(column => column.name === 'evidence_type')) {
    await _db.exec(`
      ALTER TABLE evidence
      ADD COLUMN evidence_type TEXT NOT NULL DEFAULT 'ORIGINAL'
    `);
  }

  // Store separate Investigator and Verifier decisions
  // for each individual evidence file.
  await _db.exec(`
    CREATE TABLE IF NOT EXISTS evidence_reviews (
      id TEXT PRIMARY KEY,
      evidence_id TEXT NOT NULL,
      reviewer_role TEXT NOT NULL
        CHECK (reviewer_role IN ('INVESTIGATOR', 'VERIFIER')),
      reviewer_id TEXT NOT NULL,
      decision TEXT NOT NULL
        CHECK (decision IN ('APPROVED', 'REJECTED')),
      comments TEXT,
      created_at TEXT NOT NULL,

      FOREIGN KEY (evidence_id)
        REFERENCES evidence(id),

      FOREIGN KEY (reviewer_id)
        REFERENCES users(id),

      UNIQUE (evidence_id, reviewer_role)
    );

    CREATE INDEX IF NOT EXISTS
      idx_evidence_reviews_evidence
      ON evidence_reviews(evidence_id);
  `);

  console.log('✅ Database initialized at', DB_PATH);
  
  return _db;
}

export function getDb() {
  if (!_db) throw new Error('Database not initialized. Call initDatabase() first.');
  return _db;
}
