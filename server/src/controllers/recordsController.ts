import { Request, Response } from 'express';
import { db } from '../db/schema';
import { FilterParams } from '../types';

export function getRecords(req: Request, res: Response) {
  try {
    const filters = req.query as FilterParams & {
      page?: string;
      limit?: string;
      sortBy?: string;
      sortOrder?: string;
    };

    const page = Math.max(1, parseInt(filters.page || '1', 10));
    const limit = Math.max(1, Math.min(200, parseInt(filters.limit || '20', 10)));
    const offset = (page - 1) * limit;

    const allowedSortColumns: Record<string, string> = {
      'crime_id': 'crime_id',
      'date': 'date',
      'time': 'time',
      'crime_type': 'crime_type',
      'city': 'city',
      'state': 'state',
      'district': 'district',
      'location': 'location',
      'victim_age': 'victim_age',
      'case_status': 'case_status',
      'crime_severity': 'crime_severity',
      'police_station': 'police_station',
      'arrest_made': 'arrest_made',
      'investigation_days': 'investigation_days'
    };

    const sortBy = allowedSortColumns[filters.sortBy || 'date'] || 'date';
    const sortOrder = (filters.sortOrder || 'DESC').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const clauses: string[] = [];
    const args: any[] = [];

    const datasetId = filters.datasetId || 'ds_india_all';
    clauses.push('dataset_id = ?');
    args.push(datasetId);

    if (filters.state && filters.state !== 'All' && filters.state.trim() !== '') {
      clauses.push('state = ?');
      args.push(filters.state);
    }

    if (filters.district && filters.district !== 'All' && filters.district.trim() !== '') {
      clauses.push('district = ?');
      args.push(filters.district);
    }

    if (filters.city && filters.city !== 'All' && filters.city.trim() !== '') {
      clauses.push('city = ?');
      args.push(filters.city);
    }

    if (filters.year && filters.year !== 'All' && String(filters.year).trim() !== '') {
      clauses.push('year = ?');
      args.push(Number(filters.year));
    }

    if (filters.crimeType && filters.crimeType !== 'All' && filters.crimeType.trim() !== '') {
      clauses.push('crime_type = ?');
      args.push(filters.crimeType);
    }

    if (filters.caseStatus && filters.caseStatus !== 'All' && filters.caseStatus.trim() !== '') {
      clauses.push('case_status = ?');
      args.push(filters.caseStatus);
    }

    if (filters.severity && filters.severity !== 'All' && filters.severity.trim() !== '') {
      clauses.push('crime_severity = ?');
      args.push(filters.severity);
    }

    if (filters.arrestMade && filters.arrestMade !== 'All' && filters.arrestMade.trim() !== '') {
      clauses.push('arrest_made = ?');
      args.push(filters.arrestMade);
    }

    if (filters.search && filters.search.trim() !== '') {
      const s = `%${filters.search.trim()}%`;
      clauses.push('(crime_id LIKE ? OR crime_type LIKE ? OR city LIKE ? OR state LIKE ? OR district LIKE ? OR location LIKE ? OR police_station LIKE ?)');
      args.push(s, s, s, s, s, s, s);
    }

    const whereSql = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';

    const countRow = db.prepare(`SELECT COUNT(*) as total FROM crime_records ${whereSql}`).get(...args) as { total: number };
    const totalRecords = countRow?.total || 0;

    const records = db.prepare(`
      SELECT *
      FROM crime_records
      ${whereSql}
      ORDER BY ${sortBy} ${sortOrder}
      LIMIT ? OFFSET ?
    `).all(...args, limit, offset);

    return res.json({
      records,
      pagination: {
        page,
        limit,
        totalRecords,
        totalPages: Math.ceil(totalRecords / limit)
      }
    });
  } catch (error) {
    console.error('getRecords error:', error);
    return res.status(500).json({ error: 'Failed to fetch crime records.' });
  }
}

export function exportRecords(req: Request, res: Response) {
  try {
    const filters = req.query as FilterParams;
    const datasetId = filters.datasetId || 'ds_india_all';

    const clauses: string[] = ['dataset_id = ?'];
    const args: any[] = [datasetId];

    if (filters.state && filters.state !== 'All') {
      clauses.push('state = ?');
      args.push(filters.state);
    }
    if (filters.district && filters.district !== 'All') {
      clauses.push('district = ?');
      args.push(filters.district);
    }
    if (filters.city && filters.city !== 'All') {
      clauses.push('city = ?');
      args.push(filters.city);
    }
    if (filters.year && filters.year !== 'All') {
      clauses.push('year = ?');
      args.push(Number(filters.year));
    }
    if (filters.crimeType && filters.crimeType !== 'All') {
      clauses.push('crime_type = ?');
      args.push(filters.crimeType);
    }

    const whereSql = `WHERE ${clauses.join(' AND ')}`;
    const records = db.prepare(`
      SELECT crime_id as "Crime_ID", date as "Date", time as "Time", crime_type as "Crime_Type",
             city as "City", state as "State", district as "District", location as "Location",
             victim_age as "Victim_Age", victim_gender as "Victim_Gender",
             suspect_age as "Suspect_Age", suspect_gender as "Suspect_Gender",
             weapon_used as "Weapon_Used", case_status as "Case_Status",
             latitude as "Latitude", crime_severity as "Crime_Severity",
             police_station as "Police_Station", arrest_made as "Arrest_Made",
             incident_day as "Incident_Day", investigation_days as "Investigation_Days"
      FROM crime_records
      ${whereSql}
      ORDER BY date DESC
    `).all(...args);

    return res.json({ records });
  } catch (error) {
    console.error('exportRecords error:', error);
    return res.status(500).json({ error: 'Failed to export records.' });
  }
}
