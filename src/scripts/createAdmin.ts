import "dotenv/config";
import bcrypt from 'bcrypt';
import prisma from '../model/index';

const createAdmin = async () => {
  try {
    // Default admin credentials
    const adminEmail = process.env.ADMIN_EMAIL || 'clickseekersofficial@gmail.com';
    const adminPassword = process.env.ADMIN_PASSWORD || '123456';
    const adminName = process.env.ADMIN_NAME || 'Admin User';

    // Hash password
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(adminPassword, saltRounds);

    // Upsert admin user
    const admin = await prisma.user.upsert({
      where: { email: adminEmail },
      update: {
        password_hash,
        role: 'ADMIN',
        email_verified: true,
        kyc_verified: true,
      },
      create: {
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

