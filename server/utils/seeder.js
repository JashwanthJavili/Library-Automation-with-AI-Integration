import mongoose from 'mongoose';
import { config } from '../../config.js';
import User from '../models/User.js';
import Book from '../models/Book.js';
import Entry from '../models/Entry.js';

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

const seedUsers = async () => {
  try {
    // Check if admin user already exists
    const existingAdmin = await User.findOne({ role: 'admin' });
    if (existingAdmin) {
      console.log('👤 Admin user already exists, but passwords may be corrupted...');
      console.log('🗑️ Clearing existing users to recreate with proper passwords...');
      
      // Clear all existing users
      await User.deleteMany({});
      console.log('✅ Existing users cleared');
    }

    console.log('🌱 Creating comprehensive user database...');

    // Create admin users - don't hash passwords, User model will do it
    const admins = [
      {
        username: 'admin',
        email: 'admin@kare.edu.in',
        password: 'admin123',
        firstName: 'Library',
        lastName: 'Administrator',
        role: 'admin',
        department: 'Library Management',
        phone: '+91-9876543210',
        isActive: true
      },
      {
        username: 'superadmin',
        email: 'superadmin@kare.edu.in',
        password: 'admin123',
        firstName: 'Dr. Rajesh',
        lastName: 'Kumar',
        role: 'admin',
        department: 'IT Administration',
        phone: '+91-9876543209',
        isActive: true
      }
    ];

    for (const adminData of admins) {
      const admin = new User(adminData);
      await admin.save();
    }
    console.log('👑 Admin users created successfully');

    // Create librarian users - don't hash passwords, User model will do it
    const librarians = [
      {
        username: 'librarian1',
        email: 'librarian1@kare.edu.in',
        password: 'librarian123',
        firstName: 'Dr. Priya',
        lastName: 'Sharma',
        role: 'librarian',
        department: 'Library Management',
        phone: '+91-9876543211',
        isActive: true
      },
      {
        username: 'librarian2',
        email: 'librarian2@kare.edu.in',
        password: 'librarian123',
        firstName: 'Mr. Arun',
        lastName: 'Patel',
        role: 'librarian',
        department: 'Library Management',
        phone: '+91-9876543212',
        isActive: true
      },
      {
        username: 'librarian3',
        email: 'librarian3@kare.edu.in',
        password: 'librarian123',
        firstName: 'Ms. Kavita',
        lastName: 'Singh',
        role: 'librarian',
        department: 'Digital Resources',
        phone: '+91-9876543213',
        isActive: true
      }
    ];

    for (const librarianData of librarians) {
      const librarian = new User(librarianData);
      await librarian.save();
    }
    console.log('📚 Librarian users created successfully');

    // Create faculty users - don't hash passwords, User model will do it
    const faculties = [
      {
        username: 'faculty1',
        email: 'faculty1@kare.edu.in',
        password: 'faculty123',
        firstName: 'Dr. Amit',
        lastName: 'Verma',
        role: 'faculty',
        department: 'Computer Science',
        phone: '+91-9876543214',
        isActive: true
      },
      {
        username: 'faculty2',
        email: 'faculty2@kare.edu.in',
        password: 'faculty123',
        firstName: 'Dr. Sunita',
        lastName: 'Reddy',
        role: 'faculty',
        department: 'Electrical Engineering',
        phone: '+91-9876543215',
        isActive: true
      },
      {
        username: 'faculty3',
        email: 'faculty3@kare.edu.in',
        password: 'faculty123',
        firstName: 'Prof. Ramesh',
        lastName: 'Iyer',
        role: 'faculty',
        department: 'Mechanical Engineering',
        phone: '+91-9876543216',
        isActive: true
      }
    ];

    for (const facultyData of faculties) {
      const faculty = new User(facultyData);
      await faculty.save();
    }
    console.log('🎓 Faculty users created successfully');

    // Create comprehensive student users - don't hash passwords, User model will do it
    const students = [
      // Computer Science Students
      {
        username: 'cs001',
        email: 'cs001@kare.edu.in',
        password: 'student123',
        firstName: 'Rahul',
        lastName: 'Kumar',
        role: 'student',
        studentId: 'KARE2024CS001',
        department: 'Computer Science',
        phone: '+91-9876543217',
        isActive: true
      },
      {
        username: 'cs002',
        email: 'cs002@kare.edu.in',
        password: 'student123',
        firstName: 'Priya',
        lastName: 'Sharma',
        role: 'student',
        studentId: 'KARE2024CS002',
        department: 'Computer Science',
        phone: '+91-9876543218',
        isActive: true
      },
      {
        username: 'cs003',
        email: 'cs003@kare.edu.in',
        password: 'student123',
        firstName: 'Amit',
        lastName: 'Patel',
        role: 'student',
        studentId: 'KARE2024CS003',
        department: 'Computer Science',
        phone: '+91-9876543219',
        isActive: true
      },
      // Electrical Engineering Students
      {
        username: 'ee001',
        email: 'ee001@kare.edu.in',
        password: 'student123',
        firstName: 'Sneha',
        lastName: 'Gupta',
        role: 'student',
        studentId: 'KARE2024EE001',
        department: 'Electrical Engineering',
        phone: '+91-9876543220',
        isActive: true
      },
      {
        username: 'ee002',
        email: 'ee002@kare.edu.in',
        password: 'student123',
        firstName: 'Vikram',
        lastName: 'Singh',
        role: 'student',
        studentId: 'KARE2024EE002',
        department: 'Electrical Engineering',
        phone: '+91-9876543221',
        isActive: true
      },
      // Mechanical Engineering Students
      {
        username: 'me001',
        email: 'me001@kare.edu.in',
        password: 'student123',
        firstName: 'Anjali',
        lastName: 'Joshi',
        role: 'student',
        studentId: 'KARE2024ME001',
        department: 'Mechanical Engineering',
        phone: '+91-9876543222',
        isActive: true
      },
      {
        username: 'me002',
        email: 'me002@kare.edu.in',
        password: 'student123',
        firstName: 'Raj',
        lastName: 'Malhotra',
        role: 'student',
        studentId: 'KARE2024ME002',
        department: 'Mechanical Engineering',
        phone: '+91-9876543223',
        isActive: true
      },
      // Civil Engineering Students
      {
        username: 'ce001',
        email: 'ce001@kare.edu.in',
        password: 'student123',
        firstName: 'Kavita',
        lastName: 'Yadav',
        role: 'student',
        studentId: 'KARE2024CE001',
        department: 'Civil Engineering',
        phone: '+91-9876543224',
        isActive: true
      },
      // Chemical Engineering Students
      {
        username: 'che001',
        email: 'che001@kare.edu.in',
        password: 'student123',
        firstName: 'Arun',
        lastName: 'Tiwari',
        role: 'student',
        studentId: 'KARE2024CHE001',
        department: 'Chemical Engineering',
        phone: '+91-9876543225',
        isActive: true
      }
    ];

    for (const studentData of students) {
      const student = new User(studentData);
      await student.save();
    }
    console.log('🎓 Comprehensive student database created successfully');

  } catch (error) {
    console.error('❌ Error seeding users:', error);
  }
};

