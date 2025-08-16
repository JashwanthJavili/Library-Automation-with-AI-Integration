import express from 'express';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// @desc    Get attendance logs
// @route   GET /api/attendance
// @access  Private (admin, librarian)
router.get('/', protect, authorize('admin', 'librarian'), async (req, res) => {
  res.json({
    success: true,
    message: 'Attendance route - Implementation pending',
    data: []
  });
});

export default router;
