import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { db } from '../db/schema';
import { UserModel, isMongoConnected } from '../db/mongodb';
import { generateToken, AuthRequest, UserRole } from '../middleware/auth';
import { User } from '../types';

export async function register(req: Request, res: Response) {
  try {
    const { name, email, password, confirmPassword, role = 'user', badge_number, station, department, phone } = req.body;

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

    const validRoles: UserRole[] = ['user', 'police', 'admin'];
    const assignedRole: UserRole = validRoles.includes(role as UserRole) ? (role as UserRole) : 'user';

    // If registering as police, ensure badge or station is noted
    const cleanBadge = assignedRole === 'police' ? (badge_number?.trim() || `POL-${Math.floor(1000 + Math.random() * 9000)}`) : null;
    const cleanStation = assignedRole === 'police' ? (station?.trim() || 'Central Station') : null;

    const cleanEmail = email.trim().toLowerCase();

    // Check if user already exists in SQLite
    const existingUserSqlite = db.prepare('SELECT id FROM users WHERE LOWER(email) = ?').get(cleanEmail);
    if (existingUserSqlite) {
      return res.status(409).json({ error: 'An account with this email address already exists. Please sign in.' });
    }

    // Check in MongoDB if connected
    if (isMongoConnected()) {
      try {
        const existingMongo = await UserModel.findOne({ email: cleanEmail });
        if (existingMongo) {
          return res.status(409).json({ error: 'An account with this email address already exists. Please sign in.' });
        }
      } catch (e) {
        console.warn('[Auth] Mongo check fallback:', e);
      }
    }

    // Hash password
    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(password, salt);
    const userId = crypto.randomUUID();

    // Insert into SQLite
    try {
      db.prepare(`
        INSERT INTO users (id, email, name, password_hash, role, badge_number, station, department, phone, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
      `).run(userId, cleanEmail, name.trim(), passwordHash, assignedRole, cleanBadge, cleanStation, department || null, phone || null);
    } catch (err: any) {
      // If column mismatch on older sqlite, fallback to core fields
      db.prepare(`
        INSERT INTO users (id, email, name, password_hash, role)
        VALUES (?, ?, ?, ?, ?)
      `).run(userId, cleanEmail, name.trim(), passwordHash, assignedRole);
    }

    // Insert into MongoDB if connected
    if (isMongoConnected()) {
      try {
        await UserModel.create({
          id: userId,
          email: cleanEmail,
          name: name.trim(),
          password_hash: passwordHash,
          role: assignedRole,
          badge_number: cleanBadge,
          station: cleanStation,
          department: department || null,
          phone: phone || null,
          status: 'active'
        });
      } catch (mongoErr: any) {
        console.warn('[Auth] Failed to persist user to MongoDB:', mongoErr.message);
      }
    }

    const newUser: User = {
      id: userId,
      email: cleanEmail,
      name: name.trim(),
      password_hash: '',
      role: assignedRole,
      badge_number: cleanBadge,
      station: cleanStation,
      department: department || null,
      phone: phone || null,
      status: 'active',
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
        role: newUser.role,
        badge_number: newUser.badge_number,
        station: newUser.station
      }
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    return res.status(500).json({ error: 'Internal server error during registration.' });
  }
}

