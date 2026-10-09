import { getDb } from '../config/database.js';

export async function listUsers(req, res) {
  try {
    const db = getDb();
    const { role, search, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let whereParts = [];
    let params = [];

    if (role) { whereParts.push('role = ?'); params.push(role.toUpperCase()); }
    if (search) {
      whereParts.push('(name LIKE ? OR email LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }

    const whereClause = whereParts.length ? `WHERE ${whereParts.join(' AND ')}` : '';

    const total = await db.get(`SELECT COUNT(*) as cnt FROM users ${whereClause}`, params);
    const users = await db.all(
      `SELECT id, name, email, phone, role, department, badge_number, is_active, created_at
       FROM users ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    res.json({
      users,
      pagination: {
        total: total.cnt, page: parseInt(page),
        limit: parseInt(limit), pages: Math.ceil(total.cnt / parseInt(limit))
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
}

export async function listOfficers(req, res) {
  try {
    const db = getDb();
    const officers = await db.all(
      `SELECT id, name, email, department, badge_number, role
       FROM users WHERE role IN ('AUTHORITY', 'INVESTIGATOR') AND is_active = 1
       ORDER BY name`
    );
    res.json({ officers });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch officers' });
  }
}

export async function toggleUserStatus(req, res) {
  try {
    const db = getDb();
    const user = await db.get('SELECT * FROM users WHERE id = ?', req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const newStatus = user.is_active ? 0 : 1;
    await db.run('UPDATE users SET is_active = ?, updated_at = ? WHERE id = ?',
      [newStatus, new Date().toISOString(), user.id]);

    res.json({ message: `User ${newStatus ? 'activated' : 'deactivated'}`, is_active: newStatus === 1 });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update user status' });
  }
}

export async function updateUserRole(req, res) {
  try {
    const { role } = req.body;
    const VALID = ['CITIZEN', 'AUTHORITY', 'INVESTIGATOR', 'VERIFIER', 'ADMIN'];
    if (!VALID.includes(role?.toUpperCase())) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const db = getDb();
    await db.run('UPDATE users SET role = ?, updated_at = ? WHERE id = ?',
      [role.toUpperCase(), new Date().toISOString(), req.params.id]);

    res.json({ message: 'Role updated successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update role' });
  }
}
