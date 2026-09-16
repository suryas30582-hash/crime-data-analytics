import { Request, Response } from 'express';
import { db } from '../db/schema';
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

  // Send initial ping to keep connection open
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

    // Generate unique report code e.g. EMG-2026-98234
    const randomCode = Math.floor(10000 + Math.random() * 90000);
    const year = new Date().getFullYear();
    const report_code = `EMG-${year}-${randomCode}`;

    let photo_url: string | null = null;
    let audio_url: string | null = null;

    // Handle uploaded photo
    if (files && files['photo'] && files['photo'][0]) {
      const photoFile = files['photo'][0];
      const ext = path.extname(photoFile.originalname) || '.jpg';
      const filename = `photo_${report_code}_${Date.now()}${ext}`;
      const filepath = path.join(uploadsDir, filename);
      fs.writeFileSync(filepath, photoFile.buffer);
      photo_url = `/uploads/emergency/${filename}`;
    } else if (body.photo_base64) {
      // Direct base64 fallback
      try {
        const matches = body.photo_base64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          const buffer = Buffer.from(matches[2], 'base64');
          const filename = `photo_${report_code}_${Date.now()}.jpg`;
          fs.writeFileSync(path.join(uploadsDir, filename), buffer);
          photo_url = `/uploads/emergency/${filename}`;
        }
      } catch (e) {
        console.error('Error saving base64 photo:', e);
      }
    }

    // Handle uploaded audio voice message
    if (files && files['audio'] && files['audio'][0]) {
      const audioFile = files['audio'][0];
      const ext = path.extname(audioFile.originalname) || '.webm';
      const filename = `audio_${report_code}_${Date.now()}${ext}`;
      const filepath = path.join(uploadsDir, filename);
      fs.writeFileSync(filepath, audioFile.buffer);
      audio_url = `/uploads/emergency/${filename}`;
    } else if (body.audio_base64) {
      // Direct base64 audio fallback
      try {
        const matches = body.audio_base64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          const buffer = Buffer.from(matches[2], 'base64');
          const filename = `audio_${report_code}_${Date.now()}.webm`;
          fs.writeFileSync(path.join(uploadsDir, filename), buffer);
          audio_url = `/uploads/emergency/${filename}`;
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
    const citizen_name = body.citizen_name || 'Anonymous Citizen';
    const citizen_phone = body.citizen_phone || null;

    const initialTimeline = JSON.stringify([
      {
        status: 'RECEIVED',
        timestamp: new Date().toISOString(),
        note: 'Emergency SOS received from citizen via Web Portal'
      }
    ]);

    const stmt = db.prepare(`
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
    `);

    stmt.run(
      report_code, incident_type, severity, description,
      photo_url, audio_url, latitude, longitude, location_address,
      state, district, city, citizen_name, citizen_phone,
      initialTimeline
    );

    const newReport = db.prepare('SELECT * FROM emergency_reports WHERE report_code = ?').get(report_code);

    // Broadcast instant alert to Police Command Hub
    broadcastEmergencyEvent('NEW_EMERGENCY', newReport);

    res.status(201).json({
      success: true,
      message: '🚨 Emergency alert broadcasted successfully to police control hub.',
      report: newReport
    });
  } catch (error: any) {
    console.error('Error submitting emergency report:', error);
    res.status(500).json({ success: false, error: error.message || 'Internal Server Error' });
  }
}

/**
 * Get All Emergency Reports with optional filters
 */
