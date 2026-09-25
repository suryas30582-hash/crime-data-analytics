import { Request, Response } from 'express';
import * as xlsx from 'xlsx';
import Papa from 'papaparse';
import { db } from '../db/schema';
import { DatasetModel, CrimeRecordModel, isMongoConnected } from '../db/mongodb';
import { AuthRequest } from '../middleware/auth';
import { CrimeRecord } from '../types';
import { getDistrictForCity } from '../db/seed';
import { broadcastEmergencyEvent } from './emergencyController';

const REQUIRED_COLUMNS = [
  'Crime_ID',
  'Date',
  'Time',
  'Crime_Type',
  'City',
  'State',
  'Location',
  'Victim_Age',
  'Victim_Gender',
  'Suspect_Age',
  'Suspect_Gender',
  'Weapon_Used',
  'Case_Status',
  'Latitude',
  'Crime_Severity',
  'Police_Station',
  'Arrest_Made',
  'Incident_Day',
  'Investigation_Days'
];

interface ValidationReport {
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

export function validateUploadedFile(req: AuthRequest, res: Response) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded. Please upload a valid CSV or XLSX file.' });
    }

    const fileBuffer = req.file.buffer;
    const fileName = req.file.originalname;
    const fileSize = req.file.size;
    const ext = fileName.split('.').pop()?.toLowerCase();

    let rawRows: any[] = [];

    if (ext === 'xlsx' || ext === 'xls') {
      const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      rawRows = xlsx.utils.sheet_to_json(worksheet, { defval: '' });
    } else if (ext === 'csv') {
      const csvString = fileBuffer.toString('utf-8');
      const parsed = Papa.parse(csvString, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: false
      });
      rawRows = parsed.data;
    } else {
      return res.status(400).json({ error: 'Unsupported file format. Please upload a .xlsx or .csv file.' });
    }

    if (rawRows.length === 0) {
      return res.status(400).json({ error: 'The uploaded file is empty or could not be parsed.' });
    }

    const firstRow = rawRows[0];
    const detectedColumns = Object.keys(firstRow);
    const colMap: Record<string, string> = {};

    for (const key of detectedColumns) {
      const cleanKey = key.trim().toLowerCase().replace(/[\s_-]+/g, '');
      for (const reqCol of REQUIRED_COLUMNS) {
        const cleanReq = reqCol.toLowerCase().replace(/[\s_-]+/g, '');
        if (cleanKey === cleanReq) {
          colMap[reqCol] = key;
        }
      }
    }

    const missingRequiredColumns = REQUIRED_COLUMNS.filter(reqCol => !colMap[reqCol]);

    const missingValuesPerColumn: Record<string, number> = {};
    for (const col of REQUIRED_COLUMNS) {
      missingValuesPerColumn[col] = 0;
    }

    const validationErrors: { row: number; column: string; message: string; value: any }[] = [];
    const seenCrimeIds = new Set<string>();
    let duplicateCount = 0;
    const validRecords: CrimeRecord[] = [];

    rawRows.forEach((row, idx) => {
      const rowNum = idx + 2;
      let hasFatalError = false;

      // Check Crime_ID
      const rawId = colMap['Crime_ID'] ? String(row[colMap['Crime_ID']] || '').trim() : '';
      if (!rawId) {
        missingValuesPerColumn['Crime_ID'] = (missingValuesPerColumn['Crime_ID'] || 0) + 1;
        validationErrors.push({ row: rowNum, column: 'Crime_ID', message: 'Missing Crime ID', value: '' });
        hasFatalError = true;
      } else if (seenCrimeIds.has(rawId)) {
        duplicateCount++;
        validationErrors.push({ row: rowNum, column: 'Crime_ID', message: 'Duplicate Crime ID in file', value: rawId });
      } else {
        seenCrimeIds.add(rawId);
      }

      // Check Date
      let rawDate = colMap['Date'] ? String(row[colMap['Date']] || '').trim() : '';
      if (!rawDate) {
        missingValuesPerColumn['Date'] = (missingValuesPerColumn['Date'] || 0) + 1;
        validationErrors.push({ row: rowNum, column: 'Date', message: 'Missing Date', value: '' });
        hasFatalError = true;
      } else {
        if (!isNaN(Number(rawDate)) && Number(rawDate) > 30000 && Number(rawDate) < 60000) {
          const d = new Date(Math.round((Number(rawDate) - 25569) * 86400 * 1000));
          rawDate = d.toISOString().split('T')[0];
        }
        const d = new Date(rawDate);
        if (isNaN(d.getTime())) {
          validationErrors.push({ row: rowNum, column: 'Date', message: 'Invalid Date format (expected YYYY-MM-DD)', value: rawDate });
          hasFatalError = true;
        }
      }

      // Check Crime Type
      const crimeType = colMap['Crime_Type'] ? String(row[colMap['Crime_Type']] || '').trim() : '';
      if (!crimeType) {
        missingValuesPerColumn['Crime_Type'] = (missingValuesPerColumn['Crime_Type'] || 0) + 1;
      }

      // Check City & State
      const city = colMap['City'] ? String(row[colMap['City']] || '').trim() : '';
      const state = colMap['State'] ? String(row[colMap['State']] || '').trim() : '';
      if (!city) missingValuesPerColumn['City'] = (missingValuesPerColumn['City'] || 0) + 1;
      if (!state) missingValuesPerColumn['State'] = (missingValuesPerColumn['State'] || 0) + 1;

      // Check Ages
      const rawVictimAge = colMap['Victim_Age'] ? row[colMap['Victim_Age']] : null;
      let victimAge: number | null = null;
      if (rawVictimAge !== null && rawVictimAge !== undefined && String(rawVictimAge).trim() !== '') {
        const num = Number(rawVictimAge);
        if (isNaN(num) || num < 0 || num > 125) {
          validationErrors.push({ row: rowNum, column: 'Victim_Age', message: 'Invalid Victim Age (must be 0-125)', value: rawVictimAge });
        } else {
          victimAge = num;
        }
      } else {
        missingValuesPerColumn['Victim_Age'] = (missingValuesPerColumn['Victim_Age'] || 0) + 1;
      }

      const rawSuspectAge = colMap['Suspect_Age'] ? row[colMap['Suspect_Age']] : null;
      let suspectAge: number | null = null;
      if (rawSuspectAge !== null && rawSuspectAge !== undefined && String(rawSuspectAge).trim() !== '') {
        const num = Number(rawSuspectAge);
        if (isNaN(num) || num < 0 || num > 125) {
          validationErrors.push({ row: rowNum, column: 'Suspect_Age', message: 'Invalid Suspect Age (must be 0-125)', value: rawSuspectAge });
        } else {
          suspectAge = num;
        }
      } else {
        missingValuesPerColumn['Suspect_Age'] = (missingValuesPerColumn['Suspect_Age'] || 0) + 1;
      }

      // Severity & Status
      const severity = colMap['Crime_Severity'] ? String(row[colMap['Crime_Severity']] || 'Medium').trim() : 'Medium';
      const caseStatus = colMap['Case_Status'] ? String(row[colMap['Case_Status']] || 'Under Investigation').trim() : 'Under Investigation';
      const arrestMade = colMap['Arrest_Made'] ? String(row[colMap['Arrest_Made']] || 'No').trim() : 'No';

      if (!hasFatalError) {
        const parsedDate = new Date(rawDate);
        const year = !isNaN(parsedDate.getFullYear()) ? parsedDate.getFullYear() : 2026;
        const month = !isNaN(parsedDate.getMonth()) ? parsedDate.getMonth() + 1 : 1;
        const district = getDistrictForCity(city, state);

        validRecords.push({
          dataset_id: '',
          crime_id: rawId,
          date: rawDate,
          time: colMap['Time'] ? String(row[colMap['Time']] || '12:00').trim() : '12:00',
          year,
          month,
          crime_type: crimeType || 'General Offense',
          city: city || 'Unknown City',
          state: state || 'Unknown State',
          district,
          location: colMap['Location'] ? String(row[colMap['Location']] || 'Public Area').trim() : 'Public Area',
          victim_age: victimAge,
          victim_gender: colMap['Victim_Gender'] ? String(row[colMap['Victim_Gender']] || '').trim() : null,
          suspect_age: suspectAge,
          suspect_gender: colMap['Suspect_Gender'] ? String(row[colMap['Suspect_Gender']] || '').trim() : null,
          weapon_used: colMap['Weapon_Used'] && String(row[colMap['Weapon_Used']]).toLowerCase() !== 'nan' ? String(row[colMap['Weapon_Used']]).trim() : null,
          case_status: caseStatus,
          latitude: colMap['Latitude'] && !isNaN(Number(row[colMap['Latitude']])) ? Number(row[colMap['Latitude']]) : null,
          longitude: null,
          crime_severity: severity,
          police_station: colMap['Police_Station'] ? String(row[colMap['Police_Station']] || 'Station').trim() : 'Station',
          arrest_made: arrestMade,
          incident_day: colMap['Incident_Day'] ? String(row[colMap['Incident_Day']] || 'Monday').trim() : 'Monday',
          investigation_days: colMap['Investigation_Days'] && !isNaN(Number(row[colMap['Investigation_Days']])) ? Number(row[colMap['Investigation_Days']]) : null
        });
      }
    });

    const report: ValidationReport = {
      fileName,
      fileSize,
      totalRows: rawRows.length,
      columnCount: detectedColumns.length,
      detectedColumns,
      missingRequiredColumns,
      validRowCount: validRecords.length,
      invalidRowCount: rawRows.length - validRecords.length,
      duplicateCount,
      missingValuesPerColumn,
      validationErrors: validationErrors.slice(0, 50),
      previewRows: rawRows.slice(0, 10),
      parsedValidRecords: validRecords
    };

    return res.json(report);
  } catch (error: any) {
    console.error('validateUploadedFile error:', error);
    return res.status(500).json({ error: `File processing error: ${error.message || 'Unknown error'}` });
  }
}