const seedBooks = async () => {
  try {
    // Check if books already exist
    const existingBooks = await Book.countDocuments();
    if (existingBooks > 0) {
      console.log('📖 Books already exist, clearing to recreate with proper user references...');
      await Book.deleteMany({});
      console.log('✅ Existing books cleared');
    }

    console.log('🌱 Creating comprehensive book database...');

    // Get admin user for book creation
    const adminUser = await User.findOne({ role: 'admin' });
    
    if (!adminUser) {
      console.log('⚠️ No admin user found, skipping book creation');
      return;
    }

    const comprehensiveBooks = [
      // Computer Science Books
      {
        title: 'Introduction to Computer Science: A Comprehensive Guide',
        author: 'Dr. John Smith',
        isbn: '9780123456789',
        category: 'Computer Science',
        subcategory: 'Programming Fundamentals',
        publisher: 'Tech Books Inc.',
        publicationYear: 2023,
        edition: '3rd Edition',
        pages: 650,
        language: 'English',
        description: 'A comprehensive introduction to computer science fundamentals covering programming, algorithms, and data structures',
        totalCopies: 8,
        availableCopies: 8,
        location: { shelf: 'CS-1', row: 'A', section: 'Programming' },
        tags: ['computer science', 'programming', 'fundamentals', 'algorithms'],
        status: 'available',
        addedBy: adminUser._id
      },
      {
        title: 'Data Structures and Algorithms: Advanced Concepts',
        author: 'Prof. Jane Doe',
        isbn: '9780987654321',
        category: 'Computer Science',
        subcategory: 'Data Structures',
        publisher: 'Algorithm Press',
        publicationYear: 2022,
        edition: '2nd Edition',
        pages: 720,
        language: 'English',
        description: 'Advanced concepts in data structures and algorithm design with practical implementations',
        totalCopies: 5,
        availableCopies: 5,
        location: { shelf: 'CS-2', row: 'B', section: 'Algorithms' },
        tags: ['data structures', 'algorithms', 'computer science', 'advanced'],
        status: 'available',
        addedBy: adminUser._id
      },
      {
        title: 'Machine Learning Fundamentals',
        author: 'Dr. Sarah Johnson',
        isbn: '9781122334455',
        category: 'Computer Science',
        subcategory: 'Machine Learning',
        publisher: 'AI Publications',
        publicationYear: 2024,
        edition: '1st Edition',
        pages: 580,
        language: 'English',
        description: 'Comprehensive guide to machine learning fundamentals and practical applications',
        totalCopies: 6,
        availableCopies: 6,
        location: { shelf: 'CS-3', row: 'C', section: 'AI/ML' },
        tags: ['machine learning', 'artificial intelligence', 'computer science'],
        status: 'available',
        addedBy: adminUser._id
      },
      // Electrical Engineering Books
      {
        title: 'Digital Electronics and Circuit Design',
        author: 'Prof. Mike Wilson',
        isbn: '9782233445566',
        category: 'Engineering',
        subcategory: 'Electronics',
        publisher: 'Engineering Books Ltd.',
        publicationYear: 2021,
        edition: '4th Edition',
        pages: 680,
        language: 'English',
        description: 'Comprehensive guide to digital electronics and circuit design principles',
        totalCopies: 7,
        availableCopies: 7,
        location: { shelf: 'EE-1', row: 'D', section: 'Electronics' },
        tags: ['electronics', 'digital circuits', 'engineering', 'circuit design'],
        status: 'available',
        addedBy: adminUser._id
      },
      {
        title: 'Power Systems Engineering',
        author: 'Dr. Robert Chen',
        isbn: '9783344556677',
        category: 'Engineering',
        subcategory: 'Power Systems',
        publisher: 'Power Engineering Press',
        publicationYear: 2023,
        edition: '2nd Edition',
        pages: 750,
        language: 'English',
        description: 'Advanced concepts in power systems engineering and electrical distribution',
        totalCopies: 4,
        availableCopies: 4,
        location: { shelf: 'EE-2', row: 'E', section: 'Power Systems' },
        tags: ['power systems', 'electrical engineering', 'distribution'],
        status: 'available',
        addedBy: adminUser._id
      },
      // Mechanical Engineering Books
      {
        title: 'Thermodynamics and Heat Transfer',
        author: 'Prof. David Brown',
        isbn: '9784455667788',
        category: 'Engineering',
        subcategory: 'Thermodynamics',
        publisher: 'Mechanical Engineering Press',
        publicationYear: 2022,
        edition: '3rd Edition',
        pages: 620,
        language: 'English',
        description: 'Comprehensive study of thermodynamics and heat transfer principles',
        totalCopies: 6,
        availableCopies: 6,
        location: { shelf: 'ME-1', row: 'F', section: 'Thermodynamics' },
        tags: ['thermodynamics', 'heat transfer', 'mechanical engineering'],
        status: 'available',
        addedBy: adminUser._id
      },
      // Mathematics Books
      {
        title: 'Advanced Calculus: Theory and Applications',
        author: 'Dr. Emily Davis',
        isbn: '9785566778899',
        category: 'Mathematics',
        subcategory: 'Calculus',
        publisher: 'Math Publications',
        publicationYear: 2023,
        edition: '2nd Edition',
        pages: 580,
        language: 'English',
        description: 'Advanced calculus concepts with real-world applications in engineering',
        totalCopies: 5,
        availableCopies: 5,
        location: { shelf: 'MATH-1', row: 'G', section: 'Calculus' },
        tags: ['mathematics', 'calculus', 'advanced', 'engineering math'],
        status: 'available',
        addedBy: adminUser._id
      },
      // Physics Books
      {
        title: 'Engineering Physics: Principles and Applications',
        author: 'Prof. Lisa Anderson',
        isbn: '9786677889900',
        category: 'Physics',
        subcategory: 'Engineering Physics',
        publisher: 'Physics Press',
        publicationYear: 2022,
        edition: '3rd Edition',
        pages: 640,
        language: 'English',
        description: 'Physics principles applied to engineering problems and real-world scenarios',
        totalCopies: 6,
        availableCopies: 6,
        location: { shelf: 'PHY-1', row: 'H', section: 'Engineering Physics' },
        tags: ['physics', 'engineering', 'principles', 'applications'],
        status: 'available',
        addedBy: adminUser._id
      }
    ];

    for (const bookData of comprehensiveBooks) {
      const book = new Book(bookData);
      await book.save();
    }
    console.log('📚 Comprehensive book database created successfully');

  } catch (error) {
    console.error('❌ Error seeding books:', error);
  }
};

