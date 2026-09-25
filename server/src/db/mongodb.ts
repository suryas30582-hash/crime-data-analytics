import mongoose, { Schema, Document, Model } from 'mongoose';

// Track connection state
let mongoConnected = false;

export function isMongoConnected(): boolean {
  return mongoConnected && mongoose.connection.readyState === 1;
}

// -------------------------------------------------------------
// USER SCHEMA & MODEL
// -------------------------------------------------------------
export interface IUserDoc extends Document {
  id: string;
  email: string;
  name: string;
  password_hash: string;
  role: 'user' | 'police' | 'admin';
  roles?: string[];
  badge_number?: string;
  station?: string;
  department?: string;
  phone?: string;
  status: 'active' | 'suspended';
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUserDoc>(
  {
    id: { type: String, required: true, unique: true, index: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    name: { type: String, required: true, trim: true },
    password_hash: { type: String, required: true },
    role: { type: String, enum: ['user', 'police', 'admin'], default: 'user', index: true },
    roles: [{ type: String }],
    badge_number: { type: String, default: null },
    station: { type: String, default: null },
    department: { type: String, default: null },
    phone: { type: String, default: null },
    status: { type: String, enum: ['active', 'suspended'], default: 'active' }
  },
  { timestamps: true }
);

export const UserModel: Model<IUserDoc> = mongoose.models.User || mongoose.model<IUserDoc>('User', UserSchema);

// -------------------------------------------------------------
// INCIDENT REPORT SCHEMA & MODEL
// -------------------------------------------------------------
export interface IStatusTimelineItem {
  status: string;
  timestamp: Date;
  updated_by_name?: string;
  updated_by_role?: string;
  note?: string;
}

export interface IPatrolAssignmentSubDoc {
  unit_name: string;
  vehicle_type: string;
  officer_in_charge: string;
  contact_number?: string;
  eta_minutes: number;
  dispatch_notes?: string;
  assigned_at: Date;
  resolved_at?: Date;
}

export interface IIncidentReportDoc extends Document {
  report_code: string;
  user_id?: string;
  citizen_name: string;
  citizen_phone?: string;
  citizen_email?: string;
  incident_type: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  description: string;
  photo_url?: string | null;
  photo_size?: number | null;
  photo_mime_type?: string | null;
  audio_url?: string | null;
  audio_duration?: number | null;
  audio_size?: number | null;
  audio_mime_type?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  location_address?: string;
  state?: string;
  district?: string;
  city?: string;
  status: 'RECEIVED' | 'UNDER_REVIEW' | 'INVESTIGATING' | 'PATROL_ASSIGNED' | 'RESPONDING' | 'RESOLVED' | 'CLOSED';
  status_timeline: IStatusTimelineItem[];
  officer_notes?: string;
  assigned_officer_id?: string;
  assigned_officer_name?: string;
  patrol_assignment?: IPatrolAssignmentSubDoc | null;
  createdAt: Date;
  updatedAt: Date;
}

const IncidentReportSchema = new Schema<IIncidentReportDoc>(
  {
    report_code: { type: String, required: true, unique: true, index: true },
    user_id: { type: String, index: true, default: null },
    citizen_name: { type: String, required: true, default: 'Anonymous Citizen' },
    citizen_phone: { type: String, default: null },
    citizen_email: { type: String, default: null },
    incident_type: { type: String, required: true, index: true },
    severity: {
      type: String,
      enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'],
      default: 'HIGH',
      index: true
    },
    description: { type: String, required: true },
    photo_url: { type: String, default: null },
    photo_size: { type: Number, default: null },
    photo_mime_type: { type: String, default: null },
    audio_url: { type: String, default: null },
    audio_duration: { type: Number, default: null },
    audio_size: { type: Number, default: null },
    audio_mime_type: { type: String, default: null },
    latitude: { type: Number, default: null },
    longitude: { type: Number, default: null },
    location_address: { type: String, default: 'Location coordinates provided' },
    state: { type: String, default: 'Tamil Nadu', index: true },
    district: { type: String, default: 'Chennai', index: true },
    city: { type: String, default: 'Chennai', index: true },
    status: {
      type: String,
      enum: ['RECEIVED', 'UNDER_REVIEW', 'INVESTIGATING', 'PATROL_ASSIGNED', 'RESPONDING', 'RESOLVED', 'CLOSED'],
      default: 'RECEIVED',
      index: true
    },
    status_timeline: [
      {
        status: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
        updated_by_name: { type: String, default: 'System' },
        updated_by_role: { type: String, default: 'system' },
        note: { type: String, default: '' }
      }
    ],
    officer_notes: { type: String, default: '' },
    assigned_officer_id: { type: String, default: null },
    assigned_officer_name: { type: String, default: null },
    patrol_assignment: {
      unit_name: { type: String },
      vehicle_type: { type: String },
      officer_in_charge: { type: String },
      contact_number: { type: String },
      eta_minutes: { type: Number, default: 5 },
      dispatch_notes: { type: String },
      assigned_at: { type: Date, default: Date.now },
      resolved_at: { type: Date }
    }
  },
  { timestamps: true }
);

export const IncidentReportModel: Model<IIncidentReportDoc> =
  mongoose.models.IncidentReport || mongoose.model<IIncidentReportDoc>('IncidentReport', IncidentReportSchema);

// -------------------------------------------------------------
// POLICE ACTION LOG SCHEMA & MODEL
// -------------------------------------------------------------
export interface IPoliceActionDoc extends Document {
  report_code: string;
  officer_id: string;
  officer_name: string;
  officer_badge?: string;
  action_type: 'STATUS_UPDATE' | 'NOTE_ADDED' | 'PATROL_DISPATCHED' | 'MEDIA_DELETED' | 'INVESTIGATION_OPENED' | 'CASE_CLOSED';
  previous_status?: string;
  new_status?: string;
  notes?: string;
  unit_assigned?: string;
  timestamp: Date;
}

const PoliceActionSchema = new Schema<IPoliceActionDoc>(
  {
    report_code: { type: String, required: true, index: true },
    officer_id: { type: String, required: true, index: true },
    officer_name: { type: String, required: true },
    officer_badge: { type: String, default: null },
    action_type: {
      type: String,
      enum: ['STATUS_UPDATE', 'NOTE_ADDED', 'PATROL_DISPATCHED', 'MEDIA_DELETED', 'INVESTIGATION_OPENED', 'CASE_CLOSED'],
      required: true
    },
    previous_status: { type: String },
    new_status: { type: String },
    notes: { type: String },
    unit_assigned: { type: String },
    timestamp: { type: Date, default: Date.now, index: true }
  }
);

export const PoliceActionModel: Model<IPoliceActionDoc> =
  mongoose.models.PoliceAction || mongoose.model<IPoliceActionDoc>('PoliceAction', PoliceActionSchema);

// -------------------------------------------------------------
// DATASET SCHEMA & MODEL
// -------------------------------------------------------------
export interface IDatasetDoc extends Document {
  id: string;
  name: string;
  description: string;
  record_count: number;
  created_by?: string;
  is_default: number;
  createdAt: Date;
  updatedAt: Date;
}

const DatasetSchema = new Schema<IDatasetDoc>(
  {
    id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    record_count: { type: Number, default: 0 },
    created_by: { type: String, default: 'System' },
    is_default: { type: Number, default: 0, index: true }
  },
  { timestamps: true }
);

export const DatasetModel: Model<IDatasetDoc> =
  mongoose.models.Dataset || mongoose.model<IDatasetDoc>('Dataset', DatasetSchema);

// -------------------------------------------------------------
// CRIME RECORD SCHEMA & MODEL
// -------------------------------------------------------------
export interface ICrimeRecordDoc extends Document {
  dataset_id: string;
  crime_id: string;
  date: string;
  time: string;
  year: number;
  month: number;
  crime_type: string;
  city: string;
  state: string;
  district: string;
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
  createdAt: Date;
  updatedAt: Date;
}

const CrimeRecordSchema = new Schema<ICrimeRecordDoc>(
  {
    dataset_id: { type: String, required: true, index: true },
    crime_id: { type: String, required: true, index: true },
    date: { type: String, required: true },
    time: { type: String, default: '12:00' },
    year: { type: Number, required: true, index: true },
    month: { type: Number, required: true, index: true },
    crime_type: { type: String, required: true, index: true },
    city: { type: String, required: true, index: true },
    state: { type: String, required: true, index: true },
    district: { type: String, required: true, index: true },
    location: { type: String, default: 'Public Area' },
    victim_age: { type: Number, default: null },
    victim_gender: { type: String, default: null },
    suspect_age: { type: Number, default: null },
    suspect_gender: { type: String, default: null },
    weapon_used: { type: String, default: null },
    case_status: { type: String, required: true, index: true },
    latitude: { type: Number, default: null },
    longitude: { type: Number, default: null },
    crime_severity: { type: String, default: 'Medium', index: true },
    police_station: { type: String, default: 'Station' },
    arrest_made: { type: String, default: 'No' },
    incident_day: { type: String, default: 'Monday' },
    investigation_days: { type: Number, default: null }
  },
  { timestamps: true }
);

export const CrimeRecordModel: Model<ICrimeRecordDoc> =
  mongoose.models.CrimeRecord || mongoose.model<ICrimeRecordDoc>('CrimeRecord', CrimeRecordSchema);

// -------------------------------------------------------------
// MONGOOSE CONNECTION MANAGER
// -------------------------------------------------------------
export async function connectMongoDB(): Promise<boolean> {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    console.warn(`[MongoDB Atlas] Notice: MONGODB_URI environment variable is not defined.`);
    mongoConnected = false;
    return false;
  }

  const sanitizedUri = mongoUri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@');

  try {
    mongoose.set('strictQuery', false);
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 15000,
      connectTimeoutMS: 15000
    });
    mongoConnected = true;
    console.log(`[MongoDB Atlas] ✅ Successfully connected to database at: ${sanitizedUri}`);
    return true;
  } catch (error: any) {
    mongoConnected = false;
    console.error(`[MongoDB Atlas] ❌ Failed to connect to MongoDB Atlas (${sanitizedUri}): ${error.message}`);
    console.warn(`[MongoDB Atlas] Operating in resilient fallback mode with local database storage.`);
    return false;
  }
}
