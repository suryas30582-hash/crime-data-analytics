import * as xlsx from 'xlsx';
import path from 'path';
import fs from 'fs';
import { db, initDatabase } from './schema';
import { CrimeRecord } from '../types';
import bcrypt from 'bcryptjs';
import { UserModel, isMongoConnected } from './mongodb';

const cityToDistrictMap: Record<string, string> = {
  'Chennai': 'Chennai',
  'Coimbatore': 'Coimbatore',
  'Madurai': 'Madurai',
  'Tiruchirappalli': 'Tiruchirappalli',
  'Salem': 'Salem',
  'Tirunelveli': 'Tirunelveli',
  'Tiruppur': 'Tiruppur',
  'Erode': 'Erode',
  'Vellore': 'Vellore',
  'Thoothukudi': 'Thoothukudi',
  'Dindigul': 'Dindigul',
  'Thanjavur': 'Thanjavur',
  'Ranipet': 'Ranipet',
  'Sivakasi': 'Virudhunagar',
  'Karur': 'Karur',
  'Hosur': 'Krishnagiri',
  'Nagercoil': 'Kanyakumari',
  'Kanchipuram': 'Kanchipuram',
  'Kumarapalayam': 'Namakkal',
  'Karaikkudi': 'Sivaganga',
  'Neyveli': 'Cuddalore',
  'Cuddalore': 'Cuddalore',
  'Kumbakonam': 'Thanjavur',
  'Tiruvannamalai': 'Tiruvannamalai',
  'Pollachi': 'Coimbatore',
  'Rajapalayam': 'Virudhunagar',
  'Gudiyatham': 'Vellore',
  'Pudukkottai': 'Pudukkottai',
  'Vaniyambadi': 'Tirupattur',
  'Ambur': 'Tirupattur',
  'Nagapattinam': 'Nagapattinam',
  'Mumbai': 'Mumbai City',
  'Delhi': 'Central Delhi',
  'Bengaluru': 'Bengaluru Urban',
  'Bangalore': 'Bengaluru Urban',
  'Hyderabad': 'Hyderabad',
  'Ahmedabad': 'Ahmedabad',
  'Kolkata': 'Kolkata',
  'Surat': 'Surat',
  'Pune': 'Pune',
  'Jaipur': 'Jaipur',
  'Lucknow': 'Lucknow',
  'Kanpur': 'Kanpur Nagar',
  'Nagpur': 'Nagpur',
  'Indore': 'Indore',
  'Thane': 'Thane',
  'Bhopal': 'Bhopal',
  'Visakhapatnam': 'Visakhapatnam',
  'Pimpri-Chinchwad': 'Pune',
  'Patna': 'Patna',
  'Vadodara': 'Vadodara',
  'Ghaziabad': 'Ghaziabad',
  'Ludhiana': 'Ludhiana',
  'Agra': 'Agra',
  'Nashik': 'Nashik',
  'Faridabad': 'Faridabad',
  'Meerut': 'Meerut',
  'Rajkot': 'Rajkot',
  'Kalyan-Dombivli': 'Thane',
  'Vasai-Virar': 'Palghar',
  'Varanasi': 'Varanasi',
  'Srinagar': 'Srinagar',
  'Aurangabad': 'Aurangabad',
  'Dhanbad': 'Dhanbad',
  'Amritsar': 'Amritsar',
  'Navi Mumbai': 'Thane',
  'Allahabad': 'Prayagraj',
  'Prayagraj': 'Prayagraj',
  'Ranchi': 'Ranchi',
  'Howrah': 'Howrah',
  'Jabalpur': 'Jabalpur',
  'Gwalior': 'Gwalior',
  'Vijayawada': 'NTR',
  'Jodhpur': 'Jodhpur',
  'Raipur': 'Raipur',
  'Kota': 'Kota',
  'Guwahati': 'Kamrup Metropolitan',
  'Chandigarh': 'Chandigarh',
  'Solapur': 'Solapur',
  'Hubballi-Dharwad': 'Dharwad',
  'Bareilly': 'Bareilly',
  'Moradabad': 'Moradabad',
  'Mysuru': 'Mysuru',
  'Gurugram': 'Gurugram',
  'Aligarh': 'Aligarh',
  'Jalandhar': 'Jalandhar',
  'Bhubaneswar': 'Khurda',
  'Kochi': 'Ernakulam',
  'Thiruvananthapuram': 'Thiruvananthapuram',
  'Kozhikode': 'Kozhikode',
  'Dehradun': 'Dehradun',
  'Shimla': 'Shimla',
  'Panaji': 'North Goa',
  'Puducherry': 'Puducherry',
  'Port Blair': 'South Andaman',
  'Gangtok': 'East Sikkim',
  'Itanagar': 'Papum Pare',
  'Kohima': 'Kohima',
  'Imphal': 'Imphal West',
  'Aizawl': 'Aizawl',
  'Agartala': 'West Tripura',
  'Shillong': 'East Khasi Hills'
};

