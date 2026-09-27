import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';

const dataDir = path.resolve(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'crime_analytics.db');
export const db = new DatabaseSync(dbPath);

// Enable WAL mode & foreign keys
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Migrate old users table schema to allow 'police' role if old check constraint exists
  try {
    const tableInfo = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='users'").get() as { sql?: string } | undefined;
    if (tableInfo?.sql && tableInfo.sql.includes('CHECK')) {
      db.exec(`
        CREATE TABLE users_new (
          id TEXT PRIMARY KEY,
          email TEXT UNIQUE NOT NULL,
          name TEXT NOT NULL,
          password_hash TEXT NOT NULL,
          role TEXT NOT NULL DEFAULT 'user',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        INSERT OR IGNORE INTO users_new (id, email, name, password_hash, role, created_at)
        SELECT id, email, name, password_hash, role, created_at FROM users;
        DROP TABLE users;
        ALTER TABLE users_new RENAME TO users;
      `);
    }
  } catch (mErr) {
    console.warn('Schema migration notice:', mErr);
  }

  db.exec(`

    CREATE TABLE IF NOT EXISTS datasets (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      record_count INTEGER DEFAULT 0,
      created_by TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      is_default INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS crime_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      dataset_id TEXT NOT NULL,
      crime_id TEXT NOT NULL,
      date TEXT NOT NULL,
      time TEXT,
      year INTEGER NOT NULL,
      month INTEGER NOT NULL,
      crime_type TEXT NOT NULL,
      city TEXT NOT NULL,
      state TEXT NOT NULL,
      district TEXT,
      location TEXT,
      victim_age INTEGER,
      victim_gender TEXT,
      suspect_age INTEGER,
      suspect_gender TEXT,
      weapon_used TEXT,
      case_status TEXT NOT NULL,
      latitude REAL,
      longitude REAL,
      crime_severity TEXT NOT NULL,
      police_station TEXT,
      arrest_made TEXT NOT NULL,
      incident_day TEXT,
      investigation_days INTEGER,
      FOREIGN KEY (dataset_id) REFERENCES datasets(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_records_dataset ON crime_records(dataset_id);
    CREATE INDEX IF NOT EXISTS idx_records_state ON crime_records(state);
    CREATE INDEX IF NOT EXISTS idx_records_district ON crime_records(district);
    CREATE INDEX IF NOT EXISTS idx_records_city ON crime_records(city);
    CREATE INDEX IF NOT EXISTS idx_records_year ON crime_records(year);
    CREATE INDEX IF NOT EXISTS idx_records_type ON crime_records(crime_type);
    CREATE INDEX IF NOT EXISTS idx_records_status ON crime_records(case_status);
    CREATE INDEX IF NOT EXISTS idx_records_severity ON crime_records(crime_severity);

    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT,
      action TEXT NOT NULL,
      details TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS emergency_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      report_code TEXT UNIQUE NOT NULL,
      incident_type TEXT NOT NULL,
      severity TEXT NOT NULL DEFAULT 'HIGH',
      description TEXT NOT NULL,
      photo_url TEXT,
      audio_url TEXT,
      latitude REAL,
      longitude REAL,
      location_address TEXT,
      state TEXT,
      district TEXT,
      city TEXT,
      citizen_name TEXT,
      citizen_phone TEXT,
      status TEXT NOT NULL DEFAULT 'RECEIVED',
      status_timeline TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_emergency_code ON emergency_reports(report_code);
    CREATE INDEX IF NOT EXISTS idx_emergency_status ON emergency_reports(status);
    CREATE INDEX IF NOT EXISTS idx_emergency_severity ON emergency_reports(severity);
    CREATE INDEX IF NOT EXISTS idx_emergency_created ON emergency_reports(created_at);
  `);

  // Non-destructive migrations for user identification
  try { db.exec('ALTER TABLE emergency_reports ADD COLUMN user_id TEXT;'); } catch {}
  try { db.exec('ALTER TABLE emergency_reports ADD COLUMN user_email TEXT;'); } catch {}

  db.exec(`

    CREATE TABLE IF NOT EXISTS police_stations (
      id TEXT PRIMARY KEY,
      station_code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      state TEXT NOT NULL,
      district TEXT NOT NULL,
      city TEXT NOT NULL,
      address TEXT,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      contact_number TEXT,
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_ps_state ON police_stations(state);
    CREATE INDEX IF NOT EXISTS idx_ps_district ON police_stations(district);
    CREATE INDEX IF NOT EXISTS idx_ps_city ON police_stations(city);

    CREATE TABLE IF NOT EXISTS patrol_units (
      id TEXT PRIMARY KEY,
      station_id TEXT NOT NULL,
      unit_code TEXT UNIQUE NOT NULL,
      vehicle_type TEXT NOT NULL,
      officer_in_charge TEXT NOT NULL,
      contact_number TEXT,
      status TEXT NOT NULL DEFAULT 'AVAILABLE',
      current_latitude REAL,
      current_longitude REAL,
      last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (station_id) REFERENCES police_stations(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_patrol_station ON patrol_units(station_id);
    CREATE INDEX IF NOT EXISTS idx_patrol_status ON patrol_units(status);

    CREATE TABLE IF NOT EXISTS patrol_assignments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      report_code TEXT NOT NULL,
      unit_name TEXT NOT NULL,
      vehicle_type TEXT NOT NULL,
      officer_in_charge TEXT NOT NULL,
      contact_number TEXT,
      eta_minutes INTEGER NOT NULL DEFAULT 5,
      dispatch_notes TEXT,
      station_id TEXT,
      station_name TEXT,
      patrol_id TEXT,
      distance_km REAL,
      dispatch_type TEXT DEFAULT 'AUTOMATIC',
      status TEXT DEFAULT 'ASSIGNED',
      assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      resolved_at DATETIME,
      FOREIGN KEY (report_code) REFERENCES emergency_reports(report_code) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS backup_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      report_code TEXT NOT NULL,
      requested_by TEXT NOT NULL,
      reason TEXT NOT NULL,
      urgency TEXT CHECK(urgency IN ('CRITICAL', 'HIGH', 'MEDIUM')) NOT NULL DEFAULT 'HIGH',
      status TEXT DEFAULT 'PENDING',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (report_code) REFERENCES emergency_reports(report_code) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_backup_report ON backup_requests(report_code);

    CREATE TABLE IF NOT EXISTS incident_audit_trail (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      report_code TEXT NOT NULL,
      user_id TEXT,
      user_name TEXT NOT NULL,
      action TEXT NOT NULL,
      previous_status TEXT,
      new_status TEXT,
      details TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_audit_report ON incident_audit_trail(report_code);
  `);

  // Non-destructive schema column migrations for emergency_reports & patrol_assignments
  const emergencyColumns = [
    'reported_at DATETIME',
    'verified_at DATETIME',
    'priority_assigned_at DATETIME',
    'patrol_assigned_at DATETIME',
    'en_route_at DATETIME',
    'arrived_at DATETIME',
    'evidence_collected_at DATETIME',
    'officer_report_submitted_at DATETIME',
    'investigation_at DATETIME',
    'resolved_at DATETIME',
    'escalated_at DATETIME',
    'delay_flagged_at DATETIME',
    'investigation_notes TEXT',
    'evidence_details TEXT',
    'action_taken TEXT',
    'scene_photos TEXT',
    'escalation_reason TEXT',
    'nearest_station_id TEXT',
    'nearest_station_name TEXT',
    'distance_km REAL',
    'estimated_eta_minutes INTEGER',
    'dispatch_status TEXT DEFAULT \'PENDING\'',
    'assigned_patrol_id TEXT',
    'assigned_patrol_code TEXT'
  ];

  for (const colDef of emergencyColumns) {
    try {
      db.exec(`ALTER TABLE emergency_reports ADD COLUMN ${colDef}`);
    } catch {
      // Column already exists or table freshly created
    }
  }

  const patrolAssignmentColumns = [
    'station_id TEXT',
    'station_name TEXT',
    'patrol_id TEXT',
    'distance_km REAL',
    'dispatch_type TEXT DEFAULT \'AUTOMATIC\'',
    'status TEXT DEFAULT \'ASSIGNED\''
  ];

  for (const colDef of patrolAssignmentColumns) {
    try {
      db.exec(`ALTER TABLE patrol_assignments ADD COLUMN ${colDef}`);
    } catch {
      // Column already exists or table freshly created
    }
  }

  // Seed Police Stations and Patrol Units
  try {
    const { seedPoliceStationsAndPatrols } = require('./policeStationSeed');
    seedPoliceStationsAndPatrols();
  } catch (err) {
    console.error('Error auto-seeding police stations:', err);
  }
}

