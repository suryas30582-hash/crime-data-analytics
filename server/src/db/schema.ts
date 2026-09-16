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
      role TEXT CHECK(role IN ('admin', 'user')) NOT NULL DEFAULT 'user',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

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

    CREATE TABLE IF NOT EXISTS patrol_assignments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      report_code TEXT NOT NULL,
      unit_name TEXT NOT NULL,
      vehicle_type TEXT NOT NULL,
      officer_in_charge TEXT NOT NULL,
      contact_number TEXT,
      eta_minutes INTEGER NOT NULL DEFAULT 5,
      dispatch_notes TEXT,
      assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      resolved_at DATETIME,
      FOREIGN KEY (report_code) REFERENCES emergency_reports(report_code) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_patrol_report ON patrol_assignments(report_code);
  `);
}
