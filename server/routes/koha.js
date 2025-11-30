import express from 'express';
import mysql from 'mysql2/promise';
import mongoose, { Schema } from 'mongoose';

const router = express.Router();

function getMysqlConfig() {
  const useTLS = (process.env.DB_USE_TLS || '').toLowerCase() === 'true';
  const cfg = {
    host: process.env.MYSQL_HOST || 'localhost',
    port: parseInt(process.env.MYSQL_PORT || '3306', 10),
    user: process.env.MYSQL_USER || 'koha_koha_library',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'koha_koha_library',
    timezone: 'Z'
  };
  if (useTLS) {
    cfg.ssl = {
      ca: process.env.DB_TLS_CA_CERTIFICATE,
      cert: process.env.DB_TLS_CLIENT_CERTIFICATE,
      key: process.env.DB_TLS_CLIENT_KEY,
      rejectUnauthorized: false
    };
  }
  return cfg;
}

function getGateDbConfig() {
  const useTLS = (process.env.GATE_DB_USE_TLS || '').toLowerCase() === 'true';
  const cfg = {
    host: process.env.GATE_MYSQL_HOST || process.env.MYSQL_HOST || 'localhost',
    port: parseInt(process.env.GATE_MYSQL_PORT || process.env.MYSQL_PORT || '3306', 10),
    user: process.env.GATE_MYSQL_USER || process.env.MYSQL_USER || 'koha_koha_library',
    password: process.env.GATE_MYSQL_PASSWORD || process.env.MYSQL_PASSWORD || '',
    database: process.env.GATE_MYSQL_DATABASE || 'library_gate_entry',
    timezone: 'Z'
  };
  if (useTLS) {
    cfg.ssl = {
      ca: process.env.GATE_DB_TLS_CA_CERTIFICATE || process.env.DB_TLS_CA_CERTIFICATE,
      cert: process.env.GATE_DB_TLS_CLIENT_CERTIFICATE || process.env.DB_TLS_CLIENT_CERTIFICATE,
      key: process.env.GATE_DB_TLS_CLIENT_KEY || process.env.DB_TLS_CLIENT_KEY,
      rejectUnauthorized: false
    };
  }
  return cfg;
}

// Minimal InOut model targeting the existing 'inouts' collection
const InOutSchema = new Schema({
  cardnumber: { type: String, required: true, index: true },
  surname: { type: String },
  sex: { type: String },
  userid: { type: String },
  branchcode: { type: String },
  categorycode: { type: String },
  entryType: { type: String, enum: ['entry', 'exit'], required: true },
  timestamp: { type: Date, default: () => new Date() },
  method: { type: String, enum: ['manual_entry', 'auto_scan', 'id_card', 'qr_code'] },
  location: { type: String },
  purpose: { type: String },
  status: { type: String, default: 'active' },
  duration: { type: Number }, // minutes spent (for exits)
  entryId: { type: Schema.Types.ObjectId, ref: 'InOut' }
}, { collection: 'inouts', timestamps: true, strict: false });
const TEN_SECONDS_MS = 10 * 1000;

const formatDuration = (minutes) => {
  const mins = Math.max(0, minutes || 0);
  if (mins < 1) {
    return `${Math.round(mins * 60)}s`;
  }
  const hours = Math.floor(mins / 60);
  const remainder = mins % 60;
  const wholeMinutes = Math.floor(remainder);
  const secs = Math.round((remainder - wholeMinutes) * 60);
  if (hours > 0) {
    return secs > 0 ? `${hours}h ${wholeMinutes}m ${secs}s` : `${hours}h ${wholeMinutes}m`;
  }
  return secs > 0 ? `${wholeMinutes}m ${secs}s` : `${wholeMinutes}m`;
};

