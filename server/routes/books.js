import express from 'express';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// @desc    Get all books
// @route   GET /api/books
// @access  Public
router.get('/', async (req, res) => {
  res.json({
    success: true,
    message: 'Books route - Implementation pending',
    data: []
  });
});

export default router;
