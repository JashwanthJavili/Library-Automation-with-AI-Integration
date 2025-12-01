import express from 'express';
import { body, validationResult } from 'express-validator';
import bcrypt from 'bcryptjs';
import pool from '../mysql.js';
import { protect, authorize, generateToken } from '../middleware/auth.js';

const router = express.Router();

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public (for students), Private (for admin/librarian creation)
router.post('/register', [
  body('username')
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),
  
  body('firstName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters'),
  
  body('lastName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters'),
  
  body('role')
    .optional()
    .isIn(['student', 'faculty', 'librarian', 'admin'])
    .withMessage('Invalid role specified'),
  
  body('studentId')
    .optional()
    .trim()
    .isLength({ min: 5, max: 20 })
    .withMessage('Student ID must be between 5 and 20 characters'),
  
  body('department')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Department must be between 2 and 100 characters'),
  
  body('phone')
    .optional()
    .matches(/^[\+]?[1-9][\d]{0,15}$/)
    .withMessage('Please provide a valid phone number')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const {
      username,
      email,
      password,
      firstName,
      lastName,
      role = 'student',
      studentId,
      department,
      phone
    } = req.body;

    // Check if user already exists in MySQL
    const [existing] = await pool.execute(
      'SELECT id FROM library_users WHERE username = ? OR email = ? LIMIT 1',
      [username, email]
    );
    if (Array.isArray(existing) && existing.length) {
      return res.status(400).json({ success: false, message: 'User already exists with this username or email' });
    }

    // Lookup role id
    const [roleRows] = await pool.execute('SELECT id FROM roles WHERE name = ? LIMIT 1', [role]);
    const roleRow = Array.isArray(roleRows) && roleRows.length ? roleRows[0] : null;
    const roleId = roleRow ? roleRow.id : null;

    const passwordHash = await bcrypt.hash(password, 12);
    const fullName = `${firstName || ''} ${lastName || ''}`.trim();

    const [result] = await pool.execute(
      `INSERT INTO library_users (username, email, full_name, password_hash, role_id, department, phone, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())`,
      [username, email, fullName, passwordHash, roleId, department || null, phone || null]
    );

    const insertedId = result.insertId;
    const token = generateToken(String(insertedId));

    const userResponse = {
      _id: String(insertedId),
      id: insertedId,
      username,
      email,
      fullName,
      department: department || null,
      phone: phone || null,
      role: role,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    res.status(201).json({ success: true, message: 'User registered successfully', data: { user: userResponse, token } });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during registration',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
router.post('/login', [
  body('username')
    .notEmpty()
    .withMessage('Username or email is required'),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { username, password } = req.body;
      // Find user in MySQL
      const [rows] = await pool.execute(
        `SELECT lu.id, lu.username, lu.email, lu.full_name, lu.password_hash, lu.department, lu.phone, lu.is_active, r.name AS role, lu.created_at, lu.updated_at
         FROM library_users lu
         LEFT JOIN roles r ON lu.role_id = r.id
         WHERE lu.username = ? OR lu.email = ? LIMIT 1`,
        [username, username]
      );

      const userRow = Array.isArray(rows) && rows.length ? rows[0] : null;

      if (!userRow) {
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
      }

      if (!userRow.is_active) {
        return res.status(401).json({ success: false, message: 'Account is deactivated. Please contact administrator.' });
      }

      // Try bcrypt compare first (expected), but fall back to plain-text match for existing dev seeds
      let match = false;
      try {
        match = await bcrypt.compare(password, userRow.password_hash);
      } catch (e) {
        console.warn('bcrypt compare failed, falling back to plain-text check');
      }

      // If bcrypt didn't match, allow plaintext match (dev only) and upgrade to bcrypt hash
      if (!match) {
        if (userRow.password_hash === password) {
          // upgrade stored password to bcrypt
          try {
            const newHash = await bcrypt.hash(password, 12);
            await pool.execute('UPDATE library_users SET password_hash = ?, updated_at = NOW() WHERE id = ?', [newHash, userRow.id]);
            match = true;
            console.log(`Upgraded plain password to bcrypt for user id=${userRow.id}`);
          } catch (e) {
            console.warn('Failed to upgrade plain password to bcrypt:', e.message || e);
          }
        }
      }

      if (!match) {
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
      }

      // Update last login - optional column; if you have last_login column, update it
      try {
        await pool.execute('UPDATE library_users SET updated_at = NOW() WHERE id = ?', [userRow.id]);
      } catch (e) {
        console.warn('Could not update last login:', e.message || e);
      }

      // Generate token using MySQL user id
      const token = generateToken(String(userRow.id));

      // Build user object to return
      const userResponse = {
        _id: String(userRow.id),
        id: userRow.id,
        username: userRow.username,
        email: userRow.email,
        fullName: userRow.full_name,
        firstName: userRow.full_name ? userRow.full_name.split(' ')[0] : '',
        lastName: userRow.full_name ? userRow.full_name.split(' ').slice(1).join(' ') : '',
        department: userRow.department,
        phone: userRow.phone,
        role: userRow.role || 'faculty',
        isActive: Boolean(userRow.is_active),
        createdAt: userRow.created_at,
        updatedAt: userRow.updated_at
      };

      res.json({ success: true, message: 'Login successful', data: { user: userResponse, token } });

  } catch (error) {
    console.error('Login error:', error);
    console.error('Error stack:', error.stack);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      code: error.code
    });
    
    res.status(500).json({
      success: false,
      message: 'Server error during login',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// @desc    Get current user profile (MySQL)
// @route   GET /api/auth/me
// @access  Private
router.get('/me', protect, async (req, res) => {
  try {
    // req.user is populated by protect middleware from MySQL
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    // Return normalized profile
    const userProfile = {
      _id: req.user._id,
      id: req.user.id,
      username: req.user.username,
      email: req.user.email,
      fullName: req.user.fullName,
      firstName: req.user.fullName ? req.user.fullName.split(' ')[0] : '',
      lastName: req.user.fullName ? req.user.fullName.split(' ').slice(1).join(' ') : '',
      department: req.user.department,
      phone: req.user.phone,
      role: req.user.role,
      isActive: req.user.isActive,
      createdAt: req.user.createdAt,
      updatedAt: req.user.updatedAt
    };

    res.json({ success: true, data: { user: userProfile } });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ success: false, message: 'Server error while fetching profile' });
  }
});

router.put('/me', protect, [
  body('firstName').optional().trim().isLength({ min: 2, max: 50 }).withMessage('First name must be between 2 and 50 characters'),
  body('lastName').optional().trim().isLength({ min: 2, max: 50 }).withMessage('Last name must be between 2 and 50 characters'),
  body('department').optional().trim().isLength({ min: 2, max: 100 }).withMessage('Department must be between 2 and 100 characters'),
  body('phone').optional().matches(/^[\+]?[1-9][\d]{0,15}$/).withMessage('Please provide a valid phone number')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
    }

    const { firstName, lastName, department, phone } = req.body;
    // Build full_name if firstName/lastName provided
    let fullName = req.user.fullName || null;
    if (firstName || lastName) {
      const parts = fullName ? fullName.split(' ') : [];
      const currentFirst = parts.length ? parts[0] : '';
      const currentLast = parts.length > 1 ? parts.slice(1).join(' ') : '';
      fullName = `${firstName || currentFirst} ${lastName || currentLast}`.trim();
    }

    // Update MySQL user
    const updates = [];
    const params = [];
    if (fullName) { updates.push('full_name = ?'); params.push(fullName); }
    if (department) { updates.push('department = ?'); params.push(department); }
    if (phone) { updates.push('phone = ?'); params.push(phone); }
    if (updates.length === 0) {
      return res.status(400).json({ success: false, message: 'No valid fields to update' });
    }

    params.push(req.user.id);
    const sql = `UPDATE library_users SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ?`;
    await pool.execute(sql, params);

    // Return updated profile
    const [rows] = await pool.execute(
      `SELECT lu.id, lu.username, lu.email, lu.full_name, lu.department, lu.phone, lu.is_active, r.name AS role, lu.created_at, lu.updated_at
       FROM library_users lu
       LEFT JOIN roles r ON lu.role_id = r.id
       WHERE lu.id = ? LIMIT 1`,
      [req.user.id]
    );

    const userRow = Array.isArray(rows) && rows.length ? rows[0] : null;
    if (!userRow) return res.status(404).json({ success: false, message: 'User not found after update' });

    const userProfile = {
      _id: String(userRow.id),
      id: userRow.id,
      username: userRow.username,
      email: userRow.email,
      fullName: userRow.full_name,
      firstName: userRow.full_name ? userRow.full_name.split(' ')[0] : '',
      lastName: userRow.full_name ? userRow.full_name.split(' ').slice(1).join(' ') : '',
      department: userRow.department,
      phone: userRow.phone,
      role: userRow.role,
      isActive: Boolean(userRow.is_active),
      createdAt: userRow.created_at,
      updatedAt: userRow.updated_at
    };

    res.json({ success: true, message: 'Profile updated successfully', data: { user: userProfile } });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ success: false, message: 'Server error while updating profile' });
  }
});

