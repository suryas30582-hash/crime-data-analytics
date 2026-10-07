import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { db } from '../db/schema';
import { syncUserToSupabase } from '../db/supabaseSync';
import { AuthRequest } from '../middleware/auth';

/**
 * GET /api/admin/users
 * Returns user list with counts by role. Excludes password_hash.
 */
export function getAdminUsers(req: Request, res: Response) {
  try {
    const roleParam = (req.query.role as string || '').toLowerCase().trim();

    const countsRow = db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN role = 'user' THEN 1 ELSE 0 END) as users,
        SUM(CASE WHEN role = 'police' THEN 1 ELSE 0 END) as police,
        SUM(CASE WHEN role = 'admin' THEN 1 ELSE 0 END) as admins
      FROM users
    `).get() as { total: number; users: number; police: number; admins: number } | undefined;

    const counts = {
      total: countsRow?.total || 0,
      users: countsRow?.users || 0,
      police: countsRow?.police || 0,
      admins: countsRow?.admins || 0
    };

    let query = `
      SELECT id, email, name, role, badge_number, station, department, phone, status, created_at 
      FROM users
    `;
    const params: any[] = [];

    if (roleParam && roleParam !== 'all') {
      query += ` WHERE LOWER(role) = ?`;
      params.push(roleParam);
    }

    query += ` ORDER BY created_at DESC`;

    const users = db.prepare(query).all(...params);

    return res.json({
      success: true,
      counts,
      users
    });
  } catch (error: any) {
    console.error('Error fetching admin users:', error);
    return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
}

/**
 * POST /api/admin/users
 * Creates a new user/officer account.
 */
export function createAdminUser(req: Request, res: Response) {
  try {
    const { name, email, password, role, badge_number, station, department, phone } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Full name is required.' });
    }

    if (!email || !email.trim()) {
      return res.status(400).json({ success: false, error: 'Email address is required.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return res.status(400).json({ success: false, error: 'Invalid email address.' });
    }

    if (!password || password.length < 6) {
      return res.status(400).json({ success: false, error: 'Password must be at least 6 characters long.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanRole = (role || 'user').toLowerCase();

    if (!['admin', 'police', 'user'].includes(cleanRole)) {
      return res.status(400).json({ success: false, error: 'Role must be admin, police, or user.' });
    }

    const existing = db.prepare('SELECT id FROM users WHERE LOWER(email) = ?').get(cleanEmail);
    if (existing) {
      return res.status(409).json({ success: false, error: `Account with email "${cleanEmail}" already exists.` });
    }

    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(password, salt);
    const userId = crypto.randomUUID();

    db.prepare(`
      INSERT INTO users (id, email, name, password_hash, role, badge_number, station, department, phone, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
    `).run(
      userId,
      cleanEmail,
      name.trim(),
      passwordHash,
      cleanRole,
      badge_number ? badge_number.trim() : null,
      station ? station.trim() : null,
      department ? department.trim() : null,
      phone ? phone.trim() : null
    );

    // Sync to Supabase
    syncUserToSupabase({
      id: userId,
      email: cleanEmail,
      name: name.trim(),
      password_hash: passwordHash,
      role: cleanRole
    }).catch(err => console.error('[Supabase Sync User Exception]', err.message));

    const newUser = db.prepare(`
      SELECT id, email, name, role, badge_number, station, department, phone, status, created_at 
      FROM users WHERE id = ?
    `).get(userId);

    return res.status(201).json({
      success: true,
      message: `Account created successfully for ${name} (${cleanRole.toUpperCase()}).`,
      user: newUser
    });
  } catch (error: any) {
    console.error('Error creating admin user:', error);
    return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
}

/**
 * PUT /api/admin/users/:id and PUT /api/admin/users/:id/role
 * Updates role and profile metadata for a user.
 */
export function updateAdminUser(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { role, status, badge_number, station, department, name, phone } = req.body;

    const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as any;
    if (!existing) {
      return res.status(404).json({ success: false, error: 'User not found.' });
    }

    const newRole = role ? role.toLowerCase() : existing.role;
    if (role && !['admin', 'police', 'user'].includes(newRole)) {
      return res.status(400).json({ success: false, error: 'Invalid role specified.' });
    }

    const newStatus = status ? status.toLowerCase() : (existing.status || 'active');
    const newName = name !== undefined ? name.trim() : existing.name;
    const newBadge = badge_number !== undefined ? badge_number : existing.badge_number;
    const newStation = station !== undefined ? station : existing.station;
    const newDept = department !== undefined ? department : existing.department;
    const newPhone = phone !== undefined ? phone : existing.phone;

    db.prepare(`
      UPDATE users 
      SET role = ?, status = ?, name = ?, badge_number = ?, station = ?, department = ?, phone = ?
      WHERE id = ?
    `).run(newRole, newStatus, newName, newBadge, newStation, newDept, newPhone, id);

    const updated = db.prepare(`
      SELECT id, email, name, role, badge_number, station, department, phone, status, created_at 
      FROM users WHERE id = ?
    `).get(id);

    return res.json({
      success: true,
      message: 'User updated successfully',
      user: updated
    });
  } catch (error: any) {
    console.error('Error updating admin user:', error);
    return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
}

/**
 * DELETE /api/admin/users/:id
 * Deletes user account from the system.
 */
export function deleteAdminUser(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;

    if (req.user?.id === id) {
      return res.status(400).json({
        success: false,
        error: 'You cannot delete your own active administrator account.'
      });
    }

    const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as any;
    if (!existing) {
      return res.status(404).json({ success: false, error: 'User not found.' });
    }

    db.prepare('DELETE FROM users WHERE id = ?').run(id);

    return res.json({
      success: true,
      message: `User ${existing.email} deleted successfully.`
    });
  } catch (error: any) {
    console.error('Error deleting admin user:', error);
    return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
}

/**
 * GET /api/admin/system-stats
 * Aggregates high-level platform health metrics for the Admin Dashboard.
 */
export function getAdminSystemStats(req: Request, res: Response) {
  try {
    const userStats = db.prepare(`
      SELECT 
        COUNT(*) as total_users,
        SUM(CASE WHEN role = 'user' THEN 1 ELSE 0 END) as citizens,
        SUM(CASE WHEN role = 'police' THEN 1 ELSE 0 END) as police,
        SUM(CASE WHEN role = 'admin' THEN 1 ELSE 0 END) as admins
      FROM users
    `).get() as any;

    const incidentStats = db.prepare(`
      SELECT 
        COUNT(*) as total_incidents,
        SUM(CASE WHEN status NOT IN ('RESOLVED', 'CLOSED') THEN 1 ELSE 0 END) as active_incidents,
        SUM(CASE WHEN status IN ('RESOLVED', 'CLOSED') THEN 1 ELSE 0 END) as resolved_incidents,
        SUM(CASE WHEN severity = 'CRITICAL' AND status NOT IN ('RESOLVED', 'CLOSED') THEN 1 ELSE 0 END) as critical_alarms
      FROM emergency_reports
    `).get() as any;

    const patrolStats = db.prepare(`
      SELECT 
        COUNT(*) as total_patrols,
        SUM(CASE WHEN status = 'AVAILABLE' THEN 1 ELSE 0 END) as available_patrols
      FROM patrol_units
    `).get() as any;

    const stationsCount = (db.prepare('SELECT COUNT(*) as count FROM police_stations').get() as any)?.count || 0;
    const datasetsCount = (db.prepare('SELECT COUNT(*) as count FROM datasets').get() as any)?.count || 0;
    const crimeRecordsCount = (db.prepare('SELECT COUNT(*) as count FROM crime_records').get() as any)?.count || 0;

    return res.json({
      success: true,
      stats: {
        total_users: userStats?.total_users || 0,
        citizens_registered: userStats?.citizens || 0,
        police_officers: userStats?.police || 0,
        administrators: userStats?.admins || 0,
        total_incidents: incidentStats?.total_incidents || 0,
        active_incidents: incidentStats?.active_incidents || 0,
        resolved_incidents: incidentStats?.resolved_incidents || 0,
        critical_alarms: incidentStats?.critical_alarms || 0,
        total_patrol_units: patrolStats?.total_patrols || 0,
        available_patrols: patrolStats?.available_patrols || 0,
        police_stations: stationsCount,
        datasets: datasetsCount,
        total_crime_records: crimeRecordsCount,
        database_status: 'healthy',
        database_engine: 'SQLite WAL + Supabase Cloud',
        server_uptime_seconds: Math.floor(process.uptime())
      }
    });
  } catch (error: any) {
    console.error('Error fetching admin system stats:', error);
    return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
}