// POST /api/koha/inout { id: "9922008035", method?: "manual_entry" }
// Determines entry/exit automatically with 10s cooldown and stores in Mongo inouts
router.post('/inout', async (req, res) => {
  const { id, method = 'manual_entry', location = 'main_gate', purpose = 'study' } = req.body || {};
  const lookup = (id || '').toString().trim();
  if (!lookup) {
    return res.status(400).json({ success: false, message: 'id is required' });
  }

  let conn;
  try {
    conn = await mysql.createConnection(getMysqlConfig());
    console.log('MySQL connected successfully (inout)');

    const [rows] = await conn.execute(
      `SELECT cardnumber, surname, firstname, categorycode, branchcode, email, sex, userid
       FROM borrowers WHERE cardnumber = ? OR userid = ? LIMIT 1`,
      [lookup, lookup]
    );

    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Borrower not found' });
    }

    const borrower = rows[0];
    const cardnumber = borrower.cardnumber;
    const now = new Date();

    const activeEntry = await InOutModel.findOne({
      cardnumber,
      entryType: 'entry',
      status: { $ne: 'completed' }
    }).sort({ timestamp: -1 });

    const baseDoc = {
      cardnumber,
      surname: borrower.surname,
      sex: borrower.sex,
      userid: borrower.userid,
      branchcode: borrower.branchcode,
      categorycode: borrower.categorycode,
      method,
      location,
      purpose,
      timestamp: now
    };

    if (activeEntry) {
      const diffMs = now.getTime() - new Date(activeEntry.timestamp).getTime();
      if (diffMs < TEN_SECONDS_MS) {
        const remaining = Math.ceil((TEN_SECONDS_MS - diffMs) / 1000);
        return res.status(429).json({ success: false, message: 'Please wait 10 seconds before trying again', data: { remaining } });
      }

      const durationMinutes = (now.getTime() - new Date(activeEntry.timestamp).getTime()) / (1000 * 60);
      const exitDoc = await InOutModel.create({
        ...baseDoc,
        entryType: 'exit',
        status: 'completed',
        duration: durationMinutes,
        entryId: activeEntry._id
      });

      await InOutModel.updateOne(
        { _id: activeEntry._id },
        {
          $set: {
            status: 'completed',
            duration: durationMinutes,
            updatedAt: now
          }
        }
      );

      const exitObj = exitDoc.toObject();
      return res.status(201).json({
        success: true,
        message: 'Exit recorded successfully',
        data: {
          inout: {
            ...exitObj,
            timeSpent: formatDuration(durationMinutes),
            entryTimestamp: activeEntry.timestamp
          }
        }
      });
    }

    const entryDoc = await InOutModel.create({
      ...baseDoc,
      entryType: 'entry',
      status: 'active'
    });

    return res.status(201).json({
      success: true,
      message: 'Entry recorded successfully',
      data: {
        inout: entryDoc.toObject()
      }
    });

  } catch (err) {
    console.error('Koha inout error:', err);
    return res.status(500).json({ success: false, message: 'Failed to record in/out', error: err?.message });
  } finally {
    if (conn) { try { await conn.end(); } catch {} }
  }
});


let InOutModel;
try {
  InOutModel = mongoose.model('InOut');
} catch {
  InOutModel = mongoose.model('InOut', InOutSchema);
}

// GET /api/koha/borrower?q=9922008035
// Looks up borrower by cardnumber or userid and returns select fields
router.get('/borrower', async (req, res) => {
  const q = (req.query.q || '').toString().trim();
  if (!q) return res.status(400).json({ success: false, message: 'Query param q is required' });

  let conn;
  try {
    conn = await mysql.createConnection(getMysqlConfig());
    console.log('MySQL connected successfully (borrower lookup)');
    const [rows] = await conn.execute(
      `SELECT cardnumber, surname, firstname, categorycode, branchcode, email, dateofbirth, sex, userid
       FROM borrowers
       WHERE cardnumber = ? OR userid = ?
       LIMIT 1`,
      [q, q]
    );

    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Borrower not found' });
    }

    const b = rows[0];
    return res.json({
      success: true,
      data: {
        cardnumber: b.cardnumber,
        surname: b.surname,
        sex: b.sex,
        userid: b.userid,
        branchcode: b.branchcode,
        categorycode: b.categorycode,
        email: b.email
      }
    });
  } catch (err) {
    console.error('Koha borrower lookup error:', err);
    return res.status(500).json({ success: false, message: 'Error looking up borrower', error: err?.message });
  } finally {
    if (conn) { try { await conn.end(); } catch {} }
  }
});

