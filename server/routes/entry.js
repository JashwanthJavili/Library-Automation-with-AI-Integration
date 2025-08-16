import express from 'express';
import { body, validationResult } from 'express-validator';
import Entry from '../models/Entry.js';
import User from '../models/User.js';
import { protect, authorize, checkLibraryStatus } from '../middleware/auth.js';

const router = express.Router();

// @desc    Record entry into library
// @route   POST /api/entry/enter
// @access  Public (for main gate system)
router.post('/enter', [
  body('registrationNumber')
    .optional()
    .trim()
    .isLength({ min: 5, max: 20 })
    .withMessage('Registration number must be between 5 and 20 characters'),
  
  body('idCardNumber')
    .optional()
    .trim()
    .isLength({ min: 5, max: 20 })
    .withMessage('ID card number must be between 5 and 20 characters'),
  
  body('method')
    .isIn(['id_card', 'manual_entry', 'qr_code'])
    .withMessage('Invalid entry method'),
  
  body('purpose')
    .optional()
    .isIn(['study', 'research', 'meeting', 'event', 'other'])
    .withMessage('Invalid purpose specified'),
  
  body('location')
    .optional()
    .isIn(['main_gate', 'side_entrance', 'emergency_exit'])
    .withMessage('Invalid location specified'),
  
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes cannot exceed 500 characters')
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
      registrationNumber,
      idCardNumber,
      method,
      purpose = 'study',
      location = 'main_gate',
      notes,
      deviceInfo
    } = req.body;

    // Find user by registration number or ID card number
    let user;
    if (registrationNumber) {
      user = await User.findOne({ studentId: registrationNumber, isActive: true });
    } else if (idCardNumber) {
      user = await User.findOne({ idCardNumber, isActive: true });
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found or account inactive'
      });
    }

    // Check if user can enter (not already inside)
    const canEnter = await Entry.canUserEnter(user._id);
    if (!canEnter) {
      return res.status(400).json({
        success: false,
        message: 'User is already inside the library'
      });
    }

    // Create entry record
    const entry = new Entry({
      user: user._id,
      entryType: 'entry',
      method,
      registrationNumber,
      idCardNumber,
      purpose,
      location,
      notes,
      deviceInfo: {
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        deviceId: deviceInfo?.deviceId
      }
    });

    await entry.save();

    res.status(201).json({
      success: true,
      message: 'Entry recorded successfully',
      data: {
        entry: {
          id: entry._id,
          user: {
            id: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
            studentId: user.studentId,
            department: user.department
          },
          timestamp: entry.timestamp,
          method,
          purpose,
          location
        }
      }
    });

  } catch (error) {
    console.error('Entry recording error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while recording entry',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// @desc    Record exit from library
// @route   POST /api/entry/exit
// @access  Public (for main gate system)
router.post('/exit', [
  body('registrationNumber')
    .optional()
    .trim()
    .isLength({ min: 5, max: 20 })
    .withMessage('Registration number must be between 5 and 20 characters'),
  
  body('idCardNumber')
    .optional()
    .trim()
    .isLength({ min: 5, max: 20 })
    .withMessage('ID card number must be between 5 and 20 characters'),
  
  body('method')
    .isIn(['id_card', 'manual_entry', 'qr_code'])
    .withMessage('Invalid exit method'),
  
  body('location')
    .optional()
    .isIn(['main_gate', 'side_entrance', 'emergency_exit'])
    .withMessage('Invalid location specified'),
  
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes cannot exceed 500 characters')
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
      registrationNumber,
      idCardNumber,
      method,
      location = 'main_gate',
      notes,
      deviceInfo
    } = req.body;

    // Find user by registration number or ID card number
    let user;
    if (registrationNumber) {
      user = await User.findOne({ studentId: registrationNumber, isActive: true });
    } else if (idCardNumber) {
      user = await User.findOne({ idCardNumber, isActive: true });
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found or account inactive'
      });
    }

    // Check if user can exit (currently inside)
    const canExit = await Entry.canUserExit(user._id);
    if (!canExit) {
      return res.status(400).json({
        success: false,
        message: 'User is not currently inside the library'
      });
    }

    // Create exit record
    const exit = new Entry({
      user: user._id,
      entryType: 'exit',
      method,
      registrationNumber,
      idCardNumber,
      location,
      notes,
      deviceInfo: {
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        deviceId: deviceInfo?.deviceId
      }
    });

    await exit.save();

    // Calculate duration from the corresponding entry
    const entryRecord = await Entry.findOne({
      user: user._id,
      entryType: 'entry',
      status: 'active'
    }).sort({ timestamp: -1 });

    let duration = 0;
    if (entryRecord) {
      duration = Math.round((exit.timestamp - entryRecord.timestamp) / (1000 * 60));
      // Mark entry as completed
      entryRecord.status = 'completed';
      await entryRecord.save();
    }

    res.status(201).json({
      success: true,
      message: 'Exit recorded successfully',
      data: {
        exit: {
          id: exit._id,
          user: {
            id: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
            studentId: user.studentId,
            department: user.department
          },
          timestamp: exit.timestamp,
          method,
          location,
          duration: duration,
          timeSpent: `${Math.floor(duration / 60)}h ${duration % 60}m`
        }
      }
    });

  } catch (error) {
    console.error('Exit recording error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while recording exit',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// @desc    Get current active entries (who's currently in library)
// @route   GET /api/entry/active
// @access  Private (admin, librarian)
router.get('/active', protect, authorize('admin', 'librarian'), async (req, res) => {
  try {
    const activeEntries = await Entry.getActiveEntries();

    res.json({
      success: true,
      count: activeEntries.length,
      data: {
        entries: activeEntries.map(entry => ({
          id: entry._id,
          user: entry.user,
          timestamp: entry.timestamp,
          method: entry.method,
          purpose: entry.purpose,
          location: entry.location,
          timeSpent: Math.round((new Date() - entry.timestamp) / (1000 * 60))
        }))
      }
    });

  } catch (error) {
    console.error('Get active entries error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching active entries'
    });
  }
});

// @desc    Get user's current library status
// @route   GET /api/entry/status/:userId
// @access  Private (admin, librarian, or own user)
router.get('/status/:userId', protect, async (req, res) => {
  try {
    const { userId } = req.params;

    // Check authorization
    if (req.user.role !== 'admin' && req.user.role !== 'librarian' && req.user._id.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this user\'s status'
      });
    }

    const user = await User.findById(userId).select('-password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const currentEntry = await Entry.getUserStatus(userId);
    const status = currentEntry ? 'inside' : 'outside';

    res.json({
      success: true,
      data: {
        user: user.getPublicProfile(),
        status,
        currentEntry: currentEntry ? {
          id: currentEntry._id,
          timestamp: currentEntry.timestamp,
          method: currentEntry.method,
          purpose: currentEntry.purpose,
          location: currentEntry.location,
          timeSpent: Math.round((new Date() - currentEntry.timestamp) / (1000 * 60))
        } : null
      }
    });

  } catch (error) {
    console.error('Get user status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching user status'
    });
  }
});

