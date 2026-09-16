export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
  created_at?: string;
}

export interface Dataset {
  id: string;
  name: string;
  description: string;
  actual_record_count: number;
  min_year?: number;
  max_year?: number;
  state_count?: number;
  city_count?: number;
  created_by?: string;
  created_at: string;
  is_default: number;
}

export interface CrimeRecord {
  id: number;
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

export interface FilterState {
  datasetId: string;
  state: string;
  district: string;
  city: string;
  year: string;
  crimeType: string;
  caseStatus: string;
  severity: string;
  arrestMade: string;
  search: string;
}

export interface AnalyticsKPIs {
  total_crimes: number;
  solved_cases: number;
  unsolved_cases: number;
  arrests_made: number;
  high_severity_crimes: number;
  avg_investigation_days: number;
  solve_rate_percentage: number;
  arrest_rate_percentage: number;
}

export interface ChartDataPoint {
  name: string;
  count: number;
  [key: string]: any;
}

export interface AnalyticsCharts {
  stateData: ChartDataPoint[];
  districtData: ChartDataPoint[];
  cityData: ChartDataPoint[];
  yearData: ChartDataPoint[];
  monthData: ChartDataPoint[];
  crimeTypeData: ChartDataPoint[];
  severityData: ChartDataPoint[];
  caseStatusData: ChartDataPoint[];
  arrestData: ChartDataPoint[];
  genderData: ChartDataPoint[];
  dayData: ChartDataPoint[];
  weaponData: ChartDataPoint[];
  policeStationData: ChartDataPoint[];
}

export interface PredictionData {
  hasSufficientData: boolean;
  message?: string;
  totalRecordsAnalyzed?: number;
  growthRate?: number;
  projectedNextPeriodCrimes?: number;
  historicalTimeline?: { year: number; month: number; crime_count: number }[];
  topCrimeTypes?: { crime_type: string; count: number; percentage: number; high_severity_count: number }[];
  topLocations?: { location: string; city: string; state: string; incident_count: number; incident_share: number }[];
  peakDays?: { day: string; count: number; percentage: number }[];
  timeSlots?: { slot: string; count: number }[];
  solveProbability?: number;
  arrestProbability?: number;
  avgInvestigationDurationDays?: number;
}

export interface RegionReportData {
  hasData: boolean;
  message?: string;
  region: {
    state: string;
    district: string;
    city: string;
    year: string;
  };
  summary: {
    totalCrimes: number;
    solvedCases: number;
    unsolvedCases: number;
    solveRate: number;
    arrestsMade: number;
    arrestRate: number;
    highSeverity: number;
    mediumSeverity: number;
    lowSeverity: number;
    avgInvestigationDays: number;
  };
  crimeTypes: { crime_type: string; count: number; percentage: number }[];
  caseStatuses: { case_status: string; count: number; percentage: number }[];
  policeStations: { police_station: string; count: number; solved: number; arrests: number }[];
  monthlyTrend: { month: number; count: number }[];
  generatedAt: string;
}

export interface ValidationReport {
  fileName: string;
  fileSize: number;
  totalRows: number;
  columnCount: number;
  detectedColumns: string[];
  missingRequiredColumns: string[];
  validRowCount: number;
  invalidRowCount: number;
  duplicateCount: number;
  missingValuesPerColumn: Record<string, number>;
  validationErrors: { row: number; column: string; message: string; value: any }[];
  previewRows: any[];
  parsedValidRecords: CrimeRecord[];
}

export interface EmergencyTimelineEvent {
  status: string;
  timestamp: string;
  note?: string;
}

export interface PatrolAssignment {
  id?: number;
  report_code: string;
  unit_name: string;
  vehicle_type: string;
  officer_in_charge: string;
  contact_number?: string;
  eta_minutes: number;
  dispatch_notes?: string;
  assigned_at: string;
  resolved_at?: string;
}

export interface EmergencyReport {
  id: number;
  report_code: string;
  incident_type: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  description: string;
  photo_url?: string | null;
  audio_url?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  location_address?: string;
  state?: string;
  district?: string;
  city?: string;
  citizen_name?: string;
  citizen_phone?: string;
  status: 'RECEIVED' | 'REVIEWING' | 'PATROL_ASSIGNED' | 'RESPONDING' | 'RESOLVED';
  status_timeline?: EmergencyTimelineEvent[];
  patrol_assignment?: PatrolAssignment | null;
  patrol_assignments?: PatrolAssignment[];
  created_at: string;
  updated_at: string;
}

export interface EmergencyStats {
  total_emergencies: number;
  critical_active: number;
  active_incidents: number;
  patrols_responding: number;
  resolved_count: number;
  avg_response_eta_minutes: number;
}
