import "dotenv/config";
import bcrypt from 'bcrypt';
import prisma from '../model/index';

const createAdmin = async () => {
  try {
    // Check if admin already exists
    const existingAdmin = await prisma.user.findFirst({
      where: { role: 'ADMIN' },
    });

    if (existingAdmin) {
      console.log('Admin user already exists');
      return;
    }

    // Default admin credentials (should be changed after first login)
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@clickseekers.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123';
    const adminName = process.env.ADMIN_NAME || 'Admin User';

    // Hash password
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(adminPassword, saltRounds);

    // Create admin user
    const admin = await prisma.user.create({
      data: {
        full_name: adminName,
        email: adminEmail,
        password_hash,
        role: 'ADMIN',
        email_verified: true, 
        kyc_verified: true, 
      },
    });

    console.log('Admin user created successfully!');
    console.log('Email:', adminEmail);
    console.log('Password:', adminPassword);
    console.log('Please change the password after first login.');
    console.log('User ID:', admin.user_id);
  } catch (error) {
    console.error('Error creating admin user:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
};

createAdmin();

