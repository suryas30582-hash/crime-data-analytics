export interface User {
  id: string;
  email: string;
  name: string;
  password_hash: string;
  role: 'admin' | 'user';
  created_at: string;
}

export interface Dataset {
  id: string;
  name: string;
  description: string;
  record_count: number;
  created_by?: string;
  created_at: string;
  is_default: number;
}

export interface CrimeRecord {
  id?: number;
  dataset_id: string;
  crime_id: string;
  date: string;
  time: string;
  year: number;
  month: number;
  crime_type: string;
  city: string;
  state: string;
  district?: string;
  location: string;
  victim_age?: number | null;
  victim_gender?: string | null;
  suspect_age?: number | null;
  suspect_gender?: string | null;
  weapon_used?: string | null;
  case_status: string;
  latitude?: number | null;
  longitude?: number | null;
  crime_severity: string;
  police_station: string;
  arrest_made: string;
  incident_day: string;
  investigation_days?: number | null;
}

export interface FilterParams {
  datasetId?: string;
  state?: string;
  district?: string;
  city?: string;
  year?: number | string;
  crimeType?: string;
  caseStatus?: string;
  severity?: string;
  arrestMade?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
}
