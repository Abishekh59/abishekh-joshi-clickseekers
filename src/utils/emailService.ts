import nodemailer from 'nodemailer';

const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587');
const SMTP_SECURE = process.env.SMTP_SECURE === 'true' || SMTP_PORT === 465;

if (!SMTP_USER || !SMTP_PASS) {
  console.warn(
    '⚠️  SMTP credentials not configured. Email sending will fail.\n' +
    'Please create a .env file with:\n' +
    '  SMTP_USER=your-email@gmail.com\n' +
    '  SMTP_PASS=your-app-password\n' +
    'Instructions: Enable 2FA on Google Account and generate an App Password'
  );
}

// Create transporter with connection timeout and pool settings
const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_SECURE,
  auth: SMTP_USER && SMTP_PASS ? {
    user: SMTP_USER,
    pass: SMTP_PASS,
  } : undefined,
  connectionTimeout: 10000, // 10 seconds
  socketTimeout: 10000, // 10 seconds
  pool: {
    maxConnections: 5,
    maxMessages: 100,
    rateDelta: 1000,
    rateLimit: 10,
  },
  logger: true,
  debug: process.env.NODE_ENV === 'development',
});

// Retry logic helper
const sendMailWithRetry = async (transporter: nodemailer.Transporter, mailOptions: nodemailer.SendMailOptions, maxRetries = 3): Promise<void> => {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await transporter.sendMail(mailOptions);
      return; // Success
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.warn(`⚠️  Email send attempt ${attempt}/${maxRetries} failed: ${lastError.message}`);
      
      if (attempt < maxRetries) {
        // Wait before retrying (exponential backoff: 1s, 2s, 4s)
        const delayMs = Math.pow(2, attempt - 1) * 1000;
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }
  
  throw lastError || new Error('Failed to send email after retries');
};

// Send OTP email
export const sendOTPEmail = async (email: string, otpCode: string, fullName: string): Promise<void> => {
  if (!SMTP_USER || !SMTP_PASS) {
    const errorMsg = 'SMTP credentials not configured. Please set SMTP_USER and SMTP_PASS in your .env file.';
    console.error(`❌ ${errorMsg}`);
    throw new Error(errorMsg);
  }

  // Logo URL - can be set in .env or use a default/hosted image
  const LOGO_URL = process.env.LOGO_URL || 'https://via.placeholder.com/200x60/2563eb/ffffff?text=ClickSeekers';

  const mailOptions = {
    from: SMTP_USER,
    to: email,
    subject: 'ClickSeekers - Email Verification OTP',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <!-- Logo Section -->
        <div style="text-align: center; margin-bottom: 30px;">
          <img src="${LOGO_URL}" alt="ClickSeekers Logo" style="max-width: 200px; height: auto; margin-bottom: 10px;" />
        </div>
        
        <!-- Header -->
        <h2 style="color: #2563eb; text-align: center; margin-bottom: 20px;">Email Verification</h2>
        
        <!-- Greeting -->
        <p style="font-size: 16px; color: #333;">Hello ${fullName},</p>
        <p style="font-size: 16px; color: #333;">Thank you for registering with ClickSeekers. Please use the following OTP to verify your email address:</p>
        
        <!-- OTP Display -->
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; margin: 30px 0; border-radius: 10px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <p style="color: #ffffff; margin: 0 0 10px 0; font-size: 14px; font-weight: 500;">Your Verification Code</p>
          <h1 style="color: #ffffff; margin: 0; font-size: 36px; letter-spacing: 8px; font-weight: bold;">${otpCode}</h1>
        </div>
        
        <!-- Instructions -->
        <p style="font-size: 14px; color: #666; margin-top: 20px;">This OTP will expire in 10 minutes.</p>
        <p style="font-size: 14px; color: #666;">If you did not request this verification, please ignore this email.</p>
        
        <!-- Footer -->
        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
          <p style="color: #666; font-size: 12px; margin: 0;">
            Best regards,<br>
            <strong style="color: #2563eb;">The ClickSeekers Team</strong>
          </p>
        </div>
      </div>
    `,
  };

  try {
    await sendMailWithRetry(transporter, mailOptions);
    console.log(`✅ OTP email sent successfully to ${email}`);
  } catch (error) {
    console.error('❌ Error sending OTP email:', error);
    throw new Error(`Failed to send OTP email: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// Send Password Reset OTP email
export const sendPasswordResetOTPEmail = async (email: string, otpCode: string, fullName: string): Promise<void> => {
  if (!SMTP_USER || !SMTP_PASS) {
    const errorMsg = 'SMTP credentials not configured. Please set SMTP_USER and SMTP_PASS in your .env file.';
    console.error(`❌ ${errorMsg}`);
    throw new Error(errorMsg);
  }

  // Logo URL - can be set in .env or use a default/hosted image
  const LOGO_URL = process.env.LOGO_URL || 'https://via.placeholder.com/200x60/2563eb/ffffff?text=ClickSeekers';

  const mailOptions = {
    from: SMTP_USER,
    to: email,
    subject: 'ClickSeekers - Password Reset OTP',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <!-- Logo Section -->
        <div style="text-align: center; margin-bottom: 30px;">
          <img src="${LOGO_URL}" alt="ClickSeekers Logo" style="max-width: 200px; height: auto; margin-bottom: 10px;" />
        </div>
        
        <!-- Header -->
        <h2 style="color: #dc2626; text-align: center; margin-bottom: 20px;">Password Reset Request</h2>
        
        <!-- Greeting -->
        <p style="font-size: 16px; color: #333;">Hello ${fullName},</p>
        <p style="font-size: 16px; color: #333;">We received a request to reset your password. Please use the following OTP to proceed with password reset:</p>
        
        <!-- OTP Display -->
        <div style="background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); padding: 30px; text-align: center; margin: 30px 0; border-radius: 10px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <p style="color: #ffffff; margin: 0 0 10px 0; font-size: 14px; font-weight: 500;">Your Password Reset Code</p>
          <h1 style="color: #ffffff; margin: 0; font-size: 36px; letter-spacing: 8px; font-weight: bold;">${otpCode}</h1>
        </div>
        
        <!-- Instructions -->
        <p style="font-size: 14px; color: #666; margin-top: 20px;">This OTP will expire in 10 minutes.</p>
        <p style="font-size: 14px; color: #dc2626; font-weight: 500;">⚠️ If you did not request a password reset, please ignore this email and ensure your account is secure.</p>
        
        <!-- Security Notice -->
        <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin-top: 30px; border-radius: 4px;">
          <p style="color: #991b1b; font-size: 14px; margin: 0; font-weight: 500;">Security Notice</p>
          <p style="color: #666; font-size: 13px; margin: 5px 0 0 0;">Never share this OTP with anyone. ClickSeekers staff will never ask for your OTP.</p>
        </div>
        
        <!-- Footer -->
        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
          <p style="color: #666; font-size: 12px; margin: 0;">
            Best regards,<br>
            <strong style="color: #2563eb;">The ClickSeekers Team</strong>
          </p>
        </div>
      </div>
    `,
  };

  try {
    await sendMailWithRetry(transporter, mailOptions);
    console.log(`✅ Password Reset OTP email sent successfully to ${email}`);
  } catch (error) {
    console.error('❌ Error sending Password Reset OTP email:', error);
    throw new Error(`Failed to send Password Reset OTP email: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};