// @desc    Get entry/exit statistics
// @route   GET /api/entry/stats
// @access  Private (admin, librarian)
router.get('/stats', protect, authorize('admin', 'librarian'), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    let start, end;
    if (startDate && endDate) {
      start = new Date(startDate);
      end = new Date(endDate);
    } else {
      // Default to last 30 days
      end = new Date();
      start = new Date(end.getTime() - (30 * 24 * 60 * 60 * 1000));
    }

    const stats = await Entry.getEntryStats(start, end);

    res.json({
      success: true,
      data: {
        period: { start, end },
        stats
      }
    });

  } catch (error) {
    console.error('Get entry stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching entry statistics'
    });
  }
});

// @desc    Get user's entry history
// @route   GET /api/entry/history/:userId
// @access  Private (admin, librarian, or own user)
router.get('/history/:userId', protect, async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 20, type } = req.query;

    // Check authorization
    if (req.user.role !== 'admin' && req.user.role !== 'librarian' && req.user._id.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this user\'s history'
      });
    }

    const user = await User.findById(userId).select('-password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Build query
    const query = { user: userId };
    if (type && ['entry', 'exit'].includes(type)) {
      query.entryType = type;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const entries = await Entry.find(query)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('verifiedBy', 'firstName lastName');

    const total = await Entry.countDocuments(query);

    res.json({
      success: true,
      data: {
        user: user.getPublicProfile(),
        entries,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalEntries: total,
          hasNext: skip + entries.length < total,
          hasPrev: parseInt(page) > 1
        }
      }
    });

  } catch (error) {
    console.error('Get user history error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching user history'
    });
  }
});

export default router;
