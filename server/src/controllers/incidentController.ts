import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { IncidentReportModel, PoliceActionModel, isMongoConnected } from '../db/mongodb';
import { db } from '../db/schema';
import { broadcastEmergencyEvent } from './emergencyController';
import path from 'path';
import fs from 'fs';

import { emergencyUploadsDir as uploadsDir } from '../utils/paths';

/**
 * USER: Submit Incident Report
 * Stores report in MongoDB, saves media, and broadcasts to Police Command Hub
 */
export async function createIncident(req: AuthRequest, res: Response) {
  try {
    const body = req.body;
    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;

    // Generate unique incident code e.g. INC-2026-84912
    const randomCode = Math.floor(10000 + Math.random() * 90000);
    const year = new Date().getFullYear();
    const report_code = `INC-${year}-${randomCode}`;

    let photo_url: string | null = null;
    let photo_size: number | null = null;
    let photo_mime_type: string | null = null;

    let audio_url: string | null = null;
    let audio_duration: number | null = body.audio_duration ? parseFloat(body.audio_duration) : null;
    let audio_size: number | null = null;
    let audio_mime_type: string | null = null;

    // 1. Process Photo
    if (files && files['photo'] && files['photo'][0]) {
      const photoFile = files['photo'][0];
      const ext = path.extname(photoFile.originalname) || '.jpg';
      const filename = `photo_${report_code}_${Date.now()}${ext}`;
      const filepath = path.join(uploadsDir, filename);
      fs.writeFileSync(filepath, photoFile.buffer);
      photo_url = `/uploads/emergency/${filename}`;
      photo_size = photoFile.size;
      photo_mime_type = photoFile.mimetype || 'image/jpeg';
    } else if (body.photo_base64) {
      try {
        const matches = body.photo_base64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          const buffer = Buffer.from(matches[2], 'base64');
          const filename = `photo_${report_code}_${Date.now()}.jpg`;
          fs.writeFileSync(path.join(uploadsDir, filename), buffer);
          photo_url = `/uploads/emergency/${filename}`;
          photo_size = buffer.length;
          photo_mime_type = matches[1] || 'image/jpeg';
        }
      } catch (e) {
        console.error('Failed to parse photo base64:', e);
      }
    }

    // 2. Process Audio Recording
    if (files && files['audio'] && files['audio'][0]) {
      const audioFile = files['audio'][0];
      const ext = path.extname(audioFile.originalname) || '.webm';
      const filename = `audio_${report_code}_${Date.now()}${ext}`;
      const filepath = path.join(uploadsDir, filename);
      fs.writeFileSync(filepath, audioFile.buffer);
      audio_url = `/uploads/emergency/${filename}`;
      audio_size = audioFile.size;
      audio_mime_type = audioFile.mimetype || 'audio/webm';
    } else if (body.audio_base64) {
      try {
        const matches = body.audio_base64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          const buffer = Buffer.from(matches[2], 'base64');
          const filename = `audio_${report_code}_${Date.now()}.webm`;
          fs.writeFileSync(path.join(uploadsDir, filename), buffer);
          audio_url = `/uploads/emergency/${filename}`;
          audio_size = buffer.length;
          audio_mime_type = matches[1] || 'audio/webm';
        }
      } catch (e) {
        console.error('Failed to parse audio base64:', e);
      }
    }

    const userId = req.user?.id || null;
    const citizenName = body.citizen_name || req.user?.name || 'Citizen User';
    const citizenEmail = req.user?.email || body.citizen_email || null;
    const citizenPhone = body.citizen_phone || null;
    const incidentType = body.incident_type || 'General Incident';
    const severity = (body.severity || 'HIGH').toUpperCase() as any;
    const description = body.description || 'Incident report filed by user';
    const latitude = body.latitude ? parseFloat(body.latitude) : null;
    const longitude = body.longitude ? parseFloat(body.longitude) : null;
    const locationAddress = body.location_address || 'Location coordinates logged';
    const state = body.state || 'Tamil Nadu';
    const district = body.district || 'Chennai';
    const city = body.city || 'Chennai';

    const initialTimeline = [
      {
        status: 'RECEIVED',
        timestamp: new Date(),
        updated_by_name: citizenName,
        updated_by_role: req.user?.role || 'user',
        note: 'Incident report submitted and securely stored in database.'
      }
    ];

    let createdIncident: any = null;

    // Save to MongoDB if connected
    if (isMongoConnected()) {
      try {
        createdIncident = await IncidentReportModel.create({
          report_code,
          user_id: userId || undefined,
          citizen_name: citizenName,
          citizen_phone: citizenPhone || undefined,
          citizen_email: citizenEmail || undefined,
          incident_type: incidentType,
          severity,
          description,
          photo_url: photo_url || undefined,
          photo_size: photo_size || undefined,
          photo_mime_type: photo_mime_type || undefined,
          audio_url: audio_url || undefined,
          audio_duration: audio_duration !== null ? audio_duration : undefined,
          audio_size: audio_size || undefined,
          audio_mime_type: audio_mime_type || undefined,
          latitude: latitude !== null ? latitude : undefined,
          longitude: longitude !== null ? longitude : undefined,
          location_address: locationAddress,
          state,
          district,
          city,
          status: 'RECEIVED',
          status_timeline: initialTimeline
        });
      } catch (err: any) {
        console.warn('[Incident] MongoDB save error, syncing via SQLite:', err.message);
      }
    }

    // Mirror to SQLite for compatibility and local resilience
    try {
      db.prepare(`
        INSERT INTO emergency_reports (
          report_code, incident_type, severity, description,
          photo_url, photo_size, photo_mime_type,
          audio_url, audio_duration, audio_size, audio_mime_type,
          latitude, longitude, location_address,
          state, district, city, citizen_name, citizen_phone,
          status, status_timeline, user_id, citizen_email,
          created_at, updated_at
        ) VALUES (
          ?, ?, ?, ?,
          ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?,
          ?, ?, ?, ?, ?,
          'RECEIVED', ?, ?, ?,
          CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        )
      `).run(
        report_code, incidentType, severity, description,
        photo_url, photo_size, photo_mime_type,
        audio_url, audio_duration, audio_size, audio_mime_type,
        latitude, longitude, locationAddress,
        state, district, city, citizenName, citizenPhone,
        JSON.stringify(initialTimeline), userId, citizenEmail
      );
    } catch (e: any) {
      // Fallback
      db.prepare(`
        INSERT INTO emergency_reports (
          report_code, incident_type, severity, description,
          photo_url, audio_url, latitude, longitude, location_address,
          state, district, city, citizen_name, citizen_phone,
          status, status_timeline, created_at, updated_at
        ) VALUES (
          ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          'RECEIVED', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        )
      `).run(
        report_code, incidentType, severity, description,
        photo_url, audio_url, latitude, longitude, locationAddress,
        state, district, city, citizenName, citizenPhone,
        JSON.stringify(initialTimeline)
      );
    }

    const reportData = createdIncident
      ? createdIncident.toObject()
      : db.prepare('SELECT * FROM emergency_reports WHERE report_code = ?').get(report_code);

    // Broadcast instant alert to Police & Admin dashboards
    broadcastEmergencyEvent('NEW_INCIDENT', reportData);

    return res.status(201).json({
      success: true,
      message: '🚨 Incident report successfully submitted and securely registered.',
      report_code,
      incident: reportData
    });
  } catch (error: any) {
    console.error('Error submitting incident:', error);
    return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
}

