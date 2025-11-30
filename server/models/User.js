import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    minlength: [3, 'Username must be at least 3 characters'],
    maxlength: [30, 'Username cannot exceed 30 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false // Don't include password in queries by default
  },
  role: {
    type: String,
    enum: ['admin', 'librarian', 'student', 'faculty'],
    default: 'student'
  },
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true,
    maxlength: [50, 'First name cannot exceed 50 characters']
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true,
    maxlength: [50, 'Last name cannot exceed 50 characters']
  },
  studentId: {
    type: String,
    unique: true,
    sparse: true, // Allow null/undefined values
    trim: true
  },
  department: {
    type: String,
    trim: true
  },
  section: {
    type: String,
    trim: true
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other'],
    lowercase: true,
    trim: true
  },
  phone: {
    type: String,
    trim: true,
    match: [/^[\+]?[0-9\-\s\(\)]+$/, 'Please enter a valid phone number']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  },
  profileImage: {
    type: String
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Index for better query performance
userSchema.index({ username: 1, email: 1, studentId: 1 });

// Pre-save middleware to hash password - DISABLED FOR DEVELOPMENT
// userSchema.pre('save', async function(next) {
//   if (!this.isModified('password')) return next();
//   
//   try {
//     const salt = await bcrypt.genSalt(12);
//     this.password = await bcrypt.hash(this.password, salt);
//     next();
//   } catch (error) {
//     next(error);
//   }
// });

// Method to compare password - PLAIN TEXT COMPARISON FOR DEVELOPMENT
userSchema.methods.comparePassword = async function(candidatePassword) {
  return candidatePassword === this.password;
};

// Method to get public profile (without sensitive data)
userSchema.methods.getPublicProfile = function() {
  try {
    const userObject = this.toObject ? this.toObject() : this;
    const publicProfile = { ...userObject };
    delete publicProfile.password;
    return publicProfile;
  } catch (error) {
    // Fallback if toObject fails
    const publicProfile = { ...this };
    delete publicProfile.password;
    return publicProfile;
  }
};

// Static method to find user by credentials
userSchema.statics.findByCredentials = async function(username, password) {
  const user = await this.findOne({ 
    $or: [{ username }, { email: username }],
    isActive: true 
  }).select('+password');
  
  if (!user) {
    throw new Error('Invalid login credentials');
  }
  
  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw new Error('Invalid login credentials');
  }
  
  return user;
};

const User = mongoose.model('User', userSchema);

export default User;
