import express from 'express';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// @desc    Get room bookings
// @route   GET /api/bookings
// @access  Private
router.get('/', protect, async (req, res) => {
  res.json({
    success: true,
    message: 'Bookings route - Implementation pending',
    data: []
  });
});

export default router;
