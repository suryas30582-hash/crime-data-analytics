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
  `);
}
