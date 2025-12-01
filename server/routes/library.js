import express from 'express';
import pool from '../mysql.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// GET /api/library/halls - list active halls
router.get('/halls', protect, async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT id, name, location, capacity, description, is_active, created_at, updated_at FROM halls WHERE is_active = 1 ORDER BY name');
    res.json({ success: true, data: { halls: rows } });
  } catch (err) {
    console.error('Get halls error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch halls' });
  }
});

// POST /api/library/bookings - create a booking (faculty/librarian/admin)
router.post('/bookings', protect, async (req, res) => {
  try {
  const { hall_id, start_datetime, end_datetime, num_students = 0, purpose = '', purpose_title, purpose_description, reference } = req.body;

    if (!hall_id || !start_datetime || !end_datetime) {
      return res.status(400).json({ success: false, message: 'hall_id, start_datetime and end_datetime are required' });
    }

    const start = new Date(start_datetime);
    const end = new Date(end_datetime);
    if (isNaN(start.valueOf()) || isNaN(end.valueOf()) || end <= start) {
      return res.status(400).json({ success: false, message: 'Invalid start or end datetime' });
    }

    // Basic overlap check against approved bookings
    const [conf] = await pool.execute(
      `SELECT COUNT(*) AS cnt FROM hall_bookings WHERE hall_id = ? AND status = 'approved' AND NOT (end_datetime <= ? OR start_datetime >= ?)`,
      [hall_id, start.toISOString().slice(0, 19).replace('T', ' '), end.toISOString().slice(0, 19).replace('T', ' ')]
    );

    if (conf && conf[0] && conf[0].cnt > 0) {
      return res.status(409).json({ success: false, message: 'Requested time conflicts with an already approved booking' });
    }

    // Store purpose as structured JSON string to allow richer data without altering schema
    const purposeObj = {
      title: purpose_title || (typeof purpose === 'string' ? purpose : ''),
      description: purpose_description || '',
      reference: reference || ''
    };

    const purposeJson = JSON.stringify(purposeObj);

    const [result] = await pool.execute(
      `INSERT INTO hall_bookings (hall_id, requester_id, num_students, purpose, start_datetime, end_datetime, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 'pending', NOW(), NOW())`,
      [hall_id, req.user.id, num_students, purposeJson, start.toISOString().slice(0, 19).replace('T', ' '), end.toISOString().slice(0, 19).replace('T', ' ')]
    );

    const bookingId = result.insertId;
    const [newRows] = await pool.execute('SELECT * FROM hall_bookings WHERE id = ? LIMIT 1', [bookingId]);

    res.status(201).json({ success: true, message: 'Booking created', data: { booking: newRows[0] } });
  } catch (err) {
    console.error('Create booking error:', err);
    res.status(500).json({ success: false, message: 'Failed to create booking' });
  }
});

// GET /api/library/bookings - list bookings (admin sees all, others see own unless filter provided)
router.get('/bookings', protect, async (req, res) => {
  try {
    const { status, mine, hall_id } = req.query;
    const params = [];
    let where = 'WHERE 1=1';

    if (status) {
      where += ' AND status = ?';
      params.push(status);
    }

    if (hall_id) {
      where += ' AND hall_id = ?';
      params.push(hall_id);
    }

    // If mine flag present or user not admin, restrict to requester
    if (mine === 'true' || req.user.role !== 'admin') {
      where += ' AND requester_id = ?';
      params.push(req.user.id);
    }

    const sql = `SELECT hb.*, h.name AS hall_name, lu.full_name AS requester_name FROM hall_bookings hb
                 LEFT JOIN halls h ON hb.hall_id = h.id
                 LEFT JOIN library_users lu ON hb.requester_id = lu.id
                 ${where} ORDER BY hb.created_at DESC`;

    const [rows] = await pool.execute(sql, params);
    res.json({ success: true, data: { bookings: rows } });
  } catch (err) {
    console.error('List bookings error:', err);
    res.status(500).json({ success: false, message: 'Failed to list bookings' });
  }
});

