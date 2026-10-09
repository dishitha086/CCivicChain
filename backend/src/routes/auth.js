import express from 'express';
import rateLimit from 'express-rate-limit';
import { register, login, getMe, updateProfile, changePassword } from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Strict rate limiter for login to prevent brute force password guessing attacks
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Max 20 attempts per 15 min window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts. For security reasons, please try again in 15 minutes.' }
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Max 10 account creations per hour per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Account registration limit reached. Please try again later.' }
});

router.post('/register', registerLimiter, register);
router.post('/login', authLimiter, login);
router.get('/me', authenticate, getMe);
router.put('/profile', authenticate, updateProfile);
router.put('/change-password', authLimiter, authenticate, changePassword);

export default router;
