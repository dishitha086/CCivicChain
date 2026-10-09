import { getDb } from '../config/database.js';

export async function getCitizenDashboard(req, res) {
  try {
    const db = getDb();
    const userId = req.user.id;

    const stats = await db.get(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'REPORTED' THEN 1 ELSE 0 END) as reported,
        SUM(CASE WHEN status IN ('REGISTERED','ASSIGNED','INVESTIGATING','VERIFIED','ACTION_TAKEN') THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN status IN ('RESOLVED','RESOLUTION_VERIFIED') THEN 1 ELSE 0 END) as resolved,
        SUM(CASE WHEN status = 'CLOSED' THEN 1 ELSE 0 END) as closed
      FROM complaints WHERE citizen_id = ?`,
      userId
    );

    const recent = await db.all(
      `SELECT id, complaint_number, title, category, status, priority, created_at, updated_at
       FROM complaints WHERE citizen_id = ? ORDER BY updated_at DESC LIMIT 5`,
      userId
    );

    res.json({ stats, recent });
  } catch (err) {
    console.error('Citizen dashboard error:', err);
    res.status(500).json({ error: 'Failed to fetch dashboard' });
  }
}

export async function getAuthorityDashboard(req, res) {
  try {
    const db = getDb();

    const stats = await db.get(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'REPORTED' THEN 1 ELSE 0 END) as pending_registration,
        SUM(CASE WHEN status = 'REGISTERED' THEN 1 ELSE 0 END) as registered,
        SUM(CASE WHEN status = 'ASSIGNED' THEN 1 ELSE 0 END) as assigned,
        SUM(CASE WHEN status = 'INVESTIGATING' THEN 1 ELSE 0 END) as investigating,
        SUM(CASE WHEN status = 'VERIFIED' THEN 1 ELSE 0 END) as verified,
        SUM(CASE WHEN status = 'ACTION_TAKEN' THEN 1 ELSE 0 END) as action_taken,
        SUM(CASE WHEN status IN ('RESOLVED','RESOLUTION_VERIFIED') THEN 1 ELSE 0 END) as resolved,
        SUM(CASE WHEN status = 'CLOSED' THEN 1 ELSE 0 END) as closed
      FROM complaints`
    );

    const byCategory = await db.all(
      'SELECT category, COUNT(*) as count FROM complaints GROUP BY category ORDER BY count DESC'
    );

    const recent = await db.all(
      `SELECT c.id, c.complaint_number, c.title, c.category, c.status, c.priority,
              c.assigned_department, c.created_at, c.updated_at, u.name as citizen_name
       FROM complaints c LEFT JOIN users u ON c.citizen_id = u.id
       ORDER BY c.updated_at DESC LIMIT 10`
    );

    res.json({ stats, byCategory, recent });
  } catch (err) {
    console.error('Authority dashboard error:', err);
    res.status(500).json({ error: 'Failed to fetch authority dashboard' });
  }
}

export async function getAdminDashboard(req, res) {
  try {
    const db = getDb();

    const complaintStats = await db.get(`
      SELECT COUNT(*) as total,
        SUM(CASE WHEN status = 'REPORTED' THEN 1 ELSE 0 END) as reported,
        SUM(CASE WHEN status = 'REGISTERED' THEN 1 ELSE 0 END) as registered,
        SUM(CASE WHEN status = 'ASSIGNED' THEN 1 ELSE 0 END) as assigned,
        SUM(CASE WHEN status = 'INVESTIGATING' THEN 1 ELSE 0 END) as investigating,
        SUM(CASE WHEN status = 'CLOSED' THEN 1 ELSE 0 END) as closed
      FROM complaints`
    );

    const userStats = await db.all('SELECT role, COUNT(*) as count FROM users GROUP BY role');

    const blockchainStats = await db.get(
      'SELECT mode, COUNT(*) as count FROM blockchain_records GROUP BY mode'
    );

    const recentUsers = await db.all(
      'SELECT id, name, email, role, is_active, created_at FROM users ORDER BY created_at DESC LIMIT 10'
    );

    const recentComplaints = await db.all(
      `SELECT c.id, c.complaint_number, c.title, c.category, c.status, c.created_at, u.name as citizen_name
       FROM complaints c LEFT JOIN users u ON c.citizen_id = u.id
       ORDER BY c.created_at DESC LIMIT 10`
    );

    res.json({
      complaintStats,
      userStats,
      blockchainStats: blockchainStats || { mode: 'mock', count: 0 },
      recentUsers,
      recentComplaints,
      systemInfo: {
        blockchainMode: process.env.BLOCKCHAIN_MODE || 'mock',
        version: '1.0.0',
        nodeEnv: process.env.NODE_ENV
      }
    });
  } catch (err) {
    console.error('Admin dashboard error:', err);
    res.status(500).json({ error: 'Failed to fetch admin dashboard' });
  }
}