// POST /api/koha/scan { id: string }
// Determines IN or OUT, enforces 10s lockout after IN, and logs to MySQL library_gate_entry.gate_logs
router.post('/scan', async (req, res) => {
  const { id } = req.body || {};
  const lookup = (id || '').toString().trim();
  if (!lookup) {
    return res.status(400).json({ success: false, message: 'id is required' });
  }

  let kohaConn;
  let gateConn;
  try {
    kohaConn = await mysql.createConnection(getMysqlConfig());
    gateConn = await mysql.createConnection(getGateDbConfig());

    const [borrowers] = await kohaConn.execute(
      `SELECT cardnumber, surname, firstname, categorycode, branchcode, email, sex, userid
       FROM borrowers WHERE cardnumber = ? OR userid = ? LIMIT 1`,
      [lookup, lookup]
    );
    if (!borrowers.length) {
      return res.status(404).json({ success: false, message: 'Borrower not found' });
    }
    const b = borrowers[0];
    const name = [b.firstname, b.surname].filter(Boolean).join(' ').trim() || b.surname || '';
    const gender = (b.sex || '').toString().toUpperCase() === 'F' ? 'F' : 'M';
    const now = new Date();

    const [lastRows] = await gateConn.execute(
      `SELECT sl, status, entry_date, entry_time, exit_time, entry_timestamp
       FROM gate_logs
       WHERE cardnumber = ?
       ORDER BY sl DESC
       LIMIT 1`,
      [b.cardnumber]
    );

    const shouldEnter = !lastRows.length || (lastRows[0].status === 'OUT' || lastRows[0].exit_time != null);

    if (shouldEnter) {
      const [insertResult] = await gateConn.execute(
        `INSERT INTO gate_logs
         (cardnumber, name, gender, entry_date, entry_time, status, loc, cc, branch, sort1, sort2, email, mob, userid, exit_time, exit_timestamp)
         VALUES (?, ?, ?, CURDATE(), CURTIME(), 'IN', ?, ?, ?, NULL, NULL, ?, NULL, ?, NULL, NULL)`,
        [b.cardnumber, name, gender, 'main_gate', b.categorycode || '', b.branchcode || '', b.email || null, b.userid || null]
      );

      return res.status(201).json({
        success: true,
        message: 'Entry recorded',
        data: {
          action: 'IN',
          cardnumber: b.cardnumber,
          name,
          gender,
          branch: b.branchcode || '',
          cc: b.categorycode || '',
          userid: b.userid || null,
          email: b.email || null
        }
      });
    } else {
      const last = lastRows[0];
      // Use MySQL TIMESTAMPDIFF to compute elapsed seconds on the DB side (avoids JS/timezone parsing issues)
      try {
        const [diffRows] = await gateConn.execute(
          `SELECT TIMESTAMPDIFF(SECOND, CONCAT(entry_date, ' ', entry_time), NOW()) AS diffSeconds FROM gate_logs WHERE sl = ? LIMIT 1`,
          [last.sl]
        );
        const diffSecondsRaw = diffRows && diffRows[0] ? diffRows[0].diffSeconds : null;
        let diffSeconds = typeof diffSecondsRaw === 'number' ? diffSecondsRaw : null;
        // If TIMESTAMPDIFF returned a numeric value, use it. Otherwise fallback to JS parsing.
        if (diffSeconds === null) {
          let lastEntryDateTime = null;
          if (last.entry_timestamp) {
            lastEntryDateTime = new Date(last.entry_timestamp);
          } else if (last.entry_date && last.entry_time) {
            lastEntryDateTime = new Date(`${last.entry_date} ${last.entry_time}`);
          }
          if (lastEntryDateTime) {
            diffSeconds = Math.floor((now.getTime() - lastEntryDateTime.getTime()) / 1000);
          }
        }
        // If diffSeconds is still null, allow exit (no reliable timestamp to compare)
        if (diffSeconds === null) {
          console.warn('koha/scan: could not determine diffSeconds for sl=', last.sl);
        } else {
          // Clamp negative diffs and enforce 10s cooldown
          if (diffSeconds < 0) diffSeconds = 0;
          if (diffSeconds < 10) {
            return res.status(429).json({ success: false, message: 'Please wait 10 seconds before exiting', data: { remaining: Math.max(0, 10 - diffSeconds) } });
          }
        }
      } catch (diffErr) {
        console.warn('koha/scan: TIMESTAMPDIFF failed, falling back to JS parsing', diffErr?.message || diffErr);
        let lastEntryDateTime = null;
        if (last.entry_timestamp) {
          lastEntryDateTime = new Date(last.entry_timestamp);
        } else if (last.entry_date && last.entry_time) {
          lastEntryDateTime = new Date(`${last.entry_date} ${last.entry_time}`);
        }
        if (lastEntryDateTime) {
          let diffSeconds = Math.floor((now.getTime() - lastEntryDateTime.getTime()) / 1000);
          if (diffSeconds < 0) diffSeconds = 0;
          if (diffSeconds < 10) {
            return res.status(429).json({ success: false, message: 'Please wait 10 seconds before exiting', data: { remaining: Math.max(0, 10 - diffSeconds) } });
          }
        }
      }

      await gateConn.execute(
        `UPDATE gate_logs
         SET exit_time = CURTIME(), status = 'OUT', exit_timestamp = NOW()
         WHERE sl = ?`,
        [last.sl]
      );

      return res.status(201).json({
        success: true,
        message: 'Exit recorded',
        data: {
          action: 'OUT',
          cardnumber: b.cardnumber,
          name,
          gender,
          branch: b.branchcode || '',
          cc: b.categorycode || '',
          userid: b.userid || null,
          email: b.email || null
        }
      });
    }
  } catch (err) {
    console.error('Koha scan error:', err);
    return res.status(500).json({ success: false, message: 'Failed to process scan', error: err?.message });
  } finally {
    if (kohaConn) { try { await kohaConn.end(); } catch {} }
    if (gateConn) { try { await gateConn.end(); } catch {} }
  }
});

// GET /api/koha/gate-logs?limit=100&date=YYYY-MM-DD
router.get('/gate-logs', async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit || '100', 10), 1000);
  const date = (req.query.date || '').toString().trim();
  let conn;
  try {
    conn = await mysql.createConnection(getGateDbConfig());
    const params = [];
    let where = '';
    if (date) {
      where = 'WHERE entry_date = ?';
      params.push(date);
    }
    const [rows] = await conn.execute(
      `SELECT sl, cardnumber, name, gender, entry_date, entry_time, exit_time, status, loc, cc, branch, sort1, sort2, email, mob, userid, entry_timestamp, exit_timestamp
       FROM gate_logs ${where}
       ORDER BY sl DESC
       LIMIT ${limit}`,
      params
    );
    return res.json({ success: true, data: { logs: rows } });
  } catch (err) {
    console.error('Fetch gate logs error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch gate logs', error: err?.message });
  } finally {
    if (conn) { try { await conn.end(); } catch {} }
  }
});

export default router;


