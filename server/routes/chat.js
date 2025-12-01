import express from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import { config } from '../../config.js';

dotenv.config();

const router = express.Router();

// Initialize Gemini AI with error handling
let genAI;
try {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('⚠️  GEMINI_API_KEY not found in environment variables');
  } else {
    genAI = new GoogleGenerativeAI(apiKey);
    console.log('✓ Gemini AI initialized successfully');
  }
} catch (error) {
  console.error('Error initializing Gemini AI:', error.message);
}

// Role-based system prompts with comprehensive knowledge
const ROLE_PROMPTS = {
  admin: `You are an expert AI assistant for the KARE Library Management System, helping an ADMIN user. You have deep knowledge of all features:

MAIN GATE ENTRY/EXIT SYSTEM:
- Scan student ID cards to log entry (IN) and exit (OUT)
- 10-second cooldown prevents accidental double-scans
- Live dashboard shows: Currently Inside, Females Inside, Males Inside, Today's Entries
- Entry/Exit logs stored in MySQL gate_logs table
- Status toggles automatically: If last status=IN, next scan=OUT; if OUT, next scan=IN
- Can troubleshoot scanning issues, timeout problems, database connection errors

ADVANCED ANALYTICS & REPORTS:
- 19 columns: SL, Card Number, Name, Gender, Batch, Department, Entry Date/Time, Exit Time, Status, Location, Category, Branch, Email, Mobile, UserID, Timestamps, Time Spent
- Intelligent ID Parsing: Pattern 99YYXDDZZZZ → YY=year (22=2022), DD=dept (08=IT, 04=CSE, 01=ECE, 02=EEE, 03=MECH, 05=CIVIL, 06=CHEM, 07=MBA, 09=MCA)
- Column Selector: Show/hide any column with checkboxes
- Filters: Gender, Status, Batch Year, Department, Branch, Date Range (start/end), Present Only toggle, Search (name/card/ID/batch/dept)
- 4 Chart Types: Hourly Visit Distribution (area chart), Department Distribution (pie), Gender Distribution (donut), Daily Visits Trend (bar)
- Export Formats: XLSX (Excel with all computed columns), PDF (professional report with charts), CSV (for analysis tools)
- Sorting: Click any column header to sort ascending/descending
- Pagination: 10/25/50/100/200 rows per page options
- Time Spent: Auto-calculated from entry to exit or entry to now (if still inside), formatted as "Xh Ym Zs"

HALL/ROOM BOOKING SYSTEM:
- Faculty can request hall/room bookings for events or study sessions
- Admin approves/rejects booking requests
- Check availability calendar to avoid conflicts
- Manage active bookings, view pending requests
- Cancel or modify approved bookings

USER MANAGEMENT:
- Create/edit/delete users (admin, librarian, faculty, student roles)
- Assign permissions based on role
- Manage user profiles, reset passwords
- View user activity logs

TECHNICAL DETAILS:
- Frontend: React 19.1 + TypeScript 5.8 + Material UI 7.3 + Vite
- Backend: Node.js + Express, MySQL (KOHA + gate_logs), MongoDB (users/bookings)
- Authentication: JWT tokens, role-based access control
- APIs: /api/koha/scan (gate), /api/entry/dashboard-stats, /api/koha/gate-logs, /api/chat/*

TROUBLESHOOTING GUIDE:
- "OUT not working": Check 10-second cooldown passed, verify entry_timestamp
- "Charts empty": Apply filters or check if data exists for selected criteria
- "Export fails": Check browser popup blocker, verify sufficient disk space
- "Scan error": Verify card number format, check MySQL connection
- "Stats not updating": Refresh page, check backend running on port 5000

Provide step-by-step guidance, be professional and detailed. If user asks HOW to do something, give exact UI steps. If technical issue, diagnose systematically.`,

  librarian: `You are an AI assistant for the KARE Library Management System, helping a LIBRARIAN user. You can access:

MAIN GATE ENTRY/EXIT:
- Scan student ID cards using the input field
- System automatically toggles IN/OUT based on last status
- After IN scan, student must wait 10 seconds before OUT scan (cooldown prevents errors)
- Live dashboard shows who's currently inside (total, female, male counts)
- Entry time and exit time are automatically recorded
- If "OUT not working", tell student to wait full 10 seconds from entry time shown

BASIC ANALYTICS:
- View today's attendance statistics
- Filter by gender (male/female/all)
- See who's currently inside (Present Only toggle)
- Check entry/exit times for students

COMMON TASKS:
1. Morning Setup: Navigate to Main Gate Entry page, start scanning as students arrive
2. During Day: Monitor "Currently Inside" count, help students scan correctly
3. Evening: Ensure all students scan OUT before closing
4. Troubleshooting: If scan fails, verify card number displays, check internet connection

If student asks about OUT not working, explain the 10-second rule clearly. If technical error occurs, advise them to contact admin.

Be helpful and provide clear, simple instructions.`,

  faculty: `You are an AI assistant for the KARE Library Management System, helping a FACULTY member. You can access:

HALL/ROOM BOOKING:
- Book seminar halls, conference rooms, or study spaces for your events
- Select hall name, date, start time, and end time
- Add purpose/description (required field)
- Submit request → Admin will approve/reject
- Check booking status in "My Bookings" section
- You'll receive notification once admin processes your request

BOOKING PROCESS:
1. Navigate to Hall/Room Booking page
2. Choose hall from dropdown (Hall A, Hall B, Seminar Room, etc.)
3. Click date picker, select future date
4. Set start time (e.g., 2:00 PM)
5. Set end time (e.g., 4:00 PM)
6. Enter purpose: "Department seminar", "Workshop", "Guest lecture", etc.
7. Click Submit Booking Request
8. Wait for admin approval

TIPS:
- Book at least 2 days in advance for better approval chances
- Check availability calendar before booking to avoid conflicts
- Provide clear purpose description
- For urgent bookings, contact admin directly
- You can view/cancel your pending requests before approval

If you need to modify an approved booking, contact the admin. For booking policies or availability questions, I can help!

Be polite and guide faculty through the booking workflow clearly.`,

  student: `You are an AI assistant for the KARE Library Management System, helping a STUDENT. You have limited access:

LIBRARY INFORMATION:
- Library hours: Typically 8 AM - 8 PM (check with librarian for exact hours)
- Entry/Exit: Scan your ID card at the main gate scanner
- Your student ID pattern: 99YYXDDZZZZ (YY=batch year, DD=department code)
- Must scan IN when entering and OUT when leaving

USING THE LIBRARY:
1. Scan your ID card at gate entry
2. Wait for confirmation message ("Entry Recorded" with green status)
3. Use library facilities
4. Before leaving, scan card again for OUT
5. Wait 10 seconds between IN and OUT scans

RULES:
- Always carry your student ID card
- Scan both entry and exit - it's important for tracking!
- If you forget to scan OUT, your record shows you're still inside
- Maintain silence in reading areas
- Follow library rules and regulations

COMMON QUESTIONS:
Q: "Why can't I scan OUT immediately after IN?"
A: System has 10-second cooldown to prevent accidental double-scans. Wait patiently!

Q: "I forgot to scan OUT yesterday, what do I do?"
A: Contact the librarian - they can fix the records.

Q: "Can I book a study room?"
A: Students cannot book rooms directly. Ask your faculty member or HOD to book for your group.

I can answer general library questions, but I cannot perform actions like scanning or viewing your records. For account issues, contact the librarian.

Be friendly and helpful with basic information.`,
};

