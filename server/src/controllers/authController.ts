import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { db } from '../db/schema';
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

    // Check if this is the very first user created; if so, assign admin, else user
    const totalUsers = (db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number }).count;
    const role = totalUsers === 0 ? 'admin' : 'user';

    db.prepare(`
      INSERT INTO users (id, email, name, password_hash, role)
      VALUES (?, ?, ?, ?, ?)
    `).run(userId, cleanEmail, name.trim(), passwordHash, role);

    const newUser: User = {
      id: userId,
      email: cleanEmail,
      name: name.trim(),
      password_hash: '',
      role: role as 'admin' | 'user',
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
    const { email, password } = req.body;

    if (!email || !email.trim()) {
      return res.status(400).json({ error: 'Email address is required.' });
    }

    if (!password) {
      return res.status(400).json({ error: 'Password is required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = db.prepare('SELECT * FROM users WHERE LOWER(email) = ?').get(cleanEmail) as User | undefined;

    if (!user) {
      return res.status(401).json({
        error: `No registered account found with email "${cleanEmail}". Please click "Register" to create your account first.`
      });
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
