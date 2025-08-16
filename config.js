// Configuration file for the entire project
// Load environment variables first
import dotenv from 'dotenv';
dotenv.config();

export const config = {
  // Server Configuration
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',

  // MongoDB Configuration
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/library_automation',
  MONGODB_URI_PROD: process.env.MONGODB_URI_PROD || 'mongodb://localhost:27017/library_automation',

  // JWT Configuration
  JWT_SECRET: process.env.JWT_SECRET || 'default_jwt_secret',
  JWT_EXPIRE: process.env.JWT_EXPIRE || '24h',

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000,
  RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,

  // CORS Configuration
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:3000',

  // AI Integration (Future)
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || ''
};