const seedSampleEntries = async () => {
  try {
    // Check if entries already exist
    const existingEntries = await Entry.countDocuments();
    if (existingEntries > 0) {
      console.log('📝 Entries already exist, clearing to recreate with proper user references...');
      await Entry.deleteMany({});
      console.log('✅ Existing entries cleared');
    }

    console.log('🌱 Creating sample entry/exit records...');

    // Get some users for sample entries
    const students = await User.find({ role: 'student' }).limit(5);
    const adminUser = await User.findOne({ role: 'admin' });

    if (students.length === 0) {
      console.log('⚠️ No students found, skipping entry creation');
      return;
    }

    if (!adminUser) {
      console.log('⚠️ No admin user found, skipping entry creation');
      return;
    }

    const sampleEntries = [];

    // Create some sample entry records for today
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    for (let i = 0; i < students.length; i++) {
      const student = students[i];
      
      // Yesterday's entry and exit
      const yesterdayEntry = new Entry({
        user: student._id,
        entryType: 'entry',
        timestamp: new Date(yesterday.getTime() + (9 * 60 * 60 * 1000)), // 9 AM
        method: 'manual_entry',
        registrationNumber: student.studentId,
        location: 'main_gate',
        purpose: 'study',
        status: 'completed'
      });

      const yesterdayExit = new Entry({
        user: student._id,
        entryType: 'exit',
        timestamp: new Date(yesterday.getTime() + (17 * 60 * 60 * 1000)), // 5 PM
        method: 'manual_entry',
        registrationNumber: student.studentId,
        location: 'main_gate',
        purpose: 'study',
        status: 'completed'
      });

      // Today's entry (some students are currently in library)
      const todayEntry = new Entry({
        user: student._id,
        entryType: 'entry',
        timestamp: new Date(today.getTime() + (8 * 60 * 60 * 1000) + (i * 30 * 60 * 1000)), // 8 AM + staggered
        method: 'manual_entry',
        registrationNumber: student.studentId,
        location: 'main_gate',
        purpose: 'study',
        status: 'active'
      });

      sampleEntries.push(yesterdayEntry, yesterdayExit, todayEntry);
    }

    // Save all entries
    for (const entry of sampleEntries) {
      await entry.save();
    }

    console.log('📝 Sample entry/exit records created successfully');

  } catch (error) {
    console.error('❌ Error seeding entries:', error);
  }
};

