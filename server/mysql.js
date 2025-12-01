import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const pool = mysql.createPool({
  host: process.env.GATE_MYSQL_HOST || 'localhost',
  port: parseInt(process.env.GATE_MYSQL_PORT || '3306'),
  user: process.env.GATE_MYSQL_USER || 'root',
  password: process.env.GATE_MYSQL_PASSWORD || '',
  database: process.env.GATE_MYSQL_DATABASE || 'library_gate_entry',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

export default pool;
