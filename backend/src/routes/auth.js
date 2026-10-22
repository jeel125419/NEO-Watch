import { Router } from 'express';
import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { query } from '../db/index.js';
import { requireAuth, JWT_SECRET } from '../middleware/auth.js';

const router = Router();

// Rate limiter for authentication endpoints to mitigate brute force attacks
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 25, // limit each IP to 25 auth requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts. Please try again after 15 minutes.' }
});

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * POST /api/auth/register
 * Create a new user account with hashed password and return JWT
 */
router.post('/register', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
      return res.status(400).json({ error: 'Please provide a valid email address.' });
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Check if user already exists
    const existing = await query('SELECT id FROM users WHERE email = $1', [cleanEmail]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const passwordHash = await bcryptjs.hash(password, 10);
    const insertRes = await query(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, created_at',
      [cleanEmail, passwordHash]
    );

    const user = insertRes.rows[0];
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

    return res.status(201).json({
      message: 'Account created successfully',
      token,
      user: {
        id: user.id,
        email: user.email,
        created_at: user.created_at
      }
    });
  } catch (err) {
    console.error('[Auth Register Error]', err);
    return res.status(500).json({ error: 'Failed to register account.' });
  }
});

/**
 * POST /api/auth/login
 * Verify user credentials and return JWT
 */
router.post('/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const cleanEmail = email.trim().toLowerCase();

    const userRes = await query(
      'SELECT id, email, password_hash, created_at FROM users WHERE email = $1',
      [cleanEmail]
    );

    if (userRes.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const user = userRes.rows[0];
    const match = await bcryptjs.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

    return res.json({
      message: 'Signed in successfully',
      token,
      user: {
        id: user.id,
        email: user.email,
        created_at: user.created_at
      }
    });
  } catch (err) {
    console.error('[Auth Login Error]', err);
    return res.status(500).json({ error: 'Failed to sign in.' });
  }
});

/**
 * GET /api/auth/me
 * Return currently authenticated user profile
 */
router.get('/me', requireAuth, async (req, res) => {
  try {
    const result = await query(
      'SELECT id, email, created_at FROM users WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    return res.json({ user: result.rows[0] });
  } catch (err) {
    console.error('[Auth Me Error]', err);
    return res.status(500).json({ error: 'Failed to retrieve user profile.' });
  }
});

export default router;
