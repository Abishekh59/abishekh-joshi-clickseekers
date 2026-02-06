# Password Reset Flow - OTP Based

## Overview
The password reset flow allows users to reset their password using an OTP sent to their email address.

## API Endpoints

### 1. Forgot Password
**Endpoint:** `POST /api/users/forgot-password`

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "OTP sent to your email. Please verify to reset your password.",
  "data": {
    "email": "user@example.com",
    "full_name": "John Doe"
  }
}
```

**Response (User Not Found):**
```json
{
  "success": false,
  "message": "User with this email does not exist"
}
```

---

### 2. Verify Password Reset OTP
**Endpoint:** `POST /api/users/verify-password-reset-otp`

**Request Body:**
```json
{
  "email": "user@example.com",
  "otp_code": "123456"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "OTP verified successfully. You can now reset your password.",
  "data": {
    "email": "user@example.com"
  }
}
```

**Response (Invalid OTP):**
```json
{
  "success": false,
  "message": "Invalid OTP code"
}
```

**Response (OTP Expired):**
```json
{
  "success": false,
  "message": "OTP has expired. Please request a new password reset."
}
```

---

### 3. Reset Password
**Endpoint:** `POST /api/users/reset-password`

**Request Body:**
```json
{
  "email": "user@example.com",
  "otp_code": "123456",
  "new_password": "newSecurePassword123"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Password reset successfully. You can now login with your new password.",
  "data": {
    "email": "user@example.com",
    "full_name": "John Doe"
  }
}
```

**Response (Invalid Password Length):**
```json
{
  "success": false,
  "message": "Password must be at least 6 characters long"
}
```

---

## Flow Diagram

```
User Initiates Password Reset
        ↓
  [Forgot Password Endpoint]
    - Validates user exists
    - Generates OTP
    - Sends OTP to email
    - Creates PasswordReset record
        ↓
  User receives OTP in email
        ↓
  [Verify Password Reset OTP Endpoint]
    - Validates OTP matches
    - Checks OTP hasn't expired
    - Returns success if valid
        ↓
  User enters new password
        ↓
  [Reset Password Endpoint]
    - Validates OTP again
    - Hashes new password
    - Updates user password
    - Deletes PasswordReset record
        ↓
  Success - User can login with new password
```

## Key Features

- **OTP Expiry:** OTP is valid for 10 minutes (configurable via `OTP_EXPIRY_MINUTES`)
- **6-digit OTP:** Secure random 6-digit code
- **Email Verification:** OTP sent via email using configured SMTP
- **Password Validation:** New password must be at least 6 characters
- **Secure Storage:** Password hashed using bcrypt before storage
- **Cleanup:** PasswordReset record deleted after successful reset

## Database Schema

### PasswordReset Model
```prisma
model PasswordReset {
  id             Int       @id @default(autoincrement())
  email          String    @unique
  otp_code       String
  otp_expires_at DateTime
  created_at     DateTime  @default(now())
}
```

## Environment Variables Required

Ensure these are set in your `.env` file:
- `SMTP_USER` - Email sender address
- `SMTP_PASS` - SMTP password
- `SMTP_HOST` - SMTP server (default: smtp.gmail.com)
- `SMTP_PORT` - SMTP port (default: 587)
- `JWT_SECRET` - For JWT token generation

## Error Handling

All endpoints include proper error handling for:
- Missing required fields
- User not found
- Invalid/expired OTP
- Password validation failures
- Email sending failures