const runSeeder = async () => {
  try {
    await connectDB();
    
    console.log('🌱 Starting comprehensive database seeding...');
    console.log('==============================================');
    
    await seedUsers();
    await seedBooks();
    await seedSampleEntries();
    
    console.log('==============================================');
    console.log('✅ Comprehensive database seeding completed successfully!');
    console.log('\n📋 Default Login Credentials:');
    console.log('👑 Admin: username: admin, password: admin123');
    console.log('👑 Super Admin: username: superadmin, password: admin123');
    console.log('📚 Librarians: username: librarian1/2/3, password: librarian123');
    console.log('🎓 Faculty: username: faculty1/2/3, password: faculty123');
    console.log('🎓 Students: username: cs001/ee001/me001/etc, password: student123');
    console.log('\n📊 Database Statistics:');
    
    const userCount = await User.countDocuments();
    const bookCount = await Book.countDocuments();
    const entryCount = await Entry.countDocuments();
    
    console.log(`👥 Total Users: ${userCount}`);
    console.log(`📚 Total Books: ${bookCount}`);
    console.log(`📝 Total Entries: ${entryCount}`);
    
    console.log('\n🚀 Your Library Automation System is ready!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
};

// Run seeder if this file is executed directly
const isMainModule = process.argv[1] && process.argv[1].endsWith('seeder.js');
if (isMainModule) {
  console.log('🚀 Starting seeder script...');
  runSeeder().catch(error => {
    console.error('❌ Fatal error in seeder:', error);
    process.exit(1);
  });
}

export default runSeeder;
