/**
 * Seed Script — Creates initial admin user
 * Run: node seed.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const mongoose = require('mongoose');
const User = require('./models/User');

const seedData = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing data (optional — comment out to preserve)
    await User.deleteMany({});
    console.log('🗑️  Cleared existing users');

    // Create Admin
    const admin = await User.create({
      name: 'Sonu Raj',
      email: 'sonurajsonuraj4515@gmail.com',
      password: 'Sonu@123',
      role: 'admin',
      department: 'Management',
      position: 'Administrator',
      employeeId: 'ADM001',
    });
    console.log(`👑 Admin created: ${admin.email} / Sonu@123`);

    console.log('\n✨ Seed completed successfully!\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  Admin Login:');
    console.log('  Email   : sonurajsonuraj4515@gmail.com');
    console.log('  Password: Sonu@123');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seed error:', error.message);
    process.exit(1);
  }
};

seedData();
