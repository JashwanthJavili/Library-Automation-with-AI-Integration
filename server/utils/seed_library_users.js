#!/usr/bin/env node
/*
  Seed script for adding sample librarian users to MySQL database.
  - Reads MySQL connection from environment variables (use a .env file or export env vars)
  - Hashes passwords with bcryptjs and inserts into `library_users` table
  - Ensures the `roles` table has 'librarian' role and uses that id

  Usage:
    # from repo root (install deps first if needed)
    node server/utils/seed_library_users.js

  Required env vars (defaults shown):
    MYSQL_HOST (default: localhost)
    MYSQL_PORT (default: 3306)
    MYSQL_USER (default: root)
    MYSQL_PASSWORD (default: empty)
    MYSQL_DATABASE (default: library_gate_entry)
*/

import dotenv from 'dotenv';
dotenv.config();

import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';

const MYSQL_HOST = process.env.MYSQL_HOST || 'localhost';
const MYSQL_PORT = process.env.MYSQL_PORT ? Number(process.env.MYSQL_PORT) : 3306;
const MYSQL_USER = process.env.MYSQL_USER || 'root';
const MYSQL_PASSWORD = process.env.MYSQL_PASSWORD || '';
const MYSQL_DATABASE = process.env.MYSQL_DATABASE || 'library_gate_entry';

async function main() {
  const pool = mysql.createPool({
    host: MYSQL_HOST,
    port: MYSQL_PORT,
    user: MYSQL_USER,
    password: MYSQL_PASSWORD,
    database: MYSQL_DATABASE,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  });

  try {
    console.log('Connecting to MySQL %s@%s:%d/%s', MYSQL_USER, MYSQL_HOST, MYSQL_PORT, MYSQL_DATABASE);
    const conn = await pool.getConnection();
    await conn.ping();
    conn.release();

    // Ensure roles table has librarian role (insert if not exists)
    const [rows] = await pool.query("SELECT id, name FROM roles WHERE name = 'librarian'");
    let librarianRoleId = null;
    if (Array.isArray(rows) && rows.length > 0) {
      librarianRoleId = rows[0].id;
      console.log('Found existing role "librarian" with id', librarianRoleId);
    } else {
      const [res] = await pool.query("INSERT INTO roles (name) VALUES (?)", ['librarian']);
      librarianRoleId = res.insertId;
      console.log('Inserted role "librarian" with id', librarianRoleId);
    }

    // Sample librarian users to insert (username, email, full_name, plainPassword, department, phone)
    const sampleUsers = [
      ['lib_arya', 'arya.librarian@uni.edu', 'Arya Sharma', 'LibPass#01', 'Library Services', '9876500001'],
      ['lib_ravi', 'ravi.patil@uni.edu', 'Ravi Patil', 'LibPass#02', 'Acquisitions', '9876500002'],
      ['lib_sima', 'sima.khan@uni.edu', 'Sima Khan', 'LibPass#03', 'Circulation', '9876500003'],
      ['lib_rahul', 'rahul.desai@uni.edu', 'Rahul Desai', 'LibPass#04', 'Reference', '9876500004'],
      ['lib_neha', 'neha.singh@uni.edu', 'Neha Singh', 'LibPass#05', 'Digital Services', '9876500005'],
      ['lib_aman', 'aman.verma@uni.edu', 'Aman Verma', 'LibPass#06', 'Technical Services', '9876500006'],
      ['lib_priya', 'priya.nair@uni.edu', 'Priya Nair', 'LibPass#07', 'Periodicals', '9876500007'],
    ];

    console.log('Preparing to insert %d librarian users (role_id=%d)', sampleUsers.length, librarianRoleId);

    for (const [username, email, full_name, plainPassword, department, phone] of sampleUsers) {
      // Check if user already exists by username or email
      const [existing] = await pool.query('SELECT id FROM library_users WHERE username = ? OR email = ?', [username, email]);
      if (Array.isArray(existing) && existing.length > 0) {
        console.log('Skipping existing user', username);
        continue;
      }

      const password_hash = await bcrypt.hash(plainPassword, 12);

      const [res] = await pool.query(
        `INSERT INTO library_users (username, email, full_name, password_hash, role_id, department, phone, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [username, email, full_name, password_hash, librarianRoleId, department, phone, 1]
      );

      console.log('Inserted user %s (id=%d) with password %s', username, res.insertId, plainPassword);
    }

    console.log('\nDone. Please change the sample passwords after first login and store secrets safely.');
    await pool.end();
  } catch (err) {
    console.error('Error in seed script:', err);
    process.exit(1);
  }
}

main();
