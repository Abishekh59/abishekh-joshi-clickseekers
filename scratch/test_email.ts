import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '.env') });

const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;

async function testEmail() {
  console.log('Testing email with:');
  console.log('User:', SMTP_USER);
  console.log('Pass length:', SMTP_PASS?.length);

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });

  try {
    const info = await transporter.sendMail({
      from: SMTP_USER,
      to: SMTP_USER, // Send to self
      subject: 'Test Email from ClickSeekers Diagnostic',
      text: 'If you see this, the email service is working.',
    });
    console.log('Email sent successfully:', info.messageId);
  } catch (error) {
    console.error('Email sending failed:');
    console.error(error);
  }
}

testEmail();