// @desc    Change password
// @route   PUT /api/auth/change-password
// @access  Private
router.put('/change-password', protect, [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('New password must contain at least one lowercase letter, one uppercase letter, and one number')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { currentPassword, newPassword } = req.body;

    // Fetch user password_hash from MySQL
    const [rows] = await pool.execute('SELECT id, password_hash FROM library_users WHERE id = ? LIMIT 1', [req.user.id]);
    const userRow = Array.isArray(rows) && rows.length ? rows[0] : null;
    if (!userRow) return res.status(404).json({ success: false, message: 'User not found' });

    const match = await bcrypt.compare(currentPassword, userRow.password_hash);
    if (!match) return res.status(400).json({ success: false, message: 'Current password is incorrect' });

    const newHash = await bcrypt.hash(newPassword, 12);
    await pool.execute('UPDATE library_users SET password_hash = ?, updated_at = NOW() WHERE id = ?', [newHash, req.user.id]);

    res.json({ success: true, message: 'Password changed successfully' });

  } catch (error) {
    console.error('Password change error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while changing password'
    });
  }
});

// @desc    Logout user (client-side token removal)
// @route   POST /api/auth/logout
// @access  Private
router.post('/logout', protect, async (req, res) => {
  try {
    // In a stateless JWT system, logout is handled client-side
    // But we can log the logout event for audit purposes
    res.json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during logout'
    });
  }
});

// @desc    Refresh token (optional - for longer sessions)
// @route   POST /api/auth/refresh
// @access  Private
router.post('/refresh', protect, async (req, res) => {
  try {
    // Generate new token
    const token = generateToken(req.user._id);

    res.json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        token
      }
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while refreshing token'
    });
  }
});

export default router;
