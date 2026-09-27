-- ============================================================
-- SUPABASE SCHEMA FOR CRIME DATA ANALYTICS (CDA) PLATFORM
-- Execute this SQL in your Supabase SQL Editor (https://supabase.com/dashboard/project/_/sql)
-- This script is completely IDEMPOTENT (safe to execute multiple times without error).
-- ============================================================

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS public.users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT CHECK(role IN ('admin', 'user', 'police')) NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 2. DATASETS TABLE
CREATE TABLE IF NOT EXISTS public.datasets (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  record_count INT DEFAULT 0,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  is_default INT DEFAULT 0
);

-- 3. CRIME RECORDS TABLE
CREATE TABLE IF NOT EXISTS public.crime_records (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  dataset_id TEXT NOT NULL REFERENCES public.datasets(id) ON DELETE CASCADE,
  crime_id TEXT NOT NULL,
  date TEXT NOT NULL,
  time TEXT,
  year INT NOT NULL,
  month INT NOT NULL,
  crime_type TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  district TEXT,
  location TEXT,
  victim_age INT,
  victim_gender TEXT,
  suspect_age INT,
  suspect_gender TEXT,
  weapon_used TEXT,
  case_status TEXT NOT NULL,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  crime_severity TEXT NOT NULL,
  police_station TEXT,
  arrest_made TEXT NOT NULL,
  incident_day TEXT,
  investigation_days INT
);

CREATE INDEX IF NOT EXISTS idx_records_dataset ON public.crime_records(dataset_id);
CREATE INDEX IF NOT EXISTS idx_records_state ON public.crime_records(state);
CREATE INDEX IF NOT EXISTS idx_records_district ON public.crime_records(district);
CREATE INDEX IF NOT EXISTS idx_records_city ON public.crime_records(city);
CREATE INDEX IF NOT EXISTS idx_records_year ON public.crime_records(year);
CREATE INDEX IF NOT EXISTS idx_records_type ON public.crime_records(crime_type);
CREATE INDEX IF NOT EXISTS idx_records_status ON public.crime_records(case_status);
CREATE INDEX IF NOT EXISTS idx_records_severity ON public.crime_records(crime_severity);

-- 4. EMERGENCY REPORTS TABLE (With 10-Stage Incident Lifecycle & Timestamps)
CREATE TABLE IF NOT EXISTS public.emergency_reports (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  report_code TEXT UNIQUE NOT NULL,
  incident_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'HIGH',
  description TEXT NOT NULL,
  photo_url TEXT,
  audio_url TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  location_address TEXT,
  state TEXT,
  district TEXT,
  city TEXT,
  citizen_name TEXT,
  citizen_phone TEXT,
  status TEXT NOT NULL DEFAULT 'INCIDENT_REPORTED',
  status_timeline JSONB DEFAULT '[]'::jsonb,
  reported_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  verified_at TIMESTAMPTZ,
  priority_assigned_at TIMESTAMPTZ,
  patrol_assigned_at TIMESTAMPTZ,
  en_route_at TIMESTAMPTZ,
  arrived_at TIMESTAMPTZ,
  evidence_collected_at TIMESTAMPTZ,
  officer_report_submitted_at TIMESTAMPTZ,
  investigation_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  escalated_at TIMESTAMPTZ,
  delay_flagged_at TIMESTAMPTZ,
  investigation_notes TEXT,
  evidence_details TEXT,
  action_taken TEXT,
  scene_photos JSONB DEFAULT '[]'::jsonb,
  escalation_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_emergency_code ON public.emergency_reports(report_code);
CREATE INDEX IF NOT EXISTS idx_emergency_status ON public.emergency_reports(status);
CREATE INDEX IF NOT EXISTS idx_emergency_severity ON public.emergency_reports(severity);

-- 5. POLICE STATIONS TABLE
CREATE TABLE IF NOT EXISTS public.police_stations (
  id TEXT PRIMARY KEY,
  station_code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  state TEXT NOT NULL,
  district TEXT NOT NULL,
  city TEXT NOT NULL,
  address TEXT,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  contact_number TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ps_state ON public.police_stations(state);
CREATE INDEX IF NOT EXISTS idx_ps_district ON public.police_stations(district);
CREATE INDEX IF NOT EXISTS idx_ps_city ON public.police_stations(city);

-- 6. PATROL UNITS TABLE
CREATE TABLE IF NOT EXISTS public.patrol_units (
  id TEXT PRIMARY KEY,
  station_id TEXT NOT NULL REFERENCES public.police_stations(id) ON DELETE CASCADE,
  unit_code TEXT UNIQUE NOT NULL,
  vehicle_type TEXT NOT NULL,
  officer_in_charge TEXT NOT NULL,
  contact_number TEXT,
  status TEXT NOT NULL DEFAULT 'AVAILABLE',
  current_latitude DOUBLE PRECISION,
  current_longitude DOUBLE PRECISION,
  last_updated TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_patrol_station ON public.patrol_units(station_id);
CREATE INDEX IF NOT EXISTS idx_patrol_status ON public.patrol_units(status);

-- 7. PATROL ASSIGNMENTS TABLE
CREATE TABLE IF NOT EXISTS public.patrol_assignments (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  report_code TEXT NOT NULL REFERENCES public.emergency_reports(report_code) ON DELETE CASCADE,
  unit_name TEXT NOT NULL,
  vehicle_type TEXT NOT NULL,
  officer_in_charge TEXT NOT NULL,
  contact_number TEXT,
  eta_minutes INT NOT NULL DEFAULT 5,
  dispatch_notes TEXT,
  station_id TEXT,
  station_name TEXT,
  patrol_id TEXT,
  distance_km DOUBLE PRECISION,
  dispatch_type TEXT DEFAULT 'AUTOMATIC',
  status TEXT DEFAULT 'ASSIGNED',
  assigned_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_patrol_report ON public.patrol_assignments(report_code);

-- 6. BACKUP REQUESTS TABLE
CREATE TABLE IF NOT EXISTS public.backup_requests (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  report_code TEXT NOT NULL REFERENCES public.emergency_reports(report_code) ON DELETE CASCADE,
  requested_by TEXT NOT NULL,
  reason TEXT NOT NULL,
  urgency TEXT CHECK(urgency IN ('CRITICAL', 'HIGH', 'MEDIUM')) NOT NULL DEFAULT 'HIGH',
  status TEXT DEFAULT 'PENDING',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_backup_report ON public.backup_requests(report_code);

-- 7. INCIDENT AUDIT TRAIL TABLE
CREATE TABLE IF NOT EXISTS public.incident_audit_trail (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  report_code TEXT NOT NULL,
  user_id TEXT,
  user_name TEXT NOT NULL,
  action TEXT NOT NULL,
  previous_status TEXT,
  new_status TEXT,
  details TEXT,
  timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_report ON public.incident_audit_trail(report_code);

-- 8. SYSTEM AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id TEXT,
  action TEXT NOT NULL,
  details TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.datasets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crime_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergency_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patrol_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backup_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incident_audit_trail ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Allow public read access to crime intelligence datasets and records
DROP POLICY IF EXISTS "Allow public read access on datasets" ON public.datasets;
CREATE POLICY "Allow public read access on datasets" ON public.datasets FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public read access on crime_records" ON public.crime_records;
CREATE POLICY "Allow public read access on crime_records" ON public.crime_records FOR SELECT USING (true);

-- Service role bypasses all RLS automatically on the backend
DROP POLICY IF EXISTS "Allow service role full access on users" ON public.users;
CREATE POLICY "Allow service role full access on users" ON public.users FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow service role full access on emergency_reports" ON public.emergency_reports;
CREATE POLICY "Allow service role full access on emergency_reports" ON public.emergency_reports FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow service role full access on patrol_assignments" ON public.patrol_assignments;
CREATE POLICY "Allow service role full access on patrol_assignments" ON public.patrol_assignments FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow service role full access on backup_requests" ON public.backup_requests;
CREATE POLICY "Allow service role full access on backup_requests" ON public.backup_requests FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow service role full access on incident_audit_trail" ON public.incident_audit_trail;
CREATE POLICY "Allow service role full access on incident_audit_trail" ON public.incident_audit_trail FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow service role full access on audit_logs" ON public.audit_logs;
CREATE POLICY "Allow service role full access on audit_logs" ON public.audit_logs FOR ALL USING (true);

-- ============================================================
-- SUPABASE STORAGE BUCKETS SETUP
-- Run this in SQL Editor to create public storage buckets
-- ============================================================

INSERT INTO storage.buckets (id, name, public) VALUES ('emergency-images', 'emergency-images', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('emergency-audio', 'emergency-audio', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('evidence-files', 'evidence-files', true) ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public Read Emergency Images" ON storage.objects;
CREATE POLICY "Public Read Emergency Images" ON storage.objects FOR SELECT USING (bucket_id = 'emergency-images');

DROP POLICY IF EXISTS "Public Read Emergency Audio" ON storage.objects;
CREATE POLICY "Public Read Emergency Audio" ON storage.objects FOR SELECT USING (bucket_id = 'emergency-audio');

DROP POLICY IF EXISTS "Public Read Evidence Files" ON storage.objects;
CREATE POLICY "Public Read Evidence Files" ON storage.objects FOR SELECT USING (bucket_id = 'evidence-files');

DROP POLICY IF EXISTS "Allow Upload Emergency Images" ON storage.objects;
CREATE POLICY "Allow Upload Emergency Images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'emergency-images');

DROP POLICY IF EXISTS "Allow Upload Emergency Audio" ON storage.objects;
CREATE POLICY "Allow Upload Emergency Audio" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'emergency-audio');

DROP POLICY IF EXISTS "Allow Upload Evidence Files" ON storage.objects;
CREATE POLICY "Allow Upload Evidence Files" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'evidence-files');