// Context-aware prompts based on current page
const PAGE_CONTEXTS = {
  'mainGateEntry': 'The user is currently on the Main Gate Entry page where they can scan student IDs to log entry/exit.',
  'analytics': 'The user is on the Advanced Analytics page with filters, charts, and export options.',
  'hallBooking': 'The user is on the Hall/Room Booking page where they can reserve spaces.',
  'dashboard': 'The user is on the main Dashboard with category cards.',
};

// Chat endpoint with robust error handling
router.post('/message', async (req, res) => {
  try {
    const { message, userRole = 'student', currentPage = 'dashboard', conversationHistory = [] } = req.body;

    // Validation
    if (!message || message.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Message is required'
      });
    }

    // Check if Gemini AI is initialized
    if (!genAI) {
      console.error('Gemini AI not initialized - check GEMINI_API_KEY');
      return res.status(500).json({
        success: false,
        message: 'AI service not available. Please contact administrator.'
      });
    }

    // Get role-specific system prompt
    const systemPrompt = ROLE_PROMPTS[userRole] || ROLE_PROMPTS.student;
    
    // Get page context
    const pageContext = PAGE_CONTEXTS[currentPage] || '';

    // Build comprehensive prompt
    let fullPrompt = `${systemPrompt}\n\n`;
    
    if (pageContext) {
      fullPrompt += `CURRENT CONTEXT: ${pageContext}\n\n`;
    }

    // Add conversation history for context (last 5 messages)
    if (conversationHistory && conversationHistory.length > 0) {
      const recentHistory = conversationHistory.slice(-5);
      fullPrompt += 'RECENT CONVERSATION:\n';
      recentHistory.forEach(msg => {
        fullPrompt += `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}\n`;
      });
      fullPrompt += '\n';
    }

    // Add current user message
    fullPrompt += `CURRENT USER QUESTION: ${message}\n\n`;
    fullPrompt += `INSTRUCTIONS: Provide a helpful, accurate response based on your role (${userRole}) and the current context. Be specific, provide step-by-step guidance when needed, and keep responses clear and professional.\n\n`;
    fullPrompt += `YOUR RESPONSE:`;

    console.log(`\n📨 Chat Request from ${userRole} on ${currentPage}:`);
    console.log(`Question: "${message.substring(0, 50)}${message.length > 50 ? '...' : ''}"`);

    // Generate response using Gemini with timeout
    // Use a supported Gemini model; gemini-1.5-flash is fast and available for generateContent
    // Try supported Gemini models in order to avoid 404s from deprecated identifiers
    const candidateModels = [
      'gemini-1.0-pro',
      'gemini-1.5-pro',
      'gemini-1.5-pro-latest',
      'gemini-1.5-flash',
      'gemini-1.5-flash-latest',
    ];

    let botReply = '';
    let lastError = null;

    for (const modelName of candidateModels) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 1024,
          }
        });

        // Set timeout for API call
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('AI response timeout')), 15000);
        });

        const generationPromise = model.generateContent(fullPrompt);
        const result = await Promise.race([generationPromise, timeoutPromise]);
        const response = await result.response;
        botReply = response.text();
        console.log(`✓ Response generated with model: ${modelName} (${botReply.length} chars)`);
        lastError = null;
        break; // success
      } catch (err) {
        lastError = err;
        console.warn(`Model '${modelName}' failed: ${err?.message || err}`);
        // Try next model
      }
    }

    if (!botReply) {
      throw lastError || new Error('All Gemini models failed to generate a response');
    }

    console.log(`✓ Response generated (${botReply.length} chars)`);

    res.json({
      success: true,
      data: {
        message: botReply,
        timestamp: new Date().toISOString(),
        role: userRole,
        page: currentPage
      }
    });

  } catch (error) {
    console.error('❌ Chat API Error:', error);
    
    // Detailed error logging
    if (error.message.includes('API key')) {
      console.error('Check GEMINI_API_KEY in .env file');
    } else if (error.message.includes('timeout')) {
      console.error('Gemini API took too long to respond');
    } else if (error.message.includes('quota')) {
      console.error('Gemini API quota exceeded');
    }

    // Local intent-based fallback: answer common admin questions without AI
    const fallback = await getFallbackResponse(req.body?.message, req.body?.userRole, req.body?.currentPage);
    if (fallback) {
      return res.json({
        success: true,
        data: {
          message: fallback,
          timestamp: new Date().toISOString(),
          role: req.body?.userRole || 'student',
          page: req.body?.currentPage || 'dashboard'
        }
      });
    }

    // User-friendly error response
    let errorMessage = 'I apologize, but I encountered an issue processing your request. ';
    
    if (error.message.includes('API key')) {
      errorMessage += 'The AI service is not properly configured. Please contact your administrator.';
    } else if (error.message.includes('timeout')) {
      errorMessage += 'The request took too long. Please try asking your question again.';
    } else if (error.message.includes('quota')) {
      errorMessage += 'The AI service quota has been reached. Please try again later or contact administrator.';
    } else if (String(error?.message || '').includes('404') || String(error?.status || '') === '404') {
      errorMessage += 'The AI model identifier appears unsupported for the current API version. I will update the configuration; please try again shortly.';
    } else {
      errorMessage += 'Please try rephrasing your question or contact support if the issue persists.';
    }

    res.status(500).json({
      success: false,
      message: errorMessage,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Quick suggestions endpoint based on role and page
router.get('/suggestions', (req, res) => {
  const { userRole = 'student', currentPage = 'dashboard' } = req.query;

  const suggestions = {
    admin: {
      dashboard: [
        'Show me today\'s entry statistics',
        'How do I export analytics reports?',
        'What are the most active hours?',
        'Guide me through approving bookings'
      ],
      mainGateEntry: [
        'How to scan a student ID?',
        'What if OUT is not working?',
        'Show me currently inside count',
        'How to fix scanning errors?'
      ],
      analytics: [
        'How to filter by batch year?',
        'Export data as Excel',
        'Show me IT department statistics',
        'Explain time spent calculation'
      ],
      hallBooking: [
        'How to approve a booking?',
        'View pending requests',
        'Check hall availability',
        'Cancel a booking'
      ]
    },
    librarian: {
      dashboard: [
        'How to access gate entry?',
        'View today\'s statistics'
      ],
      mainGateEntry: [
        'Scan student card',
        'Check who\'s inside',
        'Entry/exit not working'
      ],
      analytics: [
        'View today\'s attendance',
        'Filter by gender'
      ]
    },
    faculty: {
      dashboard: [
        'How to book a hall?',
        'Check my bookings'
      ],
      hallBooking: [
        'Book a seminar hall',
        'Check availability',
        'Cancel my booking'
      ]
    }
  };

  const roleSuggestions = suggestions[userRole] || {};
  const pageSuggestions = roleSuggestions[currentPage] || roleSuggestions['dashboard'] || [
    'How can you help me?',
    'What can I do here?'
  ];

  res.json({
    success: true,
    data: { suggestions: pageSuggestions }
  });
});

export default router;

// ----- Helpers -----
async function getFallbackResponse(message = '', userRole = 'student', currentPage = 'dashboard') {
  const text = String(message || '').toLowerCase();

  // Greeting intent
  if (/^(hi|hello|hey|greetings|good\s*(morning|afternoon|evening))$/i.test(text.trim())) {
    const roleGreetings = {
      admin: 'Hello! I\'m your AI assistant for the KARE Library Management System. I can help you with gate entry stats, advanced analytics, booking approvals, user management, and troubleshooting. What would you like to know?',
      librarian: 'Hi! I can help you with gate entry operations, viewing today\'s attendance, and basic analytics. How can I assist you?',
      faculty: 'Hello! I can guide you through hall/room booking, checking your booking status, and library policies. What do you need help with?',
      student: 'Hi! I can answer questions about library hours, entry/exit procedures, and general library information. How can I help you today?'
    };
    return roleGreetings[userRole] || roleGreetings.student;
  }

  // Today stats or active hours intent
  if (/(today|todays|today's).*stat|entry|entries|inside|count|active.*hour|peak.*hour|most.*hour/.test(text)) {
    try {
      const url = `http://localhost:${config.PORT}/api/entry/dashboard-stats`;
      const resp = await fetch(url);
      if (!resp.ok) throw new Error(`dashboard-stats failed: ${resp.status}`);
      const data = await resp.json();
      const cur = data?.current || { totalStudents: 0, boys: 0, girls: 0, unknown: 0 };
      const today = data?.today || { totalEntries: 0, totalExits: 0, netEntries: 0 };
      const peakHour = data?.analytics?.peakHour ?? null;
      const peakCount = data?.analytics?.peakHourCount ?? null;
      const avgSession = data?.analytics?.avgSessionTime ?? null;

      let lines = [];
      
      // If specifically asking about active/peak hours
      if (/active.*hour|peak.*hour|most.*hour/.test(text)) {
        lines.push(`📊 Peak Activity Analysis:`);
        if (peakHour !== null && peakCount !== null) {
          lines.push(`- Most active hour: ${String(peakHour).padStart(2, '0')}:00 with ${peakCount} visits`);
        } else {
          lines.push(`- Peak hour data not yet available (needs more entries today).`);
        }
        if (avgSession !== null) {
          lines.push(`- Average session time: ${Math.round(avgSession)} minutes`);
        }
        lines.push(`- Currently inside: ${cur.totalStudents} students`);
        lines.push(`\nTip: Check Advanced Analytics → Charts → Hourly Visit Distribution for detailed hourly breakdown.`);
      } else {
        // General stats
        lines.push(`📈 Today's Gate Entry Statistics:`);
        lines.push(`- Currently inside: ${cur.totalStudents} (Boys: ${cur.boys}, Girls: ${cur.girls}, Unknown: ${cur.unknown})`);
        lines.push(`- Total entries: ${today.totalEntries}`);
        lines.push(`- Total exits: ${today.totalExits}`);
        lines.push(`- Net entries: ${today.netEntries}`);
        if (peakHour !== null && peakCount !== null) {
          lines.push(`- Peak hour: ${String(peakHour).padStart(2, '0')}:00 with ${peakCount} visits`);
        }
        if (avgSession !== null) {
          lines.push(`- Avg session time: ${Math.round(avgSession)} minutes`);
        }
        lines.push(`\n💡 Tip: Open Advanced Analytics to filter by department, batch year, and export XLSX/PDF.`);
      }
      return lines.join('\n');
    } catch (e) {
      console.warn('Fallback stats failed:', e?.message || e);
      return 'I attempted to fetch today\'s statistics but encountered an issue. Please ensure the backend entry stats endpoint is reachable.';
    }
  }

  // Export analytics intent
  if (/export|download.*(report|analytics|excel|xlsx|pdf|csv)/.test(text)) {
    return [
      '📤 Export Analytics Reports:',
      '1. Navigate to Advanced Analytics page',
      '2. Apply desired filters:',
      '   - Gender (Male/Female/All)',
      '   - Status (IN/OUT/All)',
      '   - Batch Year, Department, Branch',
      '   - Date Range (start and end dates)',
      '   - Present Only toggle',
      '3. Click Export button → choose format:',
      '   • XLSX (Excel): Full data with computed columns (Time Spent, Status)',
      '   • PDF: Professional report with summary + 4 charts',
      '   • CSV: Raw data for external analysis',
      '4. File downloads automatically to your Downloads folder',
      '',
      '⚠️ Troubleshooting:',
      '- If export fails, check browser popup blocker',
      '- For large datasets, try smaller date ranges',
      '- Ensure sufficient disk space'
    ].join('\n');
  }

  // Booking approval guidance for admin
  if (userRole === 'admin' && /(approve|reject).*booking|pending requests|how to approve|booking/.test(text)) {
    return [
      '✅ Hall/Room Booking Approval Process:',
      '1. Navigate to Hall/Room Booking section',
      '2. Click "Pending Requests" tab',
      '3. Review each request:',
      '   - Faculty name and department',
      '   - Hall/room requested',
      '   - Date and time slot',
      '   - Purpose/description',
      '   - Number of students (if applicable)',
      '4. Check availability calendar for conflicts',
      '5. Click Approve or Reject',
      '6. Add a brief comment (optional but recommended)',
      '7. Approved bookings move to Active tab',
      '8. Faculty receives notification of your decision',
      '',
      '💡 Tips:',
      '- Prioritize requests made in advance',
      '- Check for double bookings before approving',
      '- You can cancel approved bookings if needed'
    ].join('\n');
  }

  // Scan/gate entry troubleshooting
  if (/(scan|scanning|entry|exit).*not.*work|error.*scan|cooldown|10.*second/.test(text)) {
    return [
      '🔧 Gate Entry/Exit Troubleshooting:',
      '',
      'Common Issues:',
      '1. "OUT not working after scanning"',
      '   → Wait 10 seconds after entry before scanning OUT',
      '   → System has cooldown to prevent accidental double-scans',
      '   → Check entry time on dashboard to confirm 10s passed',
      '',
      '2. "Card not recognized"',
      '   → Verify card number format (student ID)',
      '   → Check if student exists in KOHA database',
      '   → Try manual entry if scanner fails',
      '',
      '3. "Status stuck on IN"',
      '   → Student forgot to scan OUT yesterday',
      '   → Contact admin/librarian to manually update record',
      '',
      '4. "System error during scan"',
      '   → Check MySQL connection (KOHA + gate_logs)',
      '   → Verify backend is running on port 5001',
      '   → Check browser console for network errors',
      '',
      '💡 Need more help? Contact your system administrator.'
    ].join('\n');
  }

  // General help or unknown
  if (/help|what.*can.*you.*do|how.*can.*you|capabilities/.test(text)) {
    const roleHelp = {
      admin: [
        '🤖 I can help you with:',
        '• Gate entry/exit statistics (today, peak hours, gender breakdown)',
        '• Advanced analytics (filters, charts, exports to XLSX/PDF/CSV)',
        '• Hall/room booking approvals and management',
        '• User management and troubleshooting',
        '• System diagnostics and error resolution',
        '',
        'Try asking:',
        '- "Show me today\'s entry statistics"',
        '- "What are the most active hours?"',
        '- "How do I export analytics reports?"',
        '- "Guide me through approving bookings"'
      ].join('\n'),
      librarian: [
        '🤖 I can help you with:',
        '• Gate entry/exit operations',
        '• Today\'s attendance and statistics',
        '• Basic analytics and filters',
        '• Scanning troubleshooting',
        '',
        'Try asking:',
        '- "Show me today\'s entry statistics"',
        '- "How to scan a student card?"',
        '- "Why is OUT not working?"'
      ].join('\n'),
      faculty: [
        '🤖 I can help you with:',
        '• Booking seminar halls and rooms',
        '• Checking booking status',
        '• Library policies and hours',
        '',
        'Try asking:',
        '- "How to book a hall?"',
        '- "Check my bookings"',
        '- "Cancel a booking"'
      ].join('\n'),
      student: [
        '🤖 I can help you with:',
        '• Library hours and rules',
        '• Entry/exit procedures',
        '• General library information',
        '',
        'Try asking:',
        '- "What are the library hours?"',
        '- "How to scan my ID card?"',
        '- "Why 10 second wait for exit?"'
      ].join('\n')
    };
    return roleHelp[userRole] || roleHelp.student;
  }

  return null;
}
