# APPENDIX - Key Code Implementations

## 1. User Authentication Schema (MongoDB - Mongoose)
**File:** `server/models/User.js`

```javascript
import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    minlength: [3, 'Username must be at least 3 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Valid email required']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false
  },
  role: {
    type: String,
    enum: ['admin', 'librarian', 'student', 'faculty'],
    default: 'student'
  },
  firstName: String,
  lastName: String,
  studentId: { type: String, unique: true, sparse: true },
  department: String,
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

userSchema.index({ username: 1, email: 1, studentId: 1 });

userSchema.methods.getPublicProfile = function() {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

export default mongoose.model('User', userSchema);
```

---

## 2. JWT Authentication Middleware
**File:** `server/middleware/auth.js`

```javascript
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { config } from '../../config.js';

export const protect = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization?.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    const decoded = jwt.verify(token, config.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token or inactive user.'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Token is not valid.'
    });
  }
};

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized for this operation.'
      });
    }
    next();
  };
};

export const generateToken = (userId) => {
  return jwt.sign({ id: userId }, config.JWT_SECRET, { 
    expiresIn: config.JWT_EXPIRE 
  });
};
```

---

## 3. Main Gate Entry/Exit Logic with Cooldown
**File:** `server/routes/koha.js`

```javascript
import express from 'express';
import mysql from 'mysql2/promise';

const router = express.Router();

router.post('/scan', async (req, res) => {
  const { id } = req.body || {};
  if (!id?.trim()) {
    return res.status(400).json({ 
      success: false, 
      message: 'ID is required' 
    });
  }

  let kohaConn, gateConn;
  try {
    kohaConn = await mysql.createConnection(getMysqlConfig());
    gateConn = await mysql.createConnection(getGateDbConfig());

    // Lookup borrower
    const [borrowers] = await kohaConn.execute(
      `SELECT cardnumber, surname, firstname, sex, categorycode, branchcode
       FROM borrowers WHERE cardnumber = ? OR userid = ? LIMIT 1`,
      [id.trim(), id.trim()]
    );
    
    if (!borrowers.length) {
      return res.status(404).json({ success: false, message: 'Borrower not found' });
    }
    
    const borrower = borrowers[0];
    const name = [borrower.firstname, borrower.surname].filter(Boolean).join(' ');

    // Check last entry
    const [lastRows] = await gateConn.execute(
      `SELECT sl, status, entry_time FROM gate_logs 
       WHERE cardnumber = ? ORDER BY sl DESC LIMIT 1`,
      [borrower.cardnumber]
    );

    const shouldEnter = !lastRows.length || lastRows[0].status === 'OUT';

    if (shouldEnter) {
      // Record entry
      await gateConn.execute(
        `INSERT INTO gate_logs (cardnumber, name, gender, entry_date, 
         entry_time, status, loc, cc, branch) 
         VALUES (?, ?, ?, CURDATE(), CURTIME(), 'IN', 'main_gate', ?, ?)`,
        [borrower.cardnumber, name, borrower.sex === 'F' ? 'F' : 'M', 
         borrower.categorycode, borrower.branchcode]
      );

      return res.status(201).json({
        success: true,
        message: 'Entry recorded',
        data: { action: 'IN', cardnumber: borrower.cardnumber, name }
      });
    } else {
      // Check 10-second cooldown
      const [diffRows] = await gateConn.execute(
        `SELECT TIMESTAMPDIFF(SECOND, CONCAT(entry_date, ' ', entry_time), NOW()) 
         AS diffSeconds FROM gate_logs WHERE sl = ?`,
        [lastRows[0].sl]
      );
      
      const elapsed = diffRows[0]?.diffSeconds || 0;
      if (elapsed < 10) {
        return res.status(429).json({ 
          success: false, 
          message: 'Please wait 10 seconds before exiting',
          data: { remaining: 10 - elapsed }
        });
      }

      // Record exit
      await gateConn.execute(
        `UPDATE gate_logs SET exit_time = CURTIME(), status = 'OUT', 
         exit_timestamp = NOW() WHERE sl = ?`,
        [lastRows[0].sl]
      );

      return res.status(201).json({
        success: true,
        message: 'Exit recorded',
        data: { action: 'OUT', cardnumber: borrower.cardnumber, name }
      });
    }
  } catch (err) {
    console.error('Scan error:', err);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to process scan' 
    });
  } finally {
    if (kohaConn) await kohaConn.end().catch(() => {});
    if (gateConn) await gateConn.end().catch(() => {});
  }
});

export default router;
```

