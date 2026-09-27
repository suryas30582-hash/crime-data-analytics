import { Request, Response } from 'express';
import { db } from '../db/schema';
import { autoDispatchNearestPatrol, calculateHaversineDistance, calculateDynamicETA } from '../services/dispatchService';

import { uploadToSupabaseStorage } from '../db/supabase';
import {
  syncEmergencyReportToSupabase,
  syncPatrolAssignmentToSupabase,
  syncBackupRequestToSupabase,
  syncAuditLogToSupabase
} from '../db/supabaseSync';
import path from 'path';
import fs from 'fs';


// Setup uploads directory for emergency media
const uploadsDir = path.resolve(__dirname, '../../uploads/emergency');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// In-Memory SSE Client Pool
const sseClients: Response[] = [];

/**
 * Broadcast event to all connected Police Command Center dashboards
 */
export function broadcastEmergencyEvent(eventType: string, data: any) {
  const payload = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
  for (let i = sseClients.length - 1; i >= 0; i--) {
    const client = sseClients[i];
    try {
      client.write(payload);
    } catch (err) {
      sseClients.splice(i, 1);
    }
  }
}

/**
 * Helper to log audit trail for incident actions
 */
export function logIncidentAudit(
  reportCode: string,
  userId: string | null,
  userName: string,
  action: string,
  previousStatus: string | null,
  newStatus: string | null,
  details: string
) {
  try {
    db.prepare(`
      INSERT INTO incident_audit_trail (
        report_code, user_id, user_name, action, previous_status, new_status, details, timestamp
      ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).run(
      reportCode,
      userId || 'POLICE_OFFICER',
      userName || 'Command Officer',
      action,
      previousStatus || null,
      newStatus || null,
      details
    );

    syncAuditLogToSupabase({
      report_code: reportCode,
      user_id: userId,
      user_name: userName,
      action,
      previous_status: previousStatus,
      new_status: newStatus,
      details
    });
  } catch (err) {

    console.error('Error logging incident audit trail:', err);
  }
}

/**
 * Run Smart Escalation check for response delay
 */
export function runSmartEscalationCheck(thresholdMinutes: number = 5) {
  try {
    const minutesModifier = `-${thresholdMinutes} minutes`;
    const delayedIncidents: any[] = db.prepare(`
      SELECT * FROM emergency_reports
      WHERE status IN ('PATROL_ASSIGNED', 'PATROL_EN_ROUTE', 'INCIDENT_REPORTED', 'RECEIVED', 'RESPONDING')
        AND status != 'RESPONSE_DELAY'
        AND (
          datetime(COALESCE(patrol_assigned_at, created_at)) <= datetime('now', ?)
        )
    `).all(minutesModifier);


    for (const inc of delayedIncidents) {
      let timeline = [];
      try {
        timeline = inc.status_timeline ? JSON.parse(inc.status_timeline) : [];
      } catch {
        timeline = [];
      }

      timeline.push({
        status: 'RESPONSE_DELAY',
        timestamp: new Date().toISOString(),
        note: `⚠️ SMART ESCALATION: Patrol response delay threshold exceeded (${thresholdMinutes} mins). High Priority Alert issued.`
      });

      db.prepare(`
        UPDATE emergency_reports
        SET status = 'RESPONSE_DELAY',
            delay_flagged_at = CURRENT_TIMESTAMP,
            status_timeline = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE report_code = ?
      `).run(JSON.stringify(timeline), inc.report_code);

      logIncidentAudit(
        inc.report_code,
        'SYSTEM_MONITOR',
        'Smart Escalation Engine',
        'SMART_ESCALATION_TRIGGERED',
        inc.status,
        'RESPONSE_DELAY',
        `Patrol response time exceeded ${thresholdMinutes} minutes threshold without arrival confirmation.`
      );

      const updated = db.prepare('SELECT * FROM emergency_reports WHERE report_code = ?').get(inc.report_code);
      const assignment = db.prepare('SELECT * FROM patrol_assignments WHERE report_code = ? ORDER BY assigned_at DESC LIMIT 1').get(inc.report_code);

      broadcastEmergencyEvent('RESPONSE_DELAY', {
        report: {
          ...updated,
          patrol_assignment: assignment || null,
          status_timeline: timeline
        },
        message: `⚠️ RESPONSE DELAY - Patrol has not acknowledged or arrived for incident ${inc.report_code}.`
      });
    }

    return delayedIncidents.length;
  } catch (err) {
    console.error('Error running smart escalation check:', err);
    return 0;
  }
}

/**
 * SSE Real-time stream for Police Command Hub
 */
export function streamEmergencyEvents(req: Request, res: Response) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  });

  res.write(': connected\n\n');
  sseClients.push(res);

  const keepAlive = setInterval(() => {
    try {
      res.write(': ping\n\n');
    } catch {
      clearInterval(keepAlive);
    }
  }, 25000);

  req.on('close', () => {
    clearInterval(keepAlive);
    const idx = sseClients.indexOf(res);
    if (idx !== -1) {
      sseClients.splice(idx, 1);
    }
  });
}

/**
 * Citizen Emergency Report Submission
 */
export async function createReport(req: Request, res: Response) {
  try {
    const body = req.body;
    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;

    const randomCode = Math.floor(10000 + Math.random() * 90000);
    const year = new Date().getFullYear();
    const report_code = `EMG-${year}-${randomCode}`;

    let photo_url: string | null = null;
    let audio_url: string | null = null;

    if (files && files['photo'] && files['photo'][0]) {
      const photoFile = files['photo'][0];
      const ext = path.extname(photoFile.originalname) || '.jpg';
      const filename = `photo_${report_code}_${Date.now()}${ext}`;
      const filepath = path.join(uploadsDir, filename);
      fs.writeFileSync(filepath, photoFile.buffer);
      photo_url = `/uploads/emergency/${filename}`;

      // Upload to Supabase Storage bucket 'emergency-images'
      const sbUrl = await uploadToSupabaseStorage('emergency-images', filename, photoFile.buffer, photoFile.mimetype);
      if (sbUrl) photo_url = sbUrl;
    } else if (body.photo_base64) {
      try {
        const matches = body.photo_base64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          const buffer = Buffer.from(matches[2], 'base64');
          const filename = `photo_${report_code}_${Date.now()}.jpg`;
          fs.writeFileSync(path.join(uploadsDir, filename), buffer);
          photo_url = `/uploads/emergency/${filename}`;

          const sbUrl = await uploadToSupabaseStorage('emergency-images', filename, buffer, 'image/jpeg');
          if (sbUrl) photo_url = sbUrl;
        }
      } catch (e) {
        console.error('Error saving base64 photo:', e);
      }
    }

    if (files && files['audio'] && files['audio'][0]) {
      const audioFile = files['audio'][0];
      const ext = path.extname(audioFile.originalname) || '.webm';
      const filename = `audio_${report_code}_${Date.now()}${ext}`;
      const filepath = path.join(uploadsDir, filename);
      fs.writeFileSync(filepath, audioFile.buffer);
      audio_url = `/uploads/emergency/${filename}`;

      // Upload to Supabase Storage bucket 'emergency-audio'
      const sbUrl = await uploadToSupabaseStorage('emergency-audio', filename, audioFile.buffer, audioFile.mimetype);
      if (sbUrl) audio_url = sbUrl;
    } else if (body.audio_base64) {
      try {
        const matches = body.audio_base64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          const buffer = Buffer.from(matches[2], 'base64');
          const filename = `audio_${report_code}_${Date.now()}.webm`;
          fs.writeFileSync(path.join(uploadsDir, filename), buffer);
          audio_url = `/uploads/emergency/${filename}`;

          const sbUrl = await uploadToSupabaseStorage('emergency-audio', filename, buffer, 'audio/webm');
          if (sbUrl) audio_url = sbUrl;
        }
      } catch (e) {
        console.error('Error saving base64 audio:', e);
      }
    }

    const incident_type = body.incident_type || 'General Emergency';
    const severity = (body.severity || 'HIGH').toUpperCase();
    const description = body.description || 'Emergency alert triggered by citizen';
    const latitude = body.latitude ? parseFloat(body.latitude) : null;
    const longitude = body.longitude ? parseFloat(body.longitude) : null;
    const location_address = body.location_address || 'Location coordinates provided';
    const state = body.state || 'Tamil Nadu';
    const district = body.district || 'Chennai';
    const city = body.city || 'Chennai';
    const user = (req as any).user;
    const citizen_name = body.citizen_name || user?.name || 'Anonymous Citizen';
    const citizen_phone = body.citizen_phone || user?.phone || null;
    const user_id = user?.id || body.user_id || null;
    const user_email = user?.email ? user.email.toLowerCase() : (body.user_email ? body.user_email.toLowerCase() : null);

    const initialTimeline = JSON.stringify([
      {
        status: 'INCIDENT_REPORTED',
        timestamp: new Date().toISOString(),
        note: 'Emergency SOS reported by citizen via Web Portal'
      }
    ]);

    const stmt = db.prepare(`
      INSERT INTO emergency_reports (
        report_code, incident_type, severity, description,
        photo_url, audio_url, latitude, longitude, location_address,
        state, district, city, citizen_name, citizen_phone,
        user_id, user_email,
        status, reported_at, status_timeline, created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?,
        'INCIDENT_REPORTED', CURRENT_TIMESTAMP, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      )
    `);

    stmt.run(
      report_code, incident_type, severity, description,
      photo_url, audio_url, latitude, longitude, location_address,
      state, district, city, citizen_name, citizen_phone,
      user_id, user_email,
      initialTimeline
    );

    logIncidentAudit(
      report_code,
      null,
      citizen_name,
      'INCIDENT_REPORTED',
      null,
      'INCIDENT_REPORTED',
      `Emergency SOS reported for category: ${incident_type}`
    );

    const newReport = db.prepare('SELECT * FROM emergency_reports WHERE report_code = ?').get(report_code);

    // Sync to Supabase
    syncEmergencyReportToSupabase(newReport);

    broadcastEmergencyEvent('NEW_EMERGENCY', newReport);

    // Trigger Automatic Nearest Police Station & Patrol Dispatch
    const dispatchResult = autoDispatchNearestPatrol(report_code, latitude, longitude);

    const finalReport: any = db.prepare('SELECT * FROM emergency_reports WHERE report_code = ?').get(report_code);
    const finalAssignment: any = db.prepare('SELECT * FROM patrol_assignments WHERE report_code = ? ORDER BY assigned_at DESC LIMIT 1').get(report_code);

    res.status(201).json({
      success: true,
      message: dispatchResult.success
        ? `🚨 Emergency alert received. Auto-dispatched patrol ${finalReport?.assigned_patrol_code || 'unit'} from ${finalReport?.nearest_station_name || 'nearest station'}.`
        : dispatchResult.reason === 'NO_GPS'
        ? '🚨 Emergency alert received. Location logged, pending manual station dispatch.'
        : '🚨 Emergency alert received. ⚠️ Alert: No available patrols at nearby stations.',
      report: finalReport,
      patrol_assignment: finalAssignment || null,
      dispatch: dispatchResult
    });
  } catch (error: any) {
    console.error('Error submitting emergency report:', error);
    res.status(500).json({ success: false, error: error.message || 'Internal Server Error' });
  }
}

/**
 * Get All Emergency Reports with optional filters & smart escalation check
 */
export function getReports(req: Request, res: Response) {
  try {
    const { status, severity, limit = '50', offset = '0', threshold_minutes = '5' } = req.query;

    // Run auto escalation check for delayed patrols
    runSmartEscalationCheck(parseInt(threshold_minutes as string, 10) || 5);

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

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit as string, 10), parseInt(offset as string, 10));

    const reports: any[] = db.prepare(query).all(...params);

    const enriched = reports.map(r => {
      const assignment = db.prepare('SELECT * FROM patrol_assignments WHERE report_code = ? ORDER BY assigned_at DESC LIMIT 1').get(r.report_code);
      const backups = db.prepare('SELECT * FROM backup_requests WHERE report_code = ? ORDER BY created_at DESC').all(r.report_code);
      let timeline = [];
      try {
        timeline = r.status_timeline ? JSON.parse(r.status_timeline) : [];
      } catch {
        timeline = [];
      }
      let scenePhotos = [];
      try {
        scenePhotos = r.scene_photos ? JSON.parse(r.scene_photos) : [];
      } catch {
        scenePhotos = [];
      }

      return {
        ...r,
        patrol_assignment: assignment || null,
        backup_requests: backups || [],
        scene_photos: scenePhotos,
        status_timeline: timeline
      };
    });

    const stats = getEmergencyStatsHelper();

    res.json({
      success: true,
      reports: enriched,
      stats
    });
  } catch (error: any) {
    console.error('Error fetching emergency reports:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Get Single Emergency Report by code with full audit & backup history
 */
export function getReportByCode(req: Request, res: Response) {
  try {
    const { code } = req.params;
    const report: any = db.prepare('SELECT * FROM emergency_reports WHERE report_code = ? OR id = ?').get(code, code);

    if (!report) {
      return res.status(404).json({ success: false, error: 'Emergency report not found' });
    }

    const assignments = db.prepare('SELECT * FROM patrol_assignments WHERE report_code = ? ORDER BY assigned_at ASC').all(report.report_code);
    const backups = db.prepare('SELECT * FROM backup_requests WHERE report_code = ? ORDER BY created_at DESC').all(report.report_code);
    const auditLogs = db.prepare('SELECT * FROM incident_audit_trail WHERE report_code = ? ORDER BY timestamp ASC').all(report.report_code);

    let timeline = [];
    try {
      timeline = report.status_timeline ? JSON.parse(report.status_timeline) : [];
    } catch {
      timeline = [];
    }

    let scenePhotos = [];
    try {
      scenePhotos = report.scene_photos ? JSON.parse(report.scene_photos) : [];
    } catch {
      scenePhotos = [];
    }

    res.json({
      success: true,
      report: {
        ...report,
        patrol_assignments: assignments,
        patrol_assignment: assignments.length > 0 ? assignments[assignments.length - 1] : null,
        backup_requests: backups,
        audit_trail: auditLogs,
        scene_photos: scenePhotos,
        status_timeline: timeline
      }
    });
  } catch (error: any) {
    console.error('Error fetching report by code:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Update Report Lifecycle Status
 */
export function updateReportStatus(req: Request, res: Response) {
  try {
    const { code } = req.params;
    const { status, note, officer_name, user_id } = req.body;

    const validStatuses = [
      'INCIDENT_REPORTED',
      'POLICE_VERIFICATION',
      'PRIORITY_ASSIGNED',
      'PATROL_ASSIGNED',
      'PATROL_EN_ROUTE',
      'PATROL_ARRIVED',
      'EVIDENCE_COLLECTED',
      'OFFICER_REPORT_SUBMITTED',
      'INVESTIGATION',
      'RESOLVED',
      'ESCALATED',
      'RESPONSE_DELAY',
      // Legacy backwards compatibility
      'RECEIVED',
      'REVIEWING',
      'RESPONDING'
    ];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, error: `Invalid status: ${status}` });
    }

    const existing: any = db.prepare('SELECT * FROM emergency_reports WHERE report_code = ?').get(code);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Report not found' });
    }

    let timeline: any[] = [];
    try {
      timeline = existing.status_timeline ? JSON.parse(existing.status_timeline) : [];
    } catch {
      timeline = [];
    }

    timeline.push({
      status,
      timestamp: new Date().toISOString(),
      note: note || `Status transitioned to ${status}`
    });

    // Map column updates for timestamps based on milestone status
    const columnMap: Record<string, string> = {
      'INCIDENT_REPORTED': 'reported_at',
      'RECEIVED': 'reported_at',
      'POLICE_VERIFICATION': 'verified_at',
      'REVIEWING': 'verified_at',
      'PRIORITY_ASSIGNED': 'priority_assigned_at',
      'PATROL_ASSIGNED': 'patrol_assigned_at',
      'PATROL_EN_ROUTE': 'en_route_at',
      'RESPONDING': 'en_route_at',
      'PATROL_ARRIVED': 'arrived_at',
      'EVIDENCE_COLLECTED': 'evidence_collected_at',
      'OFFICER_REPORT_SUBMITTED': 'officer_report_submitted_at',
      'INVESTIGATION': 'investigation_at',
      'RESOLVED': 'resolved_at',
      'ESCALATED': 'escalated_at',
      'RESPONSE_DELAY': 'delay_flagged_at'
    };

    const targetCol = columnMap[status];
    if (targetCol) {
      try {
        db.prepare(`
          UPDATE emergency_reports
          SET ${targetCol} = CURRENT_TIMESTAMP
          WHERE report_code = ? AND ${targetCol} IS NULL
        `).run(code);
      } catch {
        // column update fail safe
      }
    }

    db.prepare(`
      UPDATE emergency_reports
      SET status = ?, status_timeline = ?, updated_at = CURRENT_TIMESTAMP
      WHERE report_code = ?
    `).run(status, JSON.stringify(timeline), code);

    logIncidentAudit(
      code,
      user_id || null,
      officer_name || 'Police Officer',
      'STATUS_TRANSITION',
      existing.status,
      status,
      note || `Lifecycle status changed from ${existing.status} to ${status}`
    );

    const updated: any = db.prepare('SELECT * FROM emergency_reports WHERE report_code = ?').get(code);
    const assignment = db.prepare('SELECT * FROM patrol_assignments WHERE report_code = ? ORDER BY assigned_at DESC LIMIT 1').get(code);
    const backups = db.prepare('SELECT * FROM backup_requests WHERE report_code = ? ORDER BY created_at DESC').all(code);

    const fullReport = {
      ...updated,
      patrol_assignment: assignment || null,
      backup_requests: backups || [],
      status_timeline: timeline
    };

    syncEmergencyReportToSupabase(fullReport);

    broadcastEmergencyEvent('STATUS_UPDATE', fullReport);


    res.json({
      success: true,
      message: `Report status updated to ${status}`,
      report: fullReport
    });
  } catch (error: any) {
    console.error('Error updating report status:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Assign Patrol Unit to an Emergency
 */
export function assignPatrol(req: Request, res: Response) {
  try {
    const { code } = req.params;
    const { unit_name, vehicle_type, officer_in_charge, contact_number, eta_minutes, dispatch_notes } = req.body;

    if (!unit_name || !officer_in_charge) {
      return res.status(400).json({ success: false, error: 'Patrol unit name and Officer in charge are required' });
    }

    const existing: any = db.prepare('SELECT * FROM emergency_reports WHERE report_code = ?').get(code);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Report not found' });
    }

    db.prepare(`
      INSERT INTO patrol_assignments (
        report_code, unit_name, vehicle_type, officer_in_charge,
        contact_number, eta_minutes, dispatch_notes, assigned_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).run(
      code,
      unit_name,
      vehicle_type || 'PCR Patrol Van',
      officer_in_charge,
      contact_number || '+91 94440 00100',
      eta_minutes ? parseInt(eta_minutes, 10) : 5,
      dispatch_notes || 'Immediate intervention dispatched'
    );

    let timeline: any[] = [];
    try {
      timeline = existing.status_timeline ? JSON.parse(existing.status_timeline) : [];
    } catch {
      timeline = [];
    }

    timeline.push({
      status: 'PATROL_ASSIGNED',
      timestamp: new Date().toISOString(),
      note: `Patrol Unit [${unit_name}] dispatched. Officer: ${officer_in_charge}. ETA: ${eta_minutes || 5} mins.`
    });

    db.prepare(`
      UPDATE emergency_reports
      SET status = 'PATROL_ASSIGNED',
          patrol_assigned_at = CURRENT_TIMESTAMP,
          status_timeline = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE report_code = ?
    `).run(JSON.stringify(timeline), code);

    logIncidentAudit(
      code,
      null,
      officer_in_charge,
      'PATROL_DISPATCHED',
      existing.status,
      'PATROL_ASSIGNED',
      `Dispatched unit ${unit_name} (${vehicle_type}) under officer ${officer_in_charge}. ETA ${eta_minutes || 5} mins.`
    );

    const updated: any = db.prepare('SELECT * FROM emergency_reports WHERE report_code = ?').get(code);
    const assignment = db.prepare('SELECT * FROM patrol_assignments WHERE report_code = ? ORDER BY assigned_at DESC LIMIT 1').get(code);

    const fullReport = {
      ...updated,
      patrol_assignment: assignment,
      status_timeline: timeline
    };

    syncPatrolAssignmentToSupabase(assignment);
    syncEmergencyReportToSupabase(fullReport);

    broadcastEmergencyEvent('PATROL_ASSIGNED', fullReport);

    res.json({
      success: true,
      message: `Patrol Unit ${unit_name} successfully dispatched to emergency ${code}`,
      report: fullReport
    });
  } catch (error: any) {
    console.error('Error assigning patrol:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Request Backup for an Emergency Incident
 */
export function requestBackup(req: Request, res: Response) {
  try {
    const { code } = req.params;
    const { requested_by, reason, urgency } = req.body;

    const existing: any = db.prepare('SELECT * FROM emergency_reports WHERE report_code = ?').get(code);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Incident report not found' });
    }

    const backupUrgency = (urgency || 'HIGH').toUpperCase();
    const officerName = requested_by || 'Field Patrol Officer';
    const backupReason = reason || 'Additional reinforcement requested on site.';

    db.prepare(`
      INSERT INTO backup_requests (
        report_code, requested_by, reason, urgency, status, created_at
      ) VALUES (?, ?, ?, ?, 'PENDING', CURRENT_TIMESTAMP)
    `).run(code, officerName, backupReason, backupUrgency);

    let timeline: any[] = [];
    try {
      timeline = existing.status_timeline ? JSON.parse(existing.status_timeline) : [];
    } catch {
      timeline = [];
    }

    timeline.push({
      status: 'BACKUP_REQUESTED',
      timestamp: new Date().toISOString(),
      note: `🚨 BACKUP REQUESTED (${backupUrgency}): ${backupReason} (Requested by: ${officerName})`
    });

    db.prepare(`
      UPDATE emergency_reports
      SET status_timeline = ?, updated_at = CURRENT_TIMESTAMP
      WHERE report_code = ?
    `).run(JSON.stringify(timeline), code);

    logIncidentAudit(
      code,
      null,
      officerName,
      'BACKUP_REQUESTED',
      existing.status,
      existing.status,
      `Backup unit requested with urgency ${backupUrgency}. Reason: ${backupReason}`
    );

    syncBackupRequestToSupabase({
      report_code: code,
      requested_by: officerName,
      reason: backupReason,
      urgency: backupUrgency
    });

    const updated: any = db.prepare('SELECT * FROM emergency_reports WHERE report_code = ?').get(code);
    const backups = db.prepare('SELECT * FROM backup_requests WHERE report_code = ? ORDER BY created_at DESC').all(code);

    const payload = {
      report: {
        ...updated,
        backup_requests: backups,
        status_timeline: timeline
      },
      backup: {
        report_code: code,
        requested_by: officerName,
        reason: backupReason,
        urgency: backupUrgency
      }
    };

    syncEmergencyReportToSupabase(payload.report);

    broadcastEmergencyEvent('BACKUP_REQUESTED', payload);


    res.json({
      success: true,
      message: `🚨 Backup request transmitted for incident ${code}`,
      report: payload.report
    });
  } catch (error: any) {
    console.error('Error requesting backup:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Submit Officer Investigation Notes, Evidence Details & Scene Photos
 */
export async function submitOfficerNotes(req: Request, res: Response) {
  try {
    const { code } = req.params;
    const body = req.body;
    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;

    const existing: any = db.prepare('SELECT * FROM emergency_reports WHERE report_code = ?').get(code);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Incident report not found' });
    }

    let currentScenePhotos: string[] = [];
    try {
      currentScenePhotos = existing.scene_photos ? JSON.parse(existing.scene_photos) : [];
    } catch {
      currentScenePhotos = [];
    }

    // Process uploaded scene photo files
    if (files && files['scene_photos']) {
      for (const file of files['scene_photos']) {
        const ext = path.extname(file.originalname) || '.jpg';
        const filename = `scene_${code}_${Date.now()}_${Math.floor(Math.random() * 1000)}${ext}`;
        const filepath = path.join(uploadsDir, filename);
        fs.writeFileSync(filepath, file.buffer);
        let finalUrl = `/uploads/emergency/${filename}`;

        const sbUrl = await uploadToSupabaseStorage('evidence-files', filename, file.buffer, file.mimetype);
        if (sbUrl) finalUrl = sbUrl;

        currentScenePhotos.push(finalUrl);
      }
    } else if (body.photo_base64) {
      try {
        const matches = body.photo_base64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          const buffer = Buffer.from(matches[2], 'base64');
          const filename = `scene_${code}_${Date.now()}.jpg`;
          fs.writeFileSync(path.join(uploadsDir, filename), buffer);
          let finalUrl = `/uploads/emergency/${filename}`;

          const sbUrl = await uploadToSupabaseStorage('evidence-files', filename, buffer, 'image/jpeg');
          if (sbUrl) finalUrl = sbUrl;

          currentScenePhotos.push(finalUrl);
        }
      } catch (e) {
        console.error('Error saving base64 scene photo:', e);
      }
    }

    const investigation_notes = body.notes || existing.investigation_notes || null;
    const evidence_details = body.evidence_details || existing.evidence_details || null;
    const action_taken = body.action_taken || existing.action_taken || null;
    const officer_name = body.officer_name || 'Investigating Officer';
    const nextStatus = body.status || existing.status;

    let timeline: any[] = [];
    try {
      timeline = existing.status_timeline ? JSON.parse(existing.status_timeline) : [];
    } catch {
      timeline = [];
    }

    timeline.push({
      status: nextStatus,
      timestamp: new Date().toISOString(),
      note: `Officer investigation updated by ${officer_name}. Notes: ${investigation_notes ? investigation_notes.slice(0, 60) + '...' : 'Details logged'}`
    });

    db.prepare(`
      UPDATE emergency_reports
      SET investigation_notes = ?,
          evidence_details = ?,
          action_taken = ?,
          scene_photos = ?,
          status = ?,
          evidence_collected_at = COALESCE(evidence_collected_at, CURRENT_TIMESTAMP),
          officer_report_submitted_at = COALESCE(officer_report_submitted_at, CURRENT_TIMESTAMP),
          status_timeline = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE report_code = ?
    `).run(
      investigation_notes,
      evidence_details,
      action_taken,
      JSON.stringify(currentScenePhotos),
      nextStatus,
      JSON.stringify(timeline),
      code
    );

    logIncidentAudit(
      code,
      null,
      officer_name,
      'OFFICER_NOTES_SUBMITTED',
      existing.status,
      nextStatus,
      `Submitted investigation notes and evidence details. Attached ${currentScenePhotos.length} scene photos.`
    );

    const updated: any = db.prepare('SELECT * FROM emergency_reports WHERE report_code = ?').get(code);

    const fullReport = {
      ...updated,
      scene_photos: currentScenePhotos,
      status_timeline: timeline
    };

    syncEmergencyReportToSupabase(fullReport);

    broadcastEmergencyEvent('EVIDENCE_ADDED', fullReport);


    res.json({
      success: true,
      message: 'Officer investigation notes & evidence submitted successfully',
      report: fullReport
    });
  } catch (error: any) {
    console.error('Error submitting officer notes:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Get Incident Audit Trail for Admin & Police Command
 */
export function getAuditTrail(req: Request, res: Response) {
  try {
    const { code } = req.query;
    let query = 'SELECT * FROM incident_audit_trail WHERE 1=1';
    const params: any[] = [];

    if (code) {
      query += ' AND report_code = ?';
      params.push(code);
    }

    query += ' ORDER BY timestamp DESC LIMIT 200';

    const logs = db.prepare(query).all(...params);

    res.json({
      success: true,
      logs
    });
  } catch (error: any) {
    console.error('Error fetching audit trail:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Trigger manual Smart Escalation Check
 */
export function triggerEscalationCheck(req: Request, res: Response) {
  try {
    const { threshold_minutes = 5 } = req.body;
    const count = runSmartEscalationCheck(parseInt(threshold_minutes, 10) || 5);
    res.json({
      success: true,
      message: `Smart escalation check completed. ${count} delayed incidents flagged.`,
      flagged_count: count
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Helper to compute comprehensive emergency command center KPIs
 */
function getEmergencyStatsHelper() {
  const total: any = db.prepare('SELECT COUNT(*) as count FROM emergency_reports').get();
  const critical: any = db.prepare("SELECT COUNT(*) as count FROM emergency_reports WHERE severity = 'CRITICAL' AND status != 'RESOLVED'").get();
  const active: any = db.prepare("SELECT COUNT(*) as count FROM emergency_reports WHERE status NOT IN ('RESOLVED')").get();
  const responding: any = db.prepare("SELECT COUNT(*) as count FROM emergency_reports WHERE status IN ('PATROL_EN_ROUTE', 'PATROL_ASSIGNED', 'RESPONDING')").get();
  const delayed: any = db.prepare("SELECT COUNT(*) as count FROM emergency_reports WHERE status = 'RESPONSE_DELAY' OR delay_flagged_at IS NOT NULL").get();
  const resolved: any = db.prepare("SELECT COUNT(*) as count FROM emergency_reports WHERE status = 'RESOLVED'").get();
  const escalated: any = db.prepare("SELECT COUNT(*) as count FROM emergency_reports WHERE status = 'ESCALATED'").get();
  const backups: any = db.prepare('SELECT COUNT(*) as count FROM backup_requests').get();

  // Compute average response & arrival times in minutes
  const avgResponse: any = db.prepare(`
    SELECT AVG(
      (strftime('%s', COALESCE(arrived_at, patrol_assigned_at, updated_at)) - strftime('%s', created_at)) / 60.0
    ) as avg_mins
    FROM emergency_reports
    WHERE patrol_assigned_at IS NOT NULL
  `).get();

  const avgArrival: any = db.prepare(`
    SELECT AVG(
      (strftime('%s', arrived_at) - strftime('%s', COALESCE(en_route_at, patrol_assigned_at))) / 60.0
    ) as avg_mins
    FROM emergency_reports
    WHERE arrived_at IS NOT NULL
  `).get();

  return {
    total_emergencies: total?.count || 0,
    critical_active: critical?.count || 0,
    active_incidents: active?.count || 0,
    patrols_responding: responding?.count || 0,
    delayed_incidents: delayed?.count || 0,
    resolved_count: resolved?.count || 0,
    escalated_count: escalated?.count || 0,
    backup_requests_count: backups?.count || 0,
    avg_response_time_minutes: avgResponse?.avg_mins ? Math.round(avgResponse.avg_mins * 10) / 10 : 4.5,
    avg_arrival_time_minutes: avgArrival?.avg_mins ? Math.round(avgArrival.avg_mins * 10) / 10 : 3.8
  };
}

/**
 * Get All Police Stations with active patrol counts & status
 */
export function getAllPoliceStations(req: Request, res: Response) {
  try {
    const stations: any[] = db.prepare('SELECT * FROM police_stations WHERE status = "ACTIVE" ORDER BY state, city, name').all();
    const enriched = stations.map(st => {
      const patrols = db.prepare('SELECT * FROM patrol_units WHERE station_id = ?').all(st.id);
      const availableCount = patrols.filter((p: any) => p.status === 'AVAILABLE').length;
      return {
        ...st,
        patrols,
        total_patrols: patrols.length,
        available_patrols: availableCount
      };
    });

    res.json({ success: true, stations: enriched });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Get Nearest Police Station & Available Patrols for given Lat/Lng
 */
export function getNearestPoliceStation(req: Request, res: Response) {
  try {
    const { lat, lng } = req.query;
    if (!lat || !lng) {
      return res.status(400).json({ success: false, error: 'Latitude and Longitude required' });
    }

    const latitude = parseFloat(lat as string);
    const longitude = parseFloat(lng as string);

    if (isNaN(latitude) || isNaN(longitude)) {
      return res.status(400).json({ success: false, error: 'Invalid latitude or longitude' });
    }

    const stations: any[] = db.prepare('SELECT * FROM police_stations WHERE status = "ACTIVE"').all();

    const ranked = stations
      .map(st => {
        const dist = calculateHaversineDistance(latitude, longitude, st.latitude, st.longitude);
        const patrols = db.prepare('SELECT * FROM patrol_units WHERE station_id = ?').all(st.id);
        const availablePatrols = patrols.filter((p: any) => p.status === 'AVAILABLE');
        const eta = calculateDynamicETA(dist);
        return {
          ...st,
          distance_km: dist,
          estimated_eta_minutes: eta,
          patrols,
          available_patrols: availablePatrols,
          has_available_patrol: availablePatrols.length > 0
        };
      })
      .sort((a, b) => a.distance_km - b.distance_km);

    const nearestStation = ranked[0] || null;
    const nearestWithPatrol = ranked.find(s => s.has_available_patrol) || null;

    res.json({
      success: true,
      nearest_station: nearestStation,
      nearest_station_with_available_patrol: nearestWithPatrol,
      all_stations_ranked: ranked
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Update Patrol Status Lifecycle (AVAILABLE -> ASSIGNED -> EN_ROUTE -> ON_SCENE -> COMPLETED)
 */
export function updatePatrolLifecycleStatus(req: Request, res: Response) {
  try {
    const { report_code, patrol_id, status: newStatus } = req.body;

    if (!report_code || !newStatus) {
      return res.status(400).json({ success: false, error: 'Report code and status are required' });
    }

    const report: any = db.prepare('SELECT * FROM emergency_reports WHERE report_code = ?').get(report_code);
    if (!report) {
      return res.status(404).json({ success: false, error: 'Report not found' });
    }

    let timeline = [];
    try {
      timeline = report.status_timeline ? JSON.parse(report.status_timeline) : [];
    } catch {
      timeline = [];
    }

    let reportStatus = report.status;
    let note = '';

    if (newStatus === 'EN_ROUTE') {
      reportStatus = 'PATROL_EN_ROUTE';
      note = '🚙 PATROL EN ROUTE: Patrol unit dispatched and traveling to incident location.';
      db.prepare(`
        UPDATE emergency_reports
        SET status = ?, en_route_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE report_code = ?
      `).run(reportStatus, report_code);
    } else if (newStatus === 'ON_SCENE' || newStatus === 'ARRIVED') {
      reportStatus = 'ON_SCENE';
      note = '📍 PATROL ON SCENE: Officer arrived at incident site.';
      db.prepare(`
        UPDATE emergency_reports
        SET status = ?, arrived_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE report_code = ?
      `).run(reportStatus, report_code);
    } else if (newStatus === 'COMPLETED' || newStatus === 'RESOLVED') {
      reportStatus = 'RESOLVED';
      note = '✅ INCIDENT RESOLVED & PATROL FREED: Incident handled on site. Patrol unit returned to AVAILABLE status.';

      // Free the assigned patrol unit!
      const targetPatrolId = patrol_id || report.assigned_patrol_id;
      if (targetPatrolId) {
        db.prepare(`
          UPDATE patrol_units
          SET status = 'AVAILABLE', last_updated = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(targetPatrolId);
      } else if (report.assigned_patrol_code) {
        db.prepare(`
          UPDATE patrol_units
          SET status = 'AVAILABLE', last_updated = CURRENT_TIMESTAMP
          WHERE unit_code = ?
        `).run(report.assigned_patrol_code);
      }

      db.prepare(`
        UPDATE patrol_assignments
        SET status = 'COMPLETED', resolved_at = CURRENT_TIMESTAMP
        WHERE report_code = ?
      `).run(report_code);

      db.prepare(`
        UPDATE emergency_reports
        SET status = 'RESOLVED', resolved_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE report_code = ?
      `).run(report_code);
    }

    timeline.push({
      status: reportStatus,
      timestamp: new Date().toISOString(),
      note
    });

    db.prepare(`
      UPDATE emergency_reports
      SET status_timeline = ?
      WHERE report_code = ?
    `).run(JSON.stringify(timeline), report_code);

    logIncidentAudit(
      report_code,
      'POLICE_OFFICER',
      'Police Dispatch Officer',
      `PATROL_STATUS_${newStatus}`,
      report.status,
      reportStatus,
      note
    );

    const updated = db.prepare('SELECT * FROM emergency_reports WHERE report_code = ?').get(report_code);
    syncEmergencyReportToSupabase(updated);

    broadcastEmergencyEvent('PATROL_STATUS_UPDATED', {
      report: updated,
      status: reportStatus,
      patrol_status: newStatus
    });

    res.json({
      success: true,
      message: `Patrol status updated to ${newStatus}`,
      report: updated
    });
  } catch (error: any) {
    console.error('Error updating patrol lifecycle status:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Manual Patrol Assignment / Reassignment by Command Officer
 */
export function manualDispatchPatrol(req: Request, res: Response) {
  try {
    const { report_code, station_id, patrol_id, dispatch_notes } = req.body;

    if (!report_code || !patrol_id) {
      return res.status(400).json({ success: false, error: 'Report code and patrol ID are required' });
    }

    const report: any = db.prepare('SELECT * FROM emergency_reports WHERE report_code = ?').get(report_code);
    if (!report) {
      return res.status(404).json({ success: false, error: 'Report not found' });
    }

    const patrol: any = db.prepare('SELECT * FROM patrol_units WHERE id = ?').get(patrol_id);
    if (!patrol) {
      return res.status(404).json({ success: false, error: 'Patrol unit not found' });
    }

    const station: any = db.prepare('SELECT * FROM police_stations WHERE id = ?').get(patrol.station_id);

    // Free any previously assigned patrol for this report if switching
    if (report.assigned_patrol_id && report.assigned_patrol_id !== patrol_id) {
      db.prepare(`UPDATE patrol_units SET status = 'AVAILABLE' WHERE id = ?`).run(report.assigned_patrol_id);
    }

    // Compute distance if report has GPS
    let dist = report.distance_km || 2.5;
    if (report.latitude && report.longitude && station) {
      dist = calculateHaversineDistance(report.latitude, report.longitude, station.latitude, station.longitude);
    }
    const eta = calculateDynamicETA(dist);

    // Update patrol unit status to ASSIGNED
    db.prepare(`UPDATE patrol_units SET status = 'ASSIGNED', last_updated = CURRENT_TIMESTAMP WHERE id = ?`).run(patrol_id);

    // Insert patrol assignment
    db.prepare(`
      INSERT INTO patrol_assignments (
        report_code, unit_name, vehicle_type, officer_in_charge, contact_number,
        eta_minutes, dispatch_notes, station_id, station_name, patrol_id, distance_km,
        dispatch_type, status, assigned_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'MANUAL', 'ASSIGNED', CURRENT_TIMESTAMP)
    `).run(
      report_code,
      patrol.unit_code,
      patrol.vehicle_type,
      patrol.officer_in_charge,
      patrol.contact_number,
      eta,
      dispatch_notes || 'Manual dispatch by Command Officer',
      station ? station.id : null,
      station ? station.name : 'Police Command HQ',
      patrol.id,
      dist
    );

    let timeline = [];
    try {
      timeline = report.status_timeline ? JSON.parse(report.status_timeline) : [];
    } catch {
      timeline = [];
    }

    timeline.push({
      status: 'PATROL_ASSIGNED',
      timestamp: new Date().toISOString(),
      note: `🚓 MANUAL DISPATCH: Patrol ${patrol.unit_code} (${patrol.officer_in_charge}) assigned to incident by Command Officer.`
    });

    db.prepare(`
      UPDATE emergency_reports
      SET status = 'PATROL_ASSIGNED',
          nearest_station_id = ?,
          nearest_station_name = ?,
          distance_km = ?,
          estimated_eta_minutes = ?,
          dispatch_status = 'MANUAL_DISPATCH_REQUIRED',
          assigned_patrol_id = ?,
          assigned_patrol_code = ?,
          patrol_assigned_at = CURRENT_TIMESTAMP,
          status_timeline = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE report_code = ?
    `).run(
      station ? station.id : null,
      station ? station.name : 'Police Command HQ',
      dist,
      eta,
      patrol.id,
      patrol.unit_code,
      JSON.stringify(timeline),
      report_code
    );

    logIncidentAudit(
      report_code,
      'POLICE_OFFICER',
      'Police Command Officer',
      'MANUAL_PATROL_DISPATCHED',
      report.status,
      'PATROL_ASSIGNED',
      `Officer manually assigned patrol ${patrol.unit_code} (${patrol.officer_in_charge}) from station ${station?.name}.`
    );

    const updated = db.prepare('SELECT * FROM emergency_reports WHERE report_code = ?').get(report_code);
    const assignmentRecord = db.prepare('SELECT * FROM patrol_assignments WHERE report_code = ? ORDER BY assigned_at DESC LIMIT 1').get(report_code);

    syncEmergencyReportToSupabase(updated);
    syncPatrolAssignmentToSupabase(assignmentRecord);

    broadcastEmergencyEvent('PATROL_DISPATCHED', {
      report: updated,
      assignment: assignmentRecord,
      station,
      patrol
    });

    res.json({
      success: true,
      message: `Patrol ${patrol.unit_code} manually assigned to report ${report_code}`,
      report: updated,
      assignment: assignmentRecord
    });
  } catch (error: any) {
    console.error('Error in manualDispatchPatrol:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Get Reports submitted by the currently logged-in user
 */
export function getMyReports(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    const userEmail = user?.email ? user.email.toLowerCase() : (req.query.email as string || '').toLowerCase();
    const userId = user?.id || (req.query.user_id as string) || '';
    const userName = user?.name || (req.query.citizen_name as string) || '';

    let reports: any[] = [];

    if (userId || userEmail || userName) {
      reports = db.prepare(`
        SELECT * FROM emergency_reports
        WHERE (user_id IS NOT NULL AND user_id = ?)
           OR (user_email IS NOT NULL AND LOWER(user_email) = ?)
           OR (citizen_name IS NOT NULL AND citizen_name = ?)
        ORDER BY created_at DESC
      `).all(userId, userEmail, userName);
    }

    // Fallback: If no user context or 0 matches by user_id/email, match by citizen name or return recent user reports
    if (reports.length === 0 && userName) {
      reports = db.prepare(`
        SELECT * FROM emergency_reports
        WHERE citizen_name = ?
        ORDER BY created_at DESC
      `).all(userName);
    }

    // If still empty, return top recent reports for display
    if (reports.length === 0) {
      reports = db.prepare(`
        SELECT * FROM emergency_reports
        ORDER BY created_at DESC LIMIT 20
      `).all();
    }

    const enriched = reports.map(r => {
      const assignment = db.prepare('SELECT * FROM patrol_assignments WHERE report_code = ? ORDER BY assigned_at DESC LIMIT 1').get(r.report_code);
      let timeline = [];
      try { timeline = r.status_timeline ? JSON.parse(r.status_timeline) : []; } catch { timeline = []; }
      return {
        ...r,
        patrol_assignment: assignment || null,
        status_timeline: timeline
      };
    });

    res.json({
      success: true,
      count: enriched.length,
      reports: enriched
    });
  } catch (error: any) {
    console.error('Error fetching user reports:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}