// GET /api/library/bookings/:id
router.get('/bookings/:id', protect, async (req, res) => {
  try {
    const id = req.params.id;
    const [rows] = await pool.execute('SELECT hb.*, h.name AS hall_name, lu.full_name AS requester_name FROM hall_bookings hb LEFT JOIN halls h ON hb.hall_id = h.id LEFT JOIN library_users lu ON hb.requester_id = lu.id WHERE hb.id = ? LIMIT 1', [id]);
    const booking = Array.isArray(rows) && rows.length ? rows[0] : null;
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });

    // If user not admin, ensure owner
    if (req.user.role !== 'admin' && booking.requester_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized to view this booking' });
    }

    res.json({ success: true, data: { booking } });
  } catch (err) {
    console.error('Get booking error:', err);
    res.status(500).json({ success: false, message: 'Failed to get booking' });
  }
});

// PUT /api/library/bookings/:id/approve - approve or reject (admin only)
router.put('/bookings/:id/approve', protect, authorize('admin'), async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const id = req.params.id;
    const { action, comment } = req.body; // action: 'approve'|'reject'
    if (!['approve', 'reject'].includes(action)) return res.status(400).json({ success: false, message: 'Invalid action' });

    await conn.beginTransaction();

    // Get booking
    const [rows] = await conn.execute('SELECT * FROM hall_bookings WHERE id = ? FOR UPDATE', [id]);
    const booking = Array.isArray(rows) && rows.length ? rows[0] : null;
    if (!booking) {
      await conn.rollback();
      conn.release();
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    if (action === 'approve') {
      // Check overlap again for approved bookings
      const [conf] = await conn.execute(
        `SELECT COUNT(*) AS cnt FROM hall_bookings WHERE hall_id = ? AND status = 'approved' AND NOT (end_datetime <= ? OR start_datetime >= ?)`,
        [booking.hall_id, booking.start_datetime, booking.end_datetime]
      );

      if (conf && conf[0] && conf[0].cnt > 0) {
        await conn.rollback();
        conn.release();
        return res.status(409).json({ success: false, message: 'Time conflict with existing approved booking' });
      }

      await conn.execute('UPDATE hall_bookings SET status = ?, approved_by = ?, approved_at = NOW(), admin_comments = ?, updated_at = NOW() WHERE id = ?', ['approved', req.user.id, comment || null, id]);
    } else {
      await conn.execute('UPDATE hall_bookings SET status = ?, approved_by = ?, approved_at = NOW(), admin_comments = ?, updated_at = NOW() WHERE id = ?', ['rejected', req.user.id, comment || null, id]);
    }

    await conn.commit();
    conn.release();

    res.json({ success: true, message: `Booking ${action}d` });
  } catch (err) {
    await conn.rollback().catch(() => {});
    conn.release();
    console.error('Approve booking error:', err);
    res.status(500).json({ success: false, message: 'Failed to approve/reject booking' });
  }
});

// PUT /api/library/bookings/:id/cancel - requester can cancel
router.put('/bookings/:id/cancel', protect, async (req, res) => {
  try {
    const id = req.params.id;
    const [rows] = await pool.execute('SELECT * FROM hall_bookings WHERE id = ? LIMIT 1', [id]);
    const booking = Array.isArray(rows) && rows.length ? rows[0] : null;
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });

    if (booking.requester_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to cancel this booking' });
    }

    if (booking.status === 'cancelled') return res.status(400).json({ success: false, message: 'Booking already cancelled' });

    await pool.execute('UPDATE hall_bookings SET status = ?, updated_at = NOW() WHERE id = ?', ['cancelled', id]);
    res.json({ success: true, message: 'Booking cancelled' });
  } catch (err) {
    console.error('Cancel booking error:', err);
    res.status(500).json({ success: false, message: 'Failed to cancel booking' });
  }
});

export default router;
