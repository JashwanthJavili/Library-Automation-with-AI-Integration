import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import pool from '../mysql.js';
import { config } from '../../config.js';

// Middleware to protect routes
export const protect = async (req, res, next) => {
  try {
    let token;

    // Check if token exists in headers
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, config.JWT_SECRET);

      // Get user from MySQL (library_users)
      const [rows] = await pool.execute(
        `SELECT lu.id, lu.username, lu.email, lu.full_name, lu.department, lu.phone, lu.is_active, lu.created_at, lu.updated_at, r.name AS role
         FROM library_users lu
         LEFT JOIN roles r ON lu.role_id = r.id
         WHERE lu.id = ? LIMIT 1`,
        [decoded.id]
      );

      const userRow = Array.isArray(rows) && rows.length ? rows[0] : null;

      if (!userRow) {
        return res.status(401).json({
          success: false,
          message: 'Token is not valid. User not found.'
        });
      }

      if (!userRow.is_active) {
        return res.status(401).json({
          success: false,
          message: 'User account is deactivated.'
        });
      }

      // Map MySQL row to expected user object shape
      req.user = {
        _id: String(userRow.id),
        id: userRow.id,
        username: userRow.username,
        email: userRow.email,
        fullName: userRow.full_name,
        department: userRow.department,
        phone: userRow.phone,
        role: userRow.role || 'faculty',
        isActive: Boolean(userRow.is_active),
        createdAt: userRow.created_at,
        updatedAt: userRow.updated_at
      };

      next();
    } catch (error) {
      console.error('Auth token verification error:', error);
      return res.status(401).json({
        success: false,
        message: 'Token is not valid.'
      });
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error in authentication.'
    });
  }
};

// Middleware to check if user has required role
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated.'
      });
    }

    // normalize role names
    const userRole = req.user.role;

    if (!roles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: `User role '${userRole}' is not authorized to access this route.`
      });
    }

    next();
  };
};

// Middleware to check if user is accessing their own resource or is admin
export const authorizeUserOrAdmin = (resourceUserId) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated.'
      });
    }

    // Admin can access any resource
    if (req.user.role === 'admin') {
      return next();
    }

    // User can only access their own resource
    if (req.user._id.toString() === resourceUserId) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: 'Access denied. You can only access your own resources.'
    });
  };
};

// Middleware to generate JWT token
export const generateToken = (userId) => {
  return jwt.sign(
    { id: userId },
    config.JWT_SECRET,
    { expiresIn: config.JWT_EXPIRE }
  );
};

// Middleware to verify token without throwing error
export const verifyTokenOptional = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (token) {
      try {
        const decoded = jwt.verify(token, config.JWT_SECRET);
        // Load user from MySQL like protect, but don't throw on failure
        try {
          const [rows] = await pool.execute(
            `SELECT lu.id, lu.username, lu.email, lu.full_name, lu.department, lu.phone, lu.is_active, lu.created_at, lu.updated_at, r.name AS role
             FROM library_users lu
             LEFT JOIN roles r ON lu.role_id = r.id
             WHERE lu.id = ? LIMIT 1`,
            [decoded.id]
          );
          const userRow = Array.isArray(rows) && rows.length ? rows[0] : null;
          if (userRow && userRow.is_active) {
            req.user = {
              _id: String(userRow.id),
              id: userRow.id,
              username: userRow.username,
              email: userRow.email,
              fullName: userRow.full_name,
              department: userRow.department,
              phone: userRow.phone,
              role: userRow.role || 'faculty',
              isActive: Boolean(userRow.is_active),
              createdAt: userRow.created_at,
              updatedAt: userRow.updated_at
            };
          }
        } catch (e) {
          console.log('Optional auth: failed to load MySQL user', e.message || e);
        }
      } catch (error) {
        // Token is invalid, but we don't throw error
        console.log('Optional auth: Invalid token');
      }
    }

    next();
  } catch (error) {
    console.error('Optional auth middleware error:', error);
    next();
  }
};

// Middleware to check if user is currently in library
export const checkLibraryStatus = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated.'
      });
    }

    // Import Entry model here to avoid circular dependency
    const Entry = (await import('../models/Entry.js')).default;
    
    const currentEntry = await Entry.getUserStatus(req.user._id);
    req.user.libraryStatus = currentEntry ? 'inside' : 'outside';
    req.user.currentEntry = currentEntry;

    next();
  } catch (error) {
    console.error('Library status check error:', error);
    req.user.libraryStatus = 'unknown';
    next();
  }
};
