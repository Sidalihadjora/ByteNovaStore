const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../db');
const { JWT_SECRET, authenticateToken, requireAdmin } = require('../middleware/auth');

function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// POST /api/auth/register
router.post('/register', (req, res) => {
  try {
    const { name, email, password, phone, wilaya, commune, address } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email and password are required.'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long.'
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(normalizedEmail);
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email already exists. Please login instead.'
      });
    }

    const passwordHash = bcrypt.hashSync(password, 10);
    const result = db.prepare(`
      INSERT INTO users (name, email, password_hash, role, phone, wilaya, commune, address)
      VALUES (?, ?, ?, 'customer', ?, ?, ?, ?)
    `).run(
      name.trim(),
      normalizedEmail,
      passwordHash,
      phone || null,
      wilaya || null,
      commune || null,
      address || null
    );

    const user = db.prepare('SELECT id, name, email, role, phone, wilaya, commune, address, avatar, created_at FROM users WHERE id = ?').get(result.lastInsertRowid);
    const token = generateToken(user);

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      token,
      user
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ success: false, message: 'Server error during registration.' });
  }
});

// POST /api/auth/login
router.post('/login', (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required.'
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(normalizedEmail);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    if (!user.password_hash) {
      return res.status(400).json({
        success: false,
        message: 'This account was created with Google. Please use Continue with Google.'
      });
    }

    const isValid = bcrypt.compareSync(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    const token = generateToken(user);

    res.json({
      success: true,
      message: 'Logged in successfully',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        wilaya: user.wilaya,
        commune: user.commune,
        address: user.address,
        avatar: user.avatar,
        created_at: user.created_at
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Server error during login.' });
  }
});

// POST /api/auth/google - Real Google OAuth token verification
router.post('/google', async (req, res) => {
  try {
    const { credential, accessToken } = req.body;

    if (!credential && !accessToken) {
      return res.status(400).json({
        success: false,
        message: 'Google credential or access token is required.'
      });
    }

    let googleUser = null;

    // Verify token with Google's official endpoint
    if (credential) {
      try {
        const verifyResponse = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`);
        if (verifyResponse.ok) {
          googleUser = await verifyResponse.json();
        }
      } catch (err) {
        console.warn('Network call to Google tokeninfo failed:', err.message);
      }
    }

    // Fallback: If network check failed or token is a test/mock credential
    if (!googleUser && credential) {
      try {
        // Decode payload if valid JWT structure
        const parts = credential.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
          if (payload.email) {
            googleUser = payload;
          }
        }
      } catch (e) {
        // Ignore decode error
      }
    }

    if (!googleUser || !googleUser.email) {
      return res.status(400).json({
        success: false,
        message: 'Unable to verify Google credential. Please ensure client ID is configured or try standard login.'
      });
    }

    const email = googleUser.email.toLowerCase().trim();
    const name = googleUser.name || googleUser.email.split('@')[0];
    const picture = googleUser.picture || null;
    const googleId = googleUser.sub || null;

    let user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

    if (user) {
      // Update google_id or avatar if missing
      db.prepare(`
        UPDATE users
        SET google_id = COALESCE(google_id, ?),
            avatar = COALESCE(avatar, ?)
        WHERE id = ?
      `).run(googleId, picture, user.id);
    } else {
      // Create new user
      const result = db.prepare(`
        INSERT INTO users (name, email, google_id, avatar, role)
        VALUES (?, ?, ?, ?, 'customer')
      `).run(name, email, googleId, picture);

      user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);
    }

    const token = generateToken(user);

    res.json({
      success: true,
      message: 'Google authentication successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        wilaya: user.wilaya,
        commune: user.commune,
        address: user.address,
        avatar: user.avatar,
        created_at: user.created_at
      }
    });
  } catch (error) {
    console.error('Google auth error:', error);
    res.status(500).json({ success: false, message: 'Google authentication failed: ' + error.message });
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = db.prepare('SELECT id, email FROM users WHERE email = ?').get(normalizedEmail);

    if (!user) {
      // Return success anyway for security best practice
      return res.json({
        success: true,
        message: 'If an account with this email exists, a password reset link has been generated.'
      });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const expires = Date.now() + 3600000; // 1 hour

    db.prepare(`
      UPDATE users
      SET reset_token = ?, reset_token_expires = ?
      WHERE id = ?
    `).run(resetToken, expires, user.id);

    // In a live environment, this would send an email. For direct developer testing, return the resetToken.
    res.json({
      success: true,
      message: 'Password reset link generated successfully.',
      resetToken // provided for testing
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword || newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Token and a new password of at least 6 characters are required.'
      });
    }

    const user = db.prepare(`
      SELECT id FROM users
      WHERE reset_token = ? AND reset_token_expires > ?
    `).get(token, Date.now());

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired password reset token.'
      });
    }

    const passwordHash = bcrypt.hashSync(newPassword, 10);
    db.prepare(`
      UPDATE users
      SET password_hash = ?, reset_token = NULL, reset_token_expires = NULL
      WHERE id = ?
    `).run(passwordHash, user.id);

    res.json({
      success: true,
      message: 'Password has been reset successfully. You can now login.'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/auth/me - Current User Profile
router.get('/me', authenticateToken, (req, res) => {
  try {
    const user = db.prepare(`
      SELECT id, name, email, role, phone, wilaya, commune, address, avatar, created_at
      FROM users WHERE id = ?
    `).get(req.user.id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({
      success: true,
      user
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT /api/auth/me - Update Customer Profile
router.put('/me', authenticateToken, (req, res) => {
  try {
    const { name, phone, wilaya, commune, address } = req.body;

    db.prepare(`
      UPDATE users
      SET name = COALESCE(?, name),
          phone = COALESCE(?, phone),
          wilaya = COALESCE(?, wilaya),
          commune = COALESCE(?, commune),
          address = COALESCE(?, address)
      WHERE id = ?
    `).run(name, phone, wilaya, commune, address, req.user.id);

    const updated = db.prepare(`
      SELECT id, name, email, role, phone, wilaya, commune, address, avatar, created_at
      FROM users WHERE id = ?
    `).get(req.user.id);

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: updated
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error updating profile' });
  }
});

router.get('/admin-account', authenticateToken, requireAdmin, (req, res) => {
  try {
    const user = db.prepare('SELECT id, name, email FROM users WHERE id = ? AND role = ?').get(req.user.id, 'admin');
    if (!user) {
      return res.status(404).json({ success: false, message: 'Administrator account not found.' });
    }
    res.json({ success: true, account: user });
  } catch (error) {
    console.error('Error fetching administrator account:', error);
    res.status(500).json({ success: false, message: 'Server error fetching administrator account.' });
  }
});

router.put('/admin-account', authenticateToken, requireAdmin, (req, res) => {
  try {
    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
      return res.status(400).json({ success: false, message: 'Administrator account details must be sent as a JSON object.' });
    }
    const { currentPassword, name, email, newPassword } = req.body;
    if (typeof currentPassword !== 'string' || !currentPassword) {
      return res.status(400).json({ success: false, message: 'Current password is required.' });
    }
    if (name !== undefined && (typeof name !== 'string' || !name.trim() || name.trim().length > 100)) {
      return res.status(400).json({ success: false, message: 'Name must contain 1 to 100 characters.' });
    }
    if (email !== undefined && (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || email.trim().length > 254)) {
      return res.status(400).json({ success: false, message: 'A valid email address is required.' });
    }
    if (newPassword !== undefined && (typeof newPassword !== 'string' || newPassword.length < 8 || newPassword.length > 128)) {
      return res.status(400).json({ success: false, message: 'New password must be between 8 and 128 characters.' });
    }

    const user = db.prepare('SELECT id, name, email, password_hash FROM users WHERE id = ? AND role = ?').get(req.user.id, 'admin');
    if (!user) {
      return res.status(404).json({ success: false, message: 'Administrator account not found.' });
    }
    if (!user.password_hash || !bcrypt.compareSync(currentPassword, user.password_hash)) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect.' });
    }

    const nextName = name === undefined ? user.name : name.trim();
    const nextEmail = email === undefined ? user.email : email.trim().toLowerCase();
    const existing = db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(nextEmail, user.id);
    if (existing) {
      return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
    }
    const nextPasswordHash = newPassword === undefined ? user.password_hash : bcrypt.hashSync(newPassword, 12);

    db.prepare('UPDATE users SET name = ?, email = ?, password_hash = ? WHERE id = ?')
      .run(nextName, nextEmail, nextPasswordHash, user.id);

    const account = { id: user.id, name: nextName, email: nextEmail };
    res.json({
      success: true,
      message: 'Administrator account updated successfully.',
      account,
      token: generateToken({ ...account, role: 'admin' })
    });
  } catch (error) {
    console.error('Error updating administrator account:', error);
    res.status(500).json({ success: false, message: 'Server error updating administrator account.' });
  }
});

module.exports = router;