/**
 * USER: Get incidents submitted by the authenticated user
 */
export async function getMyIncidents(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;
    const userEmail = req.user?.email?.toLowerCase();

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    let reports: any[] = [];

    // Query MongoDB if connected
    if (isMongoConnected()) {
      try {
        reports = await IncidentReportModel.find({
          $or: [{ user_id: userId }, { citizen_email: userEmail }]
        })
          .sort({ createdAt: -1 })
          .lean();
      } catch (err: any) {
        console.warn('[Incident] Mongo getMyIncidents error:', err.message);
      }
    }

    // Fallback to SQLite
    if (reports.length === 0) {
      try {
        const rows = db.prepare(`
          SELECT * FROM emergency_reports
          WHERE user_id = ? OR LOWER(citizen_email) = ? OR LOWER(citizen_name) = ?
          ORDER BY created_at DESC
        `).all(userId || '', userEmail || '', req.user?.name?.toLowerCase() || '') as any[];

        reports = rows.map(r => ({
          ...r,
          status_timeline: typeof r.status_timeline === 'string' ? JSON.parse(r.status_timeline || '[]') : r.status_timeline
        }));
      } catch (err) {
        const rows = db.prepare('SELECT * FROM emergency_reports ORDER BY created_at DESC LIMIT 20').all() as any[];
        reports = rows.map(r => ({
          ...r,
          status_timeline: typeof r.status_timeline === 'string' ? JSON.parse(r.status_timeline || '[]') : r.status_timeline
        }));
      }
    }

    return res.json({ success: true, count: reports.length, reports });
  } catch (error: any) {
    console.error('Error fetching user incidents:', error);
    return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
}

