import express from 'express';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// @desc    Get notices
// @route   GET /api/notices
// @access  Public
router.get('/', async (req, res) => {
  res.json({
    success: true,
    message: 'Notices route - Implementation pending',
    data: []
  });
});

export default router;
