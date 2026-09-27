import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { db } from '../db/schema';
import nodemailer from 'nodemailer';
import { syncUserToSupabase } from '../db/supabaseSync';
import { generateToken, AuthRequest } from '../middleware/auth';

import { User } from '../types';

export function register(req: Request, res: Response) {
  try {
    const { name, email, password, confirmPassword } = req.body;

    // Validation
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Full name is required.' });
    }

    if (!email || !email.trim()) {
      return res.status(400).json({ error: 'Email address is required.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }

    if (!password) {
      return res.status(400).json({ error: 'Password is required.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    if (confirmPassword !== undefined && password !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match.' });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Check if user already exists
    const existingUser = db.prepare('SELECT id FROM users WHERE LOWER(email) = ?').get(cleanEmail);
    if (existingUser) {
      return res.status(409).json({ error: 'An account with this email address already exists. Please sign in.' });
    }

    // Hash password
    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(password, salt);
    const userId = crypto.randomUUID();

    // Determine role based on email or request body
    let role = (req.body.role || '').toLowerCase();
    if (!['admin', 'police', 'user'].includes(role)) {
      if (cleanEmail === 'rramiya697@gmail.com') role = 'police';
      else if (cleanEmail === 'suryas30582@gmail.com') role = 'admin';
      else {
        const totalUsers = (db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number }).count;
        role = totalUsers === 0 ? 'admin' : 'user';
      }
    }

    db.prepare(`
      INSERT INTO users (id, email, name, password_hash, role)
      VALUES (?, ?, ?, ?, ?)
    `).run(userId, cleanEmail, name.trim(), passwordHash, role);

    // Sync to Supabase users table
    syncUserToSupabase({
      id: userId,
      email: cleanEmail,
      name: name.trim(),
      password_hash: passwordHash,
      role
    });

    const newUser: User = {
      id: userId,
      email: cleanEmail,
      name: name.trim(),
      password_hash: '',
      role: role as 'admin' | 'police' | 'user',
      created_at: new Date().toISOString()
    };

    const token = generateToken(newUser);

    return res.status(201).json({
      message: 'Registration successful!',
      token,
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role
      }
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    return res.status(500).json({ error: 'Internal server error during registration.' });
  }
}

export function login(req: Request, res: Response) {
  try {
    const { email, password, expectedRole } = req.body;

    if (!email || !email.trim()) {
      return res.status(400).json({ error: 'Email address is required.' });
    }

    if (!password) {
      return res.status(400).json({ error: 'Password is required.' });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Enforce Email-to-Role authorization for Admin and Police
    if (expectedRole === 'admin' && cleanEmail !== 'suryas30582@gmail.com') {
      return res.status(403).json({ error: `Access denied. "${cleanEmail}" is not authorized for Administrator access.` });
    }

    if (expectedRole === 'police' && cleanEmail !== 'rramiya697@gmail.com') {
      return res.status(403).json({ error: `Access denied. "${cleanEmail}" is not authorized for Police access.` });
    }

    let user = (db.prepare('SELECT * FROM users WHERE LOWER(email) = ?').get(cleanEmail) as unknown) as User | undefined;

    // Auto-provision demo accounts if logging in with official demo credentials for first time
    if (!user) {
      if (cleanEmail === 'rramiya697@gmail.com') {
        const salt = bcrypt.genSaltSync(10);
        const passwordHash = bcrypt.hashSync('PoliceSecret2026!', salt);
        const userId = crypto.randomUUID();
        db.prepare(`
          INSERT INTO users (id, email, name, password_hash, role)
          VALUES (?, ?, ?, ?, ?)
        `).run(userId, cleanEmail, 'Inspector Ramiya (Peelamedu PS)', passwordHash, 'police');
        user = (db.prepare('SELECT * FROM users WHERE LOWER(email) = ?').get(cleanEmail) as unknown) as User;
      } else if (cleanEmail === 'suryas30582@gmail.com') {
        const salt = bcrypt.genSaltSync(10);
        const passwordHash = bcrypt.hashSync('AdminSecret2026!', salt);
        const userId = crypto.randomUUID();
        db.prepare(`
          INSERT INTO users (id, email, name, password_hash, role)
          VALUES (?, ?, ?, ?, ?)
        `).run(userId, cleanEmail, 'Suriya (Admin)', passwordHash, 'admin');
        user = (db.prepare('SELECT * FROM users WHERE LOWER(email) = ?').get(cleanEmail) as unknown) as User;
      } else if (cleanEmail === 'citizen.sharma@example.com') {
        const salt = bcrypt.genSaltSync(10);
        const passwordHash = bcrypt.hashSync('password123', salt);
        const userId = crypto.randomUUID();
        db.prepare(`
          INSERT INTO users (id, email, name, password_hash, role)
          VALUES (?, ?, ?, ?, ?)
        `).run(userId, cleanEmail, 'Citizen Sharma', passwordHash, 'user');
        user = (db.prepare('SELECT * FROM users WHERE LOWER(email) = ?').get(cleanEmail) as unknown) as User;
      } else {
        return res.status(401).json({
          error: `No registered account found with email "${cleanEmail}". Please click "Register" to create your account first.`
        });
      }
    }

    // Ensure authorized emails maintain correct role mapping
    if (cleanEmail === 'suryas30582@gmail.com' && user.role !== 'admin') {
      db.prepare('UPDATE users SET role = ? WHERE id = ?').run('admin', user.id);
      user.role = 'admin';
    } else if (cleanEmail === 'rramiya697@gmail.com' && user.role !== 'police') {
      db.prepare('UPDATE users SET role = ? WHERE id = ?').run('police', user.id);
      user.role = 'police';
    }

    const isMatch = bcrypt.compareSync(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({
        error: 'Incorrect password for this email. Please check your password or click "Forgot Password" to reset it.'
      });
    }

    const token = generateToken(user);

    return res.json({
      message: 'Login successful!',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
  } catch (error: any) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Internal server error during login.' });
  }
}

export function forgotPassword(req: Request, res: Response) {
  try {
    const { email, newPassword, confirmPassword } = req.body;

    if (!email || !email.trim()) {
      return res.status(400).json({ error: 'Email address is required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = db.prepare('SELECT * FROM users WHERE LOWER(email) = ?').get(cleanEmail) as User | undefined;

    if (!user) {
      return res.status(404).json({ error: 'No account registered with this email address.' });
    }

    if (newPassword) {
      if (newPassword.length < 6) {
        return res.status(400).json({ error: 'New password must be at least 6 characters long.' });
      }
      if (newPassword !== confirmPassword) {
        return res.status(400).json({ error: 'New passwords do not match.' });
      }
      const salt = bcrypt.genSaltSync(10);
      const passwordHash = bcrypt.hashSync(newPassword, salt);
      db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(passwordHash, user.id);

      return res.json({ message: 'Password has been successfully updated. You can now login with your new password.' });
    }

    // If only verifying email exists
    return res.json({ message: 'Email verified. Please provide new password to reset.' });
  } catch (error: any) {
    console.error('Forgot password error:', error);
    return res.status(500).json({ error: 'Internal server error while processing password reset.' });
  }
}

export function me(req: AuthRequest, res: Response) {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  const user = db.prepare('SELECT id, email, name, role, created_at FROM users WHERE id = ?').get(req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  return res.json({ user });
}

/**
 * Public Citizen Access Login - Accepts any valid email format and grants a guest citizen session.
 * Does NOT require password or Clerk account. Enforces role = 'user'.
 */
export function citizenLogin(req: Request, res: Response) {
  try {
    const { email } = req.body;

    if (!email || !email.trim()) {
      return res.status(400).json({ error: 'Email address is required for public citizen access.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Fetch existing user or create a guest citizen user
    let user = (db.prepare('SELECT * FROM users WHERE LOWER(email) = ?').get(cleanEmail) as unknown) as User | undefined;

    if (!user) {
      const userId = crypto.randomUUID();
      const userName = cleanEmail.split('@')[0];
      db.prepare(`
        INSERT INTO users (id, email, name, password_hash, role)
        VALUES (?, ?, ?, ?, ?)
      `).run(userId, cleanEmail, userName, '', 'user');

      user = (db.prepare('SELECT * FROM users WHERE LOWER(email) = ?').get(cleanEmail) as unknown) as User;
    }

    // Force public citizen session to strictly role = 'user' (never trust frontend role values)
    const citizenUser = {
      id: user.id,
      email: cleanEmail,
      name: user.name || cleanEmail.split('@')[0],
      role: 'user' as const
    };

    const token = generateToken(citizenUser);

    return res.json({
      message: 'Citizen public access granted!',
      token,
      user: {
        id: citizenUser.id,
        email: citizenUser.email,
        name: citizenUser.name,
        role: 'user'
      }
    });
  } catch (error: any) {
    console.error('Citizen login error:', error);
    return res.status(500).json({ error: 'Internal server error during citizen login.' });
  }
}

/**
 * Send OTP Verification Code to User's Email
 */
export async function sendOTP(req: Request, res: Response) {
  try {
    const { email, expectedRole } = req.body;

    if (!email || !email.trim()) {
      return res.status(400).json({ error: 'Please enter your email address.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Server-side Authorization Check for Admin / Police
    if (expectedRole === 'admin' && cleanEmail !== 'suryas30582@gmail.com') {
      return res.status(403).json({ error: 'Access denied.' });
    }

    if (expectedRole === 'police' && cleanEmail !== 'rramiya697@gmail.com') {
      return res.status(403).json({ error: 'Access denied.' });
    }

    // Check rate limiting (minimum 30s wait between resends)
    const existingOtp = db.prepare('SELECT * FROM otp_codes WHERE email = ? ORDER BY created_at DESC LIMIT 1').get(cleanEmail) as any;
    if (existingOtp) {
      const now = new Date().getTime();
      const resendAfter = new Date(existingOtp.resend_after).getTime();
      if (now < resendAfter) {
        return res.status(429).json({ error: 'Please wait before requesting another verification code.' });
      }
    }

    // Generate 6-digit numeric OTP securely
    const rawCode = String(crypto.randomInt(100000, 999999));
    const codeHash = bcrypt.hashSync(rawCode, 10);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes expiry
    const resendAfter = new Date(Date.now() + 30 * 1000).toISOString(); // 30s resend wait

    // Clean old OTP entries for this email
    db.prepare('DELETE FROM otp_codes WHERE email = ?').run(cleanEmail);

    // Save hashed OTP securely in database
    db.prepare(`
      INSERT INTO otp_codes (id, email, code_hash, expires_at, attempts, resend_after)
      VALUES (?, ?, ?, ?, 0, ?)
    `).run(crypto.randomUUID(), cleanEmail, codeHash, expiresAt, resendAfter);

    // Dispatch OTP via Nodemailer email service
    try {
      let transporter;
      if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
        transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: Number(process.env.SMTP_PORT) || 587,
          secure: process.env.SMTP_SECURE === 'true',
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
          }
        });
      } else {
        transporter = nodemailer.createTransport({
          jsonTransport: true
        });
      }

      await transporter.sendMail({
        from: '"Crime Analytics Portal" <no-reply@crimeanalytics.gov.in>',
        to: cleanEmail,
        subject: 'Verification Code - Crime Data Analytics Portal',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #eedfd9; border-radius: 12px;">
            <h2 style="color: #883a2e;">Crime Data Analytics Portal</h2>
            <p>Your 6-digit verification code is:</p>
            <div style="font-size: 32px; font-weight: bold; color: #2b1f1d; letter-spacing: 4px; padding: 12px; background: #fff7f4; text-align: center; border-radius: 8px;">
              ${rawCode}
            </div>
            <p style="color: #7a6360; font-size: 12px; margin-top: 20px;">This code will expire in 10 minutes. Do not share this code with anyone.</p>
          </div>
        `
      });
    } catch (mailErr) {
      console.warn('Nodemailer dispatch notice:', mailErr);
    }

    return res.json({ message: 'Verification code sent to your email.' });
  } catch (error: any) {
    console.error('Send OTP error:', error);
    return res.status(500).json({ error: 'Failed to send verification code. Please try again.' });
  }
}

/**
 * Verify OTP Code and Complete Authentication
 */
export async function verifyOTP(req: Request, res: Response) {
  try {
    const { email, code, expectedRole } = req.body;

    if (!email || !email.trim()) {
      return res.status(400).json({ error: 'Email address is required.' });
    }

    if (!code || !String(code).trim()) {
      return res.status(400).json({ error: 'Verification code is required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanCode = String(code).trim();

    // Server-side Authorization Check for Admin / Police
    if (expectedRole === 'admin' && cleanEmail !== 'suryas30582@gmail.com') {
      return res.status(403).json({ error: 'Access denied.' });
    }

    if (expectedRole === 'police' && cleanEmail !== 'rramiya697@gmail.com') {
      return res.status(403).json({ error: 'Access denied.' });
    }

    // Lookup active OTP record
    const otpRecord = db.prepare('SELECT * FROM otp_codes WHERE email = ? ORDER BY created_at DESC LIMIT 1').get(cleanEmail) as any;

    if (!otpRecord) {
      return res.status(400).json({ error: 'Verification code has expired or is invalid. Please request a new code.' });
    }

    const now = new Date().getTime();
    const expiresAt = new Date(otpRecord.expires_at).getTime();

    if (now > expiresAt) {
      db.prepare('DELETE FROM otp_codes WHERE id = ?').run(otpRecord.id);
      return res.status(400).json({ error: 'Verification code has expired. Please request a new code.' });
    }

    if (otpRecord.attempts >= 5) {
      db.prepare('DELETE FROM otp_codes WHERE id = ?').run(otpRecord.id);
      return res.status(429).json({ error: 'Too many failed verification attempts. Please request a new code.' });
    }

    // Verify OTP hash securely
    const isMatch = bcrypt.compareSync(cleanCode, otpRecord.code_hash);
    if (!isMatch) {
      db.prepare('UPDATE otp_codes SET attempts = attempts + 1 WHERE id = ?').run(otpRecord.id);
      return res.status(400).json({ error: 'Invalid verification code. Please check and try again.' });
    }

    // Invalidate OTP (single-use)
    db.prepare('DELETE FROM otp_codes WHERE id = ?').run(otpRecord.id);

    // Determine Role Server-Side ONLY
    let role: 'admin' | 'police' | 'user' = 'user';
    if (cleanEmail === 'suryas30582@gmail.com') {
      role = 'admin';
    } else if (cleanEmail === 'rramiya697@gmail.com') {
      role = 'police';
    }

    // Provision/Fetch User record in DB
    let user = (db.prepare('SELECT * FROM users WHERE LOWER(email) = ?').get(cleanEmail) as unknown) as User | undefined;

    if (!user) {
      const userId = crypto.randomUUID();
      const userName = cleanEmail === 'suryas30582@gmail.com'
        ? 'Suriya (Admin)'
        : cleanEmail === 'rramiya697@gmail.com'
          ? 'Inspector Ramiya (Peelamedu PS)'
          : cleanEmail.split('@')[0];

      db.prepare(`
        INSERT INTO users (id, email, name, password_hash, role)
        VALUES (?, ?, ?, ?, ?)
      `).run(userId, cleanEmail, userName, '', role);

      user = (db.prepare('SELECT * FROM users WHERE LOWER(email) = ?').get(cleanEmail) as unknown) as User;
    } else if (user.role !== role) {
      db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, user.id);
      user.role = role;
    }

    const token = generateToken(user);

    return res.json({
      message: 'Login successful!',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
  } catch (error: any) {
    console.error('Verify OTP error:', error);
    return res.status(500).json({ error: 'Internal server error during OTP verification.' });
  }
}
