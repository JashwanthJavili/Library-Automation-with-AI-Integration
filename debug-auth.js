import mongoose from 'mongoose';
import { config } from './config.js';
import User from './server/models/User.js';
import bcrypt from 'bcryptjs';

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

const debugAuthentication = async () => {
  try {
    await connectDB();
    
    console.log('🔍 Debugging authentication process...\n');
    
    // Test 1: Check if users exist in database
    console.log('1. Checking users in database:');
    const allUsers = await User.find({}, 'username email firstName lastName role isActive');
    console.log(`Found ${allUsers.length} users:`);
    allUsers.forEach(user => {
      console.log(`  - ${user.username} (${user.role}) - Active: ${user.isActive}`);
    });
    
    // Test 2: Try to find admin user specifically
    console.log('\n2. Looking for admin user:');
    const adminUser = await User.findOne({ username: 'admin' });
    if (adminUser) {
      console.log(`✅ Admin user found: ${adminUser.firstName} ${adminUser.lastName}`);
      console.log(`   Email: ${adminUser.email}`);
      console.log(`   Active: ${adminUser.isActive}`);
    } else {
      console.log('❌ Admin user not found');
    }
    
    // Test 3: Try findByCredentials method directly
    console.log('\n3. Testing findByCredentials method:');
    try {
      const foundUser = await User.findByCredentials('admin', 'admin123');
      console.log(`✅ findByCredentials successful: ${foundUser.firstName} ${foundUser.lastName}`);
    } catch (error) {
      console.log(`❌ findByCredentials failed: ${error.message}`);
      
      // Test 4: Manual password verification
      console.log('\n4. Manual password verification:');
      const userWithPassword = await User.findOne({ username: 'admin' }).select('+password');
      if (userWithPassword) {
        console.log('✅ Found user with password field');
        const isMatch = await bcrypt.compare('admin123', userWithPassword.password);
        console.log(`Password match result: ${isMatch}`);
        console.log(`Stored password hash: ${userWithPassword.password.substring(0, 20)}...`);
      } else {
        console.log('❌ Could not find user with password field');
      }
    }
    
    // Test 5: Check database query variations
    console.log('\n5. Testing database queries:');
    const byUsername = await User.findOne({ username: 'admin', isActive: true });
    const byEmail = await User.findOne({ email: 'admin@kare.edu.in', isActive: true });
    const byOr = await User.findOne({ 
      $or: [{ username: 'admin' }, { email: 'admin' }],
      isActive: true 
    });
    
    console.log(`Query by username: ${byUsername ? '✅ Found' : '❌ Not found'}`);
    console.log(`Query by email: ${byEmail ? '✅ Found' : '❌ Not found'}`);
    console.log(`Query by $or: ${byOr ? '✅ Found' : '❌ Not found'}`);
    
    console.log('\n🚀 Debug completed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Debug failed:', error);
    process.exit(1);
  }
};

debugAuthentication();
