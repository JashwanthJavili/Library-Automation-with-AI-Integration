import mongoose from 'mongoose';

const entrySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User is required']
  },
  entryType: {
    type: String,
    enum: ['entry', 'exit'],
    required: [true, 'Entry type is required']
  },
  timestamp: {
    type: Date,
    default: Date.now,
    required: true
  },
  method: {
    type: String,
    enum: ['id_card', 'manual_entry', 'qr_code'],
    required: [true, 'Entry method is required']
  },
  registrationNumber: {
    type: String,
    trim: true
  },
  idCardNumber: {
    type: String,
    trim: true
  },
  location: {
    type: String,
    enum: ['main_gate', 'side_entrance', 'emergency_exit'],
    default: 'main_gate'
  },
  purpose: {
    type: String,
    enum: ['study', 'research', 'meeting', 'event', 'other'],
    default: 'study'
  },
  duration: {
    type: Number, // in minutes, calculated when exiting
    min: 0
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'cancelled'],
    default: 'active'
  },
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  verificationTime: {
    type: Date
  },
  deviceInfo: {
    ipAddress: String,
    userAgent: String,
    deviceId: String
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for formatted timestamp
entrySchema.virtual('formattedTimestamp').get(function() {
  return this.timestamp.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
});

// Virtual for time spent (for exit entries)
entrySchema.virtual('timeSpent').get(function() {
  if (this.entryType === 'exit' && this.duration) {
    const hours = Math.floor(this.duration / 60);
    const minutes = this.duration % 60;
    return `${hours}h ${minutes}m`;
  }
  return null;
});

// Indexes for better query performance
entrySchema.index({ user: 1, timestamp: -1 });
entrySchema.index({ entryType: 1, timestamp: -1 });
entrySchema.index({ registrationNumber: 1 });
entrySchema.index({ idCardNumber: 1 });
entrySchema.index({ status: 1, entryType: 1 });

// Pre-save middleware to handle entry/exit logic
entrySchema.pre('save', function(next) {
  if (this.entryType === 'exit' && this.isNew) {
    // For exit entries, try to find the corresponding entry
    this.constructor.findOne({
      user: this.user,
      entryType: 'entry',
      status: 'active'
    }).sort({ timestamp: -1 }).then(entryRecord => {
      if (entryRecord) {
        const duration = Math.round((this.timestamp - entryRecord.timestamp) / (1000 * 60));
        this.duration = duration;
        // Mark the entry record as completed
        entryRecord.status = 'completed';
        entryRecord.save();
      }
    });
  }
  next();
});

// Static method to get current active entries
entrySchema.statics.getActiveEntries = function() {
  return this.find({ 
    entryType: 'entry', 
    status: 'active' 
  }).populate('user', 'firstName lastName studentId department section gender role');
};

// Static method to get user's current status
entrySchema.statics.getUserStatus = function(userId) {
  return this.findOne({
    user: userId,
    status: 'active'
  }).sort({ timestamp: -1 });
};

// Static method to get entry statistics
entrySchema.statics.getEntryStats = function(startDate, endDate) {
  const matchStage = {
    timestamp: {
      $gte: startDate,
      $lte: endDate
    }
  };

  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: {
          date: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
          type: '$entryType'
        },
        count: { $sum: 1 }
      }
    },
    {
      $group: {
        _id: '$_id.date',
        entries: {
          $push: {
            type: '$_id.type',
            count: '$count'
          }
        },
        totalEntries: { $sum: '$count' }
      }
    },
    { $sort: { _id: 1 } }
  ]);
};

// Method to check if user can enter
entrySchema.statics.canUserEnter = function(userId) {
  return this.findOne({
    user: userId,
    entryType: 'entry',
    status: 'active'
  }).then(entry => !entry); // Can enter if no active entry
};

// Method to check if user can exit
entrySchema.statics.canUserExit = function(userId) {
  return this.findOne({
    user: userId,
    entryType: 'entry',
    status: 'active'
  }).then(entry => !!entry); // Can exit if has active entry
};

const Entry = mongoose.model('Entry', entrySchema);

export default Entry;