export function getDistrictForCity(city: string, state: string): string {
  if (cityToDistrictMap[city]) return cityToDistrictMap[city];
  return `${city} District`;
}

export function parseExcelFile(filePath: string): any[] {
  if (!fs.existsSync(filePath)) {
    console.warn(`File not found: ${filePath}`);
    return [];
  }
  const workbook = xlsx.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  return xlsx.utils.sheet_to_json(worksheet, { defval: '' });
}

export async function seedDefaultUsers() {
  const salt = bcrypt.genSaltSync(10);
  const defaultUserHash = bcrypt.hashSync('password123', salt);
  const adminPassword = process.env.ADMIN_PASSWORD || 'AdminSecret2026!';
  const policePassword = process.env.POLICE_PASSWORD || 'PoliceSecret2026!';

  const adminHash = bcrypt.hashSync(adminPassword, salt);
  const policeHash = bcrypt.hashSync(policePassword, salt);

  const defaultUsers = [
    {
      id: 'usr_admin_surya',
      email: 'suryas30582@gmail.com',
      name: 'Surya (Admin & Citizen)',
      hash: adminHash,
      role: 'admin',
      roles: ['admin', 'user'],
      badge_number: 'ADM-HQ-001',
      station: 'National Intelligence Bureau',
      department: 'State Security & Analytics',
      phone: '+91 98400 00001'
    },
    {
      id: 'usr_police_ramiya',
      email: 'rramiya697@gmail.com',
      name: 'Inspector Ramiya (Police & Citizen)',
      hash: policeHash,
      role: 'police',
      roles: ['police', 'user'],
      badge_number: 'TN-POL-9090',
      station: 'Chennai Headquarters',
      department: 'Special Crime Investigation Branch',
      phone: '+91 98401 00002'
    },
    {
      id: 'usr_admin_001',
      email: 'admin@crimelytixs.gov.in',
      name: 'Director Raman (Admin)',
      hash: adminHash,
      role: 'admin',
      roles: ['admin', 'user'],
      badge_number: 'ADM-HQ-01',
      station: 'National Intelligence Bureau',
      department: 'State Security & Analytics',
      phone: '+91 98400 11111'
    },
    {
      id: 'usr_police_001',
      email: 'officer.vijay@police.gov.in',
      name: 'Inspector Vijay IPS',
      hash: policeHash,
      role: 'police',
      roles: ['police', 'user'],
      badge_number: 'TN-POL-4042',
      station: 'Chennai Central Police Station',
      department: 'Crime Investigation Division',
      phone: '+91 98401 22222'
    },
    {
      id: 'usr_citizen_001',
      email: 'citizen.sharma@example.com',
      name: 'Aarav Sharma (Citizen)',
      hash: defaultUserHash,
      role: 'user',
      roles: ['user'],
      badge_number: null,
      station: null,
      department: 'Citizen Community',
      phone: '+91 98401 33333'
    }
  ];

  for (const u of defaultUsers) {
    const rolesJson = JSON.stringify(u.roles);
    const existing = db.prepare('SELECT id FROM users WHERE LOWER(email) = ?').get(u.email.toLowerCase());
    
    if (!existing) {
      try {
        db.prepare(`
          INSERT INTO users (id, email, name, password_hash, role, roles, badge_number, station, department, phone, status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
        `).run(u.id, u.email.toLowerCase(), u.name, u.hash, u.role, rolesJson, u.badge_number, u.station, u.department, u.phone);
      } catch {
        db.prepare(`
          INSERT INTO users (id, email, name, password_hash, role, roles)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(u.id, u.email.toLowerCase(), u.name, u.hash, u.role, rolesJson);
      }
    } else {
      // Ensure password_hash and roles column are updated for existing accounts
      try {
        db.prepare('UPDATE users SET password_hash = ?, roles = ?, role = ? WHERE LOWER(email) = ?').run(u.hash, rolesJson, u.role, u.email.toLowerCase());
      } catch (err: any) {
        // ignore
      }
    }

    if (isMongoConnected()) {
      try {
        await UserModel.updateOne(
          { email: u.email.toLowerCase() },
          {
            $set: {
              id: u.id,
              email: u.email.toLowerCase(),
              name: u.name,
              password_hash: u.hash,
              role: u.role as any,
              roles: u.roles,
              badge_number: u.badge_number || undefined,
              station: u.station || undefined,
              department: u.department || undefined,
              phone: u.phone || undefined,
              status: 'active'
            }
          },
          { upsert: true }
        );
      } catch (err) {
        // ignore
      }
    }
  }
}

export function seedDatabase() {
  initDatabase();
  seedDefaultUsers();

  const datasetCountRow = db.prepare('SELECT COUNT(*) as count FROM datasets').get() as { count: number };
  if (datasetCountRow && datasetCountRow.count > 0) {
    console.log('Database already contains datasets. Skipping initial seed.');
    return;
  }

  console.log('Seeding initial datasets from Excel files...');

  const insertDataset = db.prepare(`
    INSERT INTO datasets (id, name, description, record_count, created_by, is_default)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const insertRecord = db.prepare(`
    INSERT INTO crime_records (
      dataset_id, crime_id, date, time, year, month, crime_type,
      city, state, district, location, victim_age, victim_gender,
      suspect_age, suspect_gender, weapon_used, case_status,
      latitude, longitude, crime_severity, police_station,
      arrest_made, incident_day, investigation_days
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?
    )
  `);

  const insertMany = (records: CrimeRecord[], datasetId: string, datasetName: string, desc: string, isDefault: number) => {
    db.exec('BEGIN TRANSACTION;');
    try {
      insertDataset.run(
        datasetId,
        datasetName,
        desc,
        records.length,
        'System Administrator',
        isDefault
      );

      for (const r of records) {
        insertRecord.run(
          r.dataset_id, r.crime_id, r.date, r.time, r.year, r.month, r.crime_type,
          r.city, r.state, r.district || '', r.location, r.victim_age ?? null, r.victim_gender ?? null,
          r.suspect_age ?? null, r.suspect_gender ?? null, r.weapon_used ?? null, r.case_status,
          r.latitude ?? null, r.longitude ?? null, r.crime_severity, r.police_station,
          r.arrest_made, r.incident_day, r.investigation_days ?? null
        );
      }
      db.exec('COMMIT;');
    } catch (e) {
      db.exec('ROLLBACK;');
      throw e;
    }
  };

  // 1. Ingest India Dataset
  const indiaPath = path.resolve('c:/Users/surya/OneDrive/Desktop/crime_data_set/India_Crime_Data_Analytics_2026_2027_2000_Rows (1).xlsx');
  const indiaRows = parseExcelFile(indiaPath);

  if (indiaRows.length > 0) {
    const records: CrimeRecord[] = indiaRows.map((row, idx) => {
      let rawDate = String(row.Date || '2026-01-01').trim();
      if (!isNaN(Number(rawDate)) && Number(rawDate) > 30000 && Number(rawDate) < 60000) {
        const d = new Date(Math.round((Number(rawDate) - 25569) * 86400 * 1000));
        rawDate = d.toISOString().split('T')[0];
      }
      const parsedDate = new Date(rawDate);
      const year = !isNaN(parsedDate.getFullYear()) ? parsedDate.getFullYear() : 2026;
      const month = !isNaN(parsedDate.getMonth()) ? parsedDate.getMonth() + 1 : 1;
      const city = String(row.City || 'Unknown').trim();
      const state = String(row.State || 'Unknown').trim();
      const district = row.District ? String(row.District).trim() : getDistrictForCity(city, state);

      return {
        dataset_id: 'ds_india_all',
        crime_id: String(row.Crime_ID || `CR_IN_${idx + 1}`).trim(),
        date: rawDate,
        time: String(row.Time || '12:00').trim(),
        year,
        month,
        crime_type: String(row.Crime_Type || 'Other').trim(),
        city,
        state,
        district,
        location: String(row.Location || 'Public Area').trim(),
        victim_age: row.Victim_Age !== '' && !isNaN(Number(row.Victim_Age)) ? Number(row.Victim_Age) : null,
        victim_gender: row.Victim_Gender ? String(row.Victim_Gender).trim() : null,
        suspect_age: row.Suspect_Age !== '' && !isNaN(Number(row.Suspect_Age)) ? Number(row.Suspect_Age) : null,
        suspect_gender: row.Suspect_Gender ? String(row.Suspect_Gender).trim() : null,
        weapon_used: row.Weapon_Used && String(row.Weapon_Used).toLowerCase() !== 'nan' ? String(row.Weapon_Used).trim() : null,
        case_status: String(row.Case_Status || 'Under Investigation').trim(),
        latitude: row.Latitude !== '' && !isNaN(Number(row.Latitude)) ? Number(row.Latitude) : null,
        longitude: row.Longitude !== '' && !isNaN(Number(row.Longitude)) ? Number(row.Longitude) : null,
        crime_severity: String(row.Crime_Severity || 'Medium').trim(),
        police_station: String(row.Police_Station || 'Central Station').trim(),
        arrest_made: String(row.Arrest_Made || 'No').trim(),
        incident_day: String(row.Incident_Day || 'Monday').trim(),
        investigation_days: row.Investigation_Days !== '' && !isNaN(Number(row.Investigation_Days)) ? Number(row.Investigation_Days) : null
      };
    });

    insertMany(records, 'ds_india_all', 'India Crime Dataset', 'Official India-wide comprehensive crime intelligence dataset spanning multiple States and Union Territories (2,000 verified incident records).', 1);
    console.log(`Ingested ${records.length} records into India Crime Dataset.`);
  }

  // 2. Ingest Tamil Nadu Dataset
  const tnPath = path.resolve('c:/Users/surya/OneDrive/Desktop/Crime_Data_Analytics/cleaned_crime_data.xlsx');
  const tnRows = parseExcelFile(tnPath);

  if (tnRows.length > 0) {
    const records: CrimeRecord[] = tnRows.map((row, idx) => {
      let rawDate = String(row.Date || '2023-01-01').trim();
      if (!isNaN(Number(rawDate)) && Number(rawDate) > 30000 && Number(rawDate) < 60000) {
        const d = new Date(Math.round((Number(rawDate) - 25569) * 86400 * 1000));
        rawDate = d.toISOString().split('T')[0];
      }
      const parsedDate = new Date(rawDate);
      const year = !isNaN(parsedDate.getFullYear()) ? parsedDate.getFullYear() : 2023;
      const month = !isNaN(parsedDate.getMonth()) ? parsedDate.getMonth() + 1 : 1;
      const city = String(row.City || 'Chennai').trim();
      const state = String(row.State || 'Tamil Nadu').trim();
      const district = row.District ? String(row.District).trim() : getDistrictForCity(city, state);

      return {
        dataset_id: 'ds_tamil_nadu',
        crime_id: String(row.Crime_ID || `CR_TN_${idx + 1}`).trim(),
        date: rawDate,
        time: String(row.Time || '12:00').trim(),
        year,
        month,
        crime_type: String(row.Crime_Type || 'Other').trim(),
        city,
        state,
        district,
        location: String(row.Location || 'Public Area').trim(),
        victim_age: row.Victim_Age !== '' && !isNaN(Number(row.Victim_Age)) ? Number(row.Victim_Age) : null,
        victim_gender: row.Victim_Gender ? String(row.Victim_Gender).trim() : null,
        suspect_age: row.Suspect_Age !== '' && !isNaN(Number(row.Suspect_Age)) ? Number(row.Suspect_Age) : null,
        suspect_gender: row.Suspect_Gender ? String(row.Suspect_Gender).trim() : null,
        weapon_used: row.Weapon_Used && String(row.Weapon_Used).toLowerCase() !== 'nan' ? String(row.Weapon_Used).trim() : null,
        case_status: String(row.Case_Status || 'Under Investigation').trim(),
        latitude: row.Latitude !== '' && !isNaN(Number(row.Latitude)) ? Number(row.Latitude) : null,
        longitude: row.Longitude !== '' && !isNaN(Number(row.Longitude)) ? Number(row.Longitude) : null,
        crime_severity: String(row.Crime_Severity || 'Medium').trim(),
        police_station: String(row.Police_Station || 'West Station').trim(),
        arrest_made: String(row.Arrest_Made || 'No').trim(),
        incident_day: String(row.Incident_Day || 'Monday').trim(),
        investigation_days: row.Investigation_Days !== '' && !isNaN(Number(row.Investigation_Days)) ? Number(row.Investigation_Days) : null
      };
    });

    insertMany(records, 'ds_tamil_nadu', 'Tamil Nadu Crime Dataset', 'Dedicated regional dataset for Tamil Nadu covering major districts, cities, crime types and resolution parameters (1,000 verified incident records).', 0);
    console.log(`Ingested ${records.length} records into Tamil Nadu Crime Dataset.`);
  }
}

if (require.main === module) {
  seedDatabase();
}
