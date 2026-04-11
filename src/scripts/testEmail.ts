
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '465');
const SMTP_SECURE = process.env.SMTP_SECURE === 'true' || SMTP_PORT === 465;

console.log('--- Email Configuration Diagnostic ---');
console.log('User:', SMTP_USER);
console.log('Host:', SMTP_HOST);
console.log('Port:', SMTP_PORT);
console.log('Secure:', SMTP_SECURE);
console.log('-----------------------------------------');

if (!SMTP_USER || !SMTP_PASS) {
  console.error('❌ Error: SMTP_USER or SMTP_PASS is missing in .env');
  process.exit(1);
}

const transporter = nodemailer.createTransport(
  (SMTP_HOST === 'smtp.gmail.com') ? {
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  } : {
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
    tls: {
      rejectUnauthorized: false,
    },
  }
);

async function testConnection() {
  try {
    console.log('⌛ Verifying connection to email server...');
    await transporter.verify();
    console.log('✅ Success: Email server is reachable and credentials are valid.');

    // Attempt to send a test email to the user themselves
    console.log(`⌛ Sending test email to ${SMTP_USER}...`);
    await transporter.sendMail({
      from: SMTP_USER,
      to: SMTP_USER,
      subject: 'ClickSeekers - SMTP Test Email',
      text: 'This is a test email to verify your SMTP configuration. If you see this, the registration failure is likely fixed!',
      html: '<h1>ClickSeekers SMTP Test</h1><p>This is a test email to verify your SMTP configuration.</p>'
    });
    console.log('✅ Success: Test email sent successfully.');
  } catch (error) {
    console.error('❌ Diagnostic Failed:');
    if (error instanceof Error) {
      console.error('   Message:', error.message);
      if ((error as any).code) console.error('   Code:', (error as any).code);
      if ((error as any).command) console.error('   Command:', (error as any).command);
    } else {
      console.error('   Unknown error:', error);
    }
    
    console.log('\n--- Troubleshooting Tips ---');
    console.log('1. If the error is "EAUTH", your App Password might be incorrect or revoked.');
    console.log('2. If the error is "ETIMEDOUT", Gmail might be blocking the connection or your firewall is blocking port 587/465.');
    console.log('3. Ensure "2-Step Verification" is enabled on your Google Account.');
  }
}

testConnection();
