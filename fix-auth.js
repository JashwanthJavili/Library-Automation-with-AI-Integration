import mongoose from 'mongoose';
import { config } from './config.js';
import User from './server/models/User.js';

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(config.MONGODB_URI);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

const fixAuthIssue = async () => {
  try {
    await connectDB();
    
    console.log('🔍 Checking for corrupted user records...');
    
    // Remove the specific corrupted record
    const corruptedId = '68a0af1c1e08a7ec35516432';
    const result = await User.findByIdAndDelete(corruptedId);
    
    if (result) {
      console.log(`✅ Removed corrupted user record: ${corruptedId}`);
    } else {
      console.log('ℹ️ Corrupted record not found or already removed');
    }
    
    // Test authentication with admin user
    console.log('🧪 Testing authentication...');
    
    try {
      const adminUser = await User.findByCredentials('admin', 'admin123');
      console.log(`✅ Authentication test successful for admin: ${adminUser.firstName} ${adminUser.lastName}`);
    } catch (error) {
      console.log(`❌ Authentication test failed: ${error.message}`);
      
      // Create fresh admin user if needed
      const existingAdmin = await User.findOne({ username: 'admin' });
      if (!existingAdmin) {
        console.log('🔧 Creating new admin user...');
        const newAdmin = new User({
          username: 'admin',
          email: 'admin@kare.edu.in',
          password: 'admin123',
          firstName: 'Library',
          lastName: 'Administrator',
          role: 'admin',
          department: 'Library Management',
          isActive: true
        });
        await newAdmin.save();
        console.log('✅ New admin user created');
      }
    }
    
    // List valid users
    const users = await User.find({}, 'username email firstName lastName role isActive').limit(5);
    console.log('\n📋 Valid users in database:');
    users.forEach(user => {
      console.log(`- ${user.username} (${user.role}) - ${user.firstName} ${user.lastName}`);
    });
    
    console.log('\n🚀 Authentication fix completed!');
    console.log('💡 Try logging in with: admin / admin123');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Fix failed:', error);
    process.exit(1);
  }
};

fixAuthIssue();