export async function commitImport(req: AuthRequest, res: Response) {
  try {
    const { datasetName, datasetDescription, targetDatasetId, records } = req.body;

    if (!records || !Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ error: 'No valid records provided for database import.' });
    }

    let activeDatasetId = targetDatasetId;
    let finalDatasetName = datasetName?.trim() || `Uploaded Dataset (${new Date().toLocaleDateString()})`;
    const uploaderRole = req.user?.role || 'user';
    const uploaderInfo = `${req.user?.name || 'User'} (${uploaderRole.toUpperCase()})`;

    if (!activeDatasetId || activeDatasetId === 'new') {
      const desc = datasetDescription || `Uploaded by ${uploaderInfo} on ${new Date().toLocaleString()}`;
      activeDatasetId = `ds_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      db.prepare(`
        INSERT INTO datasets (id, name, description, record_count, created_by, is_default)
        VALUES (?, ?, ?, ?, ?, 1)
      `).run(activeDatasetId, finalDatasetName, desc, records.length, uploaderInfo);
    } else {
      const existingDs = db.prepare('SELECT name FROM datasets WHERE id = ?').get(activeDatasetId) as any;
      if (existingDs) finalDatasetName = existingDs.name;
    }

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

    db.exec('BEGIN TRANSACTION;');
    try {
      for (const r of records) {
        insertRecord.run(
          activeDatasetId,
          r.crime_id,
          r.date,
          r.time,
          r.year,
          r.month,
          r.crime_type,
          r.city,
          r.state,
          r.district || '',
          r.location,
          r.victim_age ?? null,
          r.victim_gender ?? null,
          r.suspect_age ?? null,
          r.suspect_gender ?? null,
          r.weapon_used ?? null,
          r.case_status,
          r.latitude ?? null,
          r.longitude ?? null,
          r.crime_severity,
          r.police_station,
          r.arrest_made,
          r.incident_day,
          r.investigation_days ?? null
        );
      }
      db.exec('COMMIT;');
    } catch (err) {
      db.exec('ROLLBACK;');
      throw err;
    }

    // Update dataset record count and set as central active default
    const totalInDataset = (db.prepare('SELECT COUNT(*) as count FROM crime_records WHERE dataset_id = ?').get(activeDatasetId) as { count: number }).count;
    db.prepare('UPDATE datasets SET record_count = ? WHERE id = ?').run(totalInDataset, activeDatasetId);

    // Set as the current default dataset so all users immediately access it
    db.prepare('UPDATE datasets SET is_default = 0').run();
    db.prepare('UPDATE datasets SET is_default = 1 WHERE id = ?').run(activeDatasetId);

    // -------------------------------------------------------------
    // PERSIST TO MONGODB ATLAS
    // -------------------------------------------------------------
    if (!isMongoConnected()) {
      return res.status(503).json({
        error: 'MongoDB Atlas connection is currently offline. Please verify network access and MongoDB connection.'
      });
    }

    let mongoSyncedCount = 0;
    try {
      await DatasetModel.updateOne(
        { id: activeDatasetId },
        {
          $set: {
            id: activeDatasetId,
            name: finalDatasetName,
            description: datasetDescription || `Uploaded by ${uploaderInfo} on ${new Date().toLocaleString()}`,
            record_count: totalInDataset,
            created_by: uploaderInfo,
            is_default: 1
          }
        },
        { upsert: true }
      );

      // Reset default flag on other datasets in MongoDB
      await DatasetModel.updateMany({ id: { $ne: activeDatasetId } }, { $set: { is_default: 0 } });

      const mongoDocs = records.map((r: CrimeRecord) => ({
        dataset_id: activeDatasetId,
        crime_id: r.crime_id,
        date: r.date,
        time: r.time,
        year: r.year,
        month: r.month,
        crime_type: r.crime_type,
        city: r.city,
        state: r.state,
        district: r.district || '',
        location: r.location,
        victim_age: r.victim_age ?? null,
        victim_gender: r.victim_gender ?? null,
        suspect_age: r.suspect_age ?? null,
        suspect_gender: r.suspect_gender ?? null,
        weapon_used: r.weapon_used ?? null,
        case_status: r.case_status,
        latitude: r.latitude ?? null,
        longitude: r.longitude ?? null,
        crime_severity: r.crime_severity,
        police_station: r.police_station,
        arrest_made: r.arrest_made,
        incident_day: r.incident_day,
        investigation_days: r.investigation_days ?? null
      }));

      const insertedResult = await CrimeRecordModel.insertMany(mongoDocs, { ordered: false });
      mongoSyncedCount = insertedResult.length;
      console.log(`[MongoDB Atlas] ✅ Successfully persisted ${mongoSyncedCount} records to 'crimerecords' collection!`);
    } catch (mongoErr: any) {
      console.error(`[MongoDB Atlas Upload Error]:`, mongoErr);
      return res.status(500).json({ error: `MongoDB Atlas persistence failed: ${mongoErr.message}` });
    }

    // Log audit
    db.prepare('INSERT INTO audit_logs (user_id, action, details) VALUES (?, ?, ?)')
      .run(req.user?.id || 'anonymous', 'IMPORT_DATASET', `Imported ${records.length} records into dataset ${activeDatasetId} by ${uploaderInfo}`);

    // Broadcast real-time SSE event to all connected Citizen, Police, and Admin dashboards
    broadcastEmergencyEvent('NEW_DATASET_UPLOADED', {
      datasetId: activeDatasetId,
      name: finalDatasetName,
      uploaderName: req.user?.name || 'User',
      uploaderRole: uploaderRole,
      recordCount: totalInDataset,
      timestamp: new Date().toISOString()
    });

    return res.json({
      success: true,
      message: `Successfully imported ${records.length} crime records into central database & MongoDB Atlas!`,
      datasetId: activeDatasetId,
      datasetName: finalDatasetName,
      totalDatasetRecords: totalInDataset,
      mongoRecordsPersisted: mongoSyncedCount
    });
  } catch (error: any) {
    console.error('commitImport error:', error);
    return res.status(500).json({ error: `Database import failed: ${error.message}` });
  }
}