/**
 * POLICE & ADMIN: Live Incident Feed
 * Returns all incidents with filtering by status and severity
 */
export async function getPoliceFeed(req: AuthRequest, res: Response) {
  try {
    const { status, severity, district, search } = req.query;

    let incidents: any[] = [];

    if (isMongoConnected()) {
      try {
        const filter: any = {};
        if (status && status !== 'ALL') filter.status = status;
        if (severity && severity !== 'ALL') filter.severity = severity;
        if (district && district !== 'ALL') filter.district = district;
        if (search) {
          filter.$or = [
            { report_code: new RegExp(String(search), 'i') },
            { description: new RegExp(String(search), 'i') },
            { location_address: new RegExp(String(search), 'i') },
            { incident_type: new RegExp(String(search), 'i') }
          ];
        }

        incidents = await IncidentReportModel.find(filter).sort({ createdAt: -1 }).lean();
      } catch (err: any) {
        console.warn('[Incident] Mongo getPoliceFeed error:', err.message);
      }
    }

    if (incidents.length === 0) {
      let query = 'SELECT * FROM emergency_reports WHERE 1=1';
      const params: any[] = [];

      if (status && status !== 'ALL') {
        query += ' AND status = ?';
        params.push(status);
      }
      if (severity && severity !== 'ALL') {
        query += ' AND severity = ?';
        params.push(severity);
      }
      if (district && district !== 'ALL') {
        query += ' AND district = ?';
        params.push(district);
      }
      if (search) {
        query += ' AND (report_code LIKE ? OR description LIKE ? OR location_address LIKE ?)';
        const term = `%${search}%`;
        params.push(term, term, term);
      }

      query += ' ORDER BY created_at DESC';
      const rows = db.prepare(query).all(...params) as any[];

      incidents = rows.map(r => ({
        ...r,
        status_timeline: typeof r.status_timeline === 'string' ? JSON.parse(r.status_timeline || '[]') : r.status_timeline
      }));
    }

    // Attach latest patrol assignments
    for (const inc of incidents) {
      if (!inc.patrol_assignment) {
        const assignment = db.prepare(`
          SELECT * FROM patrol_assignments WHERE report_code = ? ORDER BY assigned_at DESC LIMIT 1
        `).get(inc.report_code) as any;
        if (assignment) {
          inc.patrol_assignment = assignment;
        }
      }
    }

    return res.json({ success: true, count: incidents.length, incidents });
  } catch (error: any) {
    console.error('Error fetching police feed:', error);
    return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
}

/**
 * POLICE & ADMIN: Update Incident Status & Officer Notes
 * Stores status update in MongoDB, appends timeline, and logs PoliceAction
 */
export async function updateIncidentStatus(req: AuthRequest, res: Response) {
  try {
    const { code } = req.params;
    const { status, notes } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    const officerName = req.user?.name || 'Authorized Officer';
    const officerId = req.user?.id || 'officer_system';
    const officerBadge = req.user?.badge_number || null;

    let previousStatus = 'RECEIVED';
    let timeline: any[] = [];

    // Check MongoDB
    let mongoDoc: any = null;
    if (isMongoConnected()) {
      try {
        mongoDoc = await IncidentReportModel.findOne({ report_code: code });
        if (mongoDoc) {
          previousStatus = mongoDoc.status;
          timeline = mongoDoc.status_timeline || [];
        }
      } catch (e) {
        console.warn('[Incident] Mongo find error:', e);
      }
    }

    // Check SQLite if needed
    if (!mongoDoc) {
      const sqliteReport = db.prepare('SELECT * FROM emergency_reports WHERE report_code = ?').get(code) as any;
      if (sqliteReport) {
        previousStatus = sqliteReport.status;
        try {
          timeline = JSON.parse(sqliteReport.status_timeline || '[]');
        } catch {
          timeline = [];
        }
      }
    }

    const timelineItem = {
      status,
      timestamp: new Date(),
      updated_by_name: officerName,
      updated_by_role: req.user?.role || 'police',
      note: notes || `Status updated from ${previousStatus} to ${status}`
    };

    timeline.push(timelineItem);

    // Update in MongoDB
    if (isMongoConnected()) {
      try {
        await IncidentReportModel.updateOne(
          { report_code: code },
          {
            $set: {
              status,
              officer_notes: notes || '',
              assigned_officer_id: officerId,
              assigned_officer_name: officerName,
              updatedAt: new Date()
            },
            $push: { status_timeline: timelineItem }
          }
        );

        // Record PoliceAction in MongoDB
        await PoliceActionModel.create({
          report_code: code,
          officer_id: officerId,
          officer_name: officerName,
          officer_badge: officerBadge || undefined,
          action_type: 'STATUS_UPDATE',
          previous_status: previousStatus,
          new_status: status,
          notes: notes || `Status updated to ${status}`,
          timestamp: new Date()
        });
      } catch (mongoErr: any) {
        console.warn('[Incident] Mongo status update error:', mongoErr.message);
      }
    }

    // Update SQLite
    try {
      db.prepare(`
        UPDATE emergency_reports
        SET status = ?, status_timeline = ?, officer_notes = ?, assigned_officer_id = ?, assigned_officer_name = ?, updated_at = CURRENT_TIMESTAMP
        WHERE report_code = ?
      `).run(status, JSON.stringify(timeline), notes || '', officerId, officerName, code);
    } catch {
      db.prepare(`
        UPDATE emergency_reports
        SET status = ?, status_timeline = ?, updated_at = CURRENT_TIMESTAMP
        WHERE report_code = ?
      `).run(status, JSON.stringify(timeline), code);
    }

    // Broadcast SSE update
    broadcastEmergencyEvent('INCIDENT_STATUS_UPDATED', {
      report_code: code,
      status,
      officer_name: officerName,
      notes,
      timelineItem
    });

    return res.json({
      success: true,
      message: `Incident ${code} status updated to ${status}.`,
      report_code: code,
      new_status: status,
      timeline
    });
  } catch (error: any) {
    console.error('Error updating incident status:', error);
    return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
}

/**
 * POLICE & ADMIN: Dispatch Patrol Unit
 */
export async function assignPatrol(req: AuthRequest, res: Response) {
  try {
    const { code } = req.params;
    const { unit_name, vehicle_type = 'Interceptor Patrol', officer_in_charge, contact_number, eta_minutes = 5, dispatch_notes } = req.body;

    if (!unit_name) {
      return res.status(400).json({ error: 'Patrol unit name is required' });
    }

    const officerName = req.user?.name || officer_in_charge || 'Dispatch Officer';
    const officerId = req.user?.id || 'officer_system';

    const patrolData = {
      unit_name,
      vehicle_type,
      officer_in_charge: officer_in_charge || officerName,
      contact_number: contact_number || '112 / Control Hub',
      eta_minutes: Number(eta_minutes) || 5,
      dispatch_notes: dispatch_notes || 'Immediate high-priority deployment',
      assigned_at: new Date()
    };

    // Store in MongoDB
    if (isMongoConnected()) {
      try {
        await IncidentReportModel.updateOne(
          { report_code: code },
          {
            $set: {
              status: 'PATROL_ASSIGNED',
              patrol_assignment: patrolData,
              updatedAt: new Date()
            },
            $push: {
              status_timeline: {
                status: 'PATROL_ASSIGNED',
                timestamp: new Date(),
                updated_by_name: officerName,
                updated_by_role: req.user?.role || 'police',
                note: `Patrol Unit [${unit_name}] dispatched. Officer: ${patrolData.officer_in_charge}. ETA: ${patrolData.eta_minutes} mins.`
              }
            }
          }
        );

        await PoliceActionModel.create({
          report_code: code,
          officer_id: officerId,
          officer_name: officerName,
          officer_badge: req.user?.badge_number || undefined,
          action_type: 'PATROL_DISPATCHED',
          previous_status: 'RECEIVED',
          new_status: 'PATROL_ASSIGNED',
          unit_assigned: unit_name,
          notes: `Dispatched ${unit_name} (${vehicle_type}). ETA: ${eta_minutes}m. ${dispatch_notes || ''}`,
          timestamp: new Date()
        });
      } catch (err: any) {
        console.warn('[Incident] Mongo patrol assign error:', err.message);
      }
    }

    // Store in SQLite
    db.prepare(`
      INSERT INTO patrol_assignments (
        report_code, unit_name, vehicle_type, officer_in_charge, contact_number, eta_minutes, dispatch_notes, assigned_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).run(code, unit_name, vehicle_type, patrolData.officer_in_charge, patrolData.contact_number, patrolData.eta_minutes, patrolData.dispatch_notes);

    db.prepare(`
      UPDATE emergency_reports SET status = 'PATROL_ASSIGNED', updated_at = CURRENT_TIMESTAMP WHERE report_code = ?
    `).run(code);

    broadcastEmergencyEvent('PATROL_ASSIGNED', {
      report_code: code,
      patrol: patrolData
    });

    return res.status(201).json({
      success: true,
      message: `Patrol Unit [${unit_name}] assigned to incident ${code}.`,
      patrol: patrolData
    });
  } catch (error: any) {
    console.error('Error assigning patrol:', error);
    return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
}

/**
 * POLICE & ADMIN: Fetch Police Action Logs
 */
export async function getPoliceActionLogs(req: AuthRequest, res: Response) {
  try {
    let logs: any[] = [];

    if (isMongoConnected()) {
      try {
        logs = await PoliceActionModel.find().sort({ timestamp: -1 }).limit(100).lean();
      } catch (e: any) {
        console.warn('[Incident] Mongo getPoliceActionLogs error:', e.message);
      }
    }

    if (logs.length === 0) {
      // Fallback from patrol assignments in SQLite
      const rows = db.prepare(`
        SELECT p.*, e.incident_type, e.severity
        FROM patrol_assignments p
        JOIN emergency_reports e ON p.report_code = e.report_code
        ORDER BY p.assigned_at DESC LIMIT 50
      `).all() as any[];

      logs = rows.map(r => ({
        report_code: r.report_code,
        officer_id: 'officer_assigned',
        officer_name: r.officer_in_charge,
        action_type: 'PATROL_DISPATCHED',
        new_status: 'PATROL_ASSIGNED',
        unit_assigned: r.unit_name,
        notes: r.dispatch_notes,
        timestamp: r.assigned_at
      }));
    }

    return res.json({ success: true, count: logs.length, logs });
  } catch (error: any) {
    console.error('Error fetching police action logs:', error);
    return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
}
