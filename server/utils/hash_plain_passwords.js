#!/usr/bin/env node
import pool from '../mysql.js';
import bcrypt from 'bcryptjs';

async function main() {
  console.log('Scanning library_users for plain passwords...');
  const [rows] = await pool.execute('SELECT id, username, password_hash FROM library_users');
  const users = Array.isArray(rows) ? rows : [];
  let updated = 0;

  for (const u of users) {
    const pw = u.password_hash || '';
    // Heuristic: bcrypt hashes start with $2a$ or $2b$ or $2y$
    if (typeof pw !== 'string' || pw.length === 0) continue;
    if (pw.startsWith('$2')) {
      console.log(`id=${u.id} username=${u.username} already hashed, skipping`);
      continue;
    }

    // If password_hash equals username or looks like plain text, re-hash using bcrypt
    const newHash = await bcrypt.hash(pw, 12);
    await pool.execute('UPDATE library_users SET password_hash = ?, updated_at = NOW() WHERE id = ?', [newHash, u.id]);
    console.log(`Updated password for id=${u.id} username=${u.username}`);
    updated++;
  }

  console.log(`Done. Updated ${updated} user(s).`);
  process.exit(0);
}

main().catch(err => {
  console.error('Error hashing passwords:', err);
  process.exit(1);
});
