import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../config/database.js';

const VALID_ROLES = ['CITIZEN', 'AUTHORITY', 'INVESTIGATOR', 'VERIFIER', 'ADMIN'];

export async function register(req, res) {
  try {
    const { name, email, phone, password, role, department, badge_number, address, city, state, pincode } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const userRole = (role || 'CITIZEN').toUpperCase();
    if (!VALID_ROLES.includes(userRole)) {
      return res.status(400).json({ error: `Invalid role. Valid: ${VALID_ROLES.join(', ')}` });
    }

    const db = getDb();
    const existing = await db.get('SELECT id FROM users WHERE email = ?', email.toLowerCase().trim());
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, parseInt(process.env.BCRYPT_ROUNDS) || 10);
    const userId = uuidv4();
    const now = new Date().toISOString();

    await db.run(
      `INSERT INTO users (id, name, email, phone, password_hash, role, department, badge_number, address, city, state, pincode, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, name.trim(), email.toLowerCase().trim(), phone || null, passwordHash, userRole,
       department || null, badge_number || null, address || null, city || null, state || null, pincode || null, now, now]
    );

    const token = jwt.sign({ userId, role: userRole }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    });

    const user = await db.get(
      'SELECT id, name, email, phone, role, department, badge_number, city, state, created_at FROM users WHERE id = ?',
      userId
    );

    res.status(201).json({ message: 'Registration successful', token, user });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
}

export async function login(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const db = getDb();
    const user = await db.get('SELECT * FROM users WHERE email = ?', email.toLowerCase().trim());
    if (!user) return res.status(401).json({ error: 'Invalid email or password' });
    if (!user.is_active) return res.status(403).json({ error: 'Account deactivated. Contact admin.' });

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) return res.status(401).json({ error: 'Invalid email or password' });

    const token = jwt.sign({ userId: user.id, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    });

    const { password_hash, ...safeUser } = user;
    res.json({ message: 'Login successful', token, user: safeUser });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
}

export async function getMe(req, res) {
  try {
    const db = getDb();
    const user = await db.get(
      'SELECT id, name, email, phone, role, department, badge_number, address, city, state, pincode, profile_photo, created_at, updated_at FROM users WHERE id = ?',
      req.user.id
    );
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
}

export async function updateProfile(req, res) {
  try {
    const { name, phone, address, city, state, pincode } = req.body;
    const db = getDb();
    const now = new Date().toISOString();

    await db.run(
      'UPDATE users SET name = ?, phone = ?, address = ?, city = ?, state = ?, pincode = ?, updated_at = ? WHERE id = ?',
      [name, phone || null, address || null, city || null, state || null, pincode || null, now, req.user.id]
    );

    const user = await db.get(
      'SELECT id, name, email, phone, role, department, address, city, state, pincode FROM users WHERE id = ?',
      req.user.id
    );
    res.json({ message: 'Profile updated', user });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update profile' });
  }
}

export async function changePassword(req, res) {
  try {
    const { current_password, new_password } = req.body;
    if (!current_password || !new_password) {
      return res.status(400).json({ error: 'Both passwords required' });
    }
    if (new_password.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }

    const db = getDb();
    const user = await db.get('SELECT password_hash FROM users WHERE id = ?', req.user.id);
    const valid = await bcrypt.compare(current_password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Current password is incorrect' });

    const newHash = await bcrypt.hash(new_password, parseInt(process.env.BCRYPT_ROUNDS) || 10);
    await db.run('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?',
      [newHash, new Date().toISOString(), req.user.id]);

    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to change password' });
  }
}
