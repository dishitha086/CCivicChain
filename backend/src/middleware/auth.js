import jwt from 'jsonwebtoken';
import { getDb } from '../config/database.js';

export async function authenticate(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const token = authHeader.slice(7);
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const db = getDb();
    const user = await db.get(
      'SELECT id, name, email, role, department, is_active FROM users WHERE id = ?',
      decoded.userId
    );
    if (!user || !user.is_active) {
      return res.status(401).json({ error: 'User not found or account deactivated' });
    }
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Authentication required' });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Access denied. Required: ${roles.join(' or ')}. Your role: ${req.user.role}`
      });
    }
    next();
  };
}