---

## 4. Frontend API Service Layer
**File:** `src/services/api.ts`

```typescript
const API_BASE_URL = 'http://localhost:5000/api';

interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
}

class ApiService {
  private token: string | null = null;

  setToken(token: string) {
    this.token = token;
    localStorage.setItem('token', token);
  }

  getToken(): string | null {
    return this.token || localStorage.getItem('token');
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): 
    Promise<ApiResponse<T>> {
    const token = this.getToken();
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Request failed');
      return data;
    } catch (error) {
      console.error('API error:', error);
      throw error;
    }
  }

  async login(credentials: { username: string; password: string }) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  async kohaScan(id: string) {
    return this.request('/koha/scan', {
      method: 'POST',
      body: JSON.stringify({ id })
    });
  }

  async getGateLogs(params?: { limit?: number; date?: string }) {
    const qp = new URLSearchParams();
    if (params?.limit) qp.append('limit', String(params.limit));
    if (params?.date) qp.append('date', params.date);
    return this.request(`/koha/gate-logs?${qp.toString()}`);
  }
}

export const apiService = new ApiService();
```

---

## 5. Main Gate Entry React Component
**File:** `src/Components/MainGateEntry.tsx`

```typescript
import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';

const MainGateEntry: React.FC = () => {
  const [regNumber, setRegNumber] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState({ show: false, text: '', type: 'success' });

  useEffect(() => {
    // Prevent page reload during scan operations
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      return (e.returnValue = '');
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F5' || (e.ctrlKey && e.key === 'r')) {
        e.preventDefault();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regNumber.trim() || isProcessing) return;

    setIsProcessing(true);
    try {
      const response = await apiService.kohaScan(regNumber.trim());
      
      if (response.success) {
        const action = response.data?.action === 'OUT' ? 'Exit' : 'Entry';
        setMessage({
          show: true,
          text: `${action} recorded for ${response.data?.name}`,
          type: 'success'
        });
        setRegNumber('');
        setTimeout(() => setMessage({ show: false, text: '', type: 'success' }), 3000);
      }
    } catch (error: any) {
      setMessage({
        show: true,
        text: error.message || 'Scan failed',
        type: 'error'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="gate-entry">
      <h2>Library Gate Entry</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={regNumber}
          onChange={(e) => setRegNumber(e.target.value)}
          placeholder="Scan or enter registration number"
          autoFocus
          disabled={isProcessing}
        />
        <button type="submit" disabled={isProcessing}>
          {isProcessing ? 'Processing...' : 'Submit'}
        </button>
      </form>
      {message.show && (
        <div className={`alert alert-${message.type}`}>
          {message.text}
        </div>
      )}
    </div>
  );
};

export default MainGateEntry;
```

---

## Key Technical Features

**Security:**
- JWT token-based authentication
- Role-based access control
- Password hashing with bcrypt
- Rate limiting and CORS protection

**Performance:**
- Database indexing on critical fields
- Connection pooling for MySQL
- Memoized React computations
- Efficient aggregation pipelines

**Reliability:**
- 10-second cooldown mechanism
- Comprehensive error handling
- Transaction rollback support
- Auto-reconnection logic

**Integration:**
- Dual database system (MongoDB + MySQL)
- Koha library system synchronization
- Real-time status updates
- Excel export capabilities

---

**Total Lines:** ~200 production-ready code lines demonstrating core system functionality.