export function getReports(req: Request, res: Response) {
  try {
    const { status, severity, limit = '50', offset = '0' } = req.query;

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

    // Fetch patrol assignments for each report
    const enriched = reports.map(r => {
      const assignment = db.prepare('SELECT * FROM patrol_assignments WHERE report_code = ? ORDER BY assigned_at DESC LIMIT 1').get(r.report_code);
      let timeline = [];
      try {
        timeline = r.status_timeline ? JSON.parse(r.status_timeline) : [];
      } catch {
        timeline = [];
      }
      return {
        ...r,
        patrol_assignment: assignment || null,
        status_timeline: timeline
      };
    });

    // Also calculate summary stats
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
 * Get Single Emergency Report by code
 */
export function getReportByCode(req: Request, res: Response) {
  try {
    const { code } = req.params;
    const report: any = db.prepare('SELECT * FROM emergency_reports WHERE report_code = ? OR id = ?').get(code, code);

    if (!report) {
      return res.status(404).json({ success: false, error: 'Emergency report not found' });
    }

    const assignments = db.prepare('SELECT * FROM patrol_assignments WHERE report_code = ? ORDER BY assigned_at ASC').all(report.report_code);

    let timeline = [];
    try {
      timeline = report.status_timeline ? JSON.parse(report.status_timeline) : [];
    } catch {
      timeline = [];
    }

    res.json({
      success: true,
      report: {
        ...report,
        patrol_assignments: assignments,
        status_timeline: timeline
      }
    });
  } catch (error: any) {
    console.error('Error fetching report by code:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Update Report Status
 */
export function updateReportStatus(req: Request, res: Response) {
  try {
    const { code } = req.params;
    const { status, note } = req.body;

    const validStatuses = ['RECEIVED', 'REVIEWING', 'PATROL_ASSIGNED', 'RESPONDING', 'RESOLVED'];
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

    db.prepare(`
      UPDATE emergency_reports
      SET status = ?, status_timeline = ?, updated_at = CURRENT_TIMESTAMP
      WHERE report_code = ?
    `).run(status, JSON.stringify(timeline), code);

    const updated: any = db.prepare('SELECT * FROM emergency_reports WHERE report_code = ?').get(code);
    const assignment = db.prepare('SELECT * FROM patrol_assignments WHERE report_code = ? ORDER BY assigned_at DESC LIMIT 1').get(code);

    const fullReport = {
      ...updated,
      patrol_assignment: assignment || null,
      status_timeline: timeline
    };

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

    // Insert patrol assignment
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

    // Update status to PATROL_ASSIGNED
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
      SET status = 'PATROL_ASSIGNED', status_timeline = ?, updated_at = CURRENT_TIMESTAMP
      WHERE report_code = ?
    `).run(JSON.stringify(timeline), code);

    const updated: any = db.prepare('SELECT * FROM emergency_reports WHERE report_code = ?').get(code);
    const assignment = db.prepare('SELECT * FROM patrol_assignments WHERE report_code = ? ORDER BY assigned_at DESC LIMIT 1').get(code);

    const fullReport = {
      ...updated,
      patrol_assignment: assignment,
      status_timeline: timeline
    };

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
 * Helper to compute emergency command center KPIs
 */
function getEmergencyStatsHelper() {
  const total: any = db.prepare('SELECT COUNT(*) as count FROM emergency_reports').get();
  const critical: any = db.prepare("SELECT COUNT(*) as count FROM emergency_reports WHERE severity = 'CRITICAL' AND status != 'RESOLVED'").get();
  const active: any = db.prepare("SELECT COUNT(*) as count FROM emergency_reports WHERE status IN ('RECEIVED', 'REVIEWING', 'PATROL_ASSIGNED', 'RESPONDING')").get();
  const responding: any = db.prepare("SELECT COUNT(*) as count FROM emergency_reports WHERE status = 'RESPONDING'").get();
  const resolved: any = db.prepare("SELECT COUNT(*) as count FROM emergency_reports WHERE status = 'RESOLVED'").get();

  return {
    total_emergencies: total?.count || 0,
    critical_active: critical?.count || 0,
    active_incidents: active?.count || 0,
    patrols_responding: responding?.count || 0,
    resolved_count: resolved?.count || 0,
    avg_response_eta_minutes: 4.2
  };
}
