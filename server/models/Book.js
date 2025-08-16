import mongoose from 'mongoose';

const bookSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Book title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  author: {
    type: String,
    required: [true, 'Author name is required'],
    trim: true,
    maxlength: [100, 'Author name cannot exceed 100 characters']
  },
  isbn: {
    type: String,
    required: [true, 'ISBN is required'],
    unique: true,
    trim: true,
    match: [/^(?:[0-9]{10}|[0-9]{13})$/, 'Please enter a valid 10 or 13 digit ISBN']
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: [
      'Computer Science',
      'Engineering',
      'Mathematics',
      'Physics',
      'Chemistry',
      'Biology',
      'Literature',
      'History',
      'Philosophy',
      'Economics',
      'Psychology',
      'Medicine',
      'Arts',
      'Other'
    ]
  },
  subcategory: {
    type: String,
    trim: true
  },
  publisher: {
    type: String,
    trim: true,
    maxlength: [100, 'Publisher name cannot exceed 100 characters']
  },
  publicationYear: {
    type: Number,
    min: [1800, 'Publication year must be after 1800'],
    max: [new Date().getFullYear() + 1, 'Publication year cannot be in the future']
  },
  edition: {
    type: String,
    trim: true
  },
  pages: {
    type: Number,
    min: [1, 'Pages must be at least 1']
  },
  language: {
    type: String,
    default: 'English',
    trim: true
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  coverImage: {
    type: String
  },
  totalCopies: {
    type: Number,
    required: [true, 'Total copies is required'],
    min: [1, 'Total copies must be at least 1'],
    default: 1
  },
  availableCopies: {
    type: Number,
    required: [true, 'Available copies is required'],
    min: [0, 'Available copies cannot be negative'],
    default: 1
  },
  location: {
    shelf: {
      type: String,
      trim: true
    },
    row: {
      type: String,
      trim: true
    },
    section: {
      type: String,
      trim: true
    }
  },
  tags: [{
    type: String,
    trim: true
  }],
  status: {
    type: String,
    enum: ['available', 'low_stock', 'out_of_stock', 'maintenance'],
    default: 'available'
  },
  addedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for borrowed copies
bookSchema.virtual('borrowedCopies').get(function() {
  return this.totalCopies - this.availableCopies;
});

// Virtual for availability percentage
bookSchema.virtual('availabilityPercentage').get(function() {
  return Math.round((this.availableCopies / this.totalCopies) * 100);
});

// Indexes for better query performance
bookSchema.index({ title: 'text', author: 'text', isbn: 1 });
bookSchema.index({ category: 1, subcategory: 1 });
bookSchema.index({ status: 1, availableCopies: 1 });

// Pre-save middleware to update status based on available copies
bookSchema.pre('save', function(next) {
  if (this.availableCopies === 0) {
    this.status = 'out_of_stock';
  } else if (this.availableCopies <= Math.ceil(this.totalCopies * 0.2)) {
    this.status = 'low_stock';
  } else {
    this.status = 'available';
  }
  next();
});

// Static method to find available books
bookSchema.statics.findAvailable = function() {
  return this.find({ availableCopies: { $gt: 0 } });
};

// Static method to search books by text
bookSchema.statics.searchByText = function(searchTerm) {
  return this.find({
    $text: { $search: searchTerm }
  }, {
    score: { $meta: 'textScore' }
  }).sort({ score: { $meta: 'textScore' } });
};

// Method to check if book can be borrowed
bookSchema.methods.canBeBorrowed = function() {
  return this.availableCopies > 0 && this.status === 'available';
};

// Method to borrow a copy
bookSchema.methods.borrowCopy = function() {
  if (this.availableCopies > 0) {
    this.availableCopies -= 1;
    return true;
  }
  return false;
};

// Method to return a copy
bookSchema.methods.returnCopy = function() {
  if (this.availableCopies < this.totalCopies) {
    this.availableCopies += 1;
    return true;
  }
  return false;
};

const Book = mongoose.model('Book', bookSchema);

export default Book;