export async function login(req: Request, res: Response) {
  try {
    const { email, password, expectedRole } = req.body;

    if (!email || !email.trim()) {
      return res.status(400).json({ error: 'Email address is required.' });
    }

    if (!password) {
      return res.status(400).json({ error: 'Password is required.' });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Attempt lookup in MongoDB first if connected
    let user: any = null;
    if (isMongoConnected()) {
      try {
        const mongoUser = await UserModel.findOne({ email: cleanEmail }).lean();
        if (mongoUser) {
          user = mongoUser;
        }
      } catch (e) {
        console.warn('[Auth] Mongo lookup fallback:', e);
      }
    }

    // Fallback to SQLite lookup
    if (!user) {
      user = db.prepare('SELECT * FROM users WHERE LOWER(email) = ?').get(cleanEmail) as User | undefined;
    }

    if (!user) {
      return res.status(401).json({
        error: 'Invalid email or password. Please verify your registered credentials.'
      });
    }

    const isMatch = bcrypt.compareSync(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({
        error: 'Invalid email or password. Please verify your registered credentials.'
      });
    }

    // Determine assigned multi-roles
    let userRoles: UserRole[] = [];
    if (Array.isArray(user.roles) && user.roles.length > 0) {
      userRoles = user.roles as UserRole[];
    } else if (typeof user.roles === 'string') {
      try {
        userRoles = JSON.parse(user.roles);
      } catch {
        userRoles = [user.role];
      }
    } else {
      userRoles = [user.role];
    }

    // Configure configured multi-roles for specific accounts
    if (cleanEmail === 'suryas30582@gmail.com') {
      if (!userRoles.includes('admin')) userRoles.push('admin');
      if (!userRoles.includes('user')) userRoles.push('user');
    } else if (cleanEmail === 'rramiya697@gmail.com') {
      if (!userRoles.includes('police')) userRoles.push('police');
      if (!userRoles.includes('user')) userRoles.push('user');
    }

    // Admin & police automatically inherit user/citizen access
    if (user.role === 'admin' && !userRoles.includes('admin')) userRoles.push('admin');
    if (user.role === 'police' && !userRoles.includes('police')) userRoles.push('police');
    if ((user.role === 'admin' || user.role === 'police') && !userRoles.includes('user')) {
      userRoles.push('user');
    }

    // Strict Role Check if expectedRole was specified (e.g. logging in from Police or Admin portal tab)
    if (expectedRole && expectedRole !== 'any') {
      const reqRole = expectedRole as UserRole;
      if (!userRoles.includes(reqRole)) {
        const roleNames: Record<string, string> = {
          user: 'Citizen / User',
          police: 'Police Officer',
          admin: 'Administrator'
        };
        const requestedName = roleNames[reqRole] || reqRole;
        return res.status(403).json({
          error: `You are not authorized for the ${requestedName} portal. Please select an authorized login role tab.`
        });
      }
    }

    // Determine active session role
    const activeRole: UserRole = (expectedRole && userRoles.includes(expectedRole as UserRole))
      ? (expectedRole as UserRole)
      : user.role;

    const token = generateToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: activeRole,
      roles: userRoles,
      badge_number: user.badge_number,
      station: user.station
    });

    return res.json({
      message: 'Login successful!',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: activeRole,
        roles: userRoles,
        badge_number: user.badge_number,
        station: user.station
      }
    });
  } catch (error: any) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Internal server error during login.' });
  }
}

