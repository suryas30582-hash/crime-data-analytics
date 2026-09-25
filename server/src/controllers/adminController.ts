import { Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { AuthRequest } from '../middleware/auth';
import { db } from '../db/schema';
import { UserModel, IncidentReportModel, PoliceActionModel, isMongoConnected } from '../db/mongodb';

/**
 * ADMIN: Get all users and officers
 */
export async function getUsers(req: AuthRequest, res: Response) {
  try {
    const { role } = req.query;

    let users: any[] = [];

    if (isMongoConnected()) {
      try {
        const filter: any = {};
        if (role && role !== 'ALL') {
          filter.role = role;
        }
        users = await UserModel.find(filter).select('-password_hash').sort({ createdAt: -1 }).lean();
      } catch (e: any) {
        console.warn('[Admin] Mongo getUsers fallback:', e.message);
      }
    }

    if (users.length === 0) {
      let query = 'SELECT id, email, name, role, badge_number, station, department, phone, status, created_at FROM users';
      const params: any[] = [];
      if (role && role !== 'ALL') {
        query += ' WHERE role = ?';
        params.push(role);
      }
      query += ' ORDER BY created_at DESC';
      users = db.prepare(query).all(...params) as any[];
    }

    const counts = {
      total: users.length,
      users: users.filter(u => u.role === 'user').length,
      police: users.filter(u => u.role === 'police').length,
      admins: users.filter(u => u.role === 'admin').length
    };

    return res.json({ success: true, counts, users });
  } catch (error: any) {
    console.error('Error fetching users:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

/**
 * ADMIN: Create new User or Police Officer
 */
export async function createUser(req: AuthRequest, res: Response) {
  try {
    const { name, email, password, role = 'user', badge_number, station, department, phone } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const existing = db.prepare('SELECT id FROM users WHERE LOWER(email) = ?').get(cleanEmail);
    if (existing) {
      return res.status(409).json({ error: 'An account with this email address already exists.' });
    }

    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(password, salt);
    const userId = crypto.randomUUID();

    const cleanBadge = role === 'police' ? (badge_number || `POL-${Math.floor(1000 + Math.random() * 9000)}`) : null;
    const cleanStation = role === 'police' ? (station || 'City Headquarters') : null;

    // Save to SQLite
    try {
      db.prepare(`
        INSERT INTO users (id, email, name, password_hash, role, badge_number, station, department, phone, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
      `).run(userId, cleanEmail, name.trim(), passwordHash, role, cleanBadge, cleanStation, department || null, phone || null);
    } catch {
      db.prepare(`
        INSERT INTO users (id, email, name, password_hash, role)
        VALUES (?, ?, ?, ?, ?)
      `).run(userId, cleanEmail, name.trim(), passwordHash, role);
    }

    // Save to MongoDB if connected
    if (isMongoConnected()) {
      try {
        await UserModel.create({
          id: userId,
          email: cleanEmail,
          name: name.trim(),
          password_hash: passwordHash,
          role,
          badge_number: cleanBadge,
          station: cleanStation,
          department: department || null,
          phone: phone || null,
          status: 'active'
        });
      } catch (err: any) {
        console.warn('[Admin] Mongo create user error:', err.message);
      }
    }

    return res.status(201).json({
      success: true,
      message: `${role.toUpperCase()} account successfully created for ${name}.`,
      user: {
        id: userId,
        email: cleanEmail,
        name: name.trim(),
        role,
        badge_number: cleanBadge,
        station: cleanStation
      }
    });
  } catch (error: any) {
    console.error('Error creating user by admin:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

/**
 * ADMIN: Update User Role or Status
 */
export async function updateUserRole(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const { role, status, badge_number, station } = req.body;

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as any;
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const newRole = role || user.role;
    const newStatus = status || user.status || 'active';
    const newBadge = badge_number !== undefined ? badge_number : user.badge_number;
    const newStation = station !== undefined ? station : user.station;

    try {
      db.prepare(`
        UPDATE users
        SET role = ?, status = ?, badge_number = ?, station = ?
        WHERE id = ?
      `).run(newRole, newStatus, newBadge, newStation, id);
    } catch {
      db.prepare('UPDATE users SET role = ? WHERE id = ?').run(newRole, id);
    }

    if (isMongoConnected()) {
      try {
        await UserModel.updateOne(
          { id },
          {
            $set: {
              role: newRole,
              status: newStatus,
              badge_number: newBadge,
              station: newStation,
              updatedAt: new Date()
            }
          }
        );
      } catch (e: any) {
        console.warn('[Admin] Mongo update role error:', e.message);
      }
    }

    // Sync to Clerk publicMetadata if CLERK_SECRET_KEY is present
    if (process.env.CLERK_SECRET_KEY) {
      try {
        const { createClerkClient } = await import('@clerk/backend');
        const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
        if (id.startsWith('user_')) {
          await clerk.users.updateUserMetadata(id, {
            publicMetadata: { role: newRole }
          });
        } else {
          const clerkList = await clerk.users.getUserList({ emailAddress: [user.email] });
          if (clerkList.data && clerkList.data.length > 0) {
            await clerk.users.updateUserMetadata(clerkList.data[0].id, {
              publicMetadata: { role: newRole }
            });
          }
        }
      } catch (clerkErr: any) {
        console.warn('[Admin] Clerk metadata sync notice:', clerkErr.message);
      }
    }

    return res.json({
      success: true,
      message: `User ${user.email} updated to role "${newRole}" and status "${newStatus}".`,
      user: { id, role: newRole, status: newStatus, badge_number: newBadge, station: newStation }
    });
  } catch (error: any) {
    console.error('Error updating user role:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

/**
 * ADMIN: Delete User
 */
export async function deleteUser(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;

    if (req.user?.id === id) {
      return res.status(400).json({ error: 'Cannot delete your own active administrator account.' });
    }

    db.prepare('DELETE FROM users WHERE id = ?').run(id);

    if (isMongoConnected()) {
      try {
        await UserModel.deleteOne({ id });
      } catch (e: any) {
        console.warn('[Admin] Mongo delete user error:', e.message);
      }
    }

    return res.json({ success: true, message: 'User account successfully deleted.' });
  } catch (error: any) {
    console.error('Error deleting user:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

/**
 * ADMIN: System Stats & Health
 */
export async function getSystemStats(req: AuthRequest, res: Response) {
  try {
    const totalUsers = (db.prepare('SELECT COUNT(*) as count FROM users').get() as any).count;
    const policeCount = (db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'police'").get() as any).count;
    const citizenCount = (db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'user'").get() as any).count;
    const adminCount = (db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'admin'").get() as any).count;

    const totalIncidents = (db.prepare('SELECT COUNT(*) as count FROM emergency_reports').get() as any).count;
    const activeIncidents = (db.prepare("SELECT COUNT(*) as count FROM emergency_reports WHERE status NOT IN ('RESOLVED', 'CLOSED')").get() as any).count;
    const totalDatasets = (db.prepare('SELECT COUNT(*) as count FROM datasets').get() as any).count;
    const totalCrimeRecords = (db.prepare('SELECT COUNT(*) as count FROM crime_records').get() as any).count;

    let mongoStatus = isMongoConnected() ? 'CONNECTED' : 'STANDBY_HYBRID';

    return res.json({
      success: true,
      stats: {
        users: { total: totalUsers, citizens: citizenCount, police: policeCount, admins: adminCount },
        incidents: { total: totalIncidents, active: activeIncidents },
        datasets: { count: totalDatasets, records: totalCrimeRecords },
        database: {
          mongo: mongoStatus,
          sqlite: 'CONNECTED_WAL'
        }
      }
    });
  } catch (error: any) {
    console.error('Error fetching admin system stats:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}
