import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '.env') });
import prisma from './src/model/index';

async function createTestUser() {
  const email = 'test@example.com';
  const password = 'password123';
  const saltRounds = 10;
  const password_hash = await bcrypt.hash(password, saltRounds);

  await prisma.user.upsert({
    where: { email },
    update: {
      password_hash,
      role: 'PHOTOGRAPHER' as any,
      email_verified: true,
      status: 'ACTIVE' as any,
    },
    create: {
      full_name: 'Test Photographer',
      email,
      password_hash,
      role: 'PHOTOGRAPHER' as any,
      email_verified: true,
      status: 'ACTIVE' as any,
    },
  });
  console.log(`Test user ${email} created/updated`);
}

createTestUser()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