export async function googleLogin(req: Request, res: Response) {
  try {
    const { email, name, expectedRole } = req.body;

    if (!email || !email.trim()) {
      return res.status(400).json({ error: 'Google email address is required.' });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Check if user exists in MongoDB / SQLite
    let user: any = null;
    if (isMongoConnected()) {
      try {
        user = await UserModel.findOne({ email: cleanEmail }).lean();
      } catch (e) {
        console.warn('[Auth] Mongo Google lookup fallback:', e);
      }
    }

    if (!user) {
      user = db.prepare('SELECT * FROM users WHERE LOWER(email) = ?').get(cleanEmail) as User | undefined;
    }

    // Auto-assign roles for configured accounts or new Google users
    let assignedRole: UserRole = 'user';
    let assignedRoles: UserRole[] = ['user'];

    if (cleanEmail === 'suryas30582@gmail.com') {
      assignedRole = 'admin';
      assignedRoles = ['admin', 'user'];
    } else if (cleanEmail === 'rramiya697@gmail.com') {
      assignedRole = 'police';
      assignedRoles = ['police', 'user'];
    }

    if (!user) {
      // Create new user in DB for Google account
      const userId = crypto.randomUUID();
      const salt = bcrypt.genSaltSync(10);
      const dummyHash = bcrypt.hashSync(`google_oauth_${Date.now()}_${userId}`, salt);
      const displayName = name?.trim() || cleanEmail.split('@')[0];
      const rolesJson = JSON.stringify(assignedRoles);

      try {
        db.prepare(`
          INSERT INTO users (id, email, name, password_hash, role, roles, status)
          VALUES (?, ?, ?, ?, ?, ?, 'active')
        `).run(userId, cleanEmail, displayName, dummyHash, assignedRole, rolesJson);
      } catch {
        db.prepare(`
          INSERT INTO users (id, email, name, password_hash, role)
          VALUES (?, ?, ?, ?, ?)
        `).run(userId, cleanEmail, displayName, dummyHash, assignedRole);
      }

      if (isMongoConnected()) {
        try {
          await UserModel.create({
            id: userId,
            email: cleanEmail,
            name: displayName,
            password_hash: dummyHash,
            role: assignedRole,
            roles: assignedRoles,
            status: 'active'
          });
        } catch (mErr: any) {
          console.warn('[Auth] Google user Mongo persist warning:', mErr.message);
        }
      }

      user = {
        id: userId,
        email: cleanEmail,
        name: displayName,
        role: assignedRole,
        roles: assignedRoles
      };
    }

    let userRoles: UserRole[] = [];
    if (Array.isArray(user.roles)) {
      userRoles = user.roles as UserRole[];
    } else if (typeof user.roles === 'string') {
      try { userRoles = JSON.parse(user.roles); } catch { userRoles = [user.role]; }
    } else {
      userRoles = [user.role];
    }

    if (cleanEmail === 'suryas30582@gmail.com') {
      if (!userRoles.includes('admin')) userRoles.push('admin');
      if (!userRoles.includes('user')) userRoles.push('user');
    }
    if (cleanEmail === 'rramiya697@gmail.com') {
      if (!userRoles.includes('police')) userRoles.push('police');
      if (!userRoles.includes('user')) userRoles.push('user');
    }

    if (expectedRole && expectedRole !== 'any') {
      const reqRole = expectedRole as UserRole;
      if (!userRoles.includes(reqRole)) {
        return res.status(403).json({
          error: `Google Login: Your account (${cleanEmail}) is not authorized for the ${reqRole} role.`
        });
      }
    }

    const activeRole: UserRole = (expectedRole && userRoles.includes(expectedRole as UserRole))
      ? (expectedRole as UserRole)
      : user.role;

    const token = generateToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: activeRole,
      roles: userRoles,
      badge_number: user.badge_number,
      station: user.station
    });

    return res.json({
      message: 'Google Sign-In successful!',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: activeRole,
        roles: userRoles,
        badge_number: user.badge_number,
        station: user.station
      }
    });
  } catch (error: any) {
    console.error('Google login error:', error);
    return res.status(500).json({ error: 'Internal server error during Google Sign-In.' });
  }
}

export async function forgotPassword(req: Request, res: Response) {
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

      if (isMongoConnected()) {
        try {
          await UserModel.updateOne({ id: user.id }, { password_hash: passwordHash });
        } catch (e) {
          console.warn('[Auth] Mongo password update sync:', e);
        }
      }

      return res.json({ message: 'Password has been successfully updated. You can now login with your new password.' });
    }

    return res.json({ message: 'Email verified. Please provide new password to reset.' });
  } catch (error: any) {
    console.error('Forgot password error:', error);
    return res.status(500).json({ error: 'Internal server error while processing password reset.' });
  }
}

export async function me(req: AuthRequest, res: Response) {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  // Attempt lookup in MongoDB first
  let user: any = null;
  if (isMongoConnected()) {
    try {
      user = await UserModel.findOne({ id: req.user.id }).select('-password_hash').lean();
    } catch (e) {
      // fallback
    }
  }

  if (!user) {
    user = db.prepare('SELECT id, email, name, role, badge_number, station, department, phone, status, created_at FROM users WHERE id = ?').get(req.user.id);
  }

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  return res.json({ user });
}
