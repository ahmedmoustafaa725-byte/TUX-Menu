const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

const {
  createUser,
  findUserByEmail,
  findUserById,
  updateUser,
  createPasswordResetToken,
  findPasswordResetToken,
  deletePasswordResetToken,
} = require('../db');
const { sendPasswordResetEmail } = require('../services/email');

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'development-secret';
const JWT_EXPIRES_IN = '7d';
const PASSWORD_RESET_EXPIRY_MS = 60 * 60 * 1000; // 1 hour

function generateToken(user) {
  return jwt.sign({ sub: user.id }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

function sanitizeUser(user) {
  if (!user) return null;
  const { password_hash, ...rest } = user;
  return {
    id: rest.id,
    email: rest.email,
    name: rest.name,
    address: rest.address,
    phone: rest.phone,
    created_at: rest.created_at,
    updated_at: rest.updated_at,
  };
}

async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'Authentication required.' });
  }
  const [, token] = authHeader.split(' ');
  if (!token) {
    return res.status(401).json({ error: 'Invalid authorization header.' });
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = findUserById(payload.sub);
    if (!user) {
      return res.status(401).json({ error: 'User not found.' });
    }
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

router.post('/register', async (req, res) => {
  const { email, password, name, address, phone } = req.body || {};

  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Email, password, and name are required.' });
  }

  const normalisedEmail = email.toLowerCase();
  const existing = findUserByEmail(normalisedEmail);
  if (existing) {
    return res.status(409).json({ error: 'Email is already registered.' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = createUser({
    email: normalisedEmail,
    passwordHash,
    name,
    address,
    phone,
  });

  const token = generateToken(user);
  return res.status(201).json({ token, user: sanitizeUser(user) });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }
  const user = findUserByEmail(email);
  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }
  const matches = await bcrypt.compare(password, user.password_hash);
  if (!matches) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }
  const token = generateToken(user);
  return res.json({ token, user: sanitizeUser(user) });
});

router.get('/me', authenticate, (req, res) => {
  return res.json({ user: sanitizeUser(req.user) });
});

router.put('/me', authenticate, async (req, res) => {
  const { email, name, address, phone, password } = req.body || {};
  const updates = {};
  if (email !== undefined) updates.email = email;
  if (name !== undefined) updates.name = name;
  if (address !== undefined) updates.address = address;
  if (phone !== undefined) updates.phone = phone;
  if (password) {
    updates.passwordHash = await bcrypt.hash(password, 10);
  }

  if (updates.email) {
    const existing = findUserByEmail(updates.email);
    if (existing && existing.id !== req.user.id) {
      return res.status(409).json({ error: 'Email is already registered.' });
    }
  }

  const user = updateUser(req.user.id, updates);
  return res.json({ user: sanitizeUser(user) });
});

router.post('/forgot-password', async (req, res) => {
  const { email } = req.body || {};
  if (!email) {
    return res.status(400).json({ error: 'Email is required.' });
  }
  const user = findUserByEmail(email);
  if (user) {
    const token = uuidv4();
    const expiresAt = Date.now() + PASSWORD_RESET_EXPIRY_MS;
    createPasswordResetToken(user.id, token, expiresAt);

    const resetLinkBase = process.env.RESET_PASSWORD_URL || 'http://localhost:4000/reset-password';
    const resetLink = `${resetLinkBase}?token=${token}`;
    await sendPasswordResetEmail({
      to: user.email,
      token,
      expiresAt,
      resetLink,
    });
  }
  return res.json({ message: 'If the email exists, a reset link has been sent.' });
});

router.post('/reset-password', async (req, res) => {
  const { token, password } = req.body || {};
  if (!token || !password) {
    return res.status(400).json({ error: 'Token and new password are required.' });
  }
  const resetRecord = findPasswordResetToken(token);
  if (!resetRecord) {
    return res.status(400).json({ error: 'Invalid or expired token.' });
  }
  if (Date.now() > resetRecord.expires_at) {
    deletePasswordResetToken(token);
    return res.status(400).json({ error: 'Invalid or expired token.' });
  }
  const passwordHash = await bcrypt.hash(password, 10);
  updateUser(resetRecord.user_id, { passwordHash });
  deletePasswordResetToken(token);
  return res.json({ message: 'Password updated successfully.' });
});

module.exports = router;